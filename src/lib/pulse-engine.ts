/**
 * Shared Pulse Report builder — used by /api/pulse (generic) and
 * /api/pulse/scout (conversational scouting mode).
 *
 * Configurable via BuildPulseOptions:
 *   - competitorRadiusKm    (default 0.3) — search radius for competitor matching
 *   - competitorCategories  (optional)    — when set, overrides the target's own
 *                                            category for the competitor filter
 *   - strictCategoryFilter  (default false) — when true, do NOT fall back to
 *                                            nearest-N if the category filter
 *                                            returns few matches
 *   - summarizer            (optional)    — override the AI summary function
 */

import {
  searchPlaces,
  nearbyPlaces,
  reverseGeocode,
  getDirections,
  haversineMeters,
} from '@/lib/grabmaps';
import { generatePulseSummary } from '@/lib/claude';
import type {
  PulseReport,
  PulsePlace,
  PulseCompetitor,
  PulseHeatmapPoint,
  PulseCategoryCount,
  PulseAccessibility,
  PulseSummary,
} from '@/types/pulse';
import type { NormalizedPoi } from '@/lib/grabmaps';

const MAX_COMPETITORS = 10;
const MIN_COMPETITORS_FALLBACK = 3;
const SELF_EXCLUSION_METERS = 15;
const TOP_CATEGORIES = 5;

export interface PulseSummarizerContext {
  totalCompetitorsFound: number;
  competitorRadiusKm: number;
}

export interface BuildPulseOptions {
  lat: number;
  lng: number;
  placeId?: string;
  name?: string;
  country?: string;
  competitorRadiusKm?: number;
  competitorCategories?: string[];
  strictCategoryFilter?: boolean;
  summarizer?: (
    report: Omit<PulseReport, 'summary'>,
    ctx: PulseSummarizerContext,
  ) => Promise<PulseSummary>;
}

export interface BuildPulseResult {
  report: PulseReport;
  /** Total POIs matching the category filter within the competitor radius. */
  totalCompetitorsFound: number;
  /** Radius used for competitor matching (in km). */
  competitorRadiusKm: number;
}

function categoriesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  return na.includes(nb) || nb.includes(na);
}

function matchesAnyCategory(category: string, keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  return keywords.some((k) => categoriesMatch(category, k));
}

function deduplicatePois(pois: NormalizedPoi[]): NormalizedPoi[] {
  const seenIds = new Set<string>();
  const seenCoords = new Set<string>();
  const out: NormalizedPoi[] = [];
  for (const poi of pois) {
    if (poi.placeId) {
      if (seenIds.has(poi.placeId)) continue;
      seenIds.add(poi.placeId);
    }
    const key = `${poi.lat.toFixed(5)},${poi.lng.toFixed(5)}`;
    if (seenCoords.has(key)) continue;
    seenCoords.add(key);
    out.push(poi);
  }
  return out;
}

function isSelf(
  poi: NormalizedPoi,
  targetPlaceId: string | undefined,
  lat: number,
  lng: number,
): boolean {
  if (targetPlaceId && poi.placeId === targetPlaceId) return true;
  return haversineMeters(poi.lat, poi.lng, lat, lng) <= SELF_EXCLUSION_METERS;
}

function buildCategoryBreakdown(pois: NormalizedPoi[]): PulseCategoryCount[] {
  const counts = new Map<string, number>();
  for (const p of pois) {
    const cat = p.category || 'Unknown';
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CATEGORIES)
    .map(([category, count]) => ({ category, count }));
}

function computeAccessibilityScore(
  walkingMinutes: number | null,
  totalNearby1km: number,
): number {
  const walkPenalty = walkingMinutes !== null ? Math.min(walkingMinutes * 6, 70) : 70;
  const clusterBonus = Math.min(totalNearby1km / 10, 30);
  return Math.round(Math.max(0, Math.min(100, 100 - walkPenalty + clusterBonus)));
}

export async function buildPulseReport(opts: BuildPulseOptions): Promise<BuildPulseResult> {
  const startMs = Date.now();
  const { lat, lng } = opts;
  const country = opts.country ?? 'SGP';
  const competitorRadiusKm = opts.competitorRadiusKm ?? 0.3;
  const competitorCategories = opts.competitorCategories ?? null;
  const strictFilter = opts.strictCategoryFilter ?? false;
  const summarizer = opts.summarizer ?? generatePulseSummary;

  // 1. Resolve target place
  let place: PulsePlace;
  try {
    let resolved: PulsePlace | null = null;
    if (opts.placeId || opts.name) {
      const geo = await reverseGeocode(lat, lng);
      if (geo) {
        resolved = {
          placeId: opts.placeId ?? geo.placeId,
          name: opts.name ?? geo.name,
          category: geo.category ?? 'Location',
          address: geo.address ?? `Lat: ${lat}, Lng: ${lng}`,
          lat,
          lng,
        };
      }
      if (!resolved && opts.name) {
        const results = await searchPlaces({
          keyword: opts.name,
          country,
          location: { lat, lng },
          limit: 5,
        });
        if (results.length > 0) {
          const best = results[0];
          resolved = {
            placeId: opts.placeId ?? best.placeId,
            name: best.name,
            category: best.category ?? 'Location',
            address: best.address ?? `Lat: ${lat}, Lng: ${lng}`,
            lat: best.lat,
            lng: best.lng,
          };
        }
      }
    } else {
      const geo = await reverseGeocode(lat, lng);
      if (geo) {
        resolved = {
          placeId: geo.placeId,
          name: geo.name !== 'Unknown Place' ? geo.name : 'Dropped pin',
          category: geo.category ?? 'Location',
          address: geo.address ?? `Lat: ${lat}, Lng: ${lng}`,
          lat,
          lng,
        };
      }
    }
    place = resolved ?? {
      placeId: opts.placeId,
      name: opts.name ?? 'Dropped pin',
      category: 'Location',
      address: `Lat: ${lat}, Lng: ${lng}`,
      lat,
      lng,
    };
  } catch (err) {
    console.error('[PulseEngine] Place resolution error:', err);
    place = {
      placeId: opts.placeId,
      name: opts.name ?? 'Dropped pin',
      category: 'Location',
      address: `Lat: ${lat}, Lng: ${lng}`,
      lat,
      lng,
    };
  }

  // 2. Fan-out parallel GrabMaps calls
  // Always fetch 300m and 1km for density metrics; plus MRT.
  const [nearby300R, nearby1kmR, mrtR] = await Promise.allSettled([
    nearbyPlaces({ lat, lng, radiusKm: 0.3, limit: 50, rankBy: 'distance' }),
    nearbyPlaces({ lat, lng, radiusKm: 1.0, limit: 50, rankBy: 'distance' }),
    searchPlaces({ keyword: 'MRT', location: { lat, lng }, limit: 5, country }),
  ]);

  const nearby300: NormalizedPoi[] = nearby300R.status === 'fulfilled' ? nearby300R.value : [];
  const nearby1km: NormalizedPoi[] = nearby1kmR.status === 'fulfilled' ? nearby1kmR.value : [];
  const mrtCandidates = mrtR.status === 'fulfilled' ? mrtR.value : [];

  // 3. Density
  const filtered300 = nearby300.filter((p) => !isSelf(p, place.placeId, lat, lng));
  const filtered1km = nearby1km.filter((p) => !isSelf(p, place.placeId, lat, lng));

  const categoryPredicate = (poi: NormalizedPoi): boolean => {
    if (competitorCategories && competitorCategories.length > 0) {
      return matchesAnyCategory(poi.category, competitorCategories);
    }
    return categoriesMatch(poi.category, place.category);
  };

  const sameCategoryNearby300m = filtered300.filter(categoryPredicate).length;

  const allNearby = deduplicatePois([...nearby300, ...nearby1km]);
  const heatmapPoints: PulseHeatmapPoint[] = allNearby
    .filter((p) => !isSelf(p, place.placeId, lat, lng))
    .map((p) => {
      const dist = haversineMeters(p.lat, p.lng, lat, lng);
      return { lat: p.lat, lng: p.lng, weight: 1 / Math.max(dist, 30) };
    });

  const categoryBreakdown = buildCategoryBreakdown(filtered1km);

  // 4. Competitors
  // Pick the POI pool based on competitorRadiusKm. 1km -> filtered1km; else filtered300.
  const competitorPool = competitorRadiusKm >= 0.95 ? filtered1km : filtered300;

  const matchedCompetitors = competitorPool
    .filter(categoryPredicate)
    .map((p) => ({ ...p, distanceMeters: haversineMeters(p.lat, p.lng, lat, lng) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const totalCompetitorsFound = matchedCompetitors.length;

  let competitorPois: (NormalizedPoi & { distanceMeters: number })[];
  if (strictFilter) {
    // Scout mode: ONLY category-matched POIs, no nearest-N fallback.
    competitorPois = matchedCompetitors.slice(0, MAX_COMPETITORS);
  } else if (matchedCompetitors.length >= MIN_COMPETITORS_FALLBACK) {
    competitorPois = matchedCompetitors.slice(0, MAX_COMPETITORS);
  } else {
    // Generic mode fallback: nearest-N ignoring category.
    const nearestAll = competitorPool
      .map((p) => ({ ...p, distanceMeters: haversineMeters(p.lat, p.lng, lat, lng) }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, MAX_COMPETITORS);
    competitorPois = nearestAll;
  }

  const competitors: PulseCompetitor[] = competitorPois.map((p) => ({
    placeId: p.placeId,
    name: p.name,
    category: p.category,
    distanceMeters: p.distanceMeters,
    lat: p.lat,
    lng: p.lng,
    rating: p.rating,
    address: p.address || undefined,
  }));

  // 5. Accessibility
  const mrtWithDistance = mrtCandidates
    .map((m) => ({ ...m, distM: haversineMeters(m.lat, m.lng, lat, lng) }))
    .sort((a, b) => a.distM - b.distM);

  const nearestMrtCandidate = mrtWithDistance[0] ?? null;
  let accessibility: PulseAccessibility;
  if (nearestMrtCandidate) {
    const directions = await getDirections(
      { lat, lng },
      { lat: nearestMrtCandidate.lat, lng: nearestMrtCandidate.lng },
      'walking',
    );
    const walkingDistanceMeters = directions?.distanceMeters ?? nearestMrtCandidate.distM;
    const walkingMinutes = directions
      ? Math.round(directions.durationSeconds / 60)
      : Math.round(walkingDistanceMeters / 80);
    accessibility = {
      nearestMrt: {
        name: nearestMrtCandidate.name,
        walkingMinutes,
        walkingDistanceMeters: Math.round(walkingDistanceMeters),
        lat: nearestMrtCandidate.lat,
        lng: nearestMrtCandidate.lng,
      },
      score: computeAccessibilityScore(walkingMinutes, filtered1km.length),
    };
  } else {
    accessibility = { score: computeAccessibilityScore(null, filtered1km.length) };
  }

  // 6. Assemble + summarize
  const reportWithoutSummary: Omit<PulseReport, 'summary'> = {
    place,
    density: {
      totalNearby300m: filtered300.length,
      sameCategoryNearby300m,
      totalNearby1km: filtered1km.length,
      heatmapPoints,
      categoryBreakdown,
    },
    competitors,
    accessibility,
    meta: {
      fetchedAt: new Date().toISOString(),
      durationMs: 0,
      generatedSummary: false,
    },
  };

  const summary = await summarizer(reportWithoutSummary, {
    totalCompetitorsFound,
    competitorRadiusKm,
  });
  const generatedSummary = summary.model !== undefined;

  const report: PulseReport = {
    ...reportWithoutSummary,
    summary,
    meta: {
      fetchedAt: reportWithoutSummary.meta.fetchedAt,
      durationMs: Date.now() - startMs,
      generatedSummary,
    },
  };

  return { report, totalCompetitorsFound, competitorRadiusKm };
}

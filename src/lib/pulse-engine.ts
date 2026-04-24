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
  PlaceSearchResult,
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

  // 2. Fan-out parallel GrabMaps calls.
  //
  // For scout mode (competitorCategories provided) we also fire a keyword
  // search for EACH category keyword with location bias. This massively
  // expands coverage beyond the 50-per-call nearby cap — Grab's nearby
  // endpoint only returns the 50 closest POIs, which in dense F&B areas
  // can all sit within 200m and miss everything between 200m–1km. The
  // keyword search finds POIs by name match regardless of their distance
  // rank in a generic nearby query.
  const keywordSearchesRun = Boolean(
    competitorCategories && competitorCategories.length > 0,
  );

  const baseCalls = [
    nearbyPlaces({ lat, lng, radiusKm: 0.3, limit: 100, rankBy: 'distance' }),
    nearbyPlaces({ lat, lng, radiusKm: 1.0, limit: 100, rankBy: 'distance' }),
    searchPlaces({ keyword: 'MRT', location: { lat, lng }, limit: 5, country }),
  ] as const;

  const keywordCalls = keywordSearchesRun
    ? (competitorCategories as string[]).map((kw) =>
        searchPlaces({ keyword: kw, location: { lat, lng }, limit: 20, country }),
      )
    : [];

  const settled = await Promise.allSettled([...baseCalls, ...keywordCalls]);

  const nearby300: NormalizedPoi[] =
    settled[0].status === 'fulfilled' ? (settled[0].value as NormalizedPoi[]) : [];
  const nearby1km: NormalizedPoi[] =
    settled[1].status === 'fulfilled' ? (settled[1].value as NormalizedPoi[]) : [];
  const mrtCandidates =
    settled[2].status === 'fulfilled' ? (settled[2].value as PlaceSearchResult[]) : [];

  const keywordPoolResults: PlaceSearchResult[] = [];
  for (let i = 3; i < settled.length; i++) {
    const r = settled[i];
    if (r.status === 'fulfilled') {
      keywordPoolResults.push(...(r.value as PlaceSearchResult[]));
    }
  }

  // Convert keyword-search results (PlaceSearchResult) to NormalizedPoi shape
  // so they merge cleanly with nearbyPlaces results. Filter to 1km radius
  // from the anchor so noise from biased-but-unbounded keyword searches
  // doesn't pollute the competitor pool.
  const maxCompetitorRadiusMeters = Math.max(competitorRadiusKm * 1000, 1000);
  const keywordPoolNormalized: NormalizedPoi[] = keywordPoolResults
    .filter(
      (r) => haversineMeters(r.lat, r.lng, lat, lng) <= maxCompetitorRadiusMeters,
    )
    .map((r) => ({
      placeId: r.placeId,
      name: r.name,
      category: r.category ?? '',
      address: r.address ?? '',
      lat: r.lat,
      lng: r.lng,
    }));

  // 3. Density
  //
  // Grab's nearby endpoint ranks by distance but doesn't strictly enforce
  // the `radius` param — at small radii in dense areas it still returns the
  // limit's worth of nearest POIs, some of which may sit outside the radius.
  // Enforce the radius client-side via haversine so totalNearby300m and
  // totalNearby1km have the meaning their names imply.
  const filtered300 = nearby300
    .filter((p) => !isSelf(p, place.placeId, lat, lng))
    .filter((p) => haversineMeters(p.lat, p.lng, lat, lng) <= 300);
  const filtered1km = nearby1km
    .filter((p) => !isSelf(p, place.placeId, lat, lng))
    .filter((p) => haversineMeters(p.lat, p.lng, lat, lng) <= 1000);

  const categoryPredicate = (poi: NormalizedPoi): boolean => {
    if (competitorCategories && competitorCategories.length > 0) {
      return matchesAnyCategory(poi.category, competitorCategories);
    }
    return categoriesMatch(poi.category, place.category);
  };

  const sameCategoryNearby300m = filtered300.filter(categoryPredicate).length;

  const allNearby = deduplicatePois([...nearby300, ...nearby1km]);
  // Heatmap content depends on mode:
  //   - Scout mode (strict + competitor categories): ONLY the matched competitors
  //     get heatmap weight, with boosted intensity so cold gaps are visually
  //     obvious as potential alternative locations.
  //   - Generic mode: every nearby POI contributes — represents overall density.
  const heatmapPoints: PulseHeatmapPoint[] = strictFilter && competitorCategories
    ? [] // placeholder — populated below after matchedCompetitors is built
    : allNearby
        .filter((p) => !isSelf(p, place.placeId, lat, lng))
        .map((p) => {
          const dist = haversineMeters(p.lat, p.lng, lat, lng);
          return { lat: p.lat, lng: p.lng, weight: 1 / Math.max(dist, 30) };
        });

  const categoryBreakdown = buildCategoryBreakdown(filtered1km);

  // 4. Competitors
  //
  // Build a multi-source pool so we're not limited to just the 50 closest
  // POIs from a single nearby call:
  //   - filtered nearby (1km or 300m depending on competitorRadiusKm)
  //   - keyword-search results (one per categoryKeyword, only populated in scout mode)
  // Then dedup, filter by radius, apply the category match, and sort by distance.
  const nearbyCompetitorPool = competitorRadiusKm >= 0.95 ? filtered1km : filtered300;

  const combinedPool = deduplicatePois([
    ...nearbyCompetitorPool,
    ...keywordPoolNormalized.filter((p) => !isSelf(p, place.placeId, lat, lng)),
  ]);

  const matchedCompetitors = combinedPool
    .filter(categoryPredicate)
    .map((p) => ({ ...p, distanceMeters: haversineMeters(p.lat, p.lng, lat, lng) }))
    .filter((p) => p.distanceMeters <= competitorRadiusKm * 1000)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const totalCompetitorsFound = matchedCompetitors.length;

  // Scout-mode heatmap: competitor-only points with boosted weight so the
  // resulting heatmap shows exactly where direct competitors cluster. Cold
  // zones then visually indicate gaps where an operator could consider
  // opening an alternative location.
  if (strictFilter && competitorCategories) {
    for (const c of matchedCompetitors) {
      const boosted = Math.min(1, (1 / Math.max(c.distanceMeters, 30)) * 50);
      heatmapPoints.push({ lat: c.lat, lng: c.lng, weight: boosted });
    }
  }

  let competitorPois: (NormalizedPoi & { distanceMeters: number })[];
  if (strictFilter) {
    // Scout mode: ONLY category-matched POIs, no nearest-N fallback.
    competitorPois = matchedCompetitors.slice(0, MAX_COMPETITORS);
  } else if (matchedCompetitors.length >= MIN_COMPETITORS_FALLBACK) {
    competitorPois = matchedCompetitors.slice(0, MAX_COMPETITORS);
  } else {
    // Generic mode fallback: nearest-N ignoring category.
    const nearestAll = combinedPool
      .map((p) => ({ ...p, distanceMeters: haversineMeters(p.lat, p.lng, lat, lng) }))
      .filter((p) => p.distanceMeters <= competitorRadiusKm * 1000)
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

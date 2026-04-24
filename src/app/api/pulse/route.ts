/**
 * POST /api/pulse
 *
 * Accepts a target location, fans out GrabMaps calls in parallel, assembles
 * a PulseReport, optionally enriches it with an AI summary via Claude, and
 * returns the full report as JSON.
 *
 * Request body: PulseRequest  { placeId?, lat, lng, name?, country? }
 * Response:     PulseReport   (HTTP 200) | { error: string } (HTTP 400/500)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  searchPlaces,
  nearbyPlaces,
  reverseGeocode,
  getDirections,
  haversineMeters,
} from '@/lib/grabmaps';
import { generatePulseSummary } from '@/lib/claude';
import type {
  PulseRequest,
  PulseReport,
  PulsePlace,
  PulseCompetitor,
  PulseHeatmapPoint,
  PulseCategoryCount,
  PulseAccessibility,
} from '@/types/pulse';
import type { NormalizedPoi } from '@/lib/grabmaps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max same-category competitors returned in the report. */
const MAX_COMPETITORS = 8;
/** Min same-category competitors before we fall back to nearest-N. */
const MIN_COMPETITORS_FALLBACK = 3;
/** If the target POI is within this distance it is considered the same place. */
const SELF_EXCLUSION_METERS = 15;
/** Number of top categories to show in categoryBreakdown. */
const TOP_CATEGORIES = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if two strings share a category (lenient substring match on
 * either side so "F&B" matches "Food & Beverage", "Coffee" matches "Kopitiam
 * / Coffee Shop", etc.).
 */
function categoriesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const normalize = (s: string) => s.toLowerCase().trim();
  const na = normalize(a);
  const nb = normalize(b);
  return na.includes(nb) || nb.includes(na);
}

/**
 * Deduplicates a list of POIs by placeId (preferring earlier entries) and
 * then by rounded lat/lng (to catch duplicates without an ID).
 */
function deduplicatePois(pois: NormalizedPoi[]): NormalizedPoi[] {
  const seenIds = new Set<string>();
  const seenCoords = new Set<string>();
  const result: NormalizedPoi[] = [];

  for (const poi of pois) {
    if (poi.placeId) {
      if (seenIds.has(poi.placeId)) continue;
      seenIds.add(poi.placeId);
    }
    // Round to ~1m precision to catch coord-duplicate entries
    const coordKey = `${poi.lat.toFixed(5)},${poi.lng.toFixed(5)}`;
    if (seenCoords.has(coordKey)) continue;
    seenCoords.add(coordKey);
    result.push(poi);
  }

  return result;
}

/**
 * Determines whether a nearby POI should be excluded as "the target itself".
 * Matches by placeId (when available) OR by being within SELF_EXCLUSION_METERS.
 */
function isSelf(
  poi: NormalizedPoi,
  targetPlaceId: string | undefined,
  targetLat: number,
  targetLng: number,
): boolean {
  if (targetPlaceId && poi.placeId === targetPlaceId) return true;
  return haversineMeters(poi.lat, poi.lng, targetLat, targetLng) <= SELF_EXCLUSION_METERS;
}

/**
 * Builds the top-N category breakdown from a list of POIs.
 */
function buildCategoryBreakdown(pois: NormalizedPoi[]): PulseCategoryCount[] {
  const counts = new Map<string, number>();
  for (const poi of pois) {
    const cat = poi.category || 'Unknown';
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CATEGORIES)
    .map(([category, count]) => ({ category, count }));
}

/**
 * Accessibility score heuristic (0–100):
 *   Base = 100 - clamp(walkingMinutes * 6, 0, 70)  →  max 70 pt deduction for walk time
 *   Bonus = min(totalNearby1km / 10, 30)            →  up to 30 bonus pts for dense cluster
 * Total clamped to [0, 100].
 */
function computeAccessibilityScore(
  walkingMinutes: number | null,
  totalNearby1km: number,
): number {
  const walkPenalty = walkingMinutes !== null
    ? Math.min(walkingMinutes * 6, 70)
    : 70; // maximum penalty if no MRT found
  const clusterBonus = Math.min(totalNearby1km / 10, 30);
  return Math.round(Math.max(0, Math.min(100, 100 - walkPenalty + clusterBonus)));
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startMs = Date.now();

  // -------------------------------------------------------------------------
  // 1. Parse & validate input
  // -------------------------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const rawBody = body as Record<string, unknown>;

  const lat = typeof rawBody['lat'] === 'number' ? rawBody['lat'] : parseFloat(String(rawBody['lat'] ?? ''));
  const lng = typeof rawBody['lng'] === 'number' ? rawBody['lng'] : parseFloat(String(rawBody['lng'] ?? ''));

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'Missing or invalid required fields: lat, lng' },
      { status: 400 },
    );
  }

  const pulseReq: PulseRequest = {
    placeId: typeof rawBody['placeId'] === 'string' ? rawBody['placeId'] : undefined,
    lat,
    lng,
    name: typeof rawBody['name'] === 'string' ? rawBody['name'] : undefined,
    country: typeof rawBody['country'] === 'string' ? rawBody['country'] : 'SGP',
  };

  const country = pulseReq.country ?? 'SGP';

  // -------------------------------------------------------------------------
  // 2. Resolve target place details
  // -------------------------------------------------------------------------
  let place: PulsePlace;

  try {
    let resolved: PulsePlace | null = null;

    if (pulseReq.placeId || pulseReq.name) {
      // Try reverse geocode first — most accurate for a known coordinate
      const geo = await reverseGeocode(lat, lng);
      if (geo) {
        resolved = {
          placeId: pulseReq.placeId ?? geo.placeId,
          name: pulseReq.name ?? geo.name,
          category: geo.category ?? 'Location',
          address: geo.address ?? `Lat: ${lat}, Lng: ${lng}`,
          lat,
          lng,
        };
      }

      // If reverse geocode didn't help and we have a name, try keyword search
      if (!resolved && pulseReq.name) {
        const searchResults = await searchPlaces({
          keyword: pulseReq.name,
          country,
          location: { lat, lng },
          limit: 5,
        });

        if (searchResults.length > 0) {
          const best = searchResults[0];
          resolved = {
            placeId: pulseReq.placeId ?? best.placeId,
            name: best.name,
            category: best.category ?? 'Location',
            address: best.address ?? `Lat: ${lat}, Lng: ${lng}`,
            lat: best.lat,
            lng: best.lng,
          };
        }
      }
    } else {
      // Dropped-pin: try reverse geocode to get address context
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

    // Ultimate fallback — we always have a place even if all API calls fail
    place = resolved ?? {
      placeId: pulseReq.placeId,
      name: pulseReq.name ?? 'Dropped pin',
      category: 'Location',
      address: `Lat: ${lat}, Lng: ${lng}`,
      lat,
      lng,
    };
  } catch (err) {
    console.error('[Pulse] Place resolution error:', err);
    place = {
      placeId: pulseReq.placeId,
      name: pulseReq.name ?? 'Dropped pin',
      category: 'Location',
      address: `Lat: ${lat}, Lng: ${lng}`,
      lat,
      lng,
    };
  }

  // -------------------------------------------------------------------------
  // 3. Fan-out parallel GrabMaps calls
  // -------------------------------------------------------------------------
  const [nearby300Result, nearby1kmResult, mrtSearchResult] = await Promise.allSettled([
    nearbyPlaces({ lat, lng, radiusKm: 0.3, limit: 50, rankBy: 'distance' }),
    nearbyPlaces({ lat, lng, radiusKm: 1.0, limit: 50, rankBy: 'distance' }),
    searchPlaces({ keyword: 'MRT', location: { lat, lng }, limit: 5, country }),
  ]);

  const nearby300: NormalizedPoi[] =
    nearby300Result.status === 'fulfilled' ? nearby300Result.value : [];
  const nearby1km: NormalizedPoi[] =
    nearby1kmResult.status === 'fulfilled' ? nearby1kmResult.value : [];
  const mrtCandidates =
    mrtSearchResult.status === 'fulfilled' ? mrtSearchResult.value : [];

  // -------------------------------------------------------------------------
  // 4. Compute density metrics
  // -------------------------------------------------------------------------

  // Exclude the target itself from both lists before counting
  const filtered300 = nearby300.filter((p) => !isSelf(p, place.placeId, lat, lng));
  const filtered1km = nearby1km.filter((p) => !isSelf(p, place.placeId, lat, lng));

  const sameCategoryNearby300m = filtered300.filter((p) =>
    categoriesMatch(p.category, place.category),
  ).length;

  // Heatmap: combine both sets, deduplicate, assign weight = 1 / max(distance, 30m)
  // Normalised so the closest POI gets weight ~1 and distant ones taper off.
  const allNearby = deduplicatePois([...nearby300, ...nearby1km]);
  const heatmapPoints: PulseHeatmapPoint[] = allNearby
    .filter((p) => !isSelf(p, place.placeId, lat, lng))
    .map((p) => {
      const dist = haversineMeters(p.lat, p.lng, lat, lng);
      return { lat: p.lat, lng: p.lng, weight: 1 / Math.max(dist, 30) };
    });

  const categoryBreakdown: PulseCategoryCount[] = buildCategoryBreakdown(filtered1km);

  // -------------------------------------------------------------------------
  // 5. Compute competitors
  // -------------------------------------------------------------------------

  // Build candidate list: same-category POIs from filtered 300m set, sorted by distance
  const sameCategory300 = filtered300
    .filter((p) => categoriesMatch(p.category, place.category))
    .map((p) => ({
      ...p,
      distanceMeters: haversineMeters(p.lat, p.lng, lat, lng),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  let competitorPois: (NormalizedPoi & { distanceMeters: number })[];

  if (sameCategory300.length >= MIN_COMPETITORS_FALLBACK) {
    competitorPois = sameCategory300.slice(0, MAX_COMPETITORS);
  } else {
    // Not enough same-category; also pull from 1km same-category set
    const sameCategory1km = filtered1km
      .filter((p) => categoriesMatch(p.category, place.category))
      .map((p) => ({
        ...p,
        distanceMeters: haversineMeters(p.lat, p.lng, lat, lng),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    // Merge and deduplicate, then if still < MIN fall back to nearest-N overall
    const merged = deduplicatePois([
      ...sameCategory300,
      ...sameCategory1km,
    ]).map((p) => ({
      ...p,
      distanceMeters: p.distanceMeters ?? haversineMeters(p.lat, p.lng, lat, lng),
    })) as (NormalizedPoi & { distanceMeters: number })[];

    if (merged.length >= MIN_COMPETITORS_FALLBACK) {
      competitorPois = merged.slice(0, MAX_COMPETITORS);
    } else {
      // Hard fallback: nearest-N POIs regardless of category
      const nearestAll = filtered300
        .map((p) => ({
          ...p,
          distanceMeters: haversineMeters(p.lat, p.lng, lat, lng),
        }))
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, MAX_COMPETITORS);
      competitorPois = nearestAll;
    }
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

  // -------------------------------------------------------------------------
  // 6. Nearest MRT + directions
  // -------------------------------------------------------------------------

  // Pick the MRT candidate closest to the target by haversine
  const mrtWithDistance = mrtCandidates
    .map((m) => ({
      ...m,
      distM: haversineMeters(m.lat, m.lng, lat, lng),
    }))
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
      : Math.round(walkingDistanceMeters / 80); // fallback: ~80 m/min walking speed

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
    accessibility = {
      score: computeAccessibilityScore(null, filtered1km.length),
    };
  }

  // -------------------------------------------------------------------------
  // 7. Assemble the report (without summary) and generate AI summary
  // -------------------------------------------------------------------------

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
      durationMs: 0, // will be overwritten below
      generatedSummary: false, // will be set after AI call
    },
  };

  const summary = await generatePulseSummary(reportWithoutSummary);
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

  return NextResponse.json(report, { status: 200 });
}

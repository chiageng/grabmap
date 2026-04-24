/**
 * GrabMaps HTTP client — server-side only.
 *
 * All exported functions are safe to call from Next.js Route Handlers and
 * Server Components. They never throw; on any fetch/parse error they log
 * to console.error and return an empty result so a single broken endpoint
 * cannot kill an entire Pulse report.
 */

import type { PlaceSearchResult } from '@/types/pulse';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = process.env.GRABMAPS_BASE_URL ?? 'https://maps.grab.com';
const API_KEY = process.env.GRABMAPS_API_KEY ?? '';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** A normalised POI returned by nearby / search helpers. */
export interface NormalizedPoi {
  placeId?: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  hours?: string;
  phone?: string;
  /** Populated by callers that compute distance from a reference point. */
  distanceMeters?: number;
}

// Raw shapes returned by GrabMaps — intentionally loose because the API
// does not publish a schema. We narrow with guards before use.
type RawPoi = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Haversine helper (in-line, no npm dependency)
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_000;

/**
 * Returns the great-circle distance in metres between two lat/lng points.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${API_KEY}` };
}

/**
 * Performs a GET request to the GrabMaps API.
 * Returns the parsed JSON body as `unknown`, or `null` on any error.
 */
async function grabGet(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: authHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[GrabMaps] HTTP ${res.status} for ${url.pathname}`);
      return null;
    }

    return await res.json() as unknown;
  } catch (err) {
    console.error(`[GrabMaps] Fetch error for ${url.pathname}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Response normaliser — maps messy GrabMaps POI shapes to NormalizedPoi
// ---------------------------------------------------------------------------

/**
 * Defensive extractor for a string field: checks multiple candidate keys in
 * order and returns the first non-empty string found, or the fallback.
 */
function extractString(obj: RawPoi, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim() !== '') return val.trim();
  }
  return fallback;
}

function extractNumber(obj: RawPoi, keys: string[]): number | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string') {
      const n = parseFloat(val);
      if (!isNaN(n)) return n;
    }
  }
  return undefined;
}

/**
 * Extracts lat/lng from various possible GrabMaps location shapes:
 *   { location: { latitude, longitude } }
 *   { location: { lat, lng } }
 *   { lat, lng }
 *   { latitude, longitude }
 */
function extractLatLng(obj: RawPoi): { lat: number; lng: number } | null {
  // Nested location object
  const loc = obj['location'];
  if (loc !== null && typeof loc === 'object' && !Array.isArray(loc)) {
    const locObj = loc as Record<string, unknown>;
    const lat = extractNumber(locObj as RawPoi, ['latitude', 'lat']);
    const lng = extractNumber(locObj as RawPoi, ['longitude', 'lng', 'lon']);
    if (lat !== undefined && lng !== undefined) return { lat, lng };
  }

  // Flat lat/lng
  const lat = extractNumber(obj, ['latitude', 'lat']);
  const lng = extractNumber(obj, ['longitude', 'lng', 'lon']);
  if (lat !== undefined && lng !== undefined) return { lat, lng };

  return null;
}

/**
 * Extracts a category string from a POI. Grab endpoints are inconsistent:
 *   - /nearby returns: business_type (string) + categories[] (array of
 *     objects with `category_name` key)
 *   - /search returns: business_type (string) + category (string)
 *
 * Strategy: collect every category-ish string we can find, join with " / "
 * so downstream substring matching has the widest surface area (matters
 * for scout's keyword filter — "food" should match "food and beverage").
 * Prefers business_type first since it's the most consistent field.
 */
function extractCategory(obj: RawPoi): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  const add = (s: unknown) => {
    if (typeof s !== 'string') return;
    const t = s.trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(t);
  };

  add(obj['business_type']);

  // categories[] — array of strings OR array of { category_name } / { name }
  const cats = obj['categories'];
  if (Array.isArray(cats)) {
    for (const c of cats) {
      if (typeof c === 'string') {
        add(c);
      } else if (c !== null && typeof c === 'object') {
        const co = c as Record<string, unknown>;
        add(co['category_name']);
        add(co['name']);
      }
    }
  } else if (typeof cats === 'string') {
    add(cats);
  }

  // Flat category / type strings
  add(obj['category']);
  add(obj['type']);

  if (parts.length === 0) return 'Point of Interest';
  return parts.join(' / ');
}

function normalisePoi(raw: RawPoi): NormalizedPoi | null {
  const coords = extractLatLng(raw);
  if (!coords) return null; // cannot use a POI without coordinates

  const name = extractString(raw, ['name', 'title', 'poi_name'], 'Unknown Place');

  return {
    placeId: extractString(raw, ['place_id', 'placeId', 'id', 'uid']) || undefined,
    name,
    category: extractCategory(raw),
    address: extractString(raw, ['address', 'formatted_address', 'vicinity', 'full_address'], ''),
    lat: coords.lat,
    lng: coords.lng,
    rating: extractNumber(raw, ['rating', 'score']),
    hours: extractString(raw, ['hours', 'opening_hours', 'business_hours']) || undefined,
    phone: extractString(raw, ['phone', 'telephone', 'phone_number']) || undefined,
  };
}

/** Extracts an array of raw POI objects from a GrabMaps response envelope. */
function extractPoiArray(body: unknown): RawPoi[] {
  if (!body || typeof body !== 'object') return [];
  const obj = body as Record<string, unknown>;

  // Try common envelope keys
  for (const key of ['data', 'results', 'pois', 'places', 'items']) {
    const candidate = obj[key];
    if (Array.isArray(candidate)) return candidate as RawPoi[];
  }

  // Bare array
  if (Array.isArray(body)) return body as RawPoi[];

  return [];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Keyword search — wraps the GrabMaps POI search endpoint.
 */
export async function searchPlaces(params: {
  keyword: string;
  country?: string;
  location?: { lat: number; lng: number };
  limit?: number;
}): Promise<PlaceSearchResult[]> {
  const { keyword, country = 'SGP', location, limit = 10 } = params;

  const queryParams: Record<string, string> = {
    keyword,
    country,
    limit: String(limit),
  };

  if (location) {
    queryParams['location'] = `${location.lat},${location.lng}`;
  }

  const body = await grabGet('/api/v1/maps/poi/v1/search', queryParams);
  const rawPois = extractPoiArray(body);

  const results: PlaceSearchResult[] = [];
  for (const raw of rawPois) {
    const poi = normalisePoi(raw);
    if (!poi) continue;
    results.push({
      placeId: poi.placeId,
      name: poi.name,
      category: poi.category,
      address: poi.address,
      lat: poi.lat,
      lng: poi.lng,
    });
  }

  return results;
}

/**
 * Nearby search — wraps the GrabMaps nearby POI endpoint.
 * Returns full NormalizedPoi objects (including optional rating/hours/phone).
 */
export async function nearbyPlaces(params: {
  lat: number;
  lng: number;
  radiusKm: number;
  limit?: number;
  rankBy?: 'distance' | 'popularity';
}): Promise<NormalizedPoi[]> {
  const { lat, lng, radiusKm, limit = 50, rankBy = 'distance' } = params;

  const body = await grabGet('/api/v1/maps/place/v2/nearby', {
    location: `${lat},${lng}`,
    radius: String(radiusKm),
    limit: String(limit),
    rankBy,
  });

  const rawPois = extractPoiArray(body);
  const results: NormalizedPoi[] = [];

  for (const raw of rawPois) {
    const poi = normalisePoi(raw);
    if (!poi) continue;
    results.push(poi);
  }

  return results;
}

/**
 * Reverse geocode — returns the best-matching PlaceSearchResult for a
 * lat/lng coordinate, or null if the endpoint fails or returns nothing.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<PlaceSearchResult | null> {
  const body = await grabGet('/api/v1/maps/poi/v1/reverse-geo', {
    location: `${lat},${lng}`,
  });

  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;

  // Try direct single-object response first, then an array envelope
  const rawPois = extractPoiArray(body);
  const primaryRaw: RawPoi | null =
    rawPois.length > 0 ? rawPois[0] : (obj as RawPoi);

  if (!primaryRaw) return null;

  const poi = normalisePoi(primaryRaw);
  if (!poi) return null;

  return {
    placeId: poi.placeId,
    name: poi.name,
    category: poi.category,
    address: poi.address,
    lat: poi.lat,
    lng: poi.lng,
  };
}

/** Shape returned by getDirections. */
export interface DirectionsResult {
  distanceMeters: number;
  durationSeconds: number;
  geometry?: unknown;
}

/**
 * Directions — wraps the GrabMaps ETA/directions endpoint.
 * Coordinates are passed as `lng,lat` per the API spec.
 * Returns null if the request fails or no route is found.
 */
export async function getDirections(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  profile: 'driving' | 'walking',
): Promise<DirectionsResult | null> {
  // The Directions API accepts repeated `coordinates` params: lng,lat format
  const url = new URL(`${BASE_URL}/api/v1/maps/eta/v1/direction`);
  url.searchParams.append('coordinates', `${start.lng},${start.lat}`);
  url.searchParams.append('coordinates', `${end.lng},${end.lat}`);
  url.searchParams.set('profile', profile);
  url.searchParams.set('overview', 'full');

  try {
    const res = await fetch(url.toString(), {
      headers: authHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[GrabMaps] Directions HTTP ${res.status}`);
      return null;
    }

    const body = await res.json() as unknown;
    if (!body || typeof body !== 'object') return null;

    const obj = body as Record<string, unknown>;

    // GrabMaps directions response likely wraps in `routes` array
    const routes = Array.isArray(obj['routes']) ? obj['routes'] : null;
    const firstRoute = routes && routes.length > 0
      ? routes[0] as Record<string, unknown>
      : obj; // fall back to top-level if no routes array

    // Distance may be in `distance` (metres) or `distanceInMeters`
    const distM = extractNumber(firstRoute as RawPoi, [
      'distance', 'distanceInMeters', 'distance_meters',
    ]);
    // Duration may be in `duration` (seconds) or `durationInSeconds`
    const durS = extractNumber(firstRoute as RawPoi, [
      'duration', 'durationInSeconds', 'duration_seconds',
    ]);

    if (distM === undefined || durS === undefined) {
      console.error('[GrabMaps] Directions: could not parse distance/duration', body);
      return null;
    }

    return {
      distanceMeters: distM,
      durationSeconds: durS,
      geometry: (firstRoute as Record<string, unknown>)['geometry'],
    };
  } catch (err) {
    console.error('[GrabMaps] Directions fetch error:', err);
    return null;
  }
}

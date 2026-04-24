/**
 * GET /api/directions
 *
 * Proxies the GrabMaps /maps/eta/v1/direction endpoint with the server's
 * Bearer key and returns distance + duration + a decoded GeoJSON LineString
 * ready to drop into a MapLibre source.
 *
 * Query params:
 *   originLat, originLng, destLat, destLng  (numbers, required)
 *   profile  'driving' | 'walking'  (default 'driving')
 *
 * Response shape:
 *   { distanceMeters, durationSeconds, geometry: LineString, profile }
 *   or { error: string } on failure
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDirections } from '@/lib/grabmaps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseCoord(v: string | null): number {
  if (v === null) return NaN;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams;

  const originLat = parseCoord(params.get('originLat'));
  const originLng = parseCoord(params.get('originLng'));
  const destLat = parseCoord(params.get('destLat'));
  const destLng = parseCoord(params.get('destLng'));

  if ([originLat, originLng, destLat, destLng].some((n) => Number.isNaN(n))) {
    return NextResponse.json(
      { error: 'Missing or invalid required params: originLat, originLng, destLat, destLng' },
      { status: 400 },
    );
  }

  const profileParam = params.get('profile') ?? 'driving';
  const profile: 'driving' | 'walking' =
    profileParam === 'walking' ? 'walking' : 'driving';

  try {
    const result = await getDirections(
      { lat: originLat, lng: originLng },
      { lat: destLat, lng: destLng },
      profile,
    );

    if (!result) {
      return NextResponse.json(
        { error: 'No route found between the specified points' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
        geometry:
          result.geometry ?? {
            type: 'LineString',
            coordinates: [
              [originLng, originLat],
              [destLng, destLat],
            ],
          },
        profile,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[Directions] failed:', err);
    return NextResponse.json({ error: 'directions_failed' }, { status: 500 });
  }
}

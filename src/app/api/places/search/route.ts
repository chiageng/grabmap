/**
 * GET /api/places/search?q=<keyword>&lat=<>&lng=<>&country=SGP
 *
 * Autocomplete proxy that forwards a keyword search to GrabMaps and returns
 * a normalised PlaceSearchResponse. Limit is capped at 8 results.
 *
 * Response: PlaceSearchResponse  { results: PlaceSearchResult[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces } from '@/lib/grabmaps';
import type { PlaceSearchResponse } from '@/types/pulse';

export const runtime = 'nodejs';

const RESULT_LIMIT = 8;

export async function GET(req: NextRequest): Promise<NextResponse<PlaceSearchResponse>> {
  const { searchParams } = req.nextUrl;

  const q = searchParams.get('q')?.trim() ?? '';
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const country = searchParams.get('country') ?? 'SGP';

  // Return empty results for blank queries — don't waste an API call
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  // Parse optional coordinate hint for proximity ranking
  const lat = latStr !== null ? parseFloat(latStr) : NaN;
  const lng = lngStr !== null ? parseFloat(lngStr) : NaN;
  const hasLocation = !isNaN(lat) && !isNaN(lng);

  const results = await searchPlaces({
    keyword: q,
    country,
    location: hasLocation ? { lat, lng } : undefined,
    limit: RESULT_LIMIT,
  });

  return NextResponse.json({ results });
}

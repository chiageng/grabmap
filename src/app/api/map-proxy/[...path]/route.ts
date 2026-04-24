/**
 * Catch-all proxy for GrabMaps resources (style.json, sprites, glyphs, tile PBFs).
 *
 * Why this exists:
 *   Grab's tile/sprite/glyph endpoints on maps.grab.com do not return CORS
 *   headers that permit browser requests from localhost. MapLibre therefore
 *   cannot fetch them directly from the client. Routing every Grab request
 *   through this same-origin proxy bypasses CORS entirely and keeps the API
 *   key server-side.
 *
 *   Client calls  →  /api/map-proxy/<grab path>?<query>
 *   Proxy fetches →  https://maps.grab.com/<grab path>?<query>  with Bearer
 *
 * Example:
 *   /api/map-proxy/api/maps/tiles/v2/vector/karta-v3/13/6458/4065.pbf
 *     → https://maps.grab.com/api/maps/tiles/v2/vector/karta-v3/13/6458/4065.pbf
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GRAB_BASE_URL = process.env.GRABMAPS_BASE_URL ?? 'https://maps.grab.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const apiKey = process.env.GRABMAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GRABMAPS_API_KEY is not set on the server' },
      { status: 500 },
    );
  }

  const { path } = await params;
  const search = request.nextUrl.search;
  const upstreamUrl = `${GRAB_BASE_URL}/${path.join('/')}${search}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });

    const body = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
    const cacheControl = upstream.headers.get('cache-control') ?? 'public, max-age=300';

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type': contentType,
        'cache-control': cacheControl,
      },
    });
  } catch (err) {
    console.error('[map-proxy] upstream fetch failed:', upstreamUrl, err);
    return NextResponse.json({ error: 'proxy_fetch_failed' }, { status: 502 });
  }
}

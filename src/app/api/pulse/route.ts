/**
 * POST /api/pulse
 *
 * Accepts a target location and returns the full Pulse Report.
 * All orchestration lives in `src/lib/pulse-engine.ts` so both this route
 * and the conversational /api/pulse/scout route share the same pipeline.
 *
 * Request body: PulseRequest  { placeId?, lat, lng, name?, country? }
 * Response:     PulseReport   (HTTP 200) | { error: string } (HTTP 400/500)
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildPulseReport } from '@/lib/pulse-engine';
import type { PulseRequest } from '@/types/pulse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const lat = typeof raw['lat'] === 'number' ? raw['lat'] : parseFloat(String(raw['lat'] ?? ''));
  const lng = typeof raw['lng'] === 'number' ? raw['lng'] : parseFloat(String(raw['lng'] ?? ''));

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'Missing or invalid required fields: lat, lng' },
      { status: 400 },
    );
  }

  const pulseReq: PulseRequest = {
    placeId: typeof raw['placeId'] === 'string' ? raw['placeId'] : undefined,
    lat,
    lng,
    name: typeof raw['name'] === 'string' ? raw['name'] : undefined,
    country: typeof raw['country'] === 'string' ? raw['country'] : 'SGP',
  };

  try {
    const { report } = await buildPulseReport(pulseReq);
    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    console.error('[Pulse] Report generation failed:', err);
    return NextResponse.json({ error: 'report_generation_failed' }, { status: 500 });
  }
}

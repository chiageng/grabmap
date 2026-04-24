/**
 * POST /api/pulse/scout
 *
 * Conversational entry point. Parses a free-form scouting prompt, geocodes
 * the anchor, runs the Pulse fan-out with a STRICT category filter at 1km,
 * and returns a scouting advisory.
 *
 * Request body:  { prompt: string, country?: string }
 * Response:      { report: PulseReport, parse: ScoutParse, analysis: ScoutAnalysis }
 *
 * Key scout-specific engine options:
 *   competitorRadiusKm:    1.0   (vs 0.3 generic default)
 *   competitorCategories:  from Claude's parse
 *   strictCategoryFilter:  true  (no nearest-N fallback; only show matching POIs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildPulseReport } from '@/lib/pulse-engine';
import { parseScoutPrompt, generateScoutAdvice } from '@/lib/claude';
import { searchPlaces } from '@/lib/grabmaps';
import type { ScoutResponse, ScoutAnalysis } from '@/types/pulse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_PROMPT_LENGTH = 5;
const MAX_PROMPT_LENGTH = 500;
const COMPETITOR_RADIUS_KM = 1.0;

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
  const prompt = typeof raw['prompt'] === 'string' ? raw['prompt'].trim() : '';
  const country = typeof raw['country'] === 'string' ? raw['country'] : 'SGP';

  if (prompt.length < MIN_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt must be at least ${MIN_PROMPT_LENGTH} characters` },
      { status: 400 },
    );
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt must be at most ${MAX_PROMPT_LENGTH} characters` },
      { status: 400 },
    );
  }

  try {
    // 1. Parse the prompt into { businessType, categoryKeywords, locationQuery, intent }
    const parse = await parseScoutPrompt(prompt);

    // 2. Geocode the location anchor
    const candidates = await searchPlaces({
      keyword: parse.locationQuery,
      country,
      limit: 5,
    });

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error: 'location_not_found',
          detail: `Could not find a location matching "${parse.locationQuery}"`,
          parse,
        },
        { status: 404 },
      );
    }

    const anchor = candidates[0];

    // 3. Build the pulse report with scout-specific options.
    // The engine passes back `totalCompetitorsFound` (true match count before
    // capping at MAX_COMPETITORS) via the summarizer context, so the advisory
    // text uses the right number.
    const { report, totalCompetitorsFound, competitorRadiusKm } = await buildPulseReport({
      lat: anchor.lat,
      lng: anchor.lng,
      name: anchor.name,
      placeId: anchor.placeId,
      country,
      competitorRadiusKm: COMPETITOR_RADIUS_KM,
      competitorCategories: parse.categoryKeywords,
      strictCategoryFilter: true,
      summarizer: (r, ctx) =>
        generateScoutAdvice(r, parse, ctx.totalCompetitorsFound, ctx.competitorRadiusKm),
    });

    const analysis: ScoutAnalysis = {
      businessType: parse.businessType,
      anchorName: anchor.name,
      locationQuery: parse.locationQuery,
      competitorRadiusKm,
      totalCompetitorsFound,
      competitorsShown: report.competitors.length,
      categoryKeywords: parse.categoryKeywords,
    };

    const response: ScoutResponse = { report, parse, analysis };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error('[Scout] Report generation failed:', err);
    return NextResponse.json({ error: 'scout_generation_failed' }, { status: 500 });
  }
}

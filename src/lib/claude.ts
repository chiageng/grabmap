/**
 * Anthropic Claude wrapper — server-side only.
 *
 * Provides `generatePulseSummary` which accepts a PulseReport (without the
 * summary field populated) and returns a PulseSummary. If ANTHROPIC_API_KEY
 * is unset or the Claude call throws for any reason, a deterministic fallback
 * summary built from the report numbers is returned so the UI is never empty.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  PulseReport,
  PulseSummary,
  PulsePlace,
  PulseDensity,
  PulseCompetitor,
  PulseAccessibility,
} from '@/types/pulse';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 350;
const TEMPERATURE = 0.4;

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

/**
 * Builds a compact, structured prompt for Claude from the report data.
 * We deliberately keep it tight (< ~300 tokens of input) so the round-trip
 * stays fast and cheap. No marketing language — just the raw numbers.
 */
function buildUserPrompt(
  place: PulsePlace,
  density: PulseDensity,
  competitors: PulseCompetitor[],
  accessibility: PulseAccessibility,
): string {
  const topCompetitors = competitors
    .slice(0, 5)
    .map(
      (c) =>
        `  - ${c.name} (${c.category}, ${Math.round(c.distanceMeters)}m away${c.rating ? `, rated ${c.rating}` : ''})`,
    )
    .join('\n');

  const mrtLine = accessibility.nearestMrt
    ? `Nearest MRT: ${accessibility.nearestMrt.name} — ${accessibility.nearestMrt.walkingMinutes} min walk (${Math.round(accessibility.nearestMrt.walkingDistanceMeters)}m).`
    : 'No MRT data available.';

  const topCategories = density.categoryBreakdown
    .slice(0, 3)
    .map((c) => `${c.category} (${c.count})`)
    .join(', ');

  return `
Place: ${place.name}
Category: ${place.category}
Address: ${place.address}
Coordinates: ${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}
${place.rating !== undefined ? `Rating: ${place.rating}` : ''}

Density:
  - POIs within 300m: ${density.totalNearby300m}
  - Same-category POIs within 300m: ${density.sameCategoryNearby300m}
  - POIs within 1km: ${density.totalNearby1km}
  - Top nearby categories: ${topCategories || 'N/A'}

Nearby competitors (same/similar category):
${topCompetitors || '  None identified'}

Accessibility:
  ${mrtLine}
  Accessibility score: ${accessibility.score}/100

Write a 3–4 sentence intelligence briefing for a Southeast Asian SME operator considering this location. Use the exact numbers provided. Be direct, specific, and actionable.
`.trim();
}

const SYSTEM_PROMPT = `You are a concise location intelligence analyst specialising in Southeast Asia SME retail and F&B strategy.
Write in plain English. Be specific and actionable.
Do NOT invent statistics or facts not present in the data.
Do NOT use marketing language or generic phrases like "great location" or "vibrant area".
Stick strictly to the numbers given.
Context: Singapore/SEA SME operators who need honest, data-driven location insights.`;

// ---------------------------------------------------------------------------
// Fallback summary (deterministic, no AI)
// ---------------------------------------------------------------------------

function buildFallbackSummary(
  place: PulsePlace,
  density: PulseDensity,
  competitors: PulseCompetitor[],
  accessibility: PulseAccessibility,
): string {
  const mrtPart = accessibility.nearestMrt
    ? `Nearest MRT is ${accessibility.nearestMrt.name} (${accessibility.nearestMrt.walkingMinutes} min walk).`
    : 'No MRT station data was found nearby.';

  const competitorNames = competitors
    .slice(0, 3)
    .map((c) => c.name)
    .join(', ');

  const competitorPart =
    competitors.length > 0
      ? `Closest competitors include: ${competitorNames}.`
      : 'No same-category competitors were identified within the search radius.';

  return (
    `${place.name} sits in a cluster of ${density.totalNearby300m} POIs within 300m, ` +
    `${density.sameCategoryNearby300m} of which share your category. ` +
    `Within 1km there are ${density.totalNearby1km} points of interest. ` +
    `${mrtPart} ` +
    `${competitorPart} ` +
    `Accessibility score: ${accessibility.score}/100.`
  );
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

/**
 * Generates an AI-powered Pulse summary for a report.
 *
 * The `report` parameter is the full PulseReport but with `summary` field
 * expected to be overwritten by the caller — we only read the other fields.
 *
 * Returns a PulseSummary with `model` set to the Claude model used, or
 * undefined if the fallback was triggered.
 */
export async function generatePulseSummary(
  report: Omit<PulseReport, 'summary'>,
): Promise<PulseSummary> {
  const generatedAt = new Date().toISOString();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // If no API key is configured, return a deterministic fallback immediately.
  if (!apiKey) {
    return {
      text: buildFallbackSummary(
        report.place,
        report.density,
        report.competitors,
        report.accessibility,
      ),
      generatedAt,
      model: undefined,
    };
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(
            report.place,
            report.density,
            report.competitors,
            report.accessibility,
          ),
        },
      ],
    });

    // Extract text from the first content block
    const firstBlock = message.content[0];
    const text =
      firstBlock && firstBlock.type === 'text' ? firstBlock.text.trim() : '';

    if (!text) {
      throw new Error('Claude returned an empty response');
    }

    return { text, generatedAt, model };
  } catch (err) {
    console.error('[Claude] generatePulseSummary failed, using fallback:', err);
    return {
      text: buildFallbackSummary(
        report.place,
        report.density,
        report.competitors,
        report.accessibility,
      ),
      generatedAt,
      model: undefined,
    };
  }
}

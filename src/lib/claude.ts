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
  ScoutParse,
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

// ---------------------------------------------------------------------------
// Scout mode — conversational prompt parsing + scouting advice
// ---------------------------------------------------------------------------

const SCOUT_PARSE_SYSTEM = `You extract structured intent from a Southeast Asian SME operator's location-scouting question.
Respond ONLY with a JSON object matching this TypeScript type — no prose, no markdown, no code fences:

{
  "businessType": string,         // concise noun phrase that the operator wants to open, e.g. "chicken rice stall", "specialty cafe", "bubble tea shop", "nail salon", "bookstore", "dental clinic", "yoga studio"
  "categoryKeywords": string[],   // 6-10 lowercase keywords that are both:
                                  //   (a) likely to appear in Grab POI category strings for DIRECT competitors (e.g., "hawker", "coffee shop", "food court", "restaurant")
                                  //   (b) likely to appear in POI NAMES of direct competitors (e.g., "chicken rice", "boba")
                                  //
                                  // ALWAYS include umbrella category terms so food-court-style POIs like Koufu, Kopitiam, or FairPrice match. Examples:
                                  //   "chicken rice stall"  → ["chicken rice", "hawker", "food court", "coffee shop", "kopitiam", "restaurant", "eatery", "food"]
                                  //   "bubble tea shop"     → ["bubble tea", "boba", "tea", "beverage", "drink", "dessert", "cafe"]
                                  //   "specialty cafe"      → ["cafe", "coffee", "coffee shop", "bakery", "dessert", "restaurant", "food"]
                                  //   "nail salon"          → ["nail", "salon", "beauty", "manicure", "pedicure", "spa", "hair"]
                                  //   "bookstore"           → ["book", "bookstore", "stationery", "library", "gift shop"]
                                  //   "dental clinic"       → ["dental", "dentist", "clinic", "orthodont", "oral", "medical"]
                                  //   "convenience store"   → ["convenience", "mart", "minimart", "7-eleven", "supermarket", "grocery"]
                                  //
                                  // For F&B businesses ALWAYS include at least "food" and "food court" so umbrella POIs match.
                                  // Do NOT include generic standalone terms like "shop" or "business".
  "locationQuery": string,        // the anchor place to geocode, e.g. "Lavender MRT", "Bugis", "Tampines Mall"
  "intent": "scout" | "analyze" | "compare"
}`;

function fallbackScoutParse(prompt: string): ScoutParse {
  const p = prompt.toLowerCase();
  const match = p.match(/\b(?:near|around|at|close to|next to)\s+(.+?)(?:[.,?!]|$)/);
  const locationQuery = match ? match[1].trim() : 'Singapore';
  return {
    businessType: 'business',
    categoryKeywords: ['food', 'restaurant', 'shop'],
    locationQuery,
    intent: 'scout',
  };
}

/** Parses a user's free-form scouting prompt into a structured ScoutParse. */
export async function parseScoutPrompt(prompt: string): Promise<ScoutParse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackScoutParse(prompt);

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model,
      max_tokens: 400,
      temperature: 0,
      system: SCOUT_PARSE_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0];
    const text = block && block.type === 'text' ? block.text.trim() : '';
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleaned) as Partial<ScoutParse>;

    if (
      typeof parsed.businessType !== 'string' ||
      !Array.isArray(parsed.categoryKeywords) ||
      typeof parsed.locationQuery !== 'string'
    ) {
      throw new Error('Invalid ScoutParse shape');
    }

    const intent: ScoutParse['intent'] =
      parsed.intent === 'analyze' || parsed.intent === 'compare' ? parsed.intent : 'scout';

    return {
      businessType: parsed.businessType,
      categoryKeywords: parsed.categoryKeywords
        .filter((k): k is string => typeof k === 'string')
        .map((k) => k.toLowerCase().trim())
        .filter((k) => k.length > 0),
      locationQuery: parsed.locationQuery,
      intent,
    };
  } catch (err) {
    console.warn('[Claude] parseScoutPrompt failed, using heuristic fallback:', err);
    return fallbackScoutParse(prompt);
  }
}

const SCOUT_ADVICE_SYSTEM = `You are a location-scouting advisor for Southeast Asian SME operators.
Given a business concept, a target neighborhood, and concrete data about direct competitors within 1km, write a 5-7 sentence advisory covering:
  1. Clear viability verdict — "strong fit", "workable but competitive", or "risky / oversaturated"
  2. Direct competitor density analysis using the exact numbers provided
  3. Accessibility pros/cons (MRT walk time)
  4. One concrete positioning or differentiation suggestion tailored to the business type

Rules:
  - Use only the numbers provided. Never invent statistics, foot traffic, demographics, or open-dates.
  - Plain English, no marketing fluff, no generic phrases like "vibrant area".
  - Address the operator directly ("you", "your").
  - Start with the verdict sentence.`;

function buildScoutUserPrompt(
  parse: ScoutParse,
  place: PulsePlace,
  density: PulseDensity,
  competitors: PulseCompetitor[],
  accessibility: PulseAccessibility,
  totalCompetitorsFound: number,
  competitorRadiusKm: number,
): string {
  const topCompetitors = competitors
    .slice(0, 8)
    .map(
      (c) => `  - ${c.name} (${c.category}, ${Math.round(c.distanceMeters)}m away)`,
    )
    .join('\n');
  const mrtLine = accessibility.nearestMrt
    ? `Nearest MRT: ${accessibility.nearestMrt.name} — ${accessibility.nearestMrt.walkingMinutes} min walk (${accessibility.nearestMrt.walkingDistanceMeters}m).`
    : 'No MRT data available within 1km.';

  return `
Operator wants to open: ${parse.businessType}
Anchor location: ${parse.locationQuery}
Resolved to: ${place.name} — ${place.address} (${place.lat.toFixed(5)}, ${place.lng.toFixed(5)})

Category keywords used for direct-competitor match: ${parse.categoryKeywords.join(', ')}

Direct competitors within ${competitorRadiusKm}km (same business type):
  - Total matched: ${totalCompetitorsFound}
  - Nearest shown below:
${topCompetitors || '  None identified within search radius'}

Neighborhood density context:
  - Total POIs within 300m: ${density.totalNearby300m}
  - Total POIs within 1km: ${density.totalNearby1km}
  - Top nearby categories: ${density.categoryBreakdown.slice(0, 5).map((c) => `${c.category} (${c.count})`).join(', ') || 'N/A'}

Accessibility:
  ${mrtLine}
  Accessibility score: ${accessibility.score}/100

Write the advisory now.
`.trim();
}

function buildScoutFallback(
  parse: ScoutParse,
  place: PulsePlace,
  density: PulseDensity,
  competitors: PulseCompetitor[],
  accessibility: PulseAccessibility,
  totalCompetitorsFound: number,
  competitorRadiusKm: number,
): string {
  const verdict =
    totalCompetitorsFound >= 10
      ? `Risky — the ${competitorRadiusKm}km radius is oversaturated with ${totalCompetitorsFound} direct competitors in your ${parse.businessType} space.`
      : totalCompetitorsFound >= 4
        ? `Workable but competitive — ${totalCompetitorsFound} direct ${parse.businessType} competitors operate within ${competitorRadiusKm}km.`
        : totalCompetitorsFound >= 1
          ? `Promising fit — only ${totalCompetitorsFound} direct ${parse.businessType} competitors within ${competitorRadiusKm}km.`
          : `Strong opportunity — no direct ${parse.businessType} competitors identified within ${competitorRadiusKm}km.`;

  const mrtPart = accessibility.nearestMrt
    ? `Nearest MRT is ${accessibility.nearestMrt.name}, a ${accessibility.nearestMrt.walkingMinutes}-minute walk.`
    : 'No MRT station was found nearby.';

  const compNames = competitors.slice(0, 3).map((c) => c.name).join(', ');
  const compLine = competitors.length > 0 ? `Closest competitors: ${compNames}.` : '';

  return (
    `${verdict} ` +
    `Near ${place.name} there are ${density.totalNearby1km} POIs within 1km total. ` +
    `${mrtPart} ${compLine} ` +
    `Accessibility score is ${accessibility.score}/100.`
  );
}

/**
 * Generates scouting-focused advisory text. Returns a PulseSummary so it drops
 * into the existing PulseReport UI without structural changes.
 */
export async function generateScoutAdvice(
  report: Omit<PulseReport, 'summary'>,
  parse: ScoutParse,
  totalCompetitorsFound: number,
  competitorRadiusKm: number,
): Promise<PulseSummary> {
  const generatedAt = new Date().toISOString();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      text: buildScoutFallback(
        parse,
        report.place,
        report.density,
        report.competitors,
        report.accessibility,
        totalCompetitorsFound,
        competitorRadiusKm,
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
      max_tokens: 600,
      temperature: 0.4,
      system: SCOUT_ADVICE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: buildScoutUserPrompt(
            parse,
            report.place,
            report.density,
            report.competitors,
            report.accessibility,
            totalCompetitorsFound,
            competitorRadiusKm,
          ),
        },
      ],
    });
    const block = message.content[0];
    const text = block && block.type === 'text' ? block.text.trim() : '';
    if (!text) throw new Error('Empty scout response');
    return { text, generatedAt, model };
  } catch (err) {
    console.error('[Claude] generateScoutAdvice failed, using fallback:', err);
    return {
      text: buildScoutFallback(
        parse,
        report.place,
        report.density,
        report.competitors,
        report.accessibility,
        totalCompetitorsFound,
        competitorRadiusKm,
      ),
      generatedAt,
      model: undefined,
    };
  }
}

/**
 * Anthropic Claude wrapper — server-side only.
 *
 * Provides two summarizers that both return a structured PulseSummary
 * (verdict + 4 sections) so the UI can render section-by-section cards:
 *   - generatePulseSummary: generic report for a known location
 *   - generateScoutAdvice:  scouting advice for a "should I open X here?" prompt
 *
 * Both are defensive: if ANTHROPIC_API_KEY is unset or Claude fails/returns
 * malformed JSON, a deterministic fallback is produced from the raw numbers
 * so the UI is never empty.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  PulseReport,
  PulseSummary,
  PulseSummarySection,
  PulseSummaryVerdict,
  PulseSectionTone,
  PulsePlace,
  PulseDensity,
  PulseCompetitor,
  PulseAccessibility,
  ScoutParse,
} from '@/types/pulse';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 900;
const TEMPERATURE = 0.3;

const SECTION_TITLES = {
  competition: 'Competitive Landscape',
  accessibility: 'Accessibility & Reach',
  neighborhood: 'Neighborhood Mix',
  recommendation: 'Recommendation',
} as const;

// ---------------------------------------------------------------------------
// Helpers — defensive JSON parsing + text derivation
// ---------------------------------------------------------------------------

const VALID_TONES: readonly PulseSectionTone[] = [
  'positive',
  'neutral',
  'warning',
  'danger',
];

function normaliseTone(v: unknown): PulseSectionTone {
  if (typeof v === 'string') {
    const t = v.toLowerCase().trim() as PulseSectionTone;
    if (VALID_TONES.includes(t)) return t;
  }
  return 'neutral';
}

function normaliseSection(v: unknown): PulseSummarySection | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  const body = typeof o.body === 'string' ? o.body.trim() : '';
  if (!title || !body) return null;
  return { title, body, tone: normaliseTone(o.tone) };
}

function normaliseVerdict(v: unknown): PulseSummaryVerdict | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const label = typeof o.label === 'string' ? o.label.trim() : '';
  if (!label) return undefined;
  return { label, tone: normaliseTone(o.tone) };
}

function tryParseJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  return JSON.parse(cleaned);
}

/** Concatenation of verdict + sections for preview/share/export. */
function flattenToText(
  verdict: PulseSummaryVerdict | undefined,
  sections: PulseSummarySection[],
): string {
  const parts: string[] = [];
  if (verdict) parts.push(`${verdict.label}.`);
  for (const s of sections) {
    parts.push(`${s.title}: ${s.body}`);
  }
  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Structured prompt builders — both shared and mode-specific helpers
// ---------------------------------------------------------------------------

function buildContextBlock(
  place: PulsePlace,
  density: PulseDensity,
  competitors: PulseCompetitor[],
  accessibility: PulseAccessibility,
): string {
  const topCompetitors = competitors
    .slice(0, 8)
    .map(
      (c) =>
        `  - ${c.name} (${c.category}, ${Math.round(c.distanceMeters)}m away${c.rating ? `, rated ${c.rating}` : ''})`,
    )
    .join('\n');
  const mrtLine = accessibility.nearestMrt
    ? `Nearest MRT: ${accessibility.nearestMrt.name} — ${accessibility.nearestMrt.walkingMinutes} min walk (${accessibility.nearestMrt.walkingDistanceMeters}m).`
    : 'No MRT data available within 1km.';
  const topCategories = density.categoryBreakdown
    .slice(0, 5)
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
`.trim();
}

const JSON_SCHEMA_DOC = `Return ONLY a JSON object matching this TypeScript type — no prose, no markdown, no code fences:

{
  "verdict": { "label": string, "tone": "positive" | "neutral" | "warning" | "danger" },
  "sections": [
    { "title": "${SECTION_TITLES.competition}",   "body": string, "tone": "positive" | "neutral" | "warning" | "danger" },
    { "title": "${SECTION_TITLES.accessibility}", "body": string, "tone": "positive" | "neutral" | "warning" | "danger" },
    { "title": "${SECTION_TITLES.neighborhood}",  "body": string, "tone": "positive" | "neutral" | "warning" | "danger" },
    { "title": "${SECTION_TITLES.recommendation}","body": string, "tone": "positive" | "neutral" | "warning" | "danger" }
  ]
}

Rules:
  - Exactly 4 sections in that order with those exact titles.
  - Each body is 2-4 sentences of plain English. No markdown inside bodies.
  - Use ONLY the numbers provided. Never invent statistics, demographics, foot traffic, or open-dates.
  - Address the operator directly ("you", "your") where it reads natural.
  - Pick the tone that matches the section content:
      "positive" = advantageous finding
      "neutral"  = factual / descriptive
      "warning"  = cautionary but not blocking
      "danger"   = significant concern
  - Verdict label is 1-4 words (e.g. "Strong fit", "Workable but competitive", "Oversaturated", "Quiet location").`;

// ---------------------------------------------------------------------------
// Generic PulseSummary — "what is this place like commercially"
// ---------------------------------------------------------------------------

const PULSE_SYSTEM = `You are a location intelligence analyst for Southeast Asia SME retail and F&B.
You are given concrete data about a specific place and its neighborhood.
Write a structured briefing that helps an operator understand the commercial character of this location.

${JSON_SCHEMA_DOC}

Section content guide for this (generic) mode:
  1. Competitive Landscape — describe same-category competitor density + the closest named ones. Quote numbers.
  2. Accessibility & Reach — describe MRT / walkability, and what the ${SECTION_TITLES.accessibility.toLowerCase()} score implies.
  3. Neighborhood Mix — describe the dominant POI categories nearby and what kind of neighborhood this is (office, F&B cluster, residential, mixed).
  4. Recommendation — what this pattern means for an operator already at this location (hours, menu, positioning).

Verdict label should be a short commercial snapshot phrase (e.g. "Dense F&B cluster", "Quiet office tower", "Mixed retail hub").`;

function fallbackPulseSummary(
  place: PulsePlace,
  density: PulseDensity,
  competitors: PulseCompetitor[],
  accessibility: PulseAccessibility,
  generatedAt: string,
): PulseSummary {
  const dominant = density.categoryBreakdown[0]?.category ?? 'mixed';
  const verdict: PulseSummaryVerdict = {
    label:
      density.totalNearby1km >= 60
        ? `Dense ${dominant} cluster`
        : density.totalNearby1km >= 20
          ? `Active ${dominant} area`
          : 'Quiet location',
    tone: 'neutral',
  };

  const closestNames = competitors
    .slice(0, 3)
    .map((c) => `${c.name} (${Math.round(c.distanceMeters)}m)`)
    .join(', ');

  const sections: PulseSummarySection[] = [
    {
      title: SECTION_TITLES.competition,
      body:
        competitors.length === 0
          ? `No same-category competitors were identified within the search radius. Within 300m there are ${density.totalNearby300m} POIs total, ${density.sameCategoryNearby300m} of which share your category.`
          : `Within 300m there are ${density.totalNearby300m} POIs, ${density.sameCategoryNearby300m} sharing your category. Closest named competitors: ${closestNames}.`,
      tone:
        density.sameCategoryNearby300m >= 6
          ? 'warning'
          : density.sameCategoryNearby300m >= 3
            ? 'neutral'
            : 'positive',
    },
    {
      title: SECTION_TITLES.accessibility,
      body: accessibility.nearestMrt
        ? `Nearest MRT is ${accessibility.nearestMrt.name}, a ${accessibility.nearestMrt.walkingMinutes}-minute walk (${accessibility.nearestMrt.walkingDistanceMeters}m). Accessibility score is ${accessibility.score}/100 based on transit proximity and local cluster density.`
        : `No MRT station was found within 1km. Accessibility score is ${accessibility.score}/100, driven entirely by local cluster density since transit reach is weak.`,
      tone:
        accessibility.score >= 70
          ? 'positive'
          : accessibility.score >= 40
            ? 'neutral'
            : 'warning',
    },
    {
      title: SECTION_TITLES.neighborhood,
      body: `Within 1km there are ${density.totalNearby1km} points of interest. The dominant categories nearby are ${
        density.categoryBreakdown
          .slice(0, 3)
          .map((c) => `${c.category} (${c.count})`)
          .join(', ') || 'mixed'
      }.`,
      tone: 'neutral',
    },
    {
      title: SECTION_TITLES.recommendation,
      body:
        density.sameCategoryNearby300m >= 5
          ? 'Competition within 300m is high — differentiate on menu, pricing, or hours rather than going head-to-head.'
          : density.totalNearby1km < 20
            ? 'Low surrounding density suggests dependence on destination traffic. Consider delivery and loyalty programs to offset limited walk-in volume.'
            : 'Moderate local density — standard retail hours and menu should perform normally. Lean into whatever the dominant nearby category brings in foot traffic.',
      tone: 'neutral',
    },
  ];

  return {
    text: flattenToText(verdict, sections),
    verdict,
    sections,
    generatedAt,
    model: undefined,
  };
}

export async function generatePulseSummary(
  report: Omit<PulseReport, 'summary'>,
): Promise<PulseSummary> {
  const generatedAt = new Date().toISOString();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return fallbackPulseSummary(
      report.place,
      report.density,
      report.competitors,
      report.accessibility,
      generatedAt,
    );
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: PULSE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: buildContextBlock(
            report.place,
            report.density,
            report.competitors,
            report.accessibility,
          ),
        },
      ],
    });

    const block = message.content[0];
    const text = block && block.type === 'text' ? block.text : '';
    if (!text.trim()) throw new Error('Empty response from Claude');

    const parsed = tryParseJson(text) as Record<string, unknown>;
    const verdict = normaliseVerdict(parsed.verdict);
    const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
    const sections = rawSections
      .map(normaliseSection)
      .filter((s): s is PulseSummarySection => s !== null);

    if (sections.length === 0) throw new Error('No valid sections in response');

    return {
      text: flattenToText(verdict, sections),
      verdict,
      sections,
      generatedAt,
      model,
    };
  } catch (err) {
    console.error('[Claude] generatePulseSummary failed, using fallback:', err);
    return fallbackPulseSummary(
      report.place,
      report.density,
      report.competitors,
      report.accessibility,
      generatedAt,
    );
  }
}

// ---------------------------------------------------------------------------
// Scout parse — prompt → structured intent
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
    const parsed = tryParseJson(text) as Partial<ScoutParse>;

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

// ---------------------------------------------------------------------------
// Scout advice — "should I open X here?"
// ---------------------------------------------------------------------------

const SCOUT_SYSTEM = `You are a location-scouting advisor for Southeast Asian SME operators.
An operator wants to open a specific business type at a specific neighborhood. You have concrete data about direct competitors and the surrounding POIs.

${JSON_SCHEMA_DOC}

Section content guide for this (scout) mode:
  1. ${SECTION_TITLES.competition} — number of direct competitors within the 1km radius, naming the closest 2-3 and their distances. Call out saturation level.
  2. ${SECTION_TITLES.accessibility} — MRT walk time, what that means for a ${SECTION_TITLES.accessibility.toLowerCase()} perspective of the business type.
  3. ${SECTION_TITLES.neighborhood} — the dominant POI categories around. What crowd does this neighborhood pull (office workers, shoppers, residents)? Stick to what the categories imply.
  4. ${SECTION_TITLES.recommendation} — one concrete positioning or differentiation suggestion tailored to the business type and the competitive reality above.

Verdict label should be an actionable scouting call, e.g. "Strong fit", "Workable but competitive", "Oversaturated", "Risky opening", "Limited upside".
Verdict tone: positive if viable, neutral if mixed, warning if competitive, danger if heavily saturated or poorly served.`;

function buildScoutContextBlock(
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
`.trim();
}

function fallbackScoutSummary(
  parse: ScoutParse,
  place: PulsePlace,
  density: PulseDensity,
  competitors: PulseCompetitor[],
  accessibility: PulseAccessibility,
  totalCompetitorsFound: number,
  competitorRadiusKm: number,
  generatedAt: string,
): PulseSummary {
  const verdict: PulseSummaryVerdict =
    totalCompetitorsFound >= 10
      ? { label: 'Oversaturated', tone: 'danger' }
      : totalCompetitorsFound >= 4
        ? { label: 'Workable but competitive', tone: 'warning' }
        : totalCompetitorsFound >= 1
          ? { label: 'Promising fit', tone: 'positive' }
          : { label: 'Strong opportunity', tone: 'positive' };

  const closestNames = competitors
    .slice(0, 3)
    .map((c) => `${c.name} (${Math.round(c.distanceMeters)}m)`)
    .join(', ');

  const sections: PulseSummarySection[] = [
    {
      title: SECTION_TITLES.competition,
      body:
        totalCompetitorsFound === 0
          ? `No direct ${parse.businessType} competitors were found within ${competitorRadiusKm}km of ${place.name}. This is unusually clear — verify demand through foot-traffic observation before committing.`
          : `${totalCompetitorsFound} direct ${parse.businessType} competitor${totalCompetitorsFound === 1 ? '' : 's'} operate within ${competitorRadiusKm}km. Closest: ${closestNames || 'n/a'}.`,
      tone: verdict.tone,
    },
    {
      title: SECTION_TITLES.accessibility,
      body: accessibility.nearestMrt
        ? `${accessibility.nearestMrt.name} is ${accessibility.nearestMrt.walkingMinutes} min walk away. Accessibility score is ${accessibility.score}/100 — transit-anchored footfall should support a ${parse.businessType}.`
        : `No MRT within 1km. Accessibility score is ${accessibility.score}/100. Expect dependence on local/destination traffic rather than transit pass-through.`,
      tone:
        accessibility.score >= 70
          ? 'positive'
          : accessibility.score >= 40
            ? 'neutral'
            : 'warning',
    },
    {
      title: SECTION_TITLES.neighborhood,
      body: `Within 1km of ${place.name} there are ${density.totalNearby1km} POIs. Dominant categories: ${
        density.categoryBreakdown
          .slice(0, 3)
          .map((c) => `${c.category} (${c.count})`)
          .join(', ') || 'mixed'
      }.`,
      tone: 'neutral',
    },
    {
      title: SECTION_TITLES.recommendation,
      body:
        totalCompetitorsFound >= 10
          ? `Don't compete head-on. If you open a ${parse.businessType} here, differentiate on a specific angle — unique dish, extended hours, delivery specialization — or consider a less saturated nearby zone.`
          : totalCompetitorsFound >= 4
            ? `Entry is possible but margins will be tight. Lock down a positioning angle (price, niche, hours) before signing a lease.`
            : `Limited direct competition means lower head-to-head risk. Validate demand signals (visible foot traffic, nearby anchor tenants) before opening.`,
      tone: 'neutral',
    },
  ];

  return {
    text: flattenToText(verdict, sections),
    verdict,
    sections,
    generatedAt,
    model: undefined,
  };
}

export async function generateScoutAdvice(
  report: Omit<PulseReport, 'summary'>,
  parse: ScoutParse,
  totalCompetitorsFound: number,
  competitorRadiusKm: number,
): Promise<PulseSummary> {
  const generatedAt = new Date().toISOString();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return fallbackScoutSummary(
      parse,
      report.place,
      report.density,
      report.competitors,
      report.accessibility,
      totalCompetitorsFound,
      competitorRadiusKm,
      generatedAt,
    );
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: SCOUT_SYSTEM,
      messages: [
        {
          role: 'user',
          content: buildScoutContextBlock(
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
    const text = block && block.type === 'text' ? block.text : '';
    if (!text.trim()) throw new Error('Empty scout response');

    const parsed = tryParseJson(text) as Record<string, unknown>;
    const verdict = normaliseVerdict(parsed.verdict);
    const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
    const sections = rawSections
      .map(normaliseSection)
      .filter((s): s is PulseSummarySection => s !== null);

    if (sections.length === 0) throw new Error('No valid sections in scout response');

    return {
      text: flattenToText(verdict, sections),
      verdict,
      sections,
      generatedAt,
      model,
    };
  } catch (err) {
    console.error('[Claude] generateScoutAdvice failed, using fallback:', err);
    return fallbackScoutSummary(
      parse,
      report.place,
      report.density,
      report.competitors,
      report.accessibility,
      totalCompetitorsFound,
      competitorRadiusKm,
      generatedAt,
    );
  }
}

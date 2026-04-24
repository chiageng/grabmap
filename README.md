# PlacePulse

> **Hackathon Track: Smarter Places**
> AI-powered location intelligence for Southeast Asian SMEs — built on GrabMaps.
>
> **🌐 Live Demo: [grabmap.vercel.app](https://grabmap.vercel.app/)**

Walk into any kopitiam, salon, or family-run shop in Singapore and ask the owner *"how is your location actually performing?"*. Most will tell you about their own sales. Almost none can answer *"how many competitors opened near me this year?"*, *"what's the real accessibility score of this block?"*, or *"if I open here versus there, which wins?"*.

Enterprise chains — Koufu, FairPrice, McDonald's — have in-house analyst teams answering these questions every week. A hawker auntie opening her second stall has herself, a phone, and a spreadsheet.

**PlacePulse is the analyst team SMEs can't afford**, delivered in 30 seconds from a browser. It turns GrabMaps' raw POI network into a structured, AI-summarised location advisory for anyone scouting a new shop location.

---

## The Problem → The Solution

| Question an SME owner can't answer | How PlacePulse answers it |
|---|---|
| "How saturated is this area for my business?" | Keyword-driven competitor search over a 1km radius + strict category filter |
| "Who are my direct competitors, ranked by relevance?" | Relevance score combining category match, name match, distance, rating |
| "Is this location a good idea, on a scale of 0–100?" | Recommendation Score with transparent 4-factor breakdown |
| "Where are the quieter pockets nearby I should scout instead?" | Competitor-only heatmap — cold zones = opportunity gaps |
| "Option A vs Option B — which do I pick?" | Side-by-side comparison panels with dual heatmaps on one map |
| "How do I get there to see it myself?" | In-app route rendering + Google Maps + Grab ride deep links |

---

## Key Features

### 1. Conversational AI Scouting
Type natural language like *"I want to build a chicken rice shop near Lavender MRT"*. Claude parses it into `{ businessType, categoryKeywords, locationQuery, intent }`, GrabMaps geocodes the anchor, and the engine fans out a category-strict competitor search.

### 2. Structured Pulse Report (7 sections)
Every location analysis returns a polished report panel:

- **Place Identity** — name, category, address, external-nav buttons
- **Recommendation Score** — 0–100 with sub-score breakdown
- **Density** — POIs in 300m / 1km + top 5 category breakdown
- **Competitor Radar** — relevance-ranked, expandable full list with relevance bars
- **Accessibility Score** — nearest MRT walk time + 0–100 score
- **AI Pulse Report** — verdict + 4 structured sections (Competitive Landscape / Accessibility & Reach / Neighborhood Mix / Recommendation), tone-coloured per section
- **Share as PNG** — html-to-image export for field briefings

### 3. Recommendation Score (0–100)
Weighted composite with a transparent breakdown:

| Factor | Weight | Meaning |
|---|---|---|
| Competition | 40% | Fewer direct competitors in 1km → higher |
| Accessibility | 30% | MRT proximity + cluster density |
| Demand | 20% | Total POIs in 1km (foot-traffic proxy) |
| Diversity | 10% | Variety of nearby POI categories |

Verdict mapping: 75+ Highly recommended · 55+ Recommended · 35+ Consider carefully · 15+ Not recommended · <15 Avoid.

### 4. Relevance-Ranked Competitor List
Instead of just "nearest N", competitors are sorted by a weighted relevance formula (category match + name match + distance + rating). Example: for "chicken rice near Lavender MRT", **Wow Chicken Rice at 53m ranks #1**, while McDonald's at 23m ranks #7 — correct, because McDonald's isn't a chicken rice competitor. The full list is browsable via a *Show all N* toggle.

### 5. Competitor Density Heatmap
Scout mode renders a red/orange heatmap **of matched competitors only** (not all POIs). Cold zones indicate opportunity gaps. Users can tap any cold spot on the map to re-run analysis at that point.

### 6. Side-by-Side Location Comparison
After running one scout, click **+ Compare location** to analyse the same business type at a second location. Two full report panels render side-by-side; the map shows both anchors with numbered pins (① green, ② blue) and **two distinct-coloured heatmaps** so users can visually compare density at a glance.

### 7. Navigation — Three Modes
- **In-app route**: full polyline rendered on the MapLibre map with distance + ETA chip
- **Google Maps**: universal deep link, works on any platform for turn-by-turn
- **Grab ride**: `grab://` deep link that books a ride to the location in the Grab app

### 8. Conversational AI with Structured JSON Output
Claude outputs strict JSON for both:
- Prompt parsing (`{ businessType, categoryKeywords, locationQuery, intent }`)
- Report sections (`{ verdict: { label, tone }, sections: [{ title, body, tone }, ...] }`)

Both paths have **defensive parsers** + **deterministic fallbacks** so the UI is never empty even if Anthropic is down.

---

## GrabMaps API Integration — Deep & Meaningful

PlacePulse uses **six GrabMaps endpoints** across every user flow. Not a shallow "call one API" integration — the whole product is built around GrabMaps' POI network and tile infrastructure.

| Endpoint | Where it's used | Purpose |
|---|---|---|
| `GET /api/style.json` | `useGrabMapStyle` hook | MapLibre base style (Bearer auth required) |
| `GET /api/maps/tiles/v2/vector/karta-v3/{z}/{x}/{y}.pbf` | Rendered via MapLibre | Street/road vector tiles |
| `GET /api/maps/tiles/v2/vector/internal-poi-v3/{z}/{x}/{y}.pbf` | Rendered via MapLibre | POI vector tiles |
| `GET /api/maps/tiles/v2/styles/urban-light/sprite*` | Rendered via MapLibre | Icon + font atlas for symbols |
| `GET /api/maps/tiles/v2/fonts/{fontstack}/{range}.pbf` | Rendered via MapLibre | Glyphs for text rendering |
| `GET /api/v1/maps/poi/v1/search` | Autocomplete + geocode anchor + competitor keyword searches | Keyword POI search with location bias |
| `GET /api/v1/maps/place/v2/nearby` | Density counts + competitor pool | Nearby POI retrieval (radius + limit) |
| `GET /api/v1/maps/poi/v1/reverse-geo` | Dropped-pin place resolution | Reverse geocode a lat/lng |
| `GET /api/v1/maps/eta/v1/direction` | Accessibility walk time + user navigation | Route geometry + distance + duration |

### Engineering notes on the GrabMaps integration

- **Same-origin proxy** for all tile/sprite/glyph/style requests to bypass CORS issues on localhost while keeping the API key server-side (`/api/map-proxy/[...path]`)
- **OSRM polyline6 decoder** implemented inline to convert Grab's route geometry into MapLibre-ready GeoJSON LineStrings
- **Quirk handling** — Grab's `style.json` returns tile URLs under `/maps/tiles/...` while the actual tile endpoint only serves `/api/maps/tiles/...`; the proxy normalises this automatically
- **Multi-source competitor pool** — parallel `nearbyPlaces(1km, limit=100)` + one `searchPlaces` per parsed category keyword, deduplicated by placeId/coords, filtered by haversine distance. This solves the 50-POI limit that would otherwise miss competitors beyond 200m in dense areas
- **Defensive response parsing** — Grab's `/nearby` uses `categories[].category_name` while `/search` uses `business_type` + `category`; our normaliser harvests both so every POI has a usable category string
- **Heatmap client-side filtering** — Grab doesn't strictly enforce the `radius` param; we post-filter with haversine so `totalNearby300m` actually means within 300m

---

## Architecture

```
Client (Next.js 15, React 19, Antd 5, MapLibre GL)
├── /                        Full-screen map + PulseReport panel(s)
│   ├── MapView              Grab tiles, markers, heatmaps, route
│   ├── PlaceSearch          Debounced autocomplete
│   ├── ScoutPrompt          AI prompt modal (initial + compare)
│   ├── NavigateButton       In-app routing modal
│   └── PulseReport          Responsive panel with 7 sections
└── /api/
    ├── /pulse               POST — generic location analysis
    ├── /pulse/scout         POST — conversational AI scout
    ├── /places/search       GET  — autocomplete proxy
    ├── /directions          GET  — route geometry + distance + duration
    └── /map-proxy/[...path] GET  — catch-all proxy for Grab tiles/sprites/glyphs/style

Server-side libraries
├── lib/grabmaps.ts          Defensive HTTP client for GrabMaps (never throws, normalises inconsistent shapes)
├── lib/pulse-engine.ts      Shared fan-out + scoring engine used by both /pulse and /pulse/scout
├── lib/claude.ts            Prompt parsing + structured JSON report generation with fallbacks
└── lib/nav-links.ts         Google Maps + Grab deep-link URL builders

External services
├── GrabMaps API             Primary data source
└── Anthropic Claude         Natural language parsing + advisory generation (claude-sonnet-4-6)
```

---

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript 5
- **UI**: Ant Design 5 with custom Grab-green theme
- **State**: TanStack Query v5 for server state + caching
- **Map**: MapLibre GL 5 rendering GrabMaps vector tiles
- **AI**: Anthropic SDK (`claude-sonnet-4-6`)
- **Export**: html-to-image for PNG share

---

## Quick Start

1. Clone and install:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local`, fill in:
   ```
   GRABMAPS_API_KEY=bm_...           # server-side (required)
   NEXT_PUBLIC_GRABMAPS_API_KEY=bm_... # client-side (same key)
   ANTHROPIC_API_KEY=sk-ant-...       # optional — falls back to deterministic summaries
   ANTHROPIC_MODEL=claude-sonnet-4-6
   ```

3. Run:
   ```bash
   npm run dev    # http://localhost:3000
   ```

4. Try these prompts in the **⚡ Ask AI** button:
   - *"I want to build a chicken rice shop near Lavender MRT, help me analyse the competitors"*
   - *"Looking to start a bubble tea shop around Orchard — too saturated?"*
   - *"Thinking of a nail salon near Tampines Mall"*

---

## Graceful Degradation — Nothing Blocks the Demo

| Failure | Fallback |
|---|---|
| No `GRABMAPS_API_KEY` | Map renders OSM raster tiles; analysis returns empty data with graceful error |
| No `ANTHROPIC_API_KEY` | Deterministic section-structured summary built from the raw numbers |
| Claude returns malformed JSON | Heuristic prompt parser + deterministic summary |
| GrabMaps nearby endpoint returns inconsistent shapes | Defensive parser harvests all category/coord variants |
| Browser denies geolocation | Navigation modal falls back to typed origin via PlaceSearch |
| One Grab endpoint is slow | `Promise.allSettled` fans out — one stuck call can't block the whole report |

---

## Extensibility — What Ships Next

The architecture is designed so the next wave of features plugs into existing contracts:

### Auto-suggest alternative locations (next sprint)
The `pulse-engine.ts` already returns the full competitor pool. Add a grid scorer that samples points in a 150m grid around the anchor, scores each by `demand − 2 × competition`, and returns the top 3 ranked pins. `MapView` already supports drop-in markers. Estimated: 2 hours.

### PDF export for site visits
`ShareButton` uses html-to-image. Swap to `jsPDF` and the Pulse Report becomes a printable field briefing. Estimated: 1 hour.

### Historical snapshots
Add a Postgres/SQLite layer that persists every PulseReport by (lat, lng, timestamp). Over time, the system can show *"6 months ago this area had 8 chicken rice shops, now it has 14"* — solving the one real data gap we currently simulate. Estimated: 1 day.

### Multi-city Southeast Asia support
All GrabMaps endpoints accept country codes. The only SG-specific code is `NEXT_PUBLIC_DEFAULT_COUNTRY=SGP` + default lat/lng. A country-selector UI unlocks KL, Jakarta, Manila, Bangkok. Estimated: 3 hours.

### SME conversion learning loop
The recommendation weights (40/30/20/10) are priors. With user feedback ("I opened here and it worked / failed"), the weights should update. Estimated: 1 sprint.

### Voice-based scouting (mobile)
Web Speech API → transcribe into the existing scout prompt input → everything downstream works unchanged. Estimated: 4 hours.

### B2B dashboard
Save scouted locations, track multi-site operators, alert when a new competitor opens near a saved spot. The core `PulseReport` + `/api/pulse` infrastructure already supports this; it's a UI + auth layer. Estimated: 1 week.

## Credits

Built for the Grab Hackathon — Smarter Places track. Powered by GrabMaps + Anthropic Claude.

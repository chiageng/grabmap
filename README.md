# PlacePulse

Live location-intelligence briefings for any place in Southeast Asia — powered by GrabMaps.

Drop a pin or search a business, and PlacePulse fans out GrabMaps calls (POI, nearby, walking directions, MRT) and returns a one-page Pulse Report: density stats, competitor radar, accessibility score, and an AI-generated briefing.

## Stack

- **Next.js 15** (App Router, React 19)
- **Ant Design 5** with a Grab-green theme
- **TanStack Query** for server state
- **MapLibre GL** with GrabMaps tiles (OSM fallback if no key)
- **Anthropic SDK** for the AI Pulse Summary (fallback deterministic summary if no key)

## Setup

1. Copy env example:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in keys:
   - `NEXT_PUBLIC_GRABMAPS_API_KEY` / `GRABMAPS_API_KEY` — your `bm_…` GrabMaps key. If blank, the map falls back to OSM raster tiles and POI/routing calls fail gracefully.
   - `ANTHROPIC_API_KEY` — optional; if blank, the Pulse Summary returns a deterministic fallback.

3. Install & run:
   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — dev server on :3000 (Turbopack)
- `npm run build` — production build (webpack — Turbopack build has a known collector bug in this Next version)
- `npm run start` — run the production build
- `npm run lint` — ESLint
- `npm run gen-client` — regenerate the backend OpenAPI client at `src/client/` (requires the FastAPI backend on :8000)

## Architecture

```
src/
├── app/
│   ├── page.tsx                        # Home: MapView + PulseReport + portal PlaceSearch
│   ├── layout.tsx                      # Providers + AppLayout shell
│   └── api/
│       ├── pulse/route.ts              # POST orchestrator (parallel GrabMaps fan-out + Claude)
│       └── places/search/route.ts      # GET autocomplete proxy
├── components/
│   ├── AppLayout.tsx                   # Top nav with logo + #pp-search-slot portal target
│   ├── MapView.tsx                     # MapLibre + Grab tiles, markers, heatmap, MRT line
│   ├── PlaceSearch.tsx                 # Debounced autocomplete
│   ├── PulseReport.tsx                 # Responsive side panel / bottom sheet
│   └── pulse/                          # Report sub-components (identity, density, radar, etc.)
├── hooks/
│   ├── usePulseReport.ts               # TanStack query wrapper for /api/pulse
│   └── useGrabMapStyle.ts              # Bearer-authed style.json fetch + OSM fallback
├── lib/
│   ├── grabmaps.ts                     # Server-side GrabMaps HTTP client (defensive parsing)
│   └── claude.ts                       # Claude summariser with deterministic fallback
└── types/pulse.ts                      # Shared contract for the Pulse Report
```

## Request flow

1. User searches, taps the map, or clicks a competitor marker.
2. `src/app/page.tsx` builds a `PulseRequest` and passes it to `usePulseReport`.
3. The hook POSTs to `/api/pulse`, which fans out in parallel:
   - Nearby 300 m (density + direct competitors)
   - Nearby 1 km (broader context + heatmap)
   - Keyword search `"MRT"` → nearest transit
   - Walking directions target → nearest MRT
4. Server calls Claude for the AI Pulse Summary, then returns the assembled `PulseReport`.
5. MapView consumes the same cached data (TanStack dedupes) to render heatmap + markers + MRT line.

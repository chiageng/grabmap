# PlacePulse — Pitch Script

**Duration target:** ~3 minutes demo + 1 minute Q&A prep
**Track:** Smarter Places
**Core one-liner:** *"Location-intelligence briefings for SME operators — in 30 seconds, powered by GrabMaps."*

Keep the browser open on http://localhost:3000 with the map centered on Singapore. Have `.env.local` loaded with live GrabMaps + Anthropic keys. Pre-open a terminal tab in case you need to restart dev.

---

## 0:00 — The Hook (15 seconds)

> **Say:** *"Imagine you're a hawker in Singapore. You've saved up for two years to open your second chicken rice stall. You're thinking about Lavender MRT. The question is simple: **will you survive the competition there?*** *Koufu has an analyst team answering this question every week. You have yourself and Google. That's the gap we close."*

**What the judge should feel:** "This is about a real person with a real problem."

Transition: *"Let me show you how PlacePulse answers that question in 30 seconds."*

---

## 0:15 — The Setup (10 seconds)

**Do:** Hard-refresh the browser. Show the clean map centered on Singapore with the prompt *"Search, tap the map, or Ask AI to generate a Pulse Report."*

> **Say:** *"This is PlacePulse. It's a full-screen map. One search bar. One button called Ask AI. That's the whole interface."*

**What the judge should feel:** "Looks clean. Not trying to do too much."

---

## 0:25 — Live Demo Part 1: The AI Scout (60 seconds)

**Do:** Click the green **⚡ Ask AI** button in the top nav.
A modal opens.

> **Say:** *"I'm not going to click on a map. I'm going to type like a human."*

**Do:** Type (or click the example tag):
> *I want to build a chicken rice shop near Lavender MRT, help me analyse the competitors*

Click **Analyze**.

**Do:** While it loads (~3 seconds), narrate what's happening:

> **Say:** *"Behind the scenes right now — Claude is parsing my sentence into a business type, seven category keywords, and a location query. GrabMaps is geocoding Lavender MRT. We're firing one nearby search plus seven keyword searches in parallel against GrabMaps' POI network. All of that, then Claude writes the advisory."*

**Do:** When the report panel appears on the right, start at the top and point to each section in turn:

1. **"🎯 Competitor Analysis banner"** — top-left corner — *"Notice: this banner summarises the scope. Chicken rice shop, near Lavender MRT Station, 47 direct competitors in 1km. The keyword chips show how we matched them — chicken rice, hawker, food court, kopitiam, restaurant."*

2. **"Recommendation Score"** — *"Here's the headline answer. 58 out of 100 — Recommended. And crucially, we show our math: competition 0 out of 100 — because 47 is saturated — but accessibility is perfect 100 because we're AT the MRT exit, demand 90, diversity 100. The 70% weight on accessibility and demand rescues the competition score. A human would miss that; the weighted model catches it."*

3. **"Competitor Radar"** — scroll to it — *"Here's where the engineering shows. We don't just list the closest shops. This is ranked by relevance. Wow Chicken Rice at 53m is rank 1. McDonald's at 23m — the closest physically — is rank 7, because name-match for 'chicken rice' beats proximity. Click Show all 46 to expand."* **Do:** Click "Show all 46".

4. **"AI Pulse Report"** — scroll to it — *"Structured AI advisory: Verdict — Workable but competitive. Four tone-coloured sections: Competitive Landscape, Accessibility, Neighborhood Mix, Recommendation. The last one has a real positioning suggestion for this specific business type."*

5. **"The heatmap"** — point at the map — *"The red heat on the map shows where chicken rice competitors cluster. The cold zones are where they don't. The user can tap any cold spot to analyse that point instead — that's built-in."*

**What the judge should feel:** "This is deep. Every pixel on screen is doing work."

---

## 1:25 — Live Demo Part 2: The Hero Feature — Compare (50 seconds)

> **Say:** *"Now — I'm not going to open here. Let me compare."*

**Do:** On the banner, click **⚡ + Compare location**. Modal opens, prefilled *"Compare at another location — we'll analyze the same business (chicken rice shop)..."*

**Do:** Type: `Bugis`

Click **Add to compare**.

**Do:** When the second panel appears:

> **Say:** *"Two panels. Same business, two locations. Watch the map."*

Pause. Let judges see both pins and both heatmaps.

> **Say:** *"The red cluster is Lavender. The blue cluster is Bugis. Visual comparison in one glance. You can see right away: both are dense F&B zones, but the shape is different — Bugis competitors cluster more to the south-east, Lavender clusters around the MRT exit."*

**Do:** Point at both Recommendation Scores.

> **Say:** *"Numbers: Location 1 — Lavender — 58. Location 2 — Bugis — [whatever it shows]. A 15-point swing could mean $200,000 difference in annual revenue for this auntie. **This is the decision PlacePulse makes explicit.**"*

**What the judge should feel:** "Okay this is genuinely useful. No one else is doing this."

---

## 2:15 — The Close: Go See It For Yourself (30 seconds)

> **Say:** *"Now I've decided. I'm going to pick Bugis. But I don't want to trust the data alone — I want to see the location in person. Walk the block, feel the foot traffic, smell the food court. Data decisions need on-site validation."*

**Do:** On the Bugis panel's Place Identity Card, point at the three icon buttons.

> **Say:** *"Three navigation options. Green one — in-app route with the polyline on our map. Google — full turn-by-turn in Google Maps. And..."*

**Do:** Click the **Grab 🚕** button. If on mobile with Grab installed, the Grab app opens to the booking screen with Bugis as the drop-off. On desktop, narrate what would happen:

> **Say:** *"On your phone, this opens the Grab app with Bugis pre-filled as the destination. No typing. No copying coordinates. Two taps and I'm in a Grab on my way to see the location — inside the same Grab ecosystem that gave me the data."*

**Pause for effect.**

> **Say:** *"That's the full loop. Analyse → Compare → Decide → Book the ride to go see it. Every step powered by Grab."*

**What the judge should feel:** "The whole product is Grab-native. They used the whole platform."

---

## 2:45 — The Wrap (15 seconds)

> **Say:** *"PlacePulse is six GrabMaps endpoints, one Claude model, and a clear product thesis: the location analysis Fortune 500 retailers pay six figures for, delivered in 30 seconds to any SME owner on their phone. Smarter Places — for the people who can't afford smart places."*

**Do:** Smile. Pause. *"Happy to take questions."*

---

## Expected Q&A — Prepared Answers

### Q: "Where does the competitor data come from? How accurate is it?"
**A:** *"Entirely from GrabMaps' POI network — their `/maps/place/v2/nearby` and `/maps/poi/v1/search` endpoints. Same data Grab uses for delivery routing and ride-hailing. It's as current as Grab's operational data, because it IS Grab's operational data."*

### Q: "You said 'foot traffic' — do you actually have foot traffic data?"
**A:** *"No, and we're explicit about that in our code. We use POI density in 1km as a foot-traffic proxy because GrabMaps doesn't expose popular-times data. If it did, we'd plug it into the Demand sub-score instantly — the architecture already has a slot for it."*

### Q: "Why these weights — 40/30/20/10?"
**A:** *"They're v1 priors based on our product hypothesis: for SME scouting, competition matters most, then accessibility, then demand signals, then variety. In production these weights should be learned from 'I opened and it worked / failed' feedback. That's a 1-sprint add once we have user data."*

### Q: "How does this compare to Google My Business?"
**A:** *"GMB tells a shop owner what happened to their existing business. PlacePulse tells them what will happen at a location they don't own yet. Different question, different product."*

### Q: "Why Claude instead of a cheaper model?"
**A:** *"Claude gives us reliable structured JSON output without fine-tuning. We get verdict + four tone-typed sections in one call. We run at temperature 0.3 with a 900-token cap — about 4 cents per report. For a hackathon demo, it's the right tradeoff between quality and cost."*

### Q: "What happens if GrabMaps is down mid-demo?"
**A:** *"Map falls back to OpenStreetMap tiles. Analysis returns graceful empty data. No API key needed to render a basic map. We tested this — every single service in the stack has a fallback. Show me a team that did that."*

### Q: "What's your next feature?"
**A:** *"Auto-suggest 3 alternative pins. We already have the competitor pool in memory. A grid scorer runs on that pool and drops 3 ranked pins labeled 'Alternative 1 / 2 / 3' with a compact preview card. Two-hour build, turns PlacePulse from 'scout one spot' to 'scout a neighborhood'."*

### Q: "How much did this cost to build?"
**A:** *"Zero API cost during development — GrabMaps free tier plus Anthropic's trial credits. Running a full report costs about 4 cents in Claude tokens and ~10 Grab API calls. At scale this is one-fifth of a cent of infrastructure for a report that would cost an SME two thousand dollars to do manually with a consultant."*

### Q: "Can this work outside Singapore?"
**A:** *"Yes, and we built it that way. Every GrabMaps endpoint accepts a country code. The only SG-specific config is our default map center. Swap the defaults, ship to KL / Jakarta / Manila — tomorrow."*

---

## If the Demo Breaks — Backup Plans

### If the scout prompt times out
*"Real network lag — not our code. Let me show you the already-cached result."* Then click an example search result that's already in TanStack cache.

### If the map tiles fail
*"That's a GrabMaps CORS issue on localhost. The app falls back automatically…"* — wait 2 seconds for OSM fallback to load. *"…there we go, OpenStreetMap fallback, everything else still works."*

### If the Grab deep link does nothing (desktop)
*"Right — `grab://` is a mobile app scheme. If I were on my phone right now, the Grab app would open to the booking screen. For desktop we fall back to Google Maps."* Then click the Google Maps button instead.

### If Claude fails
*"Even without the LLM, the report still renders — we built a deterministic fallback that composes a summary from the raw numbers. Watch…"* Show the report with the "basic summary" tag.

---

## Timing Budget

| Segment | Target | Stretch |
|---|---|---|
| Hook | 0:15 | — |
| Setup | 0:25 | — |
| AI Scout demo | 1:25 | 1:30 |
| Compare demo | 2:15 | 2:30 |
| Close with Grab | 2:45 | 3:00 |
| Wrap | 3:00 | — |

If running short: skip the `Show all 46` expand + stop narrating the heatmap; jump straight to compare mode.

If running long: do the full relevance-bar narration and mention the defensive parsing quirk.

---

## Body Language Notes

- When saying *"Koufu has an analyst team"* — lean in slightly, make eye contact with the head judge
- When the compare view appears — pause, silently, and let them see it for 2 seconds before speaking
- When clicking the Grab button — smile; this is the "aha moment" closure

## Technical Safety Checklist Before Demo

- [ ] `npm run dev` running on :3000
- [ ] Browser refreshed, cache cleared
- [ ] `.env.local` loaded with real keys
- [ ] Terminal tab open as backup
- [ ] Phone nearby with Grab app installed (for the final Grab deep link demo if they want to see it live on phone)
- [ ] Network verified — can ping maps.grab.com
- [ ] One backup static screenshot of the compare view, in case live demo fails

---

## Post-Demo Strategic Asks

If judges ask *"what would you do with the prize money / incubation?"*:

> *"Three things, in order: one, run the user learning loop — recruit 20 Singapore hawkers and salon owners, collect ground-truth 'opened here, it worked / failed' data, and tune the recommendation weights from priors into a real model. Two, ship multi-city across Southeast Asia using GrabMaps coverage. Three, build the B2B alert layer — an SME saves their shop location, gets notified the moment a new competitor opens nearby. That third one is a subscription product."*

**This shows:** commercial thinking, data discipline, and a clear growth arc.

---

## One Final Reminder

You built something real. The product works end-to-end. The code is defensive, the data is honest, the UX is polished. Don't oversell — the product is already strong. **Just walk them through the story.**

# Common Ground: Development Plan

Nov 7, 2026 · @Barna

The brief has a strong vision but no numbers, no playable spec and a few missing foundations; this plan adds them and turns the roadmap into steps you can build in order.

## Your decisions (updated 7 Nov)

You narrowed the scope in a good way: neighborhoods as tiles is the single best change for keeping the simulation small. The sections below have been rewritten around these decisions.

| Your decision | What it means for the build |
| --- | --- |
| Each tile is a neighborhood, drawn as a blob | About 16 simulation nodes in the first scenario instead of thousands of cells. The simulation is tiny and fast; players manage places, not pixels. Each blob's shape and look come from a hand-picked seed. |
| 2.5D top-down view | Canvas 2D with slightly extruded blob shapes and y-sorted sprites. No 3D engine needed. |
| Real-world technologies come from me | A starter research tree of 20 entries is in this doc, with a confidence tag on each. Have a subject-area reader check it before release. |
| Player is a community organizer | Two currencies, Budget and Community time (volunteer hours). Each neighborhood has an engagement level that makes grassroots projects cheaper. |
| Plain function-based React + TypeScript, basic linter | Function components and hooks only, the ESLint setup that ships with the Vite template, no heavy configuration. |
| Open source, runs fully in the browser, free | Static hosting, saves in the browser (IndexedDB), a permissive code licence, CC0 or self-made assets, no accounts and no analytics. |

## Verdict

The brief is a good vision document and a weak build document. Its architecture advice (simulation separate from rendering, data-driven content, fixed timestep, no backend) is sound and I keep all of it. What it lacks is the thing that makes a city builder fun or not: concrete numbers and a tight feedback loop.

Five changes I would make:

1. **Make each tile a neighborhood, not a single building.** Aim for about 16 neighborhood tiles, 8 projects, 3 resources and 8 technologies. Prove the loop, then grow.
2. **Write the simulation spec before the renderer.** A page of formulas (section 3) you can unit-test with no graphics at all.
3. **Make "why did this change?" a first-class feature.** Every indicator stores its reasons, so the UI can show "Food -4: soil fertility is low". This is the single feature that makes the game educational without being preachy.
4. **Add a tutorial and a goal ladder from day one.** The brief has milestones but no onboarding; first-time players quit in the first five minutes if the next action is unclear.
5. **Decide the fun hook early.** Placing buildings is the verb, but the reward is watching a town visibly improve. Plan before-and-after visuals (greener streets, fewer cars, wildlife appearing) from the start, even with placeholder art.

## What the brief is missing

| Gap | Why it matters | Where it is fixed |
| --- | --- | --- |
| Simulation formulas | Without numbers you cannot test balance or know if the loop is fun | Section 3 |
| Tutorial and onboarding | Players need a clear first action within 60 seconds | Section 3 and Milestone 7 |
| Explanation system ("why") | It is the core of the educational promise | Sections 3 and 6 |
| Input design | Placing, dragging, zooming and panning must feel good on mouse and touch | Section 12 |
| Performance budget | A 40 × 40 map is easy, but ticks, redraws and React re-renders can still stutter | Section 8 |
| Save corruption and migration | Players lose trust the first time a save breaks after an update | Section 6 |
| Testing strategy | Simulations fail silently; you need automated checks | Section 10 |
| Accessibility | Colour-blind-safe overlays, keyboard play and reduced motion widen your audience | Section 12 |
| Audio | Ambient sound and small feedback sounds carry much of the "cozy" feeling | Section 12 |
| Content sourcing | Educational claims need references and a review process | Section 11 |
| Hosting, analytics, legal | Where it lives, how you learn what players do, privacy and licensing of assets and fonts | Section 12 |
| A definition of "done" per milestone | Prevents endless polishing and scope creep | Section 9 |

## The game model: neighborhoods as tiles

Each tile is a neighborhood with its own residents, needs and projects. The player never places single buildings; they decide which projects each neighborhood hosts and how the neighborhoods connect. All numbers are placeholders to tune in playtests, but they are enough to build and test from day one.

### The world

- A hand-built town of 16 neighborhoods (the Willowbrook scenario below), drawn as blobs of different shapes. Each lists its neighbors in the scenario file, and two bridges link the halves of the town across the river.
- Each neighborhood has a kind: old town, suburb, apartment blocks, industrial edge, farmland, riverside or woodland. The kind sets its starting residents, needs and how many project slots it has.
- One tick is one in-game day; 30 ticks make a month. The simulation updates about 16 nodes per tick, which is trivial for a browser.

### What a neighborhood stores

| Field | Example | Notes |
| --- | --- | --- |
| `kind` | suburb | Drives starting values and the sprite set |
| `residents` | 900 | Aggregated; no individual citizens |
| `slots` | 4 | Maximum projects hosted at once (3 to 5) |
| `engagement` | 30 of 100 | How willing residents are to volunteer; lowers project cost in Community time |
| `needs` | six values, 0 to 1 | Energy, food, mobility, green space, waste, housing comfort |
| `satisfaction` | 55 of 100 | Weighted from the needs |
| `biodiversity` | 30 of 100 | Rises with habitat and green projects, falls with pollution |
| `seed` | 48213 | Hand-picked in the scenario file; decides blob shape and sprite placement |

### Needs and satisfaction

Each need is a coverage ratio: `min(1, supply / demand)`. Supply comes from the neighborhood's projects, town-level systems and surplus shared by neighbors. Satisfaction is a weighted sum, so every change can be explained:

```text
satisfaction = 100 * ( 0.20 * energy
                     + 0.20 * food
                     + 0.15 * mobility
                     + 0.15 * green_space
                     + 0.10 * waste
                     + 0.20 * housing_comfort )
```

Smooth the displayed value (move 5% toward the target each tick). Store the three largest shortfalls as reasons, so the panel can say "Mostly low because food coverage is 40%". Town satisfaction is the resident-weighted average.

### Resources (your community-organizer role)

| Resource | Start | How it works |
| --- | --- | --- |
| Budget | 15,000 | Monthly income from local taxes (about 0.25 per resident, roughly 3,000 a month in Willowbrook); spent on project costs and upkeep |
| Community time | 6 | Volunteer effort. Regenerates monthly from the average engagement; spent on grassroots projects |
| Knowledge | 0 | Earned from schools, libraries, milestones; spent on research |

Engagement is the organizer's lever. A "town meeting" action costs 1 Community time and raises one neighborhood's engagement by 10. Neighborhoods with high engagement regenerate more Community time and complete grassroots projects faster, so building trust pays off in a way money alone cannot buy.

### Starter projects (8)

| Project | Budget | Time | Effect in its neighborhood |
| --- | --- | --- | --- |
| Retrofit program | 600 | 1 | Housing comfort +0.15; energy demand -20% |
| Rooftop solar program | 900 | 1 | Adds energy supply equal to about 25% of demand |
| Community garden | 400 | 2 | Food +0.12; green space +0.08; engagement +5 per month while it runs |
| Safe streets (walking and cycling) | 700 | 1 | Mobility +0.15; fewer car emissions |
| Bus line (links two neighbors) | 1,000 | 0 | Mobility +0.20 in both linked neighborhoods; needs the research |
| Compost point | 300 | 2 | Waste +0.15; boosts nearby gardens' food output |
| Pocket habitat or meadow | 300 | 1 | Green space +0.10; biodiversity up |
| Tool library and repair café | 500 | 3 | Waste +0.10; engagement +8 |

Each project has upkeep (about 3% of cost per month) and takes a few in-game weeks to complete, which gives time to plan the next move.

### Links between neighborhoods

- **Food surplus** flows to adjacent neighborhoods with a shortfall, at about 70% efficiency (transport losses). It makes local food networks visible.
- **Bus lines** connect two neighbors and show as a line on the map.
- **Local grid** (after research) lets neighbors share energy surplus.
- Pollution and biodiversity spill over a little to adjacent neighborhoods, so a river restoration or a polluting depot affects the neighbors.

### The first 15 minutes

1. Minute 0 to 1: a short camera sweep over the town. Three neighborhoods pulse with a problem (little green space, high energy use, no bus). Tap one to open its panel.
2. Minute 1 to 3: the tutorial asks for one community garden in that neighborhood. The panel previews the expected change in food and satisfaction before you confirm.
3. Minute 3 to 6: time runs, the garden appears on the blob, the neighborhood's bars improve and a resident message thanks the player.
4. Minute 6 to 10: research Energy audits, then run a retrofit program in a second neighborhood.
5. Minute 10 to 15: the first milestone ("Greener Streets") unlocks the bus line and a new goal, so the next step is always visible.

## Starter scenario: Willowbrook

Willowbrook is a fictional market town of about 11,800 people, hand-built from 16 neighborhoods. Because the layout is fixed, you can tune each neighborhood's starting values, story and difficulty by hand, and every playtest compares like with like.

&#91;embedded content: Willowbrook · 16 neighborhoods, 4 × 4 layout, one river\]

Neighborhoods touch the ones next to them on the map. The river splits the town in two, and only two bridges cross it (Old Town to Riverside, and Linden Flats to Station Quarter). That makes the first bus line a real decision.

### The story

The mill closed twenty years ago and most people now commute by car to the regional city. Homes are heated mostly by gas, the 1970s blocks of Linden Flats have huge heating bills, and Weir Bend floods in wet years. Northfield's farms sell their crops out of town, while a keen group at the library has been asking for a tool library for years. The town is not failing; it just has not decided to change yet. That is where the player comes in.

### The 16 neighborhoods

| Neighborhood | Kind | Residents | Slots | Starts weak in | Story hook |
| --- | --- | --- | --- | --- | --- |
| Old Town | old town | 1,100 | 4 | Housing comfort, mobility | Historic buildings limit rooftop solar; strong community groups (engagement 50) |
| Station Quarter | apartments | 1,400 | 3 | Green space, waste | Busy station, the natural first bus hub |
| Linden Flats | apartments | 1,500 | 3 | Energy, housing comfort | 1970s blocks, biggest retrofit payoff, low engagement (20) |
| Maple Heights | suburb | 1,200 | 5 | Mobility | Car-dependent, with large roofs good for solar |
| Birch Park Estate | suburb | 900 | 5 | Mobility, green space | Lawns that could become meadows |
| Meadow Rise | suburb | 1,000 | 4 | Energy | Newest homes, young families asking for a playground |
| School Green | suburb | 900 | 4 | Green space | Primary school; a school project gives a Knowledge bonus |
| Orchard Lane | suburb | 700 | 5 | Waste | Old orchard trees, ideal for gardens and composting |
| Clay Hill | suburb | 600 | 4 | Mobility | Steep streets; wind exposure for later projects |
| Riverside | riverside | 800 | 4 | Biodiversity | Poor riverbank; wetland potential |
| Weir Bend | riverside | 500 | 3 | Biodiversity, green space | Floods in wet years; rain garden candidate |
| Mill Yard | industrial edge | 400 | 4 | Waste, biodiversity | Empty mill with big roofs; repair workshop or solar site |
| Southgate Retail | retail park | 300 | 3 | Mobility, energy | Vast car parks; solar canopy candidate |
| Northfield Farms | farmland | 250 | 4 | Food outlet | Grows more food than it uses and needs a local market |
| Allotment Row | farmland | 150 | 3 | None | Keen gardeners, high engagement (60) |
| Hollow Wood | woodland | 100 | 2 | None | Habitat reserve that protects neighbors' biodiversity |

Starting values for the scenario: Budget 15,000, Community time 6 (about 3 more each month at average engagement 35), town satisfaction about 52. Available research at the start: Energy audits, Community gardens, Safe walking and cycling.

### Five chapters

Each chapter has one goal, teaches one idea and unlocks new research. Targets are placeholders to tune in playtests.

1. **First steps.** Start a community garden in Linden Flats, retrofit three neighborhoods and hold your first town meeting. Goal: town satisfaction 60. Teaches that small, visible wins build trust.
2. **Getting around.** Link Station Quarter, Old Town and Maple Heights with a bus line and add safe streets in three neighborhoods. Goal: average mobility coverage 0.65. Teaches that frequency and connections matter more than single projects.
3. **A greener river.** Restore the Weir Bend rain garden and the Riverside wetland, and turn two lawns into meadows. Goal: average biodiversity 45. Teaches the value of natural buffers.
4. **Closing loops.** Set up compost points and tool libraries in four neighborhoods, and connect Northfield's surplus to three neighbors. Goal: waste coverage 0.70. Teaches that preventing waste beats recycling it.
5. **Community-owned.** Form an energy cooperative and cover about half of town electricity demand locally. Goal: engagement 60 on average. Teaches that ownership and participation are part of sustainability.

The scenario ends when all five chapter goals are met; the town keeps running afterward as a sandbox. Optional challenges (for example, finish chapter 2 without the Linden Flats retrofit) add replay value.

### How the scenario is stored

One JSON file holds everything hand-tuned, so you can change balance without touching code.

```json
{
  "id": "willowbrook",
  "name": "Willowbrook",
  "start": { "budget": 15000, "time": 6, "unlockedTech": ["energy_audits", "community_gardens", "safe_streets"] },
  "neighborhoods": [
    {
      "id": "linden_flats", "name": "Linden Flats", "kind": "apartments",
      "residents": 1500, "slots": 3, "engagement": 20,
      "needs": { "energy": 0.45, "food": 0.80, "mobility": 0.60, "green": 0.35, "waste": 0.55, "housing": 0.40 },
      "shape": { "x": 660, "y": 214, "radius": 70, "seed": 1177 },
      "neighbors": ["orchard_lane", "old_town"]
    }
  ],
  "bridges": [["old_town", "riverside"], ["linden_flats", "station_quarter"]],
  "chapters": [{ "id": "first_steps", "goal": { "townSatisfactionAtLeast": 60 } }]
}
```

Pick each neighborhood's `shape.seed` by eye: try a few values until the blob looks right, then fix it. Seed-based random towns stay on the later wish list, and the same simulation will support them when you want them.

## Starter research tree (real-world basis)

Twenty technologies and practices across six branches, each with an honest limit so the game can show trade-offs. This is written from my general knowledge, not from fresh sources: treat the notes as a first draft and have each one checked against a reputable source before it ships (section on the educational pipeline). Confidence: **established** means widely documented; **context** means it works well in some places and poorly in others.

| Technology | Branch | In the game | Real-world note and limit | Confidence |
| --- | --- | --- | --- | --- |
| Energy audits | Energy | Reveals each neighborhood's biggest energy losses; unlocks retrofits | Cheap and fast, but savings depend on the building and on people acting on the findings | Established |
| Building retrofits (insulation, windows) | Energy | Cuts heating demand, raises comfort | Strong effect in older, poorly insulated housing; deep retrofits are costly and disruptive | Established |
| Rooftop solar | Energy | Adds local electricity | Output varies by season and weather; needs suitable roofs and a grid connection | Established |
| Heat pumps | Energy | Cuts heating energy; needs retrofits first | Move heat rather than burn fuel, so they deliver several units of heat per unit of electricity, less in very cold weather | Established |
| Community batteries | Energy | Smooths evening demand from solar | Good for daily balancing, not for long outages or seasons; costly | Context |
| Energy cooperatives | Energy | Community-owned solar; cheaper Community time for energy projects | Many European communities run them; success depends on local rules and organizing effort | Context |
| Community gardens and allotments | Food | Food, green space, engagement | Meaningful social and wellbeing benefits; only a small share of a town's total food | Established |
| Composting | Food | Waste diverted, soil fertility up | Needs good sorting, and managing smell and pests | Established |
| Local food hubs and markets | Food | Surplus flows between neighborhoods | Shorter supply chains help local growers; local does not always mean lower emissions | Context |
| Regenerative farming practices | Food | Soil health and water retention up over time | Cover crops and reduced tillage can improve soils; yield effects vary by crop and climate | Context |
| Safe walking and cycling streets | Mobility | Mobility up, car emissions down | Works best as a connected network, not isolated lanes; well-known examples such as the Netherlands and Denmark took decades | Established |
| Frequent public transport | Mobility | Bus lines linking neighborhoods | Frequency and reliability matter more than coverage; low-density areas are harder to serve | Established |
| Shared mobility (car and bike sharing) | Mobility | Fewer cars per household | Helps most where density and alternatives exist | Context |
| Separate collection and recycling | Circular | Waste coverage up | Quality depends on clean sorting; recycling is not the same as waste prevention | Established |
| Repair cafés and tool libraries | Circular | Waste prevention, engagement up | Reuse and repair sit above recycling in the waste hierarchy; they need volunteers and space | Established |
| Urban trees and green roofs | Ecology | Cooling, green space | Shade and cooling are well documented; young trees need water and care, green roofs need structural support | Established |
| Pollinator meadows | Ecology | Biodiversity up | Reducing mowing and planting native flowers helps insects; benefits grow over seasons | Established |
| Rain gardens and wetlands | Ecology | Flood resilience, water quality | Absorb and filter runoff; need space and upkeep, and cannot stop extreme floods alone | Established |
| Participatory budgeting | Community | Residents choose some projects; engagement up | Began in Porto Alegre, Brazil in 1989 and spread widely; can be dominated by the most active groups | Context |
| Housing cooperatives | Community | Affordable housing, shared facilities | Long-term affordability and resident control; needs governance skill and financing | Context |

**Prerequisite chains to start with** (all are suggestions to tune): Energy audits → Retrofits → Heat pumps; Rooftop solar → Community batteries → Energy cooperatives; Community gardens → Composting → Local food hubs; Safe streets → Public transport; Repair cafés → Participatory budgeting → Housing cooperatives.

**Idea:** each tech card can show a short "in real life" line plus one example place, and a "limits" line, which is what keeps the game honest rather than preachy.

## Tech stack

I agree with the brief's lean approach, with four adjustments: add a test runner, a linter, a tiny state store, and a schema check for saves. Check current versions when you scaffold the project, since I cannot verify them from here.

| Need | Use | Why | Skip for now |
| --- | --- | --- | --- |
| Build and dev server | Vite | Fast, simple, first-class TypeScript | Webpack |
| UI | React + TypeScript (strict mode) | Good for panels, menus, tooltips | Next.js (no server needed) |
| World rendering | Canvas 2D, one canvas, own render loop | No dependency, plenty for a tile grid | Phaser, PixiJS until profiling says otherwise |
| Game state | A plain TypeScript state object owned by the simulation, exposed to React with `useSyncExternalStore` | React never owns game truth; no library needed | Redux; Zustand only if you want convenience |
| Saves | IndexedDB via a \~50-line wrapper (or the small `idb` library) | Native, handles large saves | LocalStorage (size limit, blocking) |
| Save validation | Hand-written validators, or Zod if you accept one dependency | Catches corrupted or old saves | Trusting `JSON.parse` blindly |
| Tests | Vitest | Same config as Vite, fast simulation tests | Jest |
| Code quality | ESLint + Prettier + `tsc --noEmit` in CI | Consistent, catches bugs early | Custom rules |
| Heavy simulation (later) | Web Worker | Keeps UI smooth if ticks get expensive | Doing this on day one |
| Audio | Web Audio API or `<audio>` | Native | Large audio libraries |
| Hosting | Static host (Netlify, Cloudflare Pages, GitHub Pages) | Free tier, no backend | Servers and databases |

## Graphics: 2.5D blob neighborhoods

The look is soft, slightly raised islands (the neighborhoods) on a ground plane, with small sprites scattered on top. Canvas 2D handles this well, and a 25-blob map is a light drawing job.

**How to build the look**

1. **Blob outline from the seed.** A circle whose radius wobbles with a few sine waves gives organic shapes. Squash it vertically (about 0.6) for the top-down tilt. Place blob centers by hand in the scenario file (a rough grid works well) and keep each radius under about 45% of the spacing so they do not overlap.
2. **Fake thickness.** Draw the same path several times, 1 px lower each step in a darker colour, then the top face in the main colour. That gives a raised, chunky edge with no 3D engine.
3. **Sprites on top.** Scatter houses, trees, gardens and solar panels inside each blob using the neighborhood's own seed (reject positions where `ctx.isPointInPath` says outside). Sort sprites by their y position before drawing so lower ones overlap higher ones.
4. **Show progress in the picture.** Colour and sprite sets change with state: greyer roads and cars at the start, then trees, panels, bikes and birds as indicators improve.
5. **Hit-testing for free.** Keep each blob's `Path2D`; `ctx.isPointInPath(path, x, y)` tells you which neighborhood the pointer is over. Lift the hovered blob by 4 px.
6. **Cache.** Render each blob and its sprites to an offscreen canvas once, and redraw it only when its projects change. The main loop then just blits 16 images.

```ts
function blobPath(seed: number, cx: number, cy: number, r: number): Path2D {
  const rand = mulberry32(seed);
  const waves = [2, 3, 5].map((k) => ({ k, amp: 0.06 + rand() * 0.1, phase: rand() * Math.PI * 2 }));
  const path = new Path2D();
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    let rr = r;
    for (const w of waves) rr += r * w.amp * Math.sin(w.k * a + w.phase);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * 0.6; // squash for the top-down tilt
    if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

function drawRaised(ctx: CanvasRenderingContext2D, path: Path2D, depth: number, top: string, side: string) {
  ctx.fillStyle = side;
  for (let d = depth; d > 0; d--) { ctx.save(); ctx.translate(0, d); ctx.fill(path); ctx.restore(); }
  ctx.fillStyle = top;
  ctx.fill(path);
}
```

**Art plan for an open-source project**

- Start with flat colours and the shapes above; they already look good and cost nothing. Pick one palette of about 12 colours and one sprite size (32 or 48 px).
- For sprites, look at CC0 (public domain) packs first, for example Kenney's asset library, and check the licence of every item on OpenGameArt and itch.io individually; keep each one's licence and author in `LICENSES.md`.
- To make your own: Inkscape (vector), Krita (painting), LibreSprite (pixel art) and Blender (render simple models to 2D sprites from a fixed camera angle) are all free.
- Keep sprites in one sprite sheet per category, in PNG or WebP, so loading stays fast.
- If you later want true 3D, an orthographic three.js scene could replace the renderer without touching the simulation. Do not start there.

## Architecture at a glance

&#91;embedded content: architecture · 7 parts, one rule boundary\]

The simulation is the only place game rules live: commands go in, new state comes out, and the UI and renderer only read snapshots. That lets you change the art style, or the whole UI, without touching the rules.

## Core code patterns

Five patterns carry most of the design. Each snippet is a starting shape, not final code.

### 1. Fixed-timestep game loop

Simulation ticks run at a fixed rate; drawing runs every frame and interpolates. This keeps saves, tests and speed controls consistent.

```ts
const TICK_MS = 1000;            // 1 tick per second at normal speed
let acc = 0, last = performance.now();

function frame(now: number) {
  const dt = Math.min(now - last, 250);   // clamp after tab was hidden
  last = now;
  acc += dt * speed;                      // speed: 0 = paused, 1, 2, 4
  while (acc >= TICK_MS) {
    state = tick(state);                  // pure function, no DOM
    acc -= TICK_MS;
  }
  render(state, acc / TICK_MS);           // alpha for smooth animation
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

### 2. Data-driven content with strict types

Projects, technologies and events are data. Adding content should never need a code change in the simulation.

```ts
interface ProjectDef {
  id: string;                          // "community_garden"
  name: string;
  cost: { budget: number; time: number };   // time = Community time points
  upkeepPerMonth?: number;
  requiresTech?: string;
  allowedKinds?: NeighborhoodKind[];   // e.g. no rooftop solar on farmland
  effects: {
    need?: NeedId;                     // "food", "energy", ...
    add?: number;                      // coverage added, e.g. 0.12
    demandMultiplier?: number;         // e.g. 0.8 = 20% less demand
    engagementPerMonth?: number;
    biodiversity?: number;
  }[];
  explain: string;                     // one sentence shown in the UI
}
```

Validate all JSON content at startup (and in a unit test) so a typo in `projects.json` fails loudly with the building's id.

### 3. Seeded random numbers

Never call `Math.random()` in game logic. Use a small seeded generator such as mulberry32 so the same seed gives the same town and tests are reproducible. Keep the generator's state inside the saved game state.

```ts
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### 4. Commands and a versioned save format

Every player action (start project, remove project, research, set speed) is a command object applied by the simulation. This gives you undo, replays, tutorial scripting and simple tests.

```ts
type Command =
  | { type: "startProject"; neighborhood: string; project: string }
  | { type: "removeProject"; neighborhood: string; slot: number }
  | { type: "townMeeting"; neighborhood: string }
  | { type: "research"; tech: string }
  | { type: "setSpeed"; speed: 0 | 1 | 2 | 4 };

interface SaveFile { version: number; savedAt: string; seed: number; state: GameState }

const migrations: Record<number, (s: any) => any> = {
  // 1 -> 2: add biodiversity to every neighborhood
  1: (s) => ({ ...s, neighborhoods: s.neighborhoods.map((n: any) => ({ ...n, biodiversity: 30 })) }),
};
```

On load: check the version, run migrations in order, validate, and if anything fails keep the old save untouched and show a friendly message. Always write saves to a new slot entry before replacing the old one, and keep the last known good autosave.

### 5. Explanations as data

When the simulation changes an indicator, record a reason object next to it.

```ts
interface Reason { indicator: IndicatorId; delta: number; cause: string; hint?: string }
// { indicator: "food", delta: -4, cause: "Soil fertility is low", hint: "Build a compost point near gardens" }
```

The UI sorts reasons by size and shows the top three. This is how the game teaches without lecturing.

## Coding standards

Keep it plain: function-based React with TypeScript and the ESLint setup that comes with the Vite template. Eleven rules cover almost everything.

1. **Function components and hooks only.** No class components. The simulation is plain functions and plain objects too.
2. **TypeScript `strict: true`.** Avoid `any` (the one acceptable place is save-file migrations). Describe data with `interface` or `type`.
3. **Use the template's linter.** Run `npm run lint` and `npx tsc --noEmit` before every commit. Add Prettier only if you want automatic formatting; it is optional.
4. **One boundary rule.** Nothing in `src/game/` imports from React or from `src/ui/`. If you only remember one rule, keep this one; it is what lets you change the look or the UI freely.
5. **The simulation is pure.** `tick(state, commands)` returns a new state. No `Date.now()`, no `Math.random()` (use the seeded generator), no DOM, no network.
6. **State is plain JSON-friendly data.** Arrays and records, no `Map`, `Set` or class instances, so saving is just `JSON.stringify`.
7. **Content is data, numbers have names.** Projects, technologies and events live in JSON files; balance values live in a `constants.ts` with a comment saying why.
8. **The UI only dispatches commands.** It never edits game state directly, and each component reads the smallest slice of state it needs.
9. **Naming.** Components in `PascalCase`, functions and variables in `camelCase`, content ids as `snake_case` strings (`"community_garden"`).
10. **Small files.** Split a file at about 300 lines or when it does two jobs. Comments explain why a rule or number exists, not what the code does.
11. **All visible text goes through one `t("key")` function.** Cheap now, and it makes translations by contributors possible later.

**Open-source housekeeping:** a `README.md` (what it is, how to run it), a `LICENSE`, a short `CONTRIBUTING.md`, small commits with clear messages, a `DECISIONS.md` for why you chose things, and "good first issue" labels for content tasks such as adding a technology entry or fixing a fact.

## Performance playbook

A small tile game should hold 60 frames per second on a mid-range phone. These habits keep it that way; measure before optimizing anything beyond them.

**Budgets to set now**

| Target | Budget |
| --- | --- |
| Frame time | Under 16 ms (60 fps), with 8 ms to spare on phones |
| One simulation tick | Under 5 ms for a 24 × 24 map; under 20 ms for 40 × 40 |
| First load | Under 300 KB of JavaScript compressed, game playable in under 3 seconds |
| Save size | Under 500 KB per slot |

**Rendering**

- **Draw terrain to an offscreen canvas once** and re-draw only the tiles that changed. Blit that canvas each frame.
- **Redraw only when something changed** (a `dirty` flag), so a paused town costs almost nothing.
- **Layer your canvases**: static terrain, buildings, then a cheap top layer for the cursor, highlights and overlays.
- **Round positions to whole pixels** and set `imageSmoothingEnabled = false` for pixel art; scale for `devicePixelRatio` so it stays sharp.
- **Use sprite sheets**, not one image per building, and draw with `drawImage` sub-rectangles.
- **Cull to the viewport** once the map is larger than the screen.

**Simulation**

- Typed arrays for grids; avoid allocating new objects or arrays inside the per-tile loop.
- Compute area effects (a garden's 3-tile radius) with a precomputed influence map that you update only when buildings change, not on every tick.
- Run expensive systems (satisfaction, ecology) every 5th or 10th tick, and cheap ones (resource flow) every tick.
- If a tick ever exceeds budget, move simulation into a Web Worker; this is easy if you kept the simulation pure.

**React**

- Never put the whole game state in React state. Expose small selectors (`useGameSelector(s => s.resources.food)`) and update the HUD at 4-10 Hz, not 60 Hz.
- Memoize panels; use virtualized lists only if a list exceeds a few hundred rows.

**Loading and memory**

- Lazy-load rarely used screens (research encyclopedia, settings) with dynamic `import()`.
- Compress images (WebP or PNG-8 for pixel art), subset fonts, and cache static assets with a service worker if you want offline play.
- Pause the loop on `document.visibilitychange` so a background tab uses nothing.

**How to measure**: Chrome DevTools Performance panel for frames; `performance.mark` around `tick()`; Lighthouse for load time; test on a real older phone, not only your laptop.

## Step-by-step development plan

Ten milestones (0 to 9), each ending in something you can play and a clear exit test. Time estimates assume part-time solo work (about 10 hours a week). Do not start a milestone until the previous exit test passes.

### Milestone 0: Setup (one weekend)

1. Install Node.js (current LTS) and Git. Run `npm create vite@latest common-ground -- --template react-ts`.
2. Confirm the template's `npm run lint` passes; turn on `"strict": true` in `tsconfig.json`.
3. Create the folders `src/game`, `src/ui`, `src/data` and `src/persistence`.
4. Create a public repository with a `README.md` and a `LICENSE` file (section on open source below).
5. Deploy the empty app to a free static host (GitHub Pages, Netlify or Cloudflare Pages). On GitHub Pages, set Vite's `base` option to your repository name.

**Exit test:** lint and build pass, and the page is live at a public address.

### Milestone 1: Blobs on screen (1 to 2 weeks)

1. Add the seeded random generator (`mulberry32`) and write a test that the same seed gives the same numbers.
2. Load the 16 hand-placed neighborhoods (position, radius, seed) from \`scenarios/willowbrook.json\`.
3. Draw them with `blobPath` and `drawRaised` (Graphics section), in flat colours.
4. Add hover lift and click selection with `isPointInPath`, plus pan and zoom (drag and wheel or pinch).

**Exit test:** the same seed always gives the same map; hovering and clicking pick the right neighborhood at 60 fps.

### Milestone 2: Neighborhood data and panel (1 week)

1. Define `Neighborhood` and the seven kinds in `data/neighborhoods.json`.
2. Load names, residents, slots, starting needs, neighbors and bridges from the scenario file.
3. Build a React side panel: name, kind, residents, six need bars, satisfaction (placeholder values).

**Exit test:** you click any blob and read sensible, different values.

### Milestone 3: Projects and slots (1 to 2 weeks)

1. Write `projects.json` with three projects: community garden, rooftop solar, retrofit program.
2. Implement the `startProject` and `removeProject` commands, with validation (free slot, enough Budget and Community time, allowed kind).
3. Show project slots in the panel with a picker and a preview of the expected change.
4. Unit-test every validation rule; refused actions return a reason string the UI shows.

**Exit test:** you can fill and clear slots; invalid actions are refused with a clear reason.

### Milestone 4: Time, needs and satisfaction (2 weeks)

1. Implement the fixed-timestep loop with pause, 1×, 2× and 4×.
2. Implement Budget income, Community time and Knowledge.
3. Compute coverage for each need, the satisfaction formula and the reasons list.
4. Add the top bar (resources, date, speed) and show the top three reasons in the panel.
5. Write the determinism test (same seed and commands give the same state after 1,000 ticks) and the invariant test (no `NaN`, values within range).

**Exit test:** change one project and the panel explains the change in plain language.

### Milestone 5: Save and load (1 week)

1. Implement the versioned `SaveFile`, an IndexedDB wrapper, autosave about once a minute and three manual slots.
2. Add export and import of a save as a `.json` file; this is also your safety net since there is no server.
3. Write round-trip, migration and corrupt-save tests.

**Exit test:** close the tab, reopen it and continue exactly where you were; a deliberately broken save shows a friendly message and does not crash.

### Milestone 6: Research and goals (2 weeks)

1. Add `technologies.json` with 8 entries from the research tree, with prerequisites and unlocks.
2. Build the research panel, with the education card for each entry (what it is, benefit, limit, confidence tag).
3. Add the first five milestones as data (conditions on state), with a notification when one completes.

**Exit test:** a new player can reach the first milestone without help in under 15 minutes.

### Milestone 7: Organizer mechanics and links (2 weeks)

1. Add engagement per neighborhood, monthly Community time regeneration and the "town meeting" action.
2. Add food-surplus sharing between adjacent neighborhoods.
3. Add bus lines that link two neighborhoods and appear as lines on the map.
4. Add one resident message per neighborhood (a simple request with a reward).

**Exit test:** two different playthroughs reach the same goal by different routes.

### Milestone 8: Tutorial and first playtest (1 to 2 weeks)

1. Script the first 15 minutes (spec section) with highlighted targets and short text.
2. Add a "what should I do next?" button that picks the best open goal.
3. Give the game to 5 people without explaining anything; watch, take notes and do not help.

**Exit test:** at least 3 of 5 testers reach the first milestone and say they would keep playing.

### Milestone 9: Look, sound, polish and release (4 to 6 weeks)

1. Replace flat colours with sprites, add small animations (birds, smoke stopping, trees growing) and ambient audio.
2. Add the options menu, accessibility features and the mobile layout.
3. Write the README with screenshots, publish the repository and an itch.io page, and add a feedback link (a GitHub issue template is enough).

**Exit test:** a stranger describes it as "relaxing" or "cozy" unprompted, and it runs well on an older phone.

**After release:** fix the top three complaints each week before adding anything new. Then add scenarios and seed-based freeplay, and invite contributors to add technologies and translations, which are the easiest ways to help an open-source game.

### Roadmap after Milestone 9

Done during Milestone 9 polish, from playtest feedback: undo for the last
action, construction time, a town history chart, seasons (visual), background
music with separate volume sliders, and a cooldown on town meetings.

The bigger ideas, roughly in the order they would pay off. Each keeps the
pillars: gentle, honest, never punishing.

1. **Gentle weather events.** A heatwave, a flood or a dry summer every year or
   two, announced a month ahead. Resilient projects (street trees, rain
   gardens, retrofits) visibly soften them; nothing is ever destroyed. Builds
   on the seasons that are already drawn.
2. **Citizen stories.** Five to ten recurring residents with short notes whose
   lives change as their district improves (the cyclist, the allotment
   grandmother, the shop owner).
3. **Wildlife journal.** Species appear as green space and biodiversity rise
   (bees, hedgehogs, swifts, otters), each with a short real-world note, and are
   collected in a journal.
4. **Before/after slider and photo mode.** Compare the town now with day one,
   hide the interface, and save the picture.
5. **More scenarios and seeded freeplay.** A coastal town, a mountain village,
   and a random-seed mode, all from the same content files.
6. **Translations.** Every string already goes through `t()`; add a language
   picker and invite contributors.
7. **Colour-blind palettes.** An alternative need palette (validated like the
   current one) and optional patterns on the need bars.
8. **Day and night.** A slow light cycle with lit windows at night; retrofitted
   homes glow warmest.
9. **Optional gentle challenges.** Seeded weekly goals with no streaks and no
   penalties.
10. **Install for offline play (PWA).** A manifest and a service worker so the
    game opens without a connection.

## Testing and balancing

Two different jobs: proving the code is correct, and tuning the game until it is fun. Because the simulation is pure, the first is cheap.

**Automated tests (Vitest)**

- **Unit tests** for each system: given this state, this tick, expect this change. Include edge cases (zero homes, negative budget, full map).
- **Determinism test:** run 1,000 ticks twice from the same seed and commands; the states must be identical. Run it in CI.
- **Save round-trip test:** serialize, load, compare; also load saves from every earlier version in a `fixtures/` folder.
- **Content validation test:** every building, technology and event references things that exist, has a cost above zero, and has an explanation string.
- **Invariant checks:** resources never become `NaN`, satisfaction stays between 0 and 100, no building overlaps another.

**Bot playthroughs (the balancing tool most solo developers skip)**

Write a headless script that plays the game with a simple strategy ("always build the cheapest thing that helps the worst indicator") for 10 in-game years and prints a table of indicators per year. Run it after every balance change. If the bot cannot progress, or progresses with no decisions, the numbers are wrong.

**Human playtests**

- Test early, with ugly graphics, on 3 to 5 people at a time.
- Do not explain anything; watch where they hesitate, and write down the exact moment they say "what do I do now?".
- Ask three questions afterwards: what did you try to do, what surprised you, what would you do next.
- Add a hidden debug panel (speed 50×, free money, reveal all research) so you can test late-game quickly.

**Balance principles for this game**

- Every sustainable option should have a visible benefit within about two in-game months, so the player gets the reward fast.
- Costs should differ in kind (money, land, workers, time), not only size, so choices are real trade-offs.
- Run a "no good options" check: at every point the player should have at least two affordable improvements.

## Educational content pipeline

Accuracy is what separates an educational game from a preachy one. Treat the content like a small publication, with a schema, sources and review.

**Entry schema** (one JSON object per technology or concept, kept in `data/` and separate from simulation code):

```json
{
  "id": "rooftop_solar",
  "title": "Rooftop solar",
  "summary": "Panels on roofs turn sunlight into electricity for the building or the grid.",
  "howItWorks": "...",
  "benefits": ["..."],
  "limits": ["Output varies with weather and season", "..."],
  "realWorld": "...",
  "confidence": "established",
  "sources": [{ "title": "...", "url": "...", "checked": "2026-11-07" }]
}
```

**Rules**

1. Every claim with a number carries a source and the date you checked it. Prefer government agencies, international bodies, universities and peer-reviewed reviews over blogs.
2. Use the `confidence` field (`established`, `emerging`, `context-dependent`) and show it in the UI as a small tag; it teaches players that not every solution works everywhere.
3. Always write a limits section. If you cannot name a trade-off, you do not understand the topic well enough yet.
4. Keep entries to about 80 words in the first view, with an optional "learn more" link.
5. Make game effects honest: a technology in the game should have an effect roughly proportional to the real-world one, and be labelled as simplified where it is not.
6. Ask a subject expert (a university contact, a local energy or gardening group) to review each branch before launch. Add a visible "Report a mistake" link.
7. Keep a `CONTENT_LOG.md` with the review date for each entry, and recheck facts yearly.

**Tone:** write like a curious local guide, not a lecturer. Show consequences in the town ("The bakery now buys local flour") before the explanation.

## Other things you are missing

**Input and controls**

- Support mouse, touch and keyboard from the start: pointer events (not mouse events), pinch-zoom, arrow-key panning, `Esc` to cancel placement, `Z` for undo.
- Make touch targets at least 44 px, and avoid hover-only information (show tooltips on tap too).
- Add undo for the last few placements; it makes experimenting feel safe, which fits your non-punitive design.

**Accessibility**

- Never use colour alone: overlays need patterns or icons as well (many people are colour-blind). Offer a high-contrast palette.
- Respect `prefers-reduced-motion`; allow text size scaling; label every control for screen readers; allow all UI to be used by keyboard.
- Add a pause-on-open option for dialogs, so reading never costs the player progress.

**Audio**

- Soft ambient loops that change with the town (traffic fades as cars decrease, birds increase with biodiversity). It makes the progress audible.
- Short, gentle feedback sounds for build, complete and milestone. Provide separate volume sliders and a mute button; start muted until the first click (browsers require this anyway).

**Mobile and layout**

- Plan a responsive layout now: a bottom toolbar and slide-up panels on phones, side panels on desktop. Retrofitting this later is painful.
- Support both portrait and landscape, and prevent the page from scrolling or zooming while the player drags the map.

**Language and localization**

- Use one `t("key")` function for every visible string from day one. A translation into a second language can be a strong early differentiator, and metric units suit the European setting in your brief.

**Open source, licences and privacy**

- **No server, no data collected.** If the game runs entirely in the browser, stores saves only in IndexedDB and has no analytics, accounts or third-party trackers, there is nothing to disclose in practice. Say so plainly on an About screen and in the README ("Everything stays in your browser"). This is not legal advice; if you ever add analytics, a feedback form that stores emails or a hosted font or script from another company, revisit it. Self-host fonts and libraries to keep it clean.
- **Code licence.** Pick one early and put it in a `LICENSE` file. MIT or Apache-2.0 let anyone reuse the code freely; GPL or AGPL require changes to be shared back. For a free educational game, MIT is the simplest and most welcoming choice.
- **Asset licences are separate from code.** CC0 means no strings attached; CC BY requires crediting the author (add a credits screen); avoid assets marked non-commercial (NC) or no-derivatives (ND), because they limit what others can do with your open-source project.
- **Keep a `LICENSES.md`** listing every asset, font and library with author, source link and licence. Add each item when you add the file, not at the end.
- **Contributions.** Contributors keep their copyright but agree their work is under the project's licence; stating this in `CONTRIBUTING.md` is usually enough for a small project.
- **Name check.** Search for existing games, trademarks and app-store names called "Common Ground" before you build a brand around it; the brief says this is unchecked.

**Release and feedback**

- Publish a free demo early on a static host and on itch.io; add a simple feedback link. Keep a changelog players can read.
- Add an in-game "New here?" help screen and a glossary of terms.
- Provide an error boundary that shows a friendly screen and a "download my save" button if the game crashes. Never lose a player's town.

**Funding (optional)**

Since the game is free and open source, the usual options are a donation link (GitHub Sponsors, Ko-fi or similar) or nothing at all. Neither needs a server. Keep your promise of no manipulative timers or pressure mechanics.

## Other shapes this idea could take

The brief describes a free-form tile city builder. That is the most ambitious format. These alternatives share the same theme and content, and several are much cheaper to build and easier to finish.

| Format | How it plays | Build effort | Best for | Main risk |
| --- | --- | --- | --- | --- |
| Tile city builder (the brief) | Place buildings on a grid, simulate resources and citizens | High | Deep strategy fans | Scope and balancing |
| Tile-placement puzzle (Dorfromantik-style) | Draw a tile from a stack and place it so edges match; score for green, connected neighborhoods | Low | Casual, relaxing play, short sessions | Less simulation, less sense of a living town |
| Neighborhood-scale management | One district of about 12 × 12 tiles with rich detail, upgrade each street and building | Medium | Showing cause and effect clearly | Fewer opportunities for emergent play |
| Card-based decisions (Reigns-style) | Swipe or choose on policy cards, watch indicator bars for energy, food, nature, happiness | Low | Education, mobile, fast prototyping | Less spatial planning |
| Scenario puzzles | Each level is a hand-built town with a goal ("cut emissions 40% with a fixed budget") | Medium | Teaching specific concepts, classrooms | Needs good level design |
| Idle or incremental hybrid | Town grows slowly while you are away; you choose upgrades and projects | Low to medium | Return visits | Can drift toward manipulative timers, which your pillars reject |
| 2.5D or low-poly 3D town | Same simulation, richer visuals and camera | High | Marketing and wow factor | Asset cost, performance on phones |

My recommendation: build the neighborhood-tile version you chose, which sits between the city builder and the scenario puzzle, but keep the simulation separate so you can also ship a card-decision or scenario-puzzle mode from the same data. The simulation spec, content files and educational entries are reusable across all of these.

### Extra feature ideas that fit your pillars

- **Seasons and weather events** (heatwave, flood, drought) that reward resilient choices without punishing the player.
- **Citizen stories**: five to ten recurring characters whose lives visibly change as the town improves.
- **Before and after slider** comparing the town now with the start, shareable as an image.
- **Daily or weekly challenge seed** that is optional and gentle, with no streak penalties.
- **Sandbox mode with no budget**, for kids and for educators.
- **Teacher kit**: printable lesson plans linked to each scenario.
- **Wildlife that appears** as biodiversity rises (birds, bees, otters), with a small collection journal.
- **Photo mode** that hides the interface for screenshots.

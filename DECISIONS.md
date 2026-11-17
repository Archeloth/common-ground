# Decisions

Short record of *why* the baseline is shaped this way, for future contributors.
Follow the plan document for design decisions there; this file covers tooling.

## 7 Nov 2026 — Milestone 0 baseline

**Package manager: Yarn.** The plan says `npm create vite`, but you asked for Yarn.
Yarn 1.22.19 was already installed, so the project is managed with it:
`yarn.lock` is committed and all scripts run through `yarn`.

- *Why classic (1.x) and not Yarn 4?* Yarn 1.22 is installed and risk-free on this
  machine; Yarn 4 (Berry) would add tooling risk for no baseline benefit. Note that
  `yarn create` (the scaffolder) is broken against the modern npm registry on newer
  Node versions (it rejects an unrelated stale package's engine field), so this
  baseline was written by hand and the deps were fetched with `yarn add`.
- *Planned upgrade:* when we want, `corepack enable` + `.yarnrc.yml` with
  `nodeLinker: node-modules` moves the repo to Yarn 4 without changing anything else.

**Scaffold.** Vite `react-ts` template files (Vite 8 shape): flat `eslint.config.js`,
project-references tsconfigs, and `"strict": true` (a Milestone 0 exit requirement).
The development plan's `Common Ground Development Plan.md` stays at the repo root.

**TypeScript is pinned to the 6.x line.** Yarn resolved `typescript@7.0.2` (the new
native compiler) but `typescript-eslint` refuses to load against 7.0, so the
project pins `typescript@6` (`^6.0.x`). Revisit once the lint toolchain supports
TS 7 (tracked upstream in typescript-eslint#10940); TypeScript 6 keeps the full
`tsc`/`tsc -b` behaviour used by the build.


**Folder structure.** `src/game`, `src/ui`, `src/data`, `src/persistence` per the
plan, each with a short `README.md` describing its boundary so the architecture
rule ("rules only in `src/game`", "content is data") survives as the file count
grows. The plan document is the authority on naming (PascalCase components,
camelCase functions, snake_case content ids).

**Vitest added in the baseline.** The plan requires an automated testing strategy
from Milestone 1 on ("simulation spec before the renderer"), so the test runner is
set up now with one smoke test; `yarn test` replaces specs as Milestone 1 lands.

**Licence: MIT** with "Common Ground contributors" as the copyright holder, per the
open-source section of the plan. Asset licences will be tracked separately in
`LICENSES.md` when assets arrive.

## 10 Nov 2026 — Milestone 3 decisions

**Projects and commands.** The three projects (community garden, rooftop solar,
retrofit program) live in `src/data/projects.json` as content.
`applyCommand(state, command)` in `src/game/state.ts` is the single validation
gate — in a pinned order (unknown ids → capacity → eligibility → budget/time) — and
returns `{ ok, reason }` so every refusal is testable and translatable. The picker
in the panel disables a project by asking `applyCommand` itself, so the UI can
never disagree with the rules.

**No refunds on removal.** Removing a project frees the slot but does not refund
budget or community time: the materials are already spent. If the balance ever
wants refunds it's a one-function change.

**Rooftop solar is blocked on farmland and woodland** (no roofs / the plan's
no-solar-on-farmland rule); a loader and test rule keep every kind with at least
two project options. The picker preview shows each project's *advertised* effect
on the need bars as the "expected change" until Milestone 4's simulation actually
moves them.

## 10 Nov 2026 — Milestone 4 decisions

**The store is framework-free.** `src/game/store.ts` owns the GameState and runs
the plan's fixed-timestep loop (`acc += dt * speed`; `while acc >= TICK_MS: tick`),
with a 250 ms delta clamp for hidden tabs and an automatic pause on
`visibilitychange`. React subscribes via `useSyncExternalStore` in
`src/ui/useGame.ts`, so `src/game` still imports nothing from the UI (the boundary
rule) and the store remains testable in Node through `step(now)`.

**Commands follow the plan's core pattern.** `startProject` / `removeProject` /
`setSpeed` (camelCase) replace the Milestone 3 snake_case literals; content ids
stay snake_case. Same validation order and reasons.

**Needs moved from content into state.** Coverage drifts toward
base + project effects at 2% per tick (`NEED_DRIFT_PER_TICK`), so a project's
effects arrive over 2–3 in-game months and can be watched — and explained — as
they happen. Satisfaction is the plan's weighted formula, smoothed 5%/tick;
reasons are *data* (`{ need, coverage }`, top three shortfalls) and the wording
lives in `t()`, so translations stay simple.

**Settlement is monthly, not per-tick.** On every 30th elapsed day: budget income
0.25 per resident and community-time regeneration `1 + round(avg engagement · 0.05)`
— both in `constants.ts` with reasons. Knowledge is stored and shown but has no
source yet (that arrives in Milestone 6).

## 10 Nov 2026 — Milestone 5 decisions

**Storage is IndexedDB only.** No server, no cloud — a ~50-line wrapper
(`src/persistence/db.ts`, `common-ground` DB) over native IndexedDB. Three
manual slots plus a separate `auto` slot, so an automatic save never clobbers a
manual one. The autosave runs every 60 seconds AND flushes on `pagehide`/hidden,
so closing the tab never loses more than a heartbeat.

**Saves are versioned and validated before they are ever opened**
(`saveFile.ts`): `migrateSave` runs the migration table in order, and
`validateGameState` (live in `src/game`, shared with the invariant tests)
refuses out-of-range or non-finite state with the offending path. A broken save
returns problems instead of throwing, so the UI can say "that save could not be
loaded" and the town keeps ticking — the Milestone 5 exit test.

**Loading a save is a bootstrap, not a command.** `store.replaceState(state)` is
the single entry used by the boot loader and .json import; gameplay still only
reaches the state through `dispatch`. Manual-slot writes are transactional
(`put`), so a failed write leaves the last known good autosave untouched.

## 10 Nov 2026 — Milestone 6 decisions

**Research is Knowledge, Knowledge comes from milestones.** The scenario starts
with 10 Knowledge (enough for the first research) and completing a milestone
pays more — the plan names milestones as a Knowledge source; schools/libraries
are future content. Research commands follow the same validation-order pattern
as projects (identity → already done → prerequisites → resources).

**The research tree is the three starting chains, not all six branches.** 8
entries: Energy audits → Building retrofits → Heat pumps, Community gardens →
Composting → Local food hubs, Safe streets → Public transport. The plan's
Circular/Ecology/Community branches and the deeper tiers (costs 25/40 in
Knowledge) are conspicuously absent so the panel stays readable; they join as
data when their projects (tool libraries, meadows, energy co-op) exist. Every
entry is a first draft from general knowledge — `sources: []` is intentional and
must be filled before release (plan content pipeline), tracked in NOTES.

**Milestones are data; chapters 2–5's tasks are honest placeholders.** Chapter 1
("First steps" — garden in Linden Flats, 3 retrofits, town satisfaction 60) is
fully completable today and is the M6 exit test. Chapters 2–5 use their *goal
metrics* (mobility 0.65, green 0.6, waste 0.7, energy 0.75 + satisfaction 70)
plus town-wide progress totals, because their plan-specified *tasks* (bus lines,
meadows, tool libraries, energy co-op, biodiversity, dynamic engagement) need
Milestone 7+ content. When that lands, adding the real task conditions is a
data-only change.

**Save format v1 → v2.** The research/milestone fields need a shape bump; the
migration seeds research from the scenario's starting techs and empty milestone
arrays. This is the first real use of the versioned save machinery from M5.

## 10 Nov 2026 — Milestone 7 decisions

**Engagement is a per-neighborhood dynamic resource.** It rises through town
meetings (+10, costs 1 Community time) and running projects (garden +5/month),
and it feeds the monthly Community-time regeneration and a small Community-time
discount on project costs (`1 − engagement/200`). It never decays on its own:
removing the garden just stops the growth. The plan's "completes projects
faster" line is implemented as the discount; "cheaper in money" was not added
to keep the economy legible.

**Bus lines are a link command, not a slot project.** The plan lists them as a
project, but they belong to *pairs of neighbourhoods*, not a slot: `startBusLine`
requires the `public_transport` research, costs 1,000 budget and zero Community
time, and adds +0.20 mobility to both endpoints. They live in their own
`GameState.busLines` list and draw as dashed lines on the canvas.

**Food sharing is surplus-only and split evenly.** Each tick, a neighbourhood
with an unclamped food supply above 1 shares the surplus at 70% efficiency
(transport losses) among its direct neighbours, raising their food target. The
sharer never loses coverage — only surplus flows out. This keeps the plan's
intent (farms lift their grid) with a small, deterministic rule.

**Resident messages are one per neighbourhood.** `messages.json` holds a short
request per scenario neighbourhood (start a specific project) with a small
one-time reward in Budget, Community time or Knowledge. `tick()` pays it once
when the request condition is met; the panel shows the text, reward and status.

**The exit test is two scripted bots.** `playthroughs.test.ts` runs a food-first
and a retrofit-first strategy that both complete the "First steps" milestone —
same goal, different build order, which is the plan's exit test in a
deterministic, CI-friendly form. Save format bumped to v3 with a migration from
v2 (seeds engagement/messages, empty bus list).
## 15 Nov 2026 - Milestone 8 decisions

**The tutorial is data-ish, not a cutscene.** `src/game/tutorial.ts` holds five
steps as conditions on state: open a panel, start a community garden in School
Green, watch its food bar pass 0.83, research Building retrofits, run a retrofit
programme. The intro step advances only through the player's "Continue" button
(the `tutorialNext` command); action steps auto-complete in `tick()` the moment
their condition is met, so the card never lies and replays stay deterministic.
Texts live in `i18n.ts`; the map highlights each step's target neighbourhoods
with pulsing rings (canvas animation, render-only, so the simulation stays
pure). Pacing is tuned by editing the step conditions.

**"What should I do next?" is a pure function.** `src/game/guidance.ts` picks
the best open goal: the tutorial step first, then the first unfulfilled
condition of the first uncompleted milestone (actionable conditions only), then
an open resident request, then the biggest town-wide need gap. It only suggests
starts `applyCommand` would accept, so the hint never sends the player into a
refusal banner. The UI is a small bottom-right button that can fly the player to
the neighbourhood in question.

**Save format v3 to v4.** `tutorialStep` joined the GameState. Migrated saves
start the tutorial finished (their player already knows how to play); fresh
games begin at step 0. Same migration-table pattern as before.

**The M8 exit test is a human playtest.** PLAYTEST.md carries the session script
and the success criteria (at least 3 of 5 testers reach "First steps" and say
they would keep playing). The automated suites now cover the tutorial walk, the
guidance priorities and the v3-to-v4 migration instead.
## 15 Nov 2026 - Milestone 8.5 decisions (first playtest feedback)

**Every technology unlocks something to build.** The playtest showed research
rarely changed what you could do: only three slot projects existed, and
nothing raised mobility or waste, so chapters 2-4 were nearly unreachable.
The tree now covers all six plan branches (16 entries), and every tech except
public transport (bus lines) gates at least one project through `requiresTech`.
The refusal `tech_not_researched` sits after the kind check and before
resources. The project picker lists only what can be built in that
neighbourhood now and summarises the rest in one line.

**Knowledge needs a steady source.** With 16 techs, milestone rewards alone
could deadlock a player: milestones pay Knowledge only after research-gated
goals are met. The school and library add +1 Knowledge a month, and each
Workshop series adds +2 (the plan names schools and libraries as Knowledge
sources). A balance probe that follows the goals reached chapters 1-3; the
pacing of chapters 3-5 is for the next playtest.

**Volunteer projects expire; infrastructure does not.** Gardens, compost,
markets, repair cafés, meadows, co-ops and workshops last 24-48 months. A lapsed
project keeps its slot but stops giving effects, engagement and Knowledge, and
no longer counts toward goals or requests. Renewal costs only Volunteers (no
Budget), opens in the last three months, and the new lifetime runs on from the
old end day, so early renewal is never punished. This keeps the plan's
non-punitive tone and gives Volunteers a long-term use. Saves v4 -> v5 give
running volunteer projects a full lifetime from the day of the save.

**"Community time" is shown as "Volunteers".** The old chip read "6 mo", which
players took for months. Only the UI text changed; the state field is still
`time`, so saves and tests did not churn.

**The river rule is a content check, not a command rule.** Bus lines already
follow neighbour links, and only the two bridge pairs are neighbours across the
water. The scenario validator now proves it: any neighbour link whose segment
crosses the river polyline must be a bridge. The map draws the bridges and
routes bus lines across them.

**Always open paused.** New towns start at speed 0, and every boot, load and
import is forced to pause, so reading the Lexicon never costs progress. A fresh
town opens the Lexicon on its welcome page.

**One toolbar, one open drawer.** Town, Research and Save are drawers in a
single toolbar; `useDismissable` closes the open one on an outside pointerdown
(capture phase, so a map drag counts) or Escape. The top bar's "+x/mo" figures
come from `economy.ts`, which `tick()` also uses for the monthly settlement, so
the UI cannot disagree with the rules.

**Known gap: Budget piles up.** The plan's ~3% monthly upkeep was never built,
so mid-game Budget grows without limit (a balance bot ended ten years with
hundreds of thousands unspent). That belongs in Milestone 9 balancing.

## 15 Nov 2026 - Milestone 8.6 decisions (main menu, goals, review)

**Code review findings, fixed.** The content loaders (`loadProjects`,
`loadTechnologies`, `loadMilestones`, `loadKinds`) re-parsed and re-validated
JSON on every call, from `tick()`, `applyCommand()` and each render. They are
now cached like `loadScenario`: a tick fell from ~0.49 ms to ~0.05 ms, and the
test suite runs ~3x faster. Other fixes: chapter 1's satisfaction goal was free
(the town starts at exactly 60.00, so the goal is now 64); one Esc closed the
lexicon *and* the panel beneath it (overlays now handle Esc in the capture phase
and mark it); confirmations used the red error banner; the map registered its
wheel listener twice; save export revoked its blob URL before the download
could start; "What next?" recomputed its hint every tick even when closed.

**Re-render cost was measured, not assumed.** A full `nextAction` costs well
under a millisecond, so a store-selector rewrite would have been churn without
benefit. The cheaper fix was to compute guidance only while its popover is open.

**Goals live in one place.** The always-visible GoalTracker replaced both the
milestone list in Research and the chapter section in the Town overview.
Expanded or collapsed is a per-viewer convenience in localStorage.

**Settings are device preferences, not save data.** They live in localStorage
(every access guarded) and apply through `<html data-motion data-text>`, so CSS
and the canvas react the same way. The audio sliders are stored now and wired
to an `audio.ts` facade, so Milestone 9 only adds the sounds.

**The menu protects the autosave.** The store holds a blank town until the
player chooses Continue, New game or Load, so autosave only runs while a
session is active. Returning to the menu flushes the autosave first.

## 15 Nov 2026 - Milestone 9 decisions (look, sound, polish, release prep)

**Art is drawn in code.** Every building, tree, project scene and creature is a
small vector function (`src/ui/render/sprites/`), so there are no image files,
no licence questions, crisp results at any zoom, and progress can change the
picture directly. Each project names its scene in `projects.json` (`visual`);
some also change the houses around them (solar on roofs, retrofitted roofs and
warm windows, heat pumps by the walls). A deterministic layout per district
(`scene/layout.ts`, seeded from the scenario) means the town never reshuffles.

**The state is visible in the picture.** Ground colour follows satisfaction,
parked cars follow mobility, chimney smoke follows energy, birds follow green
space, and lapsed projects fade to grey. Nothing new to learn: the map simply
shows what the panel says.

**Cache the districts, animate on top.** Each district is drawn once into its
own canvas, keyed by its look and a zoom bucket (steps of about 19%, always a
little above the real zoom, so it stays sharp), and is redrawn only when that
key changes. A frame is the river, sixteen image copies and a small living
layer (turbines, smoke, birds, bees, ripples, buses, pop-ins). Measured at
about 60 fps in headless Edge; `?debug` shows the numbers. Reduced motion
draws a still town and redraws only on change.

**Sound files: trimmed, credited, re-mappable.** The interface pack (OpenGameArt,
offered as CC-BY-SA 3.0 / GPL) is used under CC-BY-SA 3.0. The files were WAVs
named .ogg and padded to 3.4 s with silence (9 MB); `scripts/trim_audio.py`
trims them to 0.6 MB and is itself the record of the modification.
`soundMap.ts` is one table, so sounds can be re-mapped by ear. The author's
name still needs confirming from the OpenGameArt page (it blocks automated
reads); LICENSES.md and the credits mark it TO FILL IN.

**Ambience is generated, not recorded.** Wind is filtered brown noise with a
slow swell; birdsong is short synthesised chirps whose rate follows town-wide
green space, so a greener town sounds livelier. No files, nothing to license.

**Sounds stay out of the simulation.** The UI plays them: button clicks by
delegation (`data-sound`), command results in the game screen, and things the
simulation did by itself (a chapter completed, a request fulfilled, a project
lapsed) by comparing consecutive states.

**Phones get bottom sheets.** All small-screen rules live in `mobile.css`. The
neighbourhood panel and drawers become sheets, the goal tracker starts
collapsed, and a tap shows a district's card for a few seconds (touch has no
hover).

**Never lose a town, even on a crash.** The store lives in its own module, so
the error boundary can still offer "Download my save" after the UI fails. It
is the one class component (React requires it for error boundaries). The menu
also says "Opening your saves..." while IndexedDB starts up: on a slow disk it
can take a couple of seconds, and two greyed-out buttons with no explanation
looked broken.

## 15 Nov 2026 - Balance pass (scarcity) and two UI fixes

**Why.** Playtesting found that nothing was ever scarce. A goal-following bot
ended ten years with 320,000 Budget and 474 Knowledge; every slot was full by
year 2 and every technology researched by year 3. There were no running costs,
volunteers banked without limit, and milestones alone paid for most of the
research tree.

**Four levers, all in `constants.ts` and the content JSON:**
- *Upkeep*: 5% of a project's price per month, 60 per bus line; lapsed
  projects cost nothing. Money floors at 0 and nothing is ever removed or
  confiscated, to keep the plan's non-punitive tone; a stretched town just
  has nothing left over.
- *Taxes follow satisfaction*: 0.13 + 0.14 x satisfaction per resident (about
  2,500/month at 60). Good play pays; a neglected town earns less. The start
  budget is 10,000.
- *A volunteer cap*: 6 + two months of new volunteers. Idle volunteers drift
  away, and raising engagement raises both the income and the cap.
- *Deeper research costs more*, milestone rewards are trimmed, and workshop
  Knowledge grows with the square root of the series running ("the same keen
  people come to every workshop", as the tech card's limit already said).

**Measured, not guessed.** A goal-following bot and a simple "build
everything" bot ran before and after each change. Result: money stays tight
for about four years without ever leaving the player stuck (zero months under
300), all five chapters complete by year 2.8, the tree finishes in year 4, and
banked money at year 10 dropped from 320,000 to 65,000. Once every slot is
full, money piles up again slowly. That is the sandbox phase; there is nothing
left to buy, so no rule could make it scarce there. `balance.test.ts` guards
the shape (never negative, never over the cap, no hoarding, not the whole tree
in two years) without pinning exact numbers.

**What next? walks the research chain.** It points at the first technology
you can actually research ("Urban trees first"), and when Knowledge is out of
reach it suggests Community learning or a workshop series instead of silence.

**Drawers stay open.** Closing on any outside click made it impossible to pan
with the Town overview open. Drawers now close with their button, an x or
Esc. Choosing a district from the Town ranking keeps the drawer open on
desktop (on phones it closes, because the drawer and the bottom sheet would
overlap).

**The panel "flicker" was the map showing through.** Screencast recordings of
district-to-district clicks showed no remount and a one-frame content switch.
But the panel was 94% opaque over a map that animates every frame, so the
moving birds, bus, rings and selection outline showed through. The panel,
drawers and goal tracker are now opaque, and need bars are keyed per district
so they no longer ease from the previous district's values.

## 15 Nov 2026 - Playtest round: camera, sound, music and four improvements

**The camera jump.** Clicking a district after panning sent the camera back to
the centre. The map's resize handler re-framed the whole town on *every*
container resize, and the panel's slide-in animation could briefly overflow the
page and resize the map. Now the town is fitted only on the first size; later
resizes keep the zoom and the point at the centre of the view. The app and the
stage also clip overflow, so entrance animations cannot create scrollbars.

**Kinder sounds.** The "ring" (message.wav) played for town meetings and for
fulfilled requests, which happen often. It now plays only when a chapter is
completed. Requests use a higher-pitched drop, meetings a soft click, expiry a
cut, and refusals a low click. Each sound has a category (interface or game) and
an optional pitch.

**Music and four volume sliders.** "Peaceful Village" loops as the background
(CC BY; the author, link and licence version are still to be filled in, see
LICENSES.md). It streams from one `<audio>` element (preload none, started on
the first click), fades over 1.5 s, and is quieter while paused. The generated
birds stay on top; the generated wind is kept only as a fallback if the music
fails to load. Volumes are Master, Music, Interface and Game; an old
"effects" setting is migrated into both Interface and Game. The MP3 is 7.4 MB
because there was no encoder available to shrink it; re-encoding it to about
96 kbps is an easy later win.

**Town meetings have a cooldown** (save v6). One meeting per district every 60
days. A meeting spends one volunteer for +10 engagement, and without a limit it
could be repeated to max engagement in a few clicks. The refusal explains
itself ("Next meeting in 23 days").

**Undo the last action.** One step, for 8 seconds of real time: start, remove
or renew a project, research, a bus line or a town meeting. It restores a full
snapshot from before the action (so it is always consistent) but keeps the
current speed. The trade-off: the few in-game days since the action are rewound
too. That is harmless in a cosy game and much simpler than reversing each
command. Z or Ctrl+Z, or the toast's button.

**Construction time** (save v7). Projects take 7 to 45 days to build
(`buildDays` in projects.json). Effects, upkeep, Knowledge, milestones and
requests all wait for completion; the lifetime of a volunteer project starts
when it is finished. Scaffolding and a crane show on the plot with a progress
ring, and the pop-in and "+12% Food" labels happen on completion. Chapters now
spread to about year 4 in the bot runs, and money is still never stuck.

**Town history** (save v8). One point per month (satisfaction, budget and the
town-average of each need), capped at 240 points (20 years) so saves stay small.
The chart follows the dataviz rules: satisfaction and budget are separate
charts (never two scales on one), and the six needs are small multiples on a
shared 0-100% scale. Hover shows a tooltip, there is a table view and a
plain-language summary.

**Need colours were validated, not eyeballed.** The palette validator passes
every adjacent pair for colour-blind separation. Two things it flagged shaped
the design: energy-yellow and housing-pink are below 3:1 contrast on white, so
values are always written in ink with the colour only as a dot or tint; and
violet against blue fails the all-pairs check, so the needs are never drawn as
six lines on one chart.

**Seasons are visual only.** They follow the calendar months (winter is
December to February, so a new game opens in snow). They tint the ground,
change leaf and field colours, put snow on roofs and trees in winter, and thin
out the wildlife and birdsong. The simulation ignores them, so nothing about
balance changes; weather events are on the roadmap.

**Saves went from v5 to v8 in three steps** (meeting cooldown, construction,
history), one migration each, so every step is tested on its own.

## 15 Nov 2026 - Playtest round 5: renew all, fading engagement, map highlights

**Engagement fades, gently.** It now eases back towards a resting level of 30
each month: it loses 8% of the distance above 30 (at least 1 point), so a
district at 90 loses about 5 a month and one at 40 loses 1. A garden (+5 a
month) or a meeting every two months (+10) outpaces it. A flat -3 a month was
tried first and measured with the balance bot: engagement collapsed to the
floor, volunteer income dried up and only three of five chapters were ever
completed. With the proportional fade, chapters still all complete (the last
moves from year 4.0 to 4.7), engagement still reaches about 90 when it is looked
after, and money is never stuck. No save change: it is a rule, not new state.

**Renew all is one command** (`renewAll`), so it is pure, tested, and a single
Undo takes it all back. It renews lapsed projects in town order while the
volunteers last and is refused only if none could be renewed. The bar appears
when two or more popups are open, and says up front how many it can cover
("Renew 12 of 17 - 12 volunteers"). "Hide the popups" dismisses them all.

**Buses run on game time.** Their position follows a clock that advances only
while the game is running, so pausing stops them. The other small life (birds,
bees, smoke) keeps moving while paused; the town should not feel frozen.

**Hovering a town-wide need shows every district's own value** on the map: a
soft veil, each district outlined in the need's colour and a pill with its
value and a small bar. The text is ink and the colour fills only the bar (same
rule as the chips). It also works with keyboard focus, and it clears when the
drawer closes.

**Music**: the 96 kbps re-encode (2.2 MB) replaces the 7.4 MB original in
`public/`; the original stays in `audio-src/`.

## 17 Nov 2026 - After Milestone 9: map, journal, stories, colours, offline

**Districts share borders with their land neighbours.** The 4x4 grid became
staggered rows, and each district's outline (`src/game/outline.ts`) reaches
toward the neighbours it shares land with until they meet on a shared, gently
wavy seam. The seam is defined once per pair (seeded from the sorted ids), so
both sides compute the same curve. Every outline is clipped against every
other district's seam and kept clear of the river, so outlines never overlap
and hit-testing no longer depends on draw order. Districts that are not
neighbours keep a strip of open ground, so touching always means "connected".
The neighbour graph did not change, so saved bus lines stay valid. Tests check
no overlaps, a shared edge for every land pair, a gap for every other pair and
river clearance.

**Wildlife journal (save v9).** Twelve species, each tied to kinds of district
and to conditions there: a project (rain garden, meadow, compost), a need level
or a season. Conditions are checked per district by `conditions.ts`, which also
reuses the milestone conditions for town-wide checks. At most one new species a
month, +1 Knowledge each: a small nudge, never a balance lever. The badger in
the old woodland is the deliberate first find (month one), so players learn the
journal exists. Every note is a short real-world fact with a confidence tag.
Discovered species are drawn on the map wherever their home is right for them
now, so the map shows what is living there, not just what was once seen.

**Citizen stories.** Eight fictional residents, three chapters each, whose
conditions are checked against their own district. At most one postcard a
month, introductions before follow-ups, and none in the first two months. The
postcard never pauses the game and waits for the tutorial card to finish, so
the bottom-left corner never holds two things at once. Leo's last chapter
waits for the otter in the journal: the two features tell one story.

**A colour-blind need palette, validated for every pair.** The standard palette
passes colour-blind checks for neighbouring needs only; its food red and green
space green are almost the same for deuteranopes (Delta E 2.5). The alternative
uses the Okabe-Ito hues with a deeper green (#008c66) and passes every pair
(worst 9.0) and the normal-vision floor (worst 15.6). The palette is copied into
`NEED_COLORS` in place, like the season palette, so every reader follows it. An
optional pattern per need bar (stripes, dots, crosshatch, checks) means the bars
never rely on colour alone.

**Offline play without a dependency.** A small Vite plugin
(`scripts/offline-plugin.mjs`) writes `sw.js` at build time, precaching the
bundle and every public file; the cache name is a hash of their contents, so a
new build replaces it. Pages load network-first, files cache-first, and music
byte ranges are served from the cache. A new version is offered on the main
menu only (the game has autosaved by then) and never forces a reload.
`vite-plugin-pwa` was not used: the hand-written worker is about 60 lines,
and the project keeps its dependencies minimal.

**Weather events are deferred** (a choice of priorities, not difficulty). The
seasons still never change needs or money; they now also decide which wildlife
is about (frogs in spring, swifts in summer).

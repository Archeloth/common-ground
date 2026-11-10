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

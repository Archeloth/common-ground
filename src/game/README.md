# src/game — the simulation core

The only place game *rules* live (see the development plan, "Architecture at a glance").

Rules for this folder:

- **Pure functions only.** No DOM, no networking, no `Math.random()` — use the seeded
  generator (`random.ts`, mulberry32) so ticks and tests are reproducible.
- **State is plain JSON-friendly data.** Arrays and records, no `Map`/`Set`/class
  instances, so a save is just `JSON.stringify`.
- **Everything else reads snapshots.** The UI and renderer dispatch `Command` objects
  here and read back new state; they never edit state directly.
- **Content is data.** `scenario.ts` loads and validates `src/data/scenarios/*.json`
  and fails loudly with the offending id.

Current modules: `mulberry32` seeded rng (`random.ts`), seeded blob geometry
(`blob.ts`), point-in-polygon hit-testing (`geometry.ts`), data types (`types.ts`)
and the scenario loader/validator (`scenario.ts`) — all unit-tested.

Later milestones add the fixed-timestep loop, the tick function, commands and the
versioned save state — all spec'd so they can be unit-tested with no graphics.

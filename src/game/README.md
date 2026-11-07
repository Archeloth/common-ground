# src/game — the simulation core

The only place game *rules* live (see the development plan, "Architecture at a glance").

Rules for this folder:

- **Pure functions only.** No DOM, no networking, no `Math.random()` — use the seeded
  generator (mulberry32, added in Milestone 1) so ticks and tests are reproducible.
- **State is plain JSON-friendly data.** Arrays and records, no `Map`/`Set`/class
  instances, so a save is just `JSON.stringify`.
- **Everything else reads snapshots.** The UI and renderer dispatch `Command` objects
  here and read back new state; they never edit state directly.

Later milestones add the fixed-timestep loop, the tick function, commands and the
versioned save state — all spec'd so they can be unit-tested with no graphics.

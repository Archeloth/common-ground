# src/persistence — saves in the browser

Saving and loading, browser-side only. No accounts, no server, no analytics.

Rules for this folder:

- **Never trust an old save.** A `SaveFile` is versioned (`version` field) and every
  load runs through the migration table, so a save made by an older build still opens.
- **IndexedDB** is the store; autosave roughly once a minute plus manual slots
  (Milestone 5).
- A broken or corrupt save must show a friendly message — and a "download my save"
  button — never crash the game (and never lose a player's town).

Milestone 5 implements this folder; the versioned `SaveFile` shape is already
defined in the development plan's "Commands and a versioned save format" section.

Implemented (10 Nov 2026):

- `saveFile.ts` — versioned `SaveFile`, the migration table, and `parseAndLoad`
  (everything from raw JSON to a validated save; failures report problems).
- `db.ts` — the tiny promisified IndexedDB wrapper (`common-ground` DB, `saves`
  object store); browser-only.
- `slots.ts` — the four slot keys (`auto` + `s1`/`s2`/`s3`) and save/load/meta.
- `fileTransfer.ts` — export/import of a save as a `.json` file.
- `src/game/validate.ts` — `validateGameState`: the range/shape checks every
  save must pass before the game will open it.

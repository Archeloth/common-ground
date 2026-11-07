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

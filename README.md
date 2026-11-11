# Common Ground

An open-source, browser-only educational game about turning a small town into a
place where people live better together. You play as a community organizer:
neighborhoods are soft blobs you watch improve as you start grassroots projects.

> **Everything stays in your browser.** Saves live in your own IndexedDB, we collect
> no data, there are no accounts and no analytics.

## Current status

**Milestone 6 — research and goals.** The town has a research tree
(`src/data/technologies.json`): eight technologies across three chains (Energy
audits → Building retrofits → Heat pumps; Community gardens → Composting →
Local food hubs; Safe streets → Public transport). The **Research** menu shows
education cards — what it does, its benefit, its honest limit, and a confidence
tag (established / emerging / context) — and research costs **Knowledge**
(10 to start from the scenario, then earned by completing milestones).

The five chapter milestones (`src/data/milestones.json`) are data with
state-checkable conditions; `tick()` completes them the moment they are met, a
banner tells you, and each one pays a Knowledge reward. Save files are v2 (a
v1 save auto-migrates, seeding research from the scenario).

Saves are versioned and validated before use (three slots + autosave, plus
`.json` export/import); a broken save never crashes the town. Click any blob
for its panel: live need bars, smoothed satisfaction, top-three shortfalls in
plain language, and the project picker. The top bar shows Budget, Community
time, Knowledge, the date and speed (pause · 1× · 2× · 4×); all visible strings
go through one `t("key")` function.

Controls: **drag** to pan · **scroll / pinch** to zoom · **hover** to inspect ·
**click** to select · **Esc** to close the panel. Save (**💾 Save**) and
**Research** menus sit at the top-left.

## Stack and decisions

- **React + TypeScript** with the Vite `react-ts` template (per the development plan).
- **Yarn** instead of npm (see `DECISIONS.md` for why, and the planned Yarn 4 move).
- Simulation core separate from rendering: `src/game` (rules), `src/ui` (React +
  Canvas), `src/data` (JSON content), `src/persistence` (IndexedDB saves).
- Full design: [`Common Ground Development Plan.md`](Common%20Ground%20Development%20Plan.md).

## Run it

Requires Node.js (current LTS) and Yarn 1.22+.

```sh
yarn install   # first time only
yarn dev       # dev server with hot reload
yarn lint      # ESLint
yarn test      # Vitest unit tests (rng, blobs, geometry, camera, content data, commands, tick, store, milestones, research, saves, state validation, determinism, invariants)
yarn build     # type-check + production build into dist/
yarn preview   # serve the production build locally
```

## Deploy

The game is designed for free static hosting (GitHub Pages, Netlify or Cloudflare
Pages). On GitHub Pages, set Vite's `base` option in `vite.config.ts` to your
repository name first.

## License

MIT — see [`LICENSE`](LICENSE). Contributions are welcome; see
[`CONTRIBUTING.md`](CONTRIBUTING.md).

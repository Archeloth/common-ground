# Common Ground

An open-source, browser-only educational game about turning a small town into a
place where people live better together. You play as a community organizer:
neighborhoods are soft blobs you watch improve as you start grassroots projects.

> **Everything stays in your browser.** Saves live in your own IndexedDB, we collect
> no data, there are no accounts and no analytics.

## Current status

**Milestone 3 — projects and slots.** Every neighborhood has project slots you can
fill from three projects (community garden, rooftop solar, retrofit program — the
catalog in `src/data/projects.json`). Each project shows its cost and community
time, previews its effects on the need bars, and is validated before it starts
(free slot, allowed kind, budget, time) — refusals return a clear reason. Budget
and community time chips sit in the header, slots fill in order, and removing a
project frees the slot without a refund.

Click any blob to open its side panel: name, kind and description (from the kinds
catalog in `src/data/neighborhoods.json`), residents, engagement, slots, the six
need bars and a placeholder satisfaction (the plan's weighted formula — reasons
and smoothing arrive in Milestone 4). Nearby neighbors and bridges are listed,
every kind is validated against the simulation's kind union, and all visible
strings go through one `t("key")` function, ready for translation.

Controls: **drag** to pan · **scroll / pinch** to zoom · **hover** to inspect ·
**click** to select · **Esc** to close the panel.

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
yarn test      # Vitest unit tests (rng, blob geometry, hit-testing, camera, scenario + kinds data, satisfaction, projects, commands)
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

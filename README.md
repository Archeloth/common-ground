# Common Ground

An open-source, browser-only educational game about turning a small town into a
place where people live better together. You play as a community organizer:
neighborhoods are soft blobs you watch improve as you start grassroots projects.

> **Everything stays in your browser.** Saves live in your own IndexedDB, we collect
> no data, there are no accounts and no analytics.

## Current status

**Milestone 4 — time, needs and satisfaction.** The simulation now runs the
plan's fixed-timestep loop: one tick is one in-game day, 30 ticks make a month,
and the top bar shows Budget, Community time, Knowledge, the in-game date and
speed controls (pause · 1× · 2× · 4×; hidden tabs pause automatically). Every
month the town earns budget from local taxes (~0.25 per resident) and community
time from the average engagement.

Needs are now live simulation values: coverage drifts toward the
base-plus-project-effects target, the panel shows the smoothed satisfaction and
the **top three shortfalls in plain language**, and starting or removing a
project visibly moves the need bars and changes the reasons list — the Milestone
4 exit test.

Click any blob to open its side panel: name, kind and description (from the
kinds catalog in `src/data/neighborhoods.json`), residents, engagement, slots,
six live need bars, satisfaction, reasons, and the project picker (`projects.json`:
community garden, rooftop solar, retrofit program — validated before starting,
WITH a clear refusal reason). Nearby neighbors and bridges are listed, and all
visible strings go through one `t("key")` function, ready for translation.

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
yarn test      # Vitest unit tests (rng, blobs, geometry, camera, scenario + kinds + projects data, commands, tick, store, satisfactions & reasons, determinism, invariants)
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

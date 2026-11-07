# Common Ground

An open-source, browser-only educational game about turning a small town into a
place where people live better together. You play as a community organizer:
neighborhoods are soft blobs you watch improve as you start grassroots projects.

> **Everything stays in your browser.** Saves live in your own IndexedDB, we collect
> no data, there are no accounts and no analytics.

## Current status

**Milestone 1 — blobs on screen.** The 16 hand-placed Willowbrook neighborhoods are
drawn as soft, raised blobs on a canvas (seeded shapes — the same seed always gives
the same town), with a river between the two banks. Hover lifts a neighborhood,
click selects it, and you can pan by dragging and zoom with the wheel or a pinch.
The seeded generator and neighbourhood geometry are unit-tested, and the scenario
data is validated on load.

Controls: **drag** to pan · **scroll / pinch** to zoom · **hover** to inspect ·
**click** to select.

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
yarn test      # Vitest unit tests (seeded rng, blob geometry, hit-testing, camera, scenario data)
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

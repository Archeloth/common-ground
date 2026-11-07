# Common Ground

An open-source, browser-only educational game about turning a small town into a
place where people live better together. You play as a community organizer:
neighborhoods are soft blobs you watch improve as you start grassroots projects.

> **Everything stays in your browser.** Saves live in your own IndexedDB, we collect
> no data, there are no accounts and no analytics.

## Current status

**Milestone 0 — baseline.** Vite + React + TypeScript scaffold (function components
and hooks only, strict TypeScript), the basic linter from the Vite template, and the
simulation folder layout. The page is a placeholder shell; the actual game starts
with Milestone 1 (neighborhood blobs on a canvas).

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
yarn test      # Vitest unit tests (simulation specs start in Milestone 1)
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

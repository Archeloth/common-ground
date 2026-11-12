# Common Ground

An open-source, browser-only educational game about turning a small town into a
place where people live better together. You play as a community organizer:
neighborhoods are soft blobs you watch improve as you start grassroots projects.

> **Everything stays in your browser.** Saves live in your own IndexedDB, we collect
> no data, there are no accounts and no analytics.

## Current status

**Milestone 7 — organizer mechanics and links.** Engagement is now a real,
per-neighborhood resource: **town meetings** (in each blob's panel) cost 1
Community time and raise engagement by 10, running projects (gardens +5/month)
nudge it up, and high engagement regenerates more Community time and **discounts
project Community time**. Bus links (`public_transport` research, 1,000 budget)
connect adjacent neighbourhoods, add +0.20 mobility to both, and render as
dashed lines on the map. Food surplus flows from food-rich neighbourhoods to
their neighbours at 70% efficiency, and every neighbourhood has one **resident
request** with a small reward (start the project they ask for).

The five chapter milestones, research tree (education cards with confidence
tags), three-slot autosave system, live need bars and plain-language reasons
all keep working. Saves are versioned (v3) and validated before use; a broken
save never crashes the town. The top bar shows Budget, Community time,
Knowledge, the date and speed (pause · 1× · 2× · 4×); every visible string goes
through one `t("key")` function.

The Milestone 7 exit test is automated: two scripted bot playthroughs (food-first
and retrofit-first) both complete the "First steps" milestone by different
routes.

Controls: **drag** to pan · **scroll / pinch** to zoom · **hover** to inspect ·
**click** to select · **Esc** to close. **Save** and **Research** menus sit at
the top-left.

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
yarn test      # Vitest unit tests (rng, blobs, geometry, camera, content data, commands, tick, store, milestones, research, messages, saves, state validation, two-route playthroughs, determinism, invariants)
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

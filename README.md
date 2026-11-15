# Common Ground

An open-source, browser-only educational game about turning a small town into a
place where people live better together. You play as a community organizer:
neighborhoods are soft blobs you watch improve as you start grassroots projects.

> **Everything stays in your browser.** Saves live in your own IndexedDB, we collect
> no data, there are no accounts and no analytics.

## Current status

**Milestone 8.5 - first playtest feedback.** The first playtest was fun but
turned up ten points, all addressed:

- **More to build.** 16 technologies across all six branches of the plan
  unlock 15 research-gated projects (heat pumps, energy co-ops, compost
  points, markets, safe streets, bike share, repair cafés, recycling, meadows,
  street trees, rain gardens, workshops). Chapters 2-5 now use real tasks.
- **Project lifetimes.** Volunteer-run projects last two to four years. When
  one lapses, a bubble pops up on its district and an hourglass marks it on
  the map; renewing costs only Volunteers. Infrastructure is permanent.
- **Volunteers** replace the unclear "Community time".
- **A paused start and a Lexicon.** Every town opens paused, and a fresh town
  opens the Lexicon (15 entries explaining every mechanic) on a welcome page.
- **Easier overview.** One toolbar (Town, Research, Save, Lexicon) whose
  drawers close when you click away; a **Town** overview with town-wide stats,
  chapter progress and a neighbourhood ranking; neighbourhood panel tabs
  (Overview, Projects, Community); satisfaction stats on hover; and resources
  showing their monthly change.
- **Calendar and bridges.** Time reads "Year 2 · March 12". The river has two
  visible bridges, and bus lines cross only there.

The Milestone 8 systems keep working: the scripted tutorial, "What next?",
town meetings, bus links, food sharing, resident requests, five chapters and
the three-slot autosave. Saves are versioned (v5) and validated before use.
See PLAYTEST.md for the round-2 checklist.

Controls: **drag** to pan - **scroll / pinch** to zoom - **hover** for a
neighbourhood's stats - **click** to open it - **Esc** closes panels and
drawers. The toolbar sits at the top-left, **What next?** at the bottom-right.

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
yarn test      # Vitest unit tests (rng, blobs, geometry, camera, calendar, content data, commands, tick, economy, project lifetimes, store, milestones, research, messages, tutorial, guidance, lexicon, saves, state validation, bot playthroughs, determinism, invariants)
yarn build     # type-check + production build into dist/
yarn preview   # serve the production build locally
```

## Deploy

The game is designed for free static hosting (GitHub Pages, Netlify or Cloudflare
Pages). On GitHub Pages, set Vite's `base` option in `vite.config.ts` to your
repository name first.

## License

MIT - see [`LICENSE`](LICENSE). Contributions are welcome; see
[`CONTRIBUTING.md`](CONTRIBUTING.md).
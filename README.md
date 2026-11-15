# Common Ground

An open-source, browser-only educational game about turning a small town into a
place where people live better together. You play as a community organizer:
neighborhoods are soft blobs you watch improve as you start grassroots projects.

> **Everything stays in your browser.** Saves live in your own IndexedDB, we collect
> no data, there are no accounts and no analytics.

## Current status

**Milestone 8 - tutorial and first playtest.** New games open with a scripted
first fifteen minutes: three problem neighbourhoods pulse on the map, a card
walks you through opening a panel, starting a community garden in School Green,
watching the bars rise, researching Building retrofits and running a retrofit
programme. Action steps complete themselves the moment you do them; the intro
step waits for "Continue". A "What next?" button at the bottom-right reads the
open goals (tutorial step, milestones, resident requests, need gaps) and can fly
you straight to the neighbourhood it recommends.

The Milestone 7 systems keep working: town meetings and dynamic engagement, bus
links, food sharing and resident requests, the research tree, five chapter
milestones, the three-slot autosave and live need bars. Saves are versioned (v4)
and validated before use; a broken save never crashes the town. The M7 exit test
(two bot playthroughs to "First steps") still passes. The M8 exit test is a
human playtest - see PLAYTEST.md for the session script and success criteria
(at least 3 of 5 testers reach "First steps" and say they would keep playing).

Controls: **drag** to pan - **scroll / pinch** to zoom - **hover** to inspect -
**click** to select - **Esc** to close. **Save** and **Research** menus sit at
the top-left; **What next?** at the bottom-right.

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
yarn test      # Vitest unit tests (rng, blobs, geometry, camera, content data, commands, tick, store, milestones, research, messages, tutorial, guidance, saves, state validation, two-route playthroughs, determinism, invariants)
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
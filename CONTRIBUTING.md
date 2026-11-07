# Contributing to Common Ground

Thanks for helping build a friendly, educational game about better towns.

## Ground rules

- **Code licence is MIT.** By contributing you keep your copyright but agree your
  work is available under the project's MIT licence (the plan says stating this in
  `CONTRIBUTING.md` is enough for a small project).
- **Read the plan first.** The design, balance numbers and milestones all live in
  [`Common Ground Development Plan.md`](Common%20Ground%20Development%20Plan.md).
  Don't start a milestone before the previous exit test passes.
- **Keep the architecture rule.** Game rules only in `src/game`, and it stays pure
  (no DOM, no `Math.random()`, plain JSON-friendly state). Content is data in
  `src/data`; the UI only dispatches commands.
- **Every educational claim carries a source**, a check date and a `confidence` tag
  (see the content pipeline in the plan).

## Workflow

1. Small, clearly-messaged commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
2. Run `yarn lint`, `yarn test` and `yarn build` before pushing.
3. For content additions (a technology entry, a fact check), a "good first issue"
   label is welcome — see `DECISIONS.md` for why we chose things.

If a fact or number looks wrong, add a "Report a mistake" issue rather than silently
changing content.

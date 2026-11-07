# src/data — data-driven content

Projects, neighborhoods, technologies and events are *data*, not code. Adding content
should never require a change in the simulation.

Rules for this folder:

- **JSON files only** (plus the small validators that check them at startup and in
  unit tests), so a typo in `projects.json` fails loudly with the entry's id.
- **Content ids are `snake_case` strings** (`"community_garden"`), and every
  educational entry carries a source, a check date and a `confidence` tag
  (established / emerging / context-dependent) per the content pipeline in the plan.

Milestone 2 onward adds `neighborhoods.json`, `projects.json`, `technologies.json`
and the `scenarios/` folder here.

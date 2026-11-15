# Licences

Common Ground keeps its code and its assets under separate licences. This file
lists every third-party asset, with its author, source and licence (as the
development plan asks: add each item when it is added, not at the end).

## Code

All source code in this repository is under the **MIT licence** (see
[`LICENSE`](LICENSE)). That includes the art, which is drawn in code
(`src/ui/render/sprites/`), and the extra birdsong, which is generated with Web
Audio (`src/ui/ambience.ts`). Neither uses any image or audio file.

## Music

| File | Title | Author | Licence | Changes |
| --- | --- | --- | --- | --- |
| `public/audio/music/peaceful-village.mp3` | Peaceful Village | **TO FILL IN: author and source link** | **CC BY** (version TO FILL IN, e.g. 3.0 or 4.0) | None (renamed only). |

CC BY requires credit: the game shows it in **Main menu -> Credits**.

> **Release checklist:** confirm the track's author, source link and CC BY
> version, then replace the "TO FILL IN" entries above and the
> `credits.musicAuthor` string in `src/ui/i18n.ts`.

## Sound effects

| Files | Source | Author | Licence | Changes |
| --- | --- | --- | --- | --- |
| `public/audio/*.wav` (15 files) | [Interface Sounds Starter Pack](https://opengameart.org/content/interface-sounds-starter-pack), OpenGameArt.org | **TO FILL IN: the author named on the OpenGameArt page** | Offered under CC-BY-SA 3.0, GPL 2.0 or GPL 3.0; **used here under [CC-BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)** | Trimmed leading/trailing silence, 15 ms fade-out, saved as WAV (the originals were WAV data with an .ogg extension). Script: [`scripts/trim_audio.py`](scripts/trim_audio.py). |

ShareAlike applies to the sound files only: the trimmed versions in
`public/audio/` are shared under CC-BY-SA 3.0 as well. The game shows this
credit in **Main menu → Credits**.

> **Release checklist:** before publishing, confirm the author's name on the
> OpenGameArt page and replace the "TO FILL IN" entry above and the
> `credits.soundsAuthor` string in `src/ui/i18n.ts`.

## Fonts

None. The UI uses the player's own system fonts (`ui-rounded`, `system-ui` and
fallbacks), so no font files are shipped and nothing is loaded from other
servers.

## Libraries

React, React DOM and the build tooling are installed from npm under their own
licences (MIT for React and Vite). See `package.json`; nothing is loaded from a
CDN at runtime.

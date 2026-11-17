# O Baque Virado

An interactive, animated explainer of maracatu de baque virado, the drum music of Recife, played
with real one-shot drum samples. It walks through the instruments, the measured swing, the
offbeat and the seven baques, then ends on the unison virada. The interface is in Brazilian
Portuguese.

Live: <https://batuque.martonpaulo.com>

## Run locally

There is no build step: the page is plain HTML, CSS and ES modules.

```sh
pnpm install
pnpm serve
```

Then open <http://127.0.0.1:8000>. A server is needed because the modules and the sounds are fetched.

Sounds load on demand: a phone downloads only the default sounds (11 AAC files, about 92 KB); the alternative
sounds a desktop viewer can pick are fetched when chosen.

## Project structure

- `index.html`, `styles.css` - the page and its layout.
- `src/rhythms/maracatu.js` - the maracatu package: tempo, voices, swing, patterns (`barHits`), the show script, readout layouts, background looks, sounds and its copy.
- `src/rhythms/coco-xamba.js` - the Coco da Xambá package, in 2/4 (open it at `/coco`).
- `src/rhythms/index.js` - the rhythms the site ships, their paths (`/<id>`) and the one a page shows.
- `src/rhythms/preparing.js` - the rhythms that have a path but no show yet.
- `tools/build-site.mjs` - builds the deployed site, with one page per rhythm path.
- `src/music.js` - the meter, voices and swing of the rhythm on show, as the engine reads them.
- `src/show.js` - a rhythm's scenes, its timeline and what sounds at any moment.
- `src/audio.js` - sound choices, the lazy sample bank, the live player and the offline WAV render.
- `src/copy.js` - the interface's words around the rhythm's own (Brazilian Portuguese).
- `src/util.js` - small helpers, including the deterministic `hash` that seeds per-hit variation.
- `src/theme.js` - the shared colour palette and fonts.
- `src/score.js` - one-line percussion notation as an SVG string.
- `src/scope.js` - the rhythm wheel.
- `src/readout.js` and `src/readout-markup.js` - the readout under the wheel.
- `src/title.js` - scene titles and labels.
- `src/background.js` - the animated WebGL background.
- `src/lanes.js` - the per-voice hit lanes.
- `src/controls.js` - the keyboard, the scene timeline and the sound controls.
- `src/main.js` - wires everything together and exposes `window.baque` for the exporter.
- `fonts/` - Space Grotesk and JetBrains Mono (Latin subsets, SIL Open Font License; see [CREDITS.md](CREDITS.md)).
- `sounds/` - the samples: WAV masters and the AAC (`.m4a`) files the page fetches (see [CREDITS.md](CREDITS.md)).
- `tools/encode-sounds.mjs` - encodes each WAV to AAC at 96 kbps (`node tools/encode-sounds.mjs`, needs `ffmpeg`).
- `tools/make-coco-sounds.mjs` - synthesizes the coco's pandeiro and palmas WAV masters (`node tools/make-coco-sounds.mjs`).
- `tests/` - unit tests of the DOM-free modules, and browser tests of the page in headless Chromium (`tests/page.test.js`, `tests/sounds-decode.test.js`).
- `tools/static-server.mjs` - the local static server (`pnpm serve`).
- `tools/export-video.mjs` - the vertical video exporter.
- [docs/research/expansion-decisions.md](docs/research/expansion-decisions.md) - the decisions for growing from one rhythm show to seven.
- [docs/research/frevo-manguebeat-coco.md](docs/research/frevo-manguebeat-coco.md) - research on frevo, manguebeat and coco da Xambá.
- [docs/research/brega-forro.md](docs/research/brega-forro.md) - research on brega romântico, brega funk and forró pé-de-serra.
- [docs/research/pernambuco-rhythms-feeling.md](docs/research/pernambuco-rhythms-feeling.md) - why Pernambuco rhythms move people.
- [docs/research/music-cognition.md](docs/research/music-cognition.md) - music cognition and semiotics for the shows.
- [docs/research/colour-and-visuals.md](docs/research/colour-and-visuals.md) - colour and animation evidence for the rhythm backgrounds.
- [docs/sketches/scripts.html](docs/sketches/scripts.html) - throwaway sketch of the show scripts.
- [docs/sketches/backgrounds.html](docs/sketches/backgrounds.html) - throwaway sketch of the rhythm backgrounds.

## Tests

```sh
pnpm test
pnpm validate
```

`pnpm validate` runs exactly what CI runs: Biome, the tests, `scripts/text_check.py` and
`scripts/dry_check.py`. The tests use `node:test` and cover the timeline, the special bars, the patterns, the sound files
and the pinned `hash` values. The browser tests load the page in headless Chromium: `CHROME_PATH`
if set, else the pinned Chrome headless shell that `node tools/install-browser.mjs` downloads to
`.scratch/browsers` (CI does this), else a Chrome or Chromium found on the machine.

## Video export

Renders the page to a 1080x1920, 30 fps H.264 MP4 with the offline-rendered audio (AAC 320k).
It needs Google Chrome for Testing and `ffmpeg`; set `CHROME_PATH` and `FFMPEG_PATH` when they are
not at the macOS defaults.

```sh
pnpm export index.html out/baque-virado.mp4
pnpm export index.html out/clip.mp4 --from 10 --to 25 --loudnorm
```

- `--from` / `--to` - the segment to export, in seconds.
- `--loudnorm` - two-pass loudness normalisation to -14 LUFS, true peak -1.5 dBTP.

## Sources

- Alfaia hand patterns: the pattern table published at
  [lansdownsoftware.com](https://lansdownsoftware.com).
- Swing: the median offset of each sixteenth, measured on a workshop recording by Batuk Nagô.
- Sounds: Freesound, public domain (CC0); authors in [CREDITS.md](CREDITS.md).

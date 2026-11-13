# O Baque Virado

An interactive, animated explainer of maracatu de baque virado, the drum music of Recife, played
with real one-shot drum samples. It walks through the instruments, the measured swing, the
offbeat and the seven baques, then ends on the unison virada. The interface is in Brazilian
Portuguese.

Live: <https://baquevirado.martonpaulo.com>

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
- `src/music.js` - tempo, voices, the measured swing and every rhythmic pattern (`barHits`).
- `src/show.js` - the scenes, the 54-bar timeline and what sounds at any moment.
- `src/audio.js` - sound choices, the lazy sample bank, the live player and the offline WAV render.
- `src/copy.js` - every word the viewer reads (Brazilian Portuguese).
- `src/util.js` - small helpers, including the deterministic `hash` that seeds per-hit variation.
- `src/theme.js` - the shared colour palette and fonts.
- `src/score.js` - one-line percussion notation as an SVG string.
- `src/scope.js` - the rhythm wheel.
- `src/readout.js` - the numeric readouts of each scene.
- `src/title.js` - scene titles and labels.
- `src/background.js` - the animated WebGL background.
- `src/lanes.js` - the per-voice hit lanes.
- `src/controls.js` - play, pause, scene and sound controls.
- `src/main.js` - wires everything together and exposes `window.baque` for the exporter.
- `fonts/` - Space Grotesk and JetBrains Mono (Latin subsets, SIL Open Font License; see [CREDITS.md](CREDITS.md)).
- `sounds/` - the samples: WAV masters and the AAC (`.m4a`) files the page fetches (see [CREDITS.md](CREDITS.md)).
- `tools/encode-sounds.mjs` - encodes each WAV to AAC at 96 kbps (`node tools/encode-sounds.mjs`, needs `ffmpeg`).
- `tests/` - unit tests of the DOM-free modules, and browser tests of the page in headless Chromium (`tests/page.test.js`, `tests/sounds-decode.test.js`).
- `tools/static-server.mjs` - the local static server (`pnpm serve`).
- `tools/export-video.mjs` - the vertical video exporter.

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

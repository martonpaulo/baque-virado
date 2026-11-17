# Architecture

Status: proposed for [#29](https://github.com/martonpaulo/baque-virado/issues/29), first phase.
No code moved yet: the code moves only after the rhythms in progress settle, in the steps of
[Migration](#migration).

## Contents

- [Why layers](#why-layers)
- [The layers](#the-layers)
- [Dependency rule](#dependency-rule)
- [Where the code stands today](#where-the-code-stands-today)
- [Ideas from Panoram and Ink Tools](#ideas-from-panoram-and-ink-tools)
- [The automatic check](#the-automatic-check)
- [Migration](#migration)

## Why layers

The site shows one rhythm per page load from one package in `src/rhythms/`. With seven rhythms,
two things change often and must stay apart:

1. **The rhythms.** Each new rhythm adds voices, patterns, scenes, a readout, sometimes its own
   synthesized sounds or background. A new rhythm must not change the engine or the views.
2. **The browser.** Web Audio, the DOM, WebGL, `location` and `localStorage` are the only parts
   that need a browser. Everything else runs in Node, so the tests can render a show without one.

## The layers

From the bottom up. A layer may import its own layer and the layers below it, never a layer above.

| Layer           | What it holds                                                                                                                                                                 | Files today                                                                                                                                                                                                                                        |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Tokens       | Design tokens as plain data: colours, fonts, tints                                                                                                                            | `src/theme.js`                                                                                                                                                                                                                                     |
| 1. Data         | One package per rhythm: tempo, meter, voices, patterns, scenes, the rhythm's own words                                                                                        | `src/rhythms/<id>.js`, `src/rhythms/index.js` (the list)                                                                                                                                                                                           |
| 2. Engine       | Pure, deterministic, browser-free: meter, timeline, hits, scheduling, per-hit variation, audio graph built on a context it is given                                           | `src/music.js`, `src/show.js`, the pure part of `src/util.js` and `src/audio.js`, `src/rhythms/<id>-sounds.js`                                                                                                                                     |
| 3. Presentation | Views that turn an engine state into markup or pixels on a target they are given: wheel, lanes, readout, score, background, title, controls, copy                             | `src/scope.js`, `src/lanes.js`, `src/readout.js`, `src/readout-markup.js`, `src/score.js`, `src/background.js`, `src/title.js`, `src/controls.js`, `src/copy.js`, `src/waves.js`, `src/rhythms/<id>-background.js`, `src/rhythms/<id>-backdrop.js` |
| 4. Platform     | The only code that names a browser global: `AudioContext`, `OfflineAudioContext`, `fetch` of samples, `document`, `location` (the `/<id>` path and `?ritmo=`), `localStorage` | inside `src/audio.js`, `src/util.js`, `src/controls.js`, `src/rhythms/index.js` today                                                                                                                                                              |
| 5. App          | The composition root: reads the route, picks the rhythm, builds engine, views and platform, and starts the loop                                                               | `src/main.js`                                                                                                                                                                                                                                      |

A rhythm package is a vertical slice, as an Ink Tools plugin is: its files sit in one folder but
in different layers, told apart by their suffix. `<id>.js` is data; `<id>-sounds.js` is engine;
`<id>-readout.js`, `<id>-background.js` and `<id>-backdrop.js` are presentation. Only
`src/rhythms/index.js` lists the packages, and only the engine and views read their fields
([#18](https://github.com/martonpaulo/baque-virado/issues/18)).

## Dependency rule

1. **Imports go down.** Tokens import nothing. Data imports only tokens and its own data files.
   The engine imports data and tokens. Presentation imports the engine, data and tokens. Only the
   app imports everything.
2. **Browser globals stay in the platform and the app.** Tokens, data and the engine never name
   `window`, `document`, `location`, `localStorage`, `fetch`, `AudioContext` or
   `OfflineAudioContext`. A view draws on the element or canvas the app gives it; a sound graph
   connects to the context the app gives it.
3. **One rhythm is an argument, not a global.** The engine takes a rhythm package as a parameter
   (`createShow(rhythm)` and `meterOf(rhythm)` already do). The route is read once, in the app,
   so a test can build any rhythm in the same process.
4. **A rhythm's readout layout is presentation.** It moves from `<id>.js` to `<id>-readout.js`,
   which may import `readout-markup.js` and `score.js`; the data file keeps only the layout's name.
5. **Stable seeds stay put.** `VOICE_ORDER` and `hash` keep their values through every move
   (`AGENTS.md`, Project commands and patterns).

## Where the code stands today

Read on branch `ritmos` at `066315a`, with four rhythm packages merged and three more in `ROUTES` as being prepared. Each line breaks a rule
above and becomes one allowlist entry of the check until its step lands.

- Data imports presentation: `src/rhythms/maracatu.js` imports `readout-markup.js` and
  `score.js`; `coco-xamba.js`, `forro.js` and `bregafunk.js` import `readout-markup.js`
  (rule 4).
- Data imports a background: `forro.js` imports `forro-backdrop.js` and `bregafunk.js` imports
  `bregafunk-background.js` (rule 1).
- The route lives in the data layer: `src/rhythms/index.js` reads `globalThis.location` (path and
  query) to export the `RHYTHM` singleton (rules 2 and 3).
- The engine is a singleton of that route: `src/music.js` exports the meter of `RHYTHM`, and
  `show.js`, `audio.js`, `copy.js`, `scope.js`, `readout.js` and `background.js` import `RHYTHM`
  directly (rule 3).
- One module mixes layers: `src/audio.js` holds the schedule and the per-hit variation (engine)
  beside `AudioContext`, `OfflineAudioContext` and sample loading (platform); `lanes.js` and
  `scope.js` import `visualOf` from it. `src/util.js` holds pure helpers beside
  `document.createElement` (rule 2).
- Presentation storage: `src/controls.js` reads and writes `localStorage` (rule 2).

## Ideas from Panoram and Ink Tools

Panoram is private; its links open only for its owner. Ink Tools is public.

Taken:

- **Layers with a written dependency direction**, from Ink Tools
  ([`docs/architecture.md`](https://github.com/martonpaulo/ink-tools/blob/main/docs/architecture.md#layer-rules),
  «Imports go one way»). Here the volatile edge is the browser, not a tablet firmware.
- **Our own model at the core, every outside shape at the edge**, from Panoram's source-neutral
  kit ([ADR 0001](https://github.com/martonpaulo/panoram/blob/main/docs/adr/0001-source-neutral-kit.md)).
  The engine reads only the rhythm package's shape; Web Audio and the DOM are adapters.
- **Data, not code, for what varies**: Ink Tools keeps device facts in a descriptor
  (`descriptor.json`); here a rhythm is a package of data the engine reads.
- **One composition root**: Panoram's app target wires the kit to the adapters
  ([`Package.swift`](https://github.com/martonpaulo/panoram/blob/main/Package.swift)); here `src/main.js`.
- **A boundary checker with a ratchet allowlist**: Panoram's
  [`clients/macos/scripts/boundaries.py`](https://github.com/martonpaulo/panoram/blob/main/clients/macos/scripts/boundaries.py)
  lists each file allowed to break a rule with its count and reason, in
  [`boundaries-allowed.json`](https://github.com/martonpaulo/panoram/blob/main/clients/macos/scripts/boundaries-allowed.json);
  a new hit, or a count lower than listed, fails, so the list only goes down. Ink Tools'
  [`scripts/boundaries.py`](https://github.com/martonpaulo/ink-tools/blob/main/scripts/boundaries.py)
  reads import targets with one regular expression, skips comment lines, prints one
  `path:line: rule: text` line per finding and is tested over fixtures
  ([`scripts/test_boundaries.py`](https://github.com/martonpaulo/ink-tools/blob/main/scripts/test_boundaries.py)).
- **A plugin as a vertical slice**: an Ink Tools plugin keeps its feature logic and its adapters
  apart while living in one folder; a rhythm package does the same by file suffix.

Not taken, and why:

- **Ports with several implementations** (Panoram's `PhotoLibrary`, Ink Tools' `CalendarProvider`):
  there is one browser and no second audio back end; an interface for one implementation is cost
  without value. The platform layer is plain functions.
- **Egress sinks and a policy decision point** (Panoram
  [ADR 0003](https://github.com/martonpaulo/panoram/blob/main/docs/adr/0003-boundaries-and-egress-sinks.md)):
  the site sends no data anywhere.
- **Module packages and role folders** (Panoram
  [ADR 0006](https://github.com/martonpaulo/panoram/blob/main/docs/adr/0006-swift-package-layout.md),
  Ink Tools' `packages/`): the site has no build step and no package manager at run time; files in
  `src/` load as native ES modules. Layer folders would only add path churn, so a file's layer is a
  table in the checker, not a folder.
- **An adapt-on/off probe** (Ink Tools' descriptor probe): the browser APIs used are stable, and a
  missing Web Audio already shows the page's error state.
- **Cross-language contracts** (Panoram's `contracts/twins.json`): one language, JavaScript.

## The automatic check

`tools/layers.mjs [--root DIR]`, run by `pnpm validate` and so by CI:

- A table maps each file of `src/` to its layer (by name, and by suffix inside `src/rhythms/`). A
  file the table does not name fails, so a new file states its layer.
- It reads every relative `import` and `export … from` target and fails when a file imports a
  higher layer (rule 1).
- It fails when a tokens, data or engine file names a browser global of rule 2, skipping comment
  lines.
- It fails when a file other than `src/main.js` and the platform imports the `RHYTHM` singleton
  (rule 3), once that singleton moves to the app.
- Each finding prints `path:line: rule: text`; exit 0 clean, 1 with findings, 2 on a bad root.
- `layers-allowed.json` lists each known break of [Where the code stands today](#where-the-code-stands-today)
  with its count and the step that removes it; a count above or below the listed one fails, as
  Panoram's ratchet does.
- `tests/layers.test.js` runs it over fixture trees (one break per rule, one clean tree) and over
  the real repository.

Biome's `noRestrictedImports` and `noRestrictedGlobals` were weighed and set aside: they match an
import string, not a resolved layer, so `../theme.js` and `./theme.js` need separate entries per
folder, and they have no ratchet for the breaks the code holds today.

## Migration

Each step is one small pull request into `main`, behaviour-preserving, after the rhythm branches
merge. Every step must keep each rhythm's audio and stage identical, proved by step 1's golden.

1. **Goldens.** Add a test that renders each rhythm's whole show with `renderShowWav` and pins
   its hash, and a page test that pins the stage markup and the background's pixels at three
   positions per rhythm. No source change.
2. **The checker.** Add `tools/layers.mjs`, its test and `layers-allowed.json` listing today's
   breaks. No source change.
3. **Route to the app.** `src/main.js` reads `location.pathname` and `location.search` and calls
   `rhythmFor`; `src/rhythms/index.js` keeps the list, `ROUTES`, `rhythmFor` and `redirectFor`, with
   no global. Modules that need the
   rhythm get it from the app until step 4 lands.
4. **Engine takes the rhythm.** `music.js` exports `meterOf` only; `show.js`, `audio.js` and the
   views build from the rhythm the app passes. `VOICE_ORDER` and `hash` keep their values.
5. **Split `audio.js`.** The schedule, `visualOf` and the per-hit variation stay in the engine;
   `AudioContext`, `OfflineAudioContext` and sample loading move to `src/web-audio.js` (platform).
6. **Split `util.js`.** DOM helpers (`svgElement`, `chipButton`, `setText` and the rest) move to
   `src/dom.js` (platform); pure helpers stay.
7. **Storage.** `localStorage` access moves from `controls.js` to `src/storage.js` (platform),
   keeping the `baque-virado:` prefix.
8. **Readouts out of the data.** Each rhythm's readout layouts move to `<id>-readout.js`; one
   pull request per rhythm, so each is small. The background and backdrop imports move with them.
9. **Close.** `layers-allowed.json` is empty and removed; the checker fails on any new break.

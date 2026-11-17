# Decisions

The only home of this project's decision history. Each row names the document that now owns the
rule; that document keeps only the current rule.

## Decision index

| ID  | Date       | Decision                                                                                                                                         | Owning document                                           | Issue                                                        |
| :-- | :--------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- | :----------------------------------------------------------- |
| D1  | 2026-11-13 | The page fetches the samples as AAC at 96 kbps; the WAVs stay as masters; no before/after video                                                  | `src/audio.js` (`SOUND_EXTENSION`), `docs/product.md`     | [#3](https://github.com/martonpaulo/baque-virado/issues/3)   |
| D2  | 2026-11-13 | On phones the stage labels never render below 11 px, and a dark scrim sits behind the readout                                                    | `styles.css` (`--label-floor`), `docs/product.md`         | [#4](https://github.com/martonpaulo/baque-virado/issues/4)   |
| D3  | 2026-11-13 | A sound picked while paused plays a short preview in place, without a seek or Play                                                               | `src/audio.js` (`preview`), `src/main.js`                 | [#5](https://github.com/martonpaulo/baque-virado/issues/5)   |
| D4  | 2026-11-13 | Section E is named "fechamento"                                                                                                                  | `src/copy.js`                                             | [#6](https://github.com/martonpaulo/baque-virado/issues/6)   |
| D5  | 2026-11-13 | `src/score.js` was written for this project, from scratch                                                                                        | `src/score.js`, `CREDITS.md`                              | [#7](https://github.com/martonpaulo/baque-virado/issues/7)   |
| D6  | 2026-11-16 | Replaces D2: a phone shows the reel alone, edge to edge, tap to play, with the desktop sizes                                                     | `styles.css` (phone block), `docs/product.md`             | none                                                         |
| D7  | 2026-11-16 | Replaces D4: the show has no lettered parts; the HUD shows only the bar and step, as the title and Roteiro already name the scene                | `src/show.js`, `src/main.js`                              | none                                                         |
| D8  | 2026-11-17 | Each rhythm is one package in `src/rhythms/` the engine receives; `?ritmo=<id>` picks one; the selector shows only with two or more rhythms      | `AGENTS.md`, `src/rhythms/index.js`                       | [#18](https://github.com/martonpaulo/baque-virado/issues/18) |
| D9  | 2026-11-17 | The second rhythm is the Coco da Xambá: 2/4 at 132 BPM, percussion only, 12 scenes; it stays on the branch `coco-xamba` until the owner approves | `src/rhythms/coco-xamba.js`, `CREDITS.md`                 | [#27](https://github.com/martonpaulo/baque-virado/issues/27) |
| D10 | 2026-11-17 | The forró show: 120 BPM, G mixolydian, an original tune, its own background; a rhythm may replace the kaleidoscope with its own backdrop         | `docs/rhythms/forro.md`, `src/rhythms/forro.js`           | [#21](https://github.com/martonpaulo/baque-virado/issues/21) |
| D11 | 2026-11-17 | Brega funk ships as a second rhythm, synthesized in the page; a rhythm may synthesize its sounds, draw its own background and move its wheel     | `docs/rhythms/brega-funk.md`, `src/rhythms/brega-funk.js` | [#23](https://github.com/martonpaulo/baque-virado/issues/23) |

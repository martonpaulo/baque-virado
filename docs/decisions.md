# Decisions

The only home of this project's decision history. Each row names the document that now owns the
rule; that document keeps only the current rule.

## Decision index

| ID  | Date       | Decision                                                                                        | Owning document                                       | Issue                                                      |
| :-- | :--------- | :---------------------------------------------------------------------------------------------- | :---------------------------------------------------- | :--------------------------------------------------------- |
| D1  | 2026-11-13 | The page fetches the samples as AAC at 96 kbps; the WAVs stay as masters; no before/after video | `src/audio.js` (`SOUND_EXTENSION`), `docs/product.md` | [#3](https://github.com/martonpaulo/baque-virado/issues/3) |
| D2  | 2026-11-13 | On phones the stage labels never render below 11 px, and a dark scrim sits behind the readout   | `styles.css` (`--label-floor`), `docs/product.md`     | [#4](https://github.com/martonpaulo/baque-virado/issues/4) |
| D3  | 2026-11-13 | A sound picked while paused plays a short preview in place, without a seek or Play              | `src/audio.js` (`preview`), `src/main.js`             | [#5](https://github.com/martonpaulo/baque-virado/issues/5) |
| D4  | 2026-11-13 | Section E is named "fechamento"                                                                 | `src/copy.js`                                         | [#6](https://github.com/martonpaulo/baque-virado/issues/6) |
| D5  | 2026-11-13 | `src/score.js` was written for this project, from scratch                                       | `src/score.js`, `CREDITS.md`                          | [#7](https://github.com/martonpaulo/baque-virado/issues/7) |

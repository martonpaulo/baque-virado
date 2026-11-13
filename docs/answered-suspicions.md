# Answered suspicions

Suspicions measured and found not to be defects. Read this before investigating a suspected defect;
reopen a row only when its condition is met.

| Date       | Suspicion                                     | Measurement                                                                           | Reopens when                                 |
| :--------- | :-------------------------------------------- | :------------------------------------------------------------------------------------ | :------------------------------------------- |
| 2026-11-13 | `innerHTML` sinks inject markup               | Every sink takes constant copy; the stored sound value is checked against the options | A sink takes viewer input or a fetched value |
| 2026-11-13 | Audio and visual hit times disagree           | Max difference 1.4e-14 s over 2803 hits; now one timeline (`barTimeline`)             | A second hit-time computation appears        |
| 2026-11-13 | `window.baque.render(p)` is not deterministic | Identical hashes on three cold page loads, including after a jump                     | The background clock changes                 |
| 2026-11-13 | Unused font weights cost bytes                | Google serves one variable woff2 per family                                           | The fonts stop being variable                |
| 2026-11-13 | GitHub Pages caches too briefly               | `max-age=600` is fixed by Pages; WAVs revalidate by ETag                              | The site moves off GitHub Pages              |
| 2026-11-13 | The page overflows horizontally on phones     | `scrollWidth` equals the viewport at 320, 375 and 1440 px                             | The layout changes                           |
| 2026-11-13 | Layout shift                                  | CLS 0 unthrottled, 0.0094 throttled                                                   | The controls change                          |
| 2026-11-13 | Desktop downloads every sound                 | 0 WAVs fetched in 4 s; options load when picked                                       | Sound loading changes                        |
| 2026-11-13 | `lang="pt-BR"` is wrong                       | The product is Brazilian Portuguese only (`docs/product.md`)                          | The interface is translated                  |
| 2026-11-13 | The leaked scheduler doubled hits             | Both timers shared `nextStep`; fixed anyway in `00919fb`                              | —                                            |
| 2026-11-13 | Text over the background lacks contrast       | `--dim` on `--void` is 5.2:1                                                          | The palette changes                          |
| 2026-11-13 | The parada strobe flashes too much            | `STROBE_ALPHA = 0.09`, far below flash thresholds                                     | The strobe changes                           |
| 2026-11-13 | The exported ensemble readout sticks mid-fade | Opacity measured 1 across 30 exported frames                                          | The readout fade changes                     |

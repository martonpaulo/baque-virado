# Coco da Xambá

The coco show: `/coco`, package [`src/rhythms/coco-xamba.js`](../../src/rhythms/coco-xamba.js), with its
own background painter (`createCocoPainter`; a new module file would need a preload line in `index.html`). The rules it
follows are in [`docs/product.md`](../product.md#rhythm-shows); this page records each choice of the
revision of [#27](https://github.com/martonpaulo/baque-virado/issues/27) and why.

## Contents

- [Music](#music)
- [Sound](#sound)
- [Feel](#feel)
- [Visuals](#visuals)
- [Open points](#open-points)

## Music

- 2/4 at 132 BPM for the whole show, an 8-step wheel, one bar per turn: 112 bars, 1:42. The
  research gives no measured coco tempo and estimates 125 to 145 BPM
  ([`frevo-manguebeat-coco.md`](../research/frevo-manguebeat-coco.md#c-patterns-meter-and-tempo));
  132 sits inside it, and `tests/coco.test.js` keeps it there.
- 13 scenes: Introdução, Alfaia, Duas peles, Ganzá, Pandeiro, Palmas, Agogô e abê, Caixa,
  Atabaques, Frases, Toque, Rufo, Final.
- **Rufadas.** The alfaia's roll: the two heads in turn on every sixteenth, each sixteenth two strokes
  a 32nd apart, swelling from soft to loud into a «golpe», both heads at once. The Introdução is the
  alfaia alone: two rufadas that land on golpes, then a short one into the first scene. Every scene
  from Alfaia to Frases rolls into the next in the second beat of its last bar while the band keeps
  playing, and the next scene lands on a golpe. In Alfaia, before the second head enters, the low
  head rolls alone. Toque goes into the Rufo, which is one long rufada of four bars, and the Final
  lands on a golpe and ends on a cut. The sources name the coco's phrases joining into a final
  «rufo»; the rufadas between scenes are this project's reading of that.
- **Atabaques.** The terreiro's trio, low to high: rum, rumpi and lé (written «lê» in some sources).
  The lé keeps a steady figure (steps 1, 3, 4, 5, 7, 8), the rumpi answers on the off-beats (3, 5,
  7), and the rum, the lead, changes its phrase every two bars and plays a fill in the last bar of
  each four. These parts are this project's reading; no source writes them out.

## Sound

Every sound is a CC0 recording, played through the studio (`src/studio.js`,
[`studio.md`](studio.md)), which gives every rhythm on it round robin, velocity layers, a
correlated human feel and a mix bus. The recordings of the old `sounds/incoming-coco` folder are
the studio takes `pandeiro-grave-*`, `pandeiro-platinela-1`, `palmas-1` to `palmas-4` and
`atabaque-*-7`/`-8`, cut and normalised by `tools/prepare-takes.mjs`; `CREDITS.md` names each one.

- **Pandeiro**, a viewer option, as the maracatu caixa is: «pandeiro de couro» (default),
  «pandeiro de platinela», «pandeiro seco», «pandeiro grave». The pick plays the strokes on the
  beats; the platinelas between them always play the five jingle takes in turn.
- **Palmas**, a viewer option: «palmas da roda» (default), «uma palma», «palma abafada», «palma com
  pulseira». The roda is many hands: it plays its own recording and the two other group claps in
  turn.
- **Round robin of one take.** A pick with a single recording plays it at three tunings (0 and
  about ±26 cents), shuffled, as rule 3 of [`human-feel.md`](../research/human-feel.md#engine-rules-for-batuque)
  allows when only one take exists: never the same sound in a long row.
- **Atabaques**, one instrument with one volume: the rum is its own recording at three tunings;
  the rumpi plays its recording and six conga takes; the lé its recording and six quinto takes.
  Measured by zero crossings, the three rise in pitch from rum to lé, as the test checks.
- **Rufadas** play the alfaia's own takes, two different takes for the two strokes of a sixteenth,
  at 80 % of a phrase stroke.

## Feel

All of it comes from the studio and is seeded: no `Math.random`, the same position gives the same
sound live, in a preview and offline. The low head leads with a 1/f drift of about 7 ms; the
others follow it and correct 22 % of the gap each beat; each phrase swells over 8 bars; the lead
varies its accents every bar; the ganzá's off-beats lilt 12 % of a sixteenth (a 56 % swing). The
test measures the low head's beat-to-beat correlation (pink, not white) and its spread.

## Visuals

- **Palette.** The coco palette of [`colour-and-visuals.md`](../research/colour-and-visuals.md#per-rhythm-palettes),
  `COCO_PALETTE`: ground `#140b08`, earth `#5a3523`, burgundy `#9e2b25`, copper `#c7793a`, cloth
  `#efe6d6`. Every instrument takes its material's colour: the low head raw leather (copper), the
  second head a lighter leather, the caixa steel, the abê gourd, the ganzá tin, the pandeiro wood, the
  palmas the white cloth, the agogô iron, and the atabaques three burgundies, deepest for the rum.
  Each is lifted until it keeps 3:1 against the wheel's face over the ground; no red passes
  R/(R+G+B) 0.8.
- **Background.** Its own, through `background.create`: a burgundy glow of the earth from the
  wheel's edge outward; the dancers' skirts, burgundy and earth, turning steadily around the wheel,
  one turn every 16 beats, one more skirt as the roda fills (1 to 8); copper rings thrown out by the
  low head and burgundy rings by the rum; copper sparks at the angle of each rufada stroke; and one
  bright bloom, cloth white into copper, from the wheel's edge on each golpe.
- **Under the wheel.** Nothing is drawn inside 1.12 wheel radii: the wheel and its numbers sit on
  the ground colour, under the wheel's own dark face.
- **Flashes (WCAG 2.3.1).** The golpe blooms are the only bright changes, never closer than 0.34 s,
  so at most three in any second. The test draws every frame at 30 fps and counts them: 14 blooms
  in the show, at most 2 in any second, the closest 0.46 s apart. Measured in headless Chromium at
  1440 x 900, 30 frames a second over the whole show: no quarter of the screen's width and height
  changes its mean relative luminance by 0.10 (the largest change in one frame is 0.034).
- **Mix.** The whole show rendered offline with the default choices peaks at −0.18 dBFS, with no
  clipping; its RMS is −12.4 dBFS.
- **Reduced motion** drops the rings, sparks and blooms and halves the skirts' turn.
- **Widgets.** The wheel, the lanes and the readout; no score (the score renderer is written for
  4/4). The Atabaques readout shows the three parts on the 8 steps; the Introdução and the Rufo
  name the rufada.

## Open points

- Nobody has listened to the show: the levels of the new options and of the trio are set, not
  tuned by ear.
- A batuqueiro of the Xambá should check the atabaque parts, the rufadas between scenes and the
  pandeiro and palmas picks.

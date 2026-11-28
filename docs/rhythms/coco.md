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
- **Background.** Its own, through `background.create`: the beaten-earth floor of the terreiro at
  night, in candlelight, seen from above the wheel, as
  [`expansion-decisions.md`](../research/expansion-decisions.md) names the coco's picture. The
  burgundy of the earth glows from the wheel's edge outward, with the candles' copper light nearest
  the wheel and the still grain of the floor. Six candles stand on the floor near the roda, one
  more lit as the roda fills, each with its own slow flicker; a rufada makes the flames tremble.
  Each stroke of the low head and of the rum raises dust that drifts outward and fades: the
  pisada. On each golpe the earth's glow lifts once and the halos gain a little.
- **Nothing circles the wheel.** The first background turned a ring of burgundy and earth wedges
  (the dancers' skirts) around the numbered wheel and threw sparks and rings; the owner saw a
  casino game in it, while the colours were right
  ([#27](https://github.com/martonpaulo/batuque/issues/27), D41). So no shape turns and no light
  chases another. The candles are set down by hand in three groups at different distances, and one
  side of the wheel stays dark: an independent look at the first candle layout still saw a game's
  wheel in eight lights on one circle round the numbers. Every halo stays inside a desktop stage,
  whose sides are 1.43 wheel radii from the wheel's centre. `tests/coco.test.js` keeps each of these
  rules. No orixá imagery is drawn
  ([`pernambuco-rhythms-feeling.md`](../research/pernambuco-rhythms-feeling.md#design-notes)).
- **Under the wheel.** Nothing is drawn inside 1.12 wheel radii: the wheel and its numbers sit on
  the ground colour, under the wheel's own dark face.
- **Flashes (WCAG 2.3.1).** The golpe flares are the only changes of the whole picture, never
  closer than 0.34 s, so at most three in any second; the test draws every frame at 30 fps and
  counts them. A flare is the earth's burgundy at 34 % at its strongest, where the first
  background's bloom was cloth white at 85 %. Measured in headless Chromium at 1440 x 900 with
  motion on, 30 frames a second, over the opening, the Atabaques scene and the Rufo into the
  Final: no quarter of the stage (half its width by half its height) changes its mean relative
  luminance by more than 0.003 between two frames, against the 0.10 of a flash, and the brightest
  quarter stays at 0.02. A render or a measurement states the motion setting: headless Chrome
  takes the machine's own, and the owner's Mac has Reduce Motion on.
- **Mix.** The whole show rendered offline with the default choices peaks at −0.18 dBFS, with no
  clipping; its RMS is −12.4 dBFS.
- **Reduced motion** drops the dust and the flares and holds every flame still.
- **Widgets.** The wheel, the lanes and the readout; no score (the score renderer is written for
  4/4). The Atabaques readout shows the three parts on the 8 steps; the Introdução and the Rufo
  name the rufada.

## Open points

- Nobody has listened to the show: the levels of the new options and of the trio are set, not
  tuned by ear.
- A batuqueiro of the Xambá should check the atabaque parts, the rufadas between scenes and the
  pandeiro and palmas picks.
- The owner heard the show whole on 2026-11-28
  ([#27](https://github.com/martonpaulo/batuque/issues/27)): several instruments sound loose or
  artificial, the palmas do not sound natural, and the rufo does not sound natural yet. These are
  the first inputs of the coco's round two
  ([#47](https://github.com/martonpaulo/batuque/issues/47)), which reads its references whole
  before its script changes ([`round-two.md`](../research/round-two.md#order-of-work)).

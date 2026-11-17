# Forró pé-de-serra

The forró show: `?ritmo=forro`, package [`src/rhythms/forro.js`](../../src/rhythms/forro.js). The
spec is [`expansion-decisions.md`](../research/expansion-decisions.md), the forró script of
[`scripts.html`](../sketches/scripts.html) and the forró background of
[`backgrounds.html`](../sketches/backgrounds.html). This page records each choice the build made and
why ([#21](https://github.com/martonpaulo/baque-virado/issues/21)).

## Music

- **Tempo and metre.** 120 BPM for the whole show, as the script says. 2/4 on an 8-step wheel, one
  bar per turn. 98 bars, 1:38. The research estimates baião at 85 to 110 BPM; the script's 120 sits
  between baião and arrasta-pé and keeps the dance feel.
- **Swing.** None. The maracatu swing was measured on a recording; no forró measurement exists here,
  so the grid stays straight rather than carry invented numbers.
- **Mode and harmony.** G mixolydian (F natural, the flat seventh). Three chords: G (I), F (♭VII)
  and C (IV), the drone-like I and ♭VII of the research.
- **Tune.** Original. The hook A is two bars: a pick-up shape that lands the flat seventh on beat 2
  and holds it. A phrase is A, A, A2 (A moved up to IV), A: the hook three times, varied once, back
  unchanged at the end. The answer phrase is B, B, A2, A. The bandolim doubles the tune a diatonic
  third below; the rabeca doubles it in unison.
- **Zabumba.** The maceta plays the baião cell (dotted eighth, sixteenth, eighth: steps 1, 4, 5, the
  last one pressed, abafada); the bacalhau plays the off-beats (3 and 7). The cell changes, as the
  research asks: 3 + 3 + 2 in the Baião scene, a fill at the end of each 8-bar phrase.
- **Triângulo.** Every sixteenth, closed by the hand, open on the off-beat eighths.
- **Sanfona.** Two voices of one instrument: the right hand (the tune) and the left hand, «fole»
  (bass button on the beat, chord button on the off-beat; in Jogo de fole, chord accents in
  3 + 3 + 2).
- **Breque.** Everyone on 1, then silence; the sanfona alone plays the pick-up back into the hook.
  The end is everyone on 1, on G, the tune held on the tonic.

## Sounds

- **Reused CC0 recordings.** The zabumba's maceta is the alfaia (`alfaia-deep-main`, pressed:
  `alfaia-deep-short-main`; a second option, «zabumba seca», uses the dry surdo). The bacalhau is
  `stick`, played a little higher.
- **Synthesized.** Triângulo, sanfona, rabeca, bandolim, cavaquinho and baixo, by
  [`tools/synth-forro.mjs`](../../tools/synth-forro.mjs): seeded, so a rerun writes the same files.
  A melodic sample is one note at a base pitch, retuned by the playback rate (at most seven
  semitones). Melodic voices are never detuned per hit (`pitched` in `src/audio.js`).

## Visuals

- **Palette.** The forró palette of [`colour-and-visuals.md`](../research/colour-and-visuals.md),
  `FORRO` in [`src/theme.js`](../../src/theme.js). Each instrument takes its material colour: the
  zabumba's leather, the bacalhau's rod, the triângulo's steel, the sanfona's red body (the tune)
  and mother-of-pearl buttons (the left hand), the rabeca's varnish, the bandolim's spruce. The
  cavaquinho takes the faded teal and the bass the incoming dusk blue, as no material sets them
  apart.
- **Background.** Its own, in [`forro-backdrop.js`](../../src/rhythms/forro-backdrop.js), circular
  and coming out of the wheel: a dusk sky from bonfire orange to night indigo, whose warm light
  shrinks toward the wheel over the show (saudade is light leaving); a sanfona bellows that opens
  and closes once per bar around the wheel; bandeirinhas thrown outward by the zabumba's low head.
  The wheel's face stays dark, so it reads over the sky.
- **Flash safety (WCAG 2.3.1).** Nothing changes brightness on the beat. The pulse is motion: the
  wheel's hand, the bellows and the flags. Measured in headless Chromium, 30 frames per second over
  two bars of the Rabeca e bandolim scene: the largest change of mean relative luminance in any
  eighth of the screen's width and height is 0.004 per frame, far below the 0.10 of a flash.
- **Widgets.** The wheel, the lanes and the readout stay; the maracatu score, swing table and
  waves do not, as forró has no measured swing and no notated baques here. The readout shows what
  each scene teaches: the triângulo's closed and open strokes, the zabumba cell, the bacalhau on
  the off-beats, the chords and their degrees, the mode with its flat seventh, the doubling, the
  3 + 3 + 2 accents, and the totals at the end. The centre names the Baião, the BREQUE and the FIM.

# Forró pé-de-serra

The forró show: `?ritmo=forro`, package [`src/rhythms/forro.js`](../../src/rhythms/forro.js). The
spec is [`expansion-decisions.md`](../research/expansion-decisions.md), the forró script of
[`scripts.html`](../sketches/scripts.html) and the forró background of
[`backgrounds.html`](../sketches/backgrounds.html). This page records each choice the build made and
why ([#21](https://github.com/martonpaulo/baque-virado/issues/21)).

## Music

- **Tempo and metre.** 120 BPM for the whole show, as the script says, counted on the quarter note:
  the felt pulse, one dance step per beat. 2/4 on an 8-step wheel, one bar per turn: 1 s per turn.
  98 bars, 1:38. 120 sits inside the baião range of the web sources in
  [`brega-forro.md`](../research/brega-forro.md) (110 to 135; xote 85 to 110, arrasta-pé 130 to
  160), above the inferred 85 to 110 of
  [`pernambuco-rhythms-feeling.md`](../research/pernambuco-rhythms-feeling.md). It is not a
  half-time count: the triângulo plays 8 sixteenths a second.
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
  The end is everyone on 1, on G, the tune held on the tonic. The Final scene's last A keeps its
  first bar, which lands the flat seventh, and the cadence takes its second: F resolves up to G.

## Sounds

Every instrument is recorded and played through the studio ([`studio.md`](studio.md)); sources are
in [`CREDITS.md`](../../CREDITS.md).

- **Zabumba**: open head from a concert bass drum (three dynamics, two round robins) and two alfaia
  hits; the pressed note from muted bass drums, a stick hit, a short surdo and the dry alfaia.
- **Bacalhau**: five stick and rim clicks and the maracatu's stick.
- **Triângulo**: two triangles, open and muted, two dynamics and two round robins each.
- **Sanfona**: nine recorded notes (C3 to E5), bass buttons C, F and G; chord buttons are three
  recorded notes together. A held note or a motif's first note opens with the bellows (45 ms), the
  others with a finger (6 ms).
- **Rabeca**: a solo violin, spiccato for short notes and arco with vibrato for held ones.
- **Bandolim**: twelve single mandolin notes cut from longer recordings.
- **Cavaquinho**: one strummed ukulele chord each for C, F and G.
- **Baixo**: ten electric bass notes, picked and fingered.

The zabumba leads the timing; the triângulo's off-beat sixteenths sit about 10 % of a sixteenth late.

## Visuals

- **Palette.** The forró palette of [`colour-and-visuals.md`](../research/colour-and-visuals.md),
  `FORRO` in [`src/theme.js`](../../src/theme.js). Each instrument takes its material colour: the
  zabumba's leather, the bacalhau's rod, the triângulo's steel, the sanfona's red body (the tune)
  and mother-of-pearl buttons (the left hand), the rabeca's varnish, the bandolim's spruce. The
  cavaquinho takes the faded teal and the bass the incoming dusk blue, as no material sets them
  apart.
- **Background.** Its own, through the engine's one `background.create()` hook, in
  [`forro-backdrop.js`](../../src/rhythms/forro-backdrop.js), circular
  and coming out of the wheel: a dusk sky from bonfire orange to night indigo, whose warm light
  shrinks toward the wheel over the show (saudade is light leaving); a sanfona bellows that opens
  and closes once per bar around the wheel; bandeirinhas thrown outward by the zabumba's low head.
  The sky stays night inside the wheel's edge, where its step numbers sit, and the light starts just
  outside; the bellows and the flags turn outside the numbers. Measured on screenshots at 393 x 852
  and 1440 x 900, the faintest wheel mark (an off-beat number) keeps 3.97:1 against what is behind
  it, and the sanfona's red dots 4.08:1 against the face; with the light at the rim, they fell to
  1.4:1 and 2.6:1.
- **Flash safety (WCAG 2.3.1).** Nothing changes brightness on the beat. The pulse is motion: the
  wheel's hand, the bellows and the flags. Measured in headless Chromium, 30 frames per second over
  two bars of the Rabeca e bandolim scene: the largest change of mean relative luminance in any
  eighth of the screen's width and height is 0.004 per frame, far below the 0.10 of a flash.
- **Only what sounds.** The wheel draws only the voices the scene plays, with no ghost of the ones
  to come (the maracatu draws them faint): the parts enter one by one on the wheel too, and the key
  over the lanes, one line, names at most six voices; nine names did not fit a phone's width.
- **Widgets.** The wheel, the lanes and the readout stay; the maracatu score, swing table and
  waves do not, as forró has no measured swing and no notated baques here. The readout shows what
  each scene teaches: the triângulo's closed and open strokes, the zabumba cell, the bacalhau on
  the off-beats, the chords and their degrees, the mode with its flat seventh, the doubling, the
  3 + 3 + 2 accents, and the totals at the end. The centre names the Baião, the BREQUE and the FIM.

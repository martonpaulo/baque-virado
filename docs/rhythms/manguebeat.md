# Manguebeat

The manguebeat show: `/manguebeat`, package [`src/rhythms/manguebeat.js`](../../src/rhythms/manguebeat.js)
with its background [`src/rhythms/manguebeat-background.js`](../../src/rhythms/manguebeat-background.js).
The spec is [`expansion-decisions.md`](../research/expansion-decisions.md), the `mangue` script of
[`scripts.html`](../sketches/scripts.html) and the `mangue` background of
[`backgrounds.html`](../sketches/backgrounds.html). This page records each choice the build made and
why ([#24](https://github.com/martonpaulo/baque-virado/issues/24)).

## Contents

- [Music](#music)
- [Sound](#sound)
- [Visuals](#visuals)
- [Widgets per scene](#widgets-per-scene)
- [Open points](#open-points)

## Music

- **Feeling.** Anger and weight, in a minor key
  ([`expansion-decisions.md`](../research/expansion-decisions.md), Feelings per show).
- **Tempo and metre.** 100 BPM for the whole show, counted on the quarter note, inside the range
  of [`pernambuco-rhythms-feeling.md`](../research/pernambuco-rhythms-feeling.md), § 4 (line 179:
  «Tempo is about 90 to 105 BPM»). The show plan in
  [`frevo-manguebeat-coco.md`](../research/frevo-manguebeat-coco.md) uses about 108, marked as an
  inference to measure; 100 keeps the weight and stays inside the range both notes allow. 4/4 on a
  16-step wheel, one bar per turn: 2.4 s per turn. 48 bars, 1:55.
- **Scenes.** Twelve, as the script's labels list them: Introdução (sampler and echo), Alfaias
  (in unison), Mãos (main hand and answer), Caixa (with echo), Baixo (doubling the main hand),
  Guitarra (the riff), Coco (the ganzá's levada), Dub, Retorno (the layers come back one per bar),
  Corte (the band stops), Banda completa, Final (the echo until silence).
- **Alfaias.** The main hand plays 3 + 3 + 4 + 3 + 3 (sixteenths 1, 4, 7, 11, 14): heavy, with no
  beat 2 or 4. In Alfaias the answer hand plays the same strokes, in unison; from Mãos on it moves
  to beats 2 and 4, the backbeat of the band, with a pick-up on the last sixteenth of every second
  bar. These are the project's reading: no published transcription exists (the research marks the
  whole groove as an inference).
- **Caixa.** In its own scene only the backbeat accents and one ghost, so the echo of the accents
  is heard filling the bar. From then on it plays the backbeat with ghosts, no echo, except a
  throw on the last bar of each four in the full band.
- **Bass.** It doubles the main hand: the same five strokes, each on the root of the riff's chord
  at that stroke, an octave under the guitar.
- **Guitar riff.** Original, four bars, E minor: power chords on the main hand's strokes and one
  chug between them. E5, G5, A5 in bars 1 and 3; E5, D5, C5 and B5 in bar 2 (the flat sixth and
  the major fifth of the harmonic minor, for the weight); bar 4 turns back through D5 into E.
- **Coco.** The ganzá plays every sixteenth with the accent on the third of each beat, the
  sketch's levada; the coco's samba-family timing pulls its third and fourth sixteenths early.
- **Dub.** The alfaia on beats 1 and 3 only, the bass on beats 1 and 3 with one push, a caixa
  throw every second bar; beats 2 and 4 hold only the echoes. The bass drops out in the last bar.
- **Echo.** A dotted eighth: three sixteenths, 450 ms at 100 BPM. Each accent of an echoing voice
  repeats as a written hit, each repeat at 0.45 to 0.6 of the one before, inside its own scene, so
  the wheel and the lanes show the echo as smaller dots. The echo returns play band-limited takes
  (the alfaia's below 700 Hz, the caixa's from 500 Hz to 2.6 kHz), as a dub return is filtered.
- **Corte and Final.** Corte: everyone on 1 and a bar of silence, then the band plays only the
  main hand's strokes together. Final: the band once more, one stroke for all with the guitar and
  the bass held, then only that stroke's echo, softer each time, then a bar of silence.
- **No reference.** No song, recording or performer is named or used as a model (`docs/product.md`,
  Limits).

## Sound

Every voice plays through the studio ([`studio.md`](studio.md)): round robin with no immediate
repeat, velocity layers, a 1/f timing drift led by the main hand, a phrase swell and a small room
(`sala-pequena`). Sources are in [`CREDITS.md`](../../CREDITS.md).

| Voice    | Takes                                                                                                                                | Source                          |
| :------- | :----------------------------------------------------------------------------------------------------------------------------------- | :------------------------------ |
| alfaia   | per hand, five layers: the repository's deep, click, body and short strokes and an alfaia hit of the zabumba group; two echo returns | the repository                  |
| caixa    | the recorded `caixa` group, layers 0.4 to 1, two takes each; two echo returns                                                        | VSCO 2 CE, VCSL                 |
| ganzá    | small shaker, two forward and two back strokes; the repository's rice ganzá                                                          | VCSL, the repository            |
| baixo    | the recorded `baixo` group: the six notes of the line and a fingered low E                                                           | the repository (Freesound)      |
| guitarra | distorted power chords: three E5 takes, G5, D5, C5 palm-muted; E5 and G5 held                                                        | Freesound, sound-library branch |
| sampler  | a worn record's noise, two takes of 1.2 s                                                                                            | synthesized, seeded             |

- The guitar's chords were measured on their spectrum and retuned to equal temperament; the held E5
  is a held D♯5 retuned up a semitone. A chord borrows a recorded one at most two semitones away
  (A5 from G5, B5 from C5); `tests/manguebeat.test.js` checks every planned chord.
- Timing templates (ms per sixteenth of the beat): the alfaias, the bass and the guitar share
  2, −5, −9, −8 (the off-beats a little early, milder than the maracatu's measured alfaias); the
  ganzá 0, 2, −6, −5; the caixa 0, 2, −2, 0. The sampler stays on the grid.
- The sampler has no instrument to record (the research says it must be synthesized): crackle,
  hiss, a slow wow and a low rumble from a seeded noise source, the same bytes on every run.
- Mix: an offline render of the whole show in Chromium peaks at −0.41 dBFS with no sample at full
  scale, RMS −12.7 dBFS (the maracatu: −0.21 and −9.2; the frevo: −0.22 and −15.3).
- A phone downloads every default take and the room: 44 files and the room, about 410 KB. The limit
  is 420 KB (`tests/manguebeat.test.js`), set by the agent, to confirm with the owner.

## Visuals

- Palette from [`colour-and-visuals.md`](../research/colour-and-visuals.md), section 5, Manguebeat:
  ground `#0b0a07`, mud `#3b2f22`, rust `#b3261e`, mangrove `#4f6b3a`, the antenna's pale
  `#d9d2b8`, with iron and cable greys and the crab's orange only on accents. Material colours on
  the wheel: the main hand crab orange, the answer raw leather, the caixa iron, the ganzá mangrove,
  the bass mud and the guitar rust, each lifted to 3:1 or more on the wheel's face and on the
  ground.
- The background comes out of the wheel and stays circular: a mud and mangrove field from just
  outside it; a grain of mud, concrete and rust that changes on each beat (a nod to a pixel
  collage); an iron ring thrown by each stroke of the main hand, stepping outward on each beat,
  jagged by the scene's fury, rust on the bar's first beat; cables hanging from the wheel that
  shake on the guitar; an antenna on top that grows with the sampler; the echoes as thin mangrove
  rings that step outward.
- Under the wheel the field is clear: every gradient stop under the wheel keeps the wheel colours at
  3:1 and every shape is born outside it (`tests/manguebeat.test.js`).
- Flash safety: the one bright emission is a pale ring of light on the guitar's first chord of a
  bar, in the scenes with `flash`: at most one a bar (2.4 s), far under 3 a second; the test draws
  the whole show at 30 frames a second and counts them. It starts outside the wheel. No red passes
  R/(R+G+B) 0.8.
- Reduced motion: no bloom, no jitter, the grain stops changing, the rings travel half as far.

## Widgets per scene

| Scene          | Widget                                                   | Why                              |
| :------------- | :------------------------------------------------------- | :------------------------------- |
| Introdução     | tempo, metre, bar length, the echo's length, instruments | one tempo; the dub delay         |
| Alfaias        | one row of marks, the strokes counted from 1             | both hands in unison             |
| Mãos           | the two hands' rows                                      | the answer on beats 2 and 4      |
| Caixa          | the bar with accents, ghost and echo repeats             | the echo fills the bar           |
| Baixo          | the main hand's row over the bass's row, the notes       | the bass doubles the main hand   |
| Guitarra       | a roll of the riff over the bass, key and chords         | the riff and its doubling        |
| Coco           | the ganzá's row, the accents                             | the third sixteenth of each beat |
| Dub            | the main hand's row, the echo, the space                 | beats 2 and 4 hold only echo     |
| Retorno        | the entering instrument                                  | the layers return one per bar    |
| Corte          | stop bars and strokes together                           | the break                        |
| Banda completa | a roll of the riff over the bass for the 8 bars          | the whole band                   |
| Final          | scenes, instruments, bars                                | the totals                       |

## Open points

- The tempo, the alfaia cell and the riff's locking are inferences; measure them on recordings, as
  the research asks, and check them with players.
- Recordings to look for: a real alfaia section in several takes per stroke (today the layers are
  edits of few recordings), a metal ganzá, a manguebeat caixa.
- Levels are by measurement; they need the owner's ear.

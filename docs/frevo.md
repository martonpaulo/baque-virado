# Frevo show

The frevo show: what it plays, what it shows and why. The package is
[`src/rhythms/frevo.js`](../src/rhythms/frevo.js); open it at `/frevo`. Built in
[#25](https://github.com/martonpaulo/baque-virado/issues/25) from the script in
[`docs/sketches/scripts.html`](sketches/scripts.html) and the notes in [`docs/research/`](research/),
then rewritten on 2026-11-17 towards the owner's reference
([`research/references.md`](research/references.md)), measured with the sound lab.

## Contents

- [Music](#music)
- [Sound](#sound)
- [What the reference changed](#what-the-reference-changed)
- [Visuals](#visuals)
- [Widgets per scene](#widgets-per-scene)
- [Round two: a first reading of the references](#round-two-a-first-reading-of-the-references)
- [Open points](#open-points)

## Music

- An instrumental frevo in the lyrical, minor-key vein of a frevo de bloco, played by a frevo
  orchestra. 2/4 at 125 BPM for the whole show, an 8-step wheel, one bar per turn. 104 bars, 1:40.
- Eleven scenes: Introdução, Surdo, Caixa, Pandeiro, Tuba, Palhetas, Metais, Lá e cá, Segunda
  parte, Fotografia, Final. The parts enter one by one: surdo, caixa, pandeiro, tuba, the
  saxofones, the clarinete, then the metais.
- Percussion: the cell of two bars that the sources give for every Pernambuco frevo, twelve
  sixteenths and then the caixa's rufo. The accents follow the 3+3+2 grouping (an inference, as
  in the research). The surdo is muted on beat 1 and open on beat 2; the pandeiro plays every
  sixteenth, the sources' ostinato: grave on the beats and platinela between.
- No swing. The sources say the push comes from anticipations, not swing, and no measured frevo
  swing exists, so none is invented.
- Key G minor; the second part moves to the relative major, B♭. The three recordings of the
  reference are in F minor and G minor.
- The melodies are original. Part A, 16 bars: a pickup of three notes, then two-bar gestures, a
  sung note and a long one. Bars 3 and 4 repeat bars 1 and 2 a step lower. The note of bar 8
  arrives on the last eighth of bar 7 and is tied over the bar line (the bambeando). Bars 9 to 12
  climb to the top note over G7 and Cm: the Alto da Sé, on the IV degree, as the composition
  source describes. A cadence through A7 and D7 closes the part.
- Harmony of part A: Gm, D7, Gm, then G7 (the dominant of the IV degree) to Cm, Gm, A7 (the
  dominant of the dominant) to D7, Gm. Part B: B♭, F7, B♭, B♭7 to E♭ (its Alto da Sé), B♭, G7 to
  Cm, F7, B♭.
- The palhetas sing the tune, legato: the saxofones in unison, two players, and the clarinete on
  the second part under them (the next chord tone under a chord tone, the scale's third under a
  passing note).
- The metais answer in the bars where the tune holds a long note (lá e cá): staccato, syncopated,
  ending on an accented held note. The trompetes play two parts; the trombones play the chord's
  third part an octave lower. Where the trompetes rest, the trombones mark the caixa's second and
  third accents (3 + 3 + 2) with one chord note each, softly. In the Alto da Sé of the second part
  and of the Final the trompetes join the tune.
- The scene Metais plays the answers of the first eight bars alone, so Lá e cá can put the tune
  over them.
- The tuba marks the beats, the root on 1 and the fifth on 2. It leads into each new chord from a
  semitone below, on the last eighth, and walks root, third, fifth in the last bar of each four.
- Each phrase is louder at its top; an accent is louder still; a staccato note is softer.

## Sound

Every sound is a real CC0 recording; nothing is synthesized. Sources and edits are in
[`CREDITS.md`](../CREDITS.md).

| Voice     | Sample                                                           | Source               |
| :-------- | :--------------------------------------------------------------- | :------------------- |
| surdo     | concert bass drum, open and muted; the dry surdo                 | VCSL; the repository |
| caixa     | rope-tension snare (tarol)                                       | VCSL                 |
| pandeiro  | small frame drum mixed with a tambourine; a coco stroke per kind | VCSL; the repository |
| tuba      | staccato, 6 pitches                                              | VSCO 2 CE            |
| trombone  | tenor trombone staccato (4) and sustained (4)                    | VSCO 2 CE            |
| trompete  | trumpet staccato (7, and 12 loud takes more) and sustained (5)   | VSCO 2 CE            |
| saxofone  | tenor sax sustained, 13 pitches a whole tone apart; staccato, 10 | FreePats; VCSL       |
| clarinete | clarinet sustained, 5 pitches                                    | FreePats             |

- Each pitched sample was measured, retuned to the exact note and trimmed so the note starts at
  0. A note plays a sample recorded within two semitones of it, retuned by its playback rate; the
  second player of a section may borrow one up to four semitones away, so that two players never
  share a take (`tests/frevo.test.js` checks every note of the show).
- A held note is a sustained take cut to the written length: an attack of 10 to 35 ms, a release,
  and a vibrato of 5 to 6 Hz that comes in after a quarter of a second. A note followed by
  another rings 30 ms into it (legato); a note before a rest stops early (a breath); a long
  saxofone note after a breath starts 40 cents flat and rises to its pitch in 70 ms. A staccato
  note is a staccato take, as it was played.
- Each player of a section has a take of its own and starts 7 ms after the one before.
- Every voice plays through the studio ([`rhythms/studio.md`](rhythms/studio.md)): the surdo and
  caixa alternate takes, the pandeiro adds one coco stroke per kind, and the band follows the
  surdo with a correlated drift.
- The mix was set against the three reference recordings with the sound lab, on the 16 bars of
  Lá e cá: the long-term spectrum is within 3 dB of their mean in every band from 20 Hz to
  16 kHz (a 3 dB cut at 1.8 kHz on the whole mix brought the horns' presence band there), and
  the drum stem sits 4.7 dB under the whole, where the two stereo recordings have it 4.6 and
  6.0 dB under.
- Choices the lab's listening model (CLAP) decided, each measured on the same 16 bars:
  - two saxofones in close thirds, held, are heard as a sanfona (a forró band, 0.66 against 0.08
    for a frevo orchestra), so the saxofones sing in unison;
  - a chorus effect on the horns halves the «band, not toy keyboard» score (0.28 against 0.52), so
    there is none;
  - a staccato take cut to a fraction of a sixteenth is heard as a toy keyboard, so staccato takes
    ring as they were played;
  - a triad fanfare for the trompetes, one rhythm in every bar, was heard as a «toy keyboard demo»
    (0.9) whatever the sound, so the Metais scene plays the answers instead.
- A phone downloads every default sample, 78 files, about 862 KB. The maracatu limit of
  100 KB cannot hold a melodic show; the frevo limit is 880 KB (`docs/product.md`, Limits).

## What the reference changed

The research ([`research/frevo-manguebeat-coco.md`](research/frevo-manguebeat-coco.md)) set a frevo
de rua at 140 BPM in a major key. The owner's reference is a frevo de bloco, and its three
recordings, analysed with the sound lab, disagree with that plan. For sound and groove the
reference wins:

| What                 | Research plan       | Reference recordings             | The show now                 |
| :------------------- | :------------------ | :------------------------------- | :--------------------------- |
| Type                 | frevo de rua        | frevo de bloco, sung by a chorus | lyrical frevo, instruments   |
| Tempo                | 140 BPM             | 120 to 125 BPM (beat tracker)    | 125 BPM                      |
| Key                  | major               | F minor, G minor                 | G minor, B♭ in part B        |
| Who carries the tune | trompetes, staccato | the melodic stem leads           | palhetas, legato             |
| Scenes               | twelve              | no ventania, no abafo            | eleven, without those scenes |

The percussion level is not in the table: the drum stem sits 39 dB, 6 dB and 5 dB under the
whole in the three recordings (the first is an old mono recording), so they set no single target.

125 BPM is inside the research's ranges: «around 120» for frevo and 125 to 145 for frevo-canção.
The bambeando and the Alto da Sé stay, inside the tune; the fotografia stays as a scene.

## Visuals

- Palette from [`colour-and-visuals.md`](research/colour-and-visuals.md): night blue ground
  `#0a1230`, the four colours of Pernambuco's flag and brass gold. Material colours on the wheel:
  the brass in golds from bright (trompete) to deep (tuba), the saxofone green and the clarinete a
  lighter green, the surdo red, the caixa chrome, the pandeiro a lifted blue. Each reads at 3:1 or more on the wheel's face.
- The background is the frevo's own (`src/rhythms/frevo-background.js`), circular and centred on
  the wheel: sombrinhas in the flag colours circle it on two rings, confetti bursts out of the
  wheel on the surdo's open beat (once per bar), the trompetes throw gold spikes, and the sax notes
  leave green arcs. The number of sombrinhas follows the density curve; the Final shakes them a
  little (fury); a cut freezes them (the fotografia's pose).
- Flash safety: no full-screen flash. The beat is carried by motion: the sombrinhas snap forward
  on each beat. The ring turns a whole fraction of the beat (1 turn per 16 and per 32 beats).
  Reduced motion halves the rotation and drops the jitter, confetti and spikes. No red passes
  R/(R+G+B) 0.8.
- The engine change this needed: a rhythm may give `background.create`; the maracatu keeps its
  kaleidoscope and feedback tunnel unchanged.
- **Graphics of its own** ([#55](https://github.com/martonpaulo/batuque/issues/55),
  [`frevo-graphics.js`](../src/rhythms/frevo-graphics.js)), in the stage's main square, with the
  wheel smaller beside the readout:
  - **Partitura.** The tune, the saxofones' line, as a score: four bars a page on two staves of
    two bars, each with the treble clef and the key's two flats, the first with the 2/4. A note is
    written with its value (half, dotted quarter, quarter, dotted eighth, eighth, sixteenth, with
    flags and no beams), a tie where it is held over a bar line or needs two values (five
    sixteenths are a quarter tied to a sixteenth), its accidental where it leaves the key or
    returns to it inside a bar, and rests where the tune breathes; a rest is never dotted, and a
    bar with no note is one whole rest. The 3 + 3 + 2 is written as two dotted eighths and an
    eighth. A bar is spaced by its sixteenths, and a sixteenth is wider where the sign on it needs
    room before it: an accidental or a rest right after a sixteenth, more after one whose flags
    reach right, and a flag before the bar line (`barLayout`); the cursor and the band follow the
    same places. The note that sounds is at full strength over a band of the saxofone's green as long
    as the note, with every piece it is tied to; a cursor in the interface's accent stands at the
    show's place. A scene where the tune does not play shows its bars as rests. A page starts at
    a scene's first bar; every scene is a whole number of pages (`tests/frevo.test.js`).
  - **Pistos.** The trompete's three valves, each a casing with its number and its button, under
    the label «trompete em si♭», which says why the name and the fingering differ. For
    the note the trompete plays now, the valves of a B flat trumpet's fingering go down and their
    casings fill with its gold, and the note's name stands beside them as it sounds (a sounding
    si bemol is the open trumpet, since the instrument sounds a tone under its written note).
    With no note the three are up and no name shows.
  - Both read the show position alone, from the package's written lines (`soundingIn`). With
    reduced motion the cursor stands on the note or rest that holds the position and moves only
    when the next one starts. A muted saxofone dims the score and lights no note; a muted
    trompete dims the valves and presses none.
  - The score stands across the middle of the square, within about 42 units of its centre, inside
    the ring the sombrinhas turn on. Its flag and rests are the percussion score's own shapes
    (`SCORE_SHAPES` in [`score.js`](../src/score.js)); the clef, the accidentals and the ties are
    drawn here. Every text is at least the stage's label size, no notehead stands on another and
    nothing is drawn outside the main circle (`tests/page.test.js`).

## Widgets per scene

Chosen by what each scene teaches, not by the maracatu set.

| Scene         | Widget                                              | Why                               |
| :------------ | :-------------------------------------------------- | :-------------------------------- |
| Introdução    | tempo, metre, key, voices                           | one tempo, 2/4 on 8 steps         |
| Surdo         | the two-bar cell, open and muted beats              | the accent on beat 2              |
| Caixa         | the two-bar cell with accents and the rufo          | twelve sixteenths, then the rufo  |
| Pandeiro      | one bar, grave and platinela                        | the sixteenth ostinato            |
| Tuba          | the chord progression, the bass line                | the bass carries the harmony      |
| Palhetas      | a melody roll of the 16 bars, the Alto da Sé shaded | the tune; where the peak sits     |
| Metais        | a melody roll, trompetes and trombones              | the call; the trombones under it  |
| Lá e cá       | a melody roll, palhetas and metais in their colours | call and response alternate       |
| Segunda parte | a melody roll, the Alto da Sé shaded                | the major key; the peak on the IV |
| Fotografia    | stop bars and attacks                               | the break and the pose            |
| Final         | scenes, voices, bars                                | the totals                        |

The melody roll ([`src/roll.js`](../src/roll.js)) draws pitch against time, each note as long as it
is held, with the score's cursor. The wheel, lanes, scene list and centre cues (RUFO, PARADA, the tópica's name) are the
engine's.

## Round two: a first reading of the references

The frevo's reading, made on 2026-11-28 from the whole of the four recordings the owner named
([`references.md`](research/references.md)), by the method of
[`round-two.md`](research/round-two.md#how-to-read-four-references), which also says what a reading is: a
proposal, with nothing built. The frevo's section maps are in
[`lab/reference-sections.txt`](../lab/reference-sections.txt) and its pulse periods and level shapes in
[`lab/reference-pulse.txt`](../lab/reference-pulse.txt).

The four are of four kinds: a frevo de bloco sung by a chorus («Madeira que Cupim Não Rói», 2:26),
a bloco's anthem with an orchestra («Hino do Elefante de Olinda», 3:11), a frevo-canção («Voltei,
Recife», 2:44) and a frevo de rua in a concert version of 7:16 with solos («Vassourinhas»). The
first round read only the first one.

What the four frevo recordings share, each trait with the trust its measurement earns:

| Trait                          | Evidence                                                                                                                                                                                                                       | Trust  |
| :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- |
| The orchestra enters whole     | Each recording holds its body level from its first 1 to 6 seconds; none builds up part by part                                                                                                                                 | High   |
| The tune leads, not the drums  | The percussive share of the energy is 0.21 to 0.31 in every song: most of the sound is held notes. The bands from 120 Hz to 2 kHz hold the energy, level with each other within 2 dB, and the band under 60 Hz sits 5 dB under | High   |
| Fast, and faster than the show | The onsets repeat at a beat of 482 ms, 418 ms, 383 ms and 366 ms: 124, 144, 157 and 164 BPM. Three of the four are at 144 or more; their mean is 147                                                                           | Medium |
| The level does not build       | Inside a song the sections stay within 1 to 3 dB of each other; only the concert version drops for its solos                                                                                                                   | Medium |
| Two parts, two modes           | By the chroma: E minor with its dominant; A minor, then C major in the last part; A minor, then A major; C major and G minor. Each song has a part in the minor and a part in the major                                        | Medium |
| Short stops                    | One to five dips of 8 to 12 dB, each half a second long, in every song: a break where the band stops and comes back whole                                                                                                      | Medium |
| One low stroke a bar           | In the two songs whose bar folds cleanly, the low band has one heavy stroke every two beats, with a lighter one just before it                                                                                                 | Low    |

The frevo against the literature ([`research/frevo-manguebeat-coco.md`](research/frevo-manguebeat-coco.md),
[`research/pernambuco-rhythms-feeling.md`](research/pernambuco-rhythms-feeling.md)):

- **Agrees.** «The introduction already is the music itself» and starts on an anacrusis: the
  recordings enter whole. The form in two parts of sixteen bars with a bridge fits the two modes.
  The fotografia, a break where the dancers pose, fits the half-second stops. The surdo's open
  stroke on beat 2 fits the one low stroke a bar. The tempo sits inside «around 120, often reaching
  180» and the composition plan's 140 to 160.
- **Disagrees.** The research's own reading, marked as inferred there, gives major keys; three of
  the four recordings open in a minor key and turn to the major. The first round took 125 BPM from
  the one recording it read, the slowest of the four.

What the reading could not do:

- Tell the instruments apart. No stems were separated on this Mac, so «the tune leads» is read
  from the held share of the sound, which holds the voices too: three of the four are sung.
- Read the caixa's cell or the answers between metais and palhetas: both need stems.
- Fold the bars of «Voltei, Recife» and «Vassourinhas»: the beat tracker locked on a dotted value
  (107.7 and 112.3 BPM, two thirds of the beat the pulse periods give).

Against the show as it is, rendered through the page and read with the same tool: it runs at
125 BPM, where three of the four references run at 144 or more; it reaches its body level only
at 18.5 s, because the parts enter one by one, where the references are whole in 1 to 6 seconds;
and it is duller than they are, 3 to 5 dB short in every band from 1 kHz up, and 2 dB over from
60 to 500 Hz. Its percussive share, 0.22, is inside the references' range.

The elements proposed for the frevo show to exalt, which the owner has not answered yet:

1. **The headlong entry**: a pick-up of a few notes and the whole orchestra at once, in the first
   second. No build-up.
2. **A fanfare to hum**: one short tune stated at once by the whole orchestra and brought back,
   the palhetas and the metais singing it as a chorus would.
3. **Lá e cá**: the metais ask and the palhetas answer, each in the bar the other leaves free, at
   speed.
4. **The motor under the tune**: the surdo's open stroke on beat 2, the caixa's running sixteenths
   with the rufo every second bar, the pandeiro; never over the tune.
5. **The lift**: a first part in the minor, a second part in the major, a half-second stop where
   the passistas pose, and the return with everything, into the final chord.

The form proposed, about 1:30 at 144 BPM: the pick-up and the first part with the whole orchestra,
sixteen bars; the first part again as lá e cá; eight bars where the tune rests and the motor shows;
the bridge with the stop; the second part in the major, twice, the second time with the runs of
the palhetas and its top note; the first part once more with everyone; the final chord, held. The
tempo rises from 125 to 144 BPM, the middle of the four references.

## Open points

- Recordings to look for, as `needs a real recording`: a real Brazilian surdo (open on 2, muted
  on 1), a real pandeiro (thumb, slap and platinelas), an alto sax (the palhetas lead; the tenor
  sings it for now), sustained trombone notes near A3, and more sustained trumpet takes, so the
  trompetes can hold in two parts.
- The studio cannot slur: every note starts again. A legato line is overlapped notes, not one
  breath.
- Levels and balance are by measurement against the reference recordings; they need the owner's ear.

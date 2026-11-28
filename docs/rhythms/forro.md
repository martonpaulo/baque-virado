# Forró pé-de-serra

The forró show: `?ritmo=forro`, package [`src/rhythms/forro.js`](../../src/rhythms/forro.js). The
spec is [`expansion-decisions.md`](../research/expansion-decisions.md), the forró script of
[`scripts.html`](../sketches/scripts.html) and the forró background of
[`backgrounds.html`](../sketches/backgrounds.html). This page records each choice the build made and
why ([#21](https://github.com/martonpaulo/baque-virado/issues/21)).

## Contents

- [Music](#music)
- [Sounds](#sounds)
- [Visuals](#visuals)
- [Round two: a first reading of the references](#round-two-a-first-reading-of-the-references)

## Music

The owner's reference is «Forró no Malagueta» (Forróçacana), studio and live
([`references.md`](../research/references.md)). The show takes its tempo, groove, density, register
and balance from it, measured on the recordings; the tune is original. Where the recording and an
earlier study disagree, the recording decides and the line below says so.

- **Tempo and metre.** 100 BPM for the whole show, counted on the quarter note: the felt pulse, one
  dance step per beat. A beat tracker gives 97 BPM for the studio recording and 103 for the live
  one, and 100 sits inside the researched baião range of 85 to 110
  ([`pernambuco-rhythms-feeling.md`](../research/pernambuco-rhythms-feeling.md)). The show ran at
  120 before, the top of another source's range. 2/4 on an 8-step wheel, one bar per turn: 1.2 s
  per turn. 86 bars, 1:43.
- **Swing.** None on the grid. No forró timing study exists here, so the wheel stays straight; the
  triângulo's off-beat sixteenths sit about 10 % late in the sound only.
- **Mode and harmony.** A dorian: a minor mode with a major sixth (F sharp). The reference is in a
  minor key, and the research names dorian beside mixolydian for the baião. The second part moves
  to D mixolydian, the same seven notes heard from D, whose flat seventh is C natural: the «major
  with a flat seventh» of the research, now as a contrast inside the tune. Five chords: Am (i),
  D (IV), G (♭VII), C (♭III) and E7 (V7), which borrows G sharp for the cadence.
- **Tune.** Original, in two parts of eight bars, each ending on a cadence. Part A (Am, Am, D, D, Am,
  G, E7, Am): a run of sixteenths up to a held top note that arrives a sixteenth early, with a
  slide into it; the same shape over IV; the bellows rebounding on thirds; V7 to i. Part B (D, C,
  D, C, G, D, E7, E7): the flat seventh held on the first beat, chords in 3 + 3 + 2, and two bars
  of V7 that lead back. No bar of a part repeats another. The show plays A, B, then A and B with
  everyone, the jogo de fole, A and B over the baião cell, the breque, and A to the end.
- **Density and register.** Measured on the reference with a transcription model: about 10 to 12
  note onsets per beat in the melodic instruments, their median pitch between F sharp 4 and B 4;
  the bass 2.5 to 3.2 notes per beat around E2. The show's tutti measures 11 notes per beat at a
  median of A4, and its bass 2.9 notes per beat at a median of D2.
- **Zabumba.** The maceta plays the baião cell (dotted eighth, sixteenth, eighth: steps 1, 4 and 5,
  the last one pressed, abafada) and a pick-up on the last sixteenth (step 8), as the reference's
  low drum does on every bar. The bacalhau plays the off-beats (3 and 7). The cell changes, as the
  research asks: 3 + 3 + 2 in the Baião scene, a fill at the end of each 8-bar phrase.
- **Triângulo.** Every sixteenth, closed by the hand, open on the off-beat eighths.
- **Sanfona.** Two voices of one instrument: the right hand (the tune) and the left hand, «fole»
  (bass button on the beat, chord button on the off-beat, with a second, lighter chord as the
  bellows come back). In the Jogo de fole the bellows shake on every sixteenth (the resfolego),
  with the accents in 3 + 3 + 2.
- **Bass.** It plays with the maceta (steps 1, 4, 5 and 8), leaves the root for the fifth, the
  third and the octave, and leans into the next chord a sixteenth early, often by a semitone.
- **Cavaquinho.** Down on the off-beat, up on the sixteenth after it, in two bars that alternate.
- **Rabeca and bandolim.** In part A the rabeca holds long notes under the tune and answers in its
  gaps; in part B it doubles the first four bars in unison. The bandolim plays the tune's eighth
  notes a diatonic third below.
- **Breque.** One more bar of V7, then everyone on 1 and silence; the sanfona alone plays the
  pick-up back into the tune. The end is everyone on 1, on the A minor chord, held.

## Sounds

Every instrument is recorded and played through the studio ([`studio.md`](studio.md)); sources are
in [`CREDITS.md`](../../CREDITS.md).

- **Zabumba**: open head from a concert bass drum (three dynamics, two round robins) and two alfaia
  hits. The bass drum takes sound near 62 Hz; the reference's zabumba sounds near 95 Hz and falls
  20 dB in about 50 ms, so the takes play 1.45 times faster, which brings both to it. The pressed
  note comes from muted bass drums, a stick hit, a short surdo and the dry alfaia.
- **Bacalhau**: five stick and rim clicks and the maracatu's stick.
- **Triângulo**: two triangles, open and muted, two dynamics and two round robins each.
- **Sanfona**: a Hohner button accordion, seventeen recorded notes from B2 to G5, each with its two
  reeds beating. A note plays a take recorded at most two semitones away. A held note opens with
  the bellows (50 ms), the others with a finger (6 ms); a grace note slides up a semitone into its
  note; the chord buttons are three recorded notes together; the bass buttons are the three
  recorded bass notes. The recording is strong from 500 to 1000 Hz and dull above, so its channel
  cuts 10 dB there and opens the top.
- **Rabeca**: a solo violin, spiccato for a sixteenth and arco with vibrato for longer notes.
- **Bandolim**: twelve single mandolin notes cut from longer recordings.
- **Cavaquinho**: no cavaquinho recording under CC0 was found. It strums the bandolim's single
  notes: four strings down, three coming back, spread over a few milliseconds, each string its own
  take. A ukulele strummed the same way measured closer to a toy keyboard and was dropped.
- **Baixo**: ten electric bass notes, picked and fingered.

### Mix

The balance follows the reference, measured with a source-separation model and an audio-text model
(CLAP) on a tutti scene. The numbers are the measures of 2026-11-17.

| Measure                                       | Before           | Now              | Reference        |
| :-------------------------------------------- | :--------------- | :--------------- | :--------------- |
| Similarity to the reference (CLAP, 0 to 1)    | 0.83             | 0.90             | 0.97 (to itself) |
| «A forró band», not «a toy keyboard» (0 to 1) | 0.74             | 0.99             | 0.99 to 1.00     |
| Drums, bass, other (dB of the total)          | −5.8, −8.4, −2.3 | −3.6, −7.7, −4.1 | −3.5, −7.1, −4.9 |

- Offline mixes of each instrument alone showed what moved the similarity: the triângulo 6 dB down
  and the bass 3 dB down, the cavaquinho 5 dB and the rabeca 4 dB up. The reference's melodic stem
  is itself heard by the model as plucked strings as much as accordion.
- A tone on the whole band brings each of nine bands, 20 Hz to 16 kHz, within about 2 dB of the
  reference's long-term spectrum; before, the band from 500 to 1000 Hz was 6 dB over and the lows
  3 to 5 dB short.
- The drums-bass-other row of «Now» was measured before the last balance change; the final values
  are in the change's report.

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
  The night follows the music's energy ([#63](https://github.com/martonpaulo/batuque/issues/63)):
  the bellows open wider the busier the trio is and their pleats travel round on the energy clock,
  the warm light leans out and back with them, and sparks of the fogueira rise from the wheel all
  the time, more of them and faster as the music fills. Reduced motion holds the picture still: the
  bellows rest where a bar begins and no flag or spark flies; before
  [#63](https://github.com/martonpaulo/batuque/issues/63) this background never read the setting.
  The sky stays night inside the wheel's edge, where its step numbers sit, and the light starts just
  outside; the bellows and the flags turn outside the numbers. Measured on screenshots at 393 x 852
  and 1440 x 900, the faintest wheel mark (an off-beat number) keeps 3.97:1 against what is behind
  it, and the sanfona's red dots 4.08:1 against the face; with the light at the rim, they fell to
  1.4:1 and 2.6:1.
- **Flash safety (WCAG 2.3.1).** The background changes no brightness on the beat. The pulse is motion: the
  wheel's hand, the bellows and the flags. The show's own graphics do light on a stroke, in small
  parts: the largest, a head of the zabumba, is 1.4 % of the main square, and the fastest, one
  button of the jogo de fole on every sixteenth (6.7 a second), is 0.1 % of it, both far under the
  quarter of the central field a flash needs; with reduced motion nothing fades. The measure that
  follows is of the background alone, taken before the graphics. Measured in headless Chromium, 30 frames per second over
  two bars of the Rabeca e bandolim scene: the largest change of mean relative luminance in any
  eighth of the screen's width and height is 0.004 per frame, far below the 0.10 of a flash.
- **Only what sounds.** The wheel draws only the voices the scene plays, with no ghost of the ones
  to come (the maracatu draws them faint): the parts enter one by one on the wheel too, and the key
  over the lanes names at most six voices, on two lines at most
  ([#61](https://github.com/martonpaulo/batuque/issues/61)).
- **Graphics of its own** ([#54](https://github.com/martonpaulo/batuque/issues/54),
  [`forro-graphics.js`](../../src/rhythms/forro-graphics.js)), in the stage's main square, with
  the wheel smaller beside the readout:
  - **Sanfona.** The right hand's keyboard, the white and black keys from the lowest to the
    highest note the tune plays in the whole show (mi to lá, an octave and a fourth). A key is lit,
    in the sanfona's red with a brighter outline and a dot where the finger is, for as long as its
    note is written, over the bar line too; thirds and the
    last chord light their keys together. Under it, the left hand's buttons as the instrument has
    them: one column a note, each a fifth above the one before (dó, sol, ré, lá, mi, si), and one
    row a kind (the bass, the major chord, the minor chord, the seventh), each row standing to the
    right of the one above by an eighth of a column, so it stays under its own note's name. A button lights with its stroke, in the buttons' pearl, as bright as
    the stroke is strong, for a sixteenth, and fades over the next: the bass alternates between a
    column and its neighbour, and the jogo de fole shows its accents in 3 + 3 + 2 on one button.
  - **Zabumba.** The drum from the side: the head the maceta plays above, the head the bacalhau
    plays below, the shell between them and each head's name beside it. A head lights while its
    stroke rings (0.3 s for the maceta's open stroke, 0.14 s for the bacalhau). A stroke of the
    maceta pressed into the skin lights the middle of the head alone, for 0.14 s, and stops the
    ring of the open stroke before it, as the hand does.
  - Both read the show position alone: the keys and the buttons from the engine's hits of the bar
    and of the bar before, the heads from the strokes that just sounded. With reduced motion a
    key, a button or a head is lit while it sounds and plain otherwise: nothing fades. A muted
    sanfona or zabumba shows disabled and lights nothing. In a scene where the instrument does not
    play, its graphic is at rest.
  - Every label is the stage's label size as the page renders it, no two names overlap and
    nothing is drawn outside the main circle (`tests/page.test.js`).
- **Widgets.** The wheel, smaller, the lanes and the readout stay; the maracatu score, swing table and
  waves do not, as forró has no measured swing and no notated baques here. The readout shows what
  each scene teaches: the triângulo's closed and open strokes, the zabumba cell, the bacalhau on
  the off-beats, the chords and their degrees, the mode with its flat seventh, the doubling, the
  3 + 3 + 2 accents, and the totals at the end. The centre names the Baião, the BREQUE and the FIM.

## Round two: a first reading of the references

The forró's reading, made on 2026-11-28 from the whole of the four recordings the owner named
([`references.md`](../research/references.md)), by the method of
[`round-two.md`](../research/round-two.md#how-to-read-four-references), which also says what a reading is: a
proposal, with nothing built. The forró's section maps are in
[`lab/reference-sections.txt`](../../lab/reference-sections.txt) and its pulse periods and level shapes in
[`lab/reference-pulse.txt`](../../lab/reference-pulse.txt). The first round read one
of the four, «Forró no Malagueta».

The four are three dance feels: two xotes («Numa Sala de Reboco» and «Meu Cenário»), a baião-paced
forró («Forró no Malagueta») and a faster forró («Forrobodó»).

What the four forró recordings share, each trait with the trust its measurement earns:

| Trait                             | Evidence                                                                                                                                                                                                                            | Trust  |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- |
| The band plays from the first bar | Each recording holds its body level from its first 0 to 5 seconds, and none has a dip of 8 dB longer than half a second: no build-up and no long stop                                                                               | High   |
| The sanfona's range leads         | The bands from 250 Hz to 1 kHz hold the most energy in the mean of the four; the low drum sits from 60 to 120 Hz, and under 60 Hz there is almost nothing (23 dB under the whole)                                                   | High   |
| Held sound over the percussion    | The percussive share of the energy is 0.13 to 0.27: the sanfona and the voice, not the zabumba and the triângulo, make most of the sound                                                                                            | High   |
| Three tempos, one family          | The onsets repeat at a beat of 784 ms, 714 ms, 610 ms and 453 ms: about 76, 84, 98 and 132 BPM. Their mean is 97. The beat tracker read three of them at a ratio (152, 172 and 129)                                                 | Medium |
| A steady grid of sixteenths       | The shortest strong period is the sixteenth in three of the four (180, 157 and 116 ms), and the onsets repeat at the beat with a strength of 0.31 to 0.61 through a whole song                                                      | Medium |
| The low drum's cell               | In «Forrobodó», whose bars fold at the felt tempo, the low band has a stroke on the beat, one on the third or fourth sixteenth and a pick-up before the next bar. In the two xotes it has a stroke on each eighth of the first beat | Low    |
| Minor keys                        | By the chroma, three of the four sit in a minor key (E minor with its dominant, A minor with D minor, B minor); «Forrobodó» is in D and G major                                                                                     | Low    |
| The sanfona frames the song       | In «Meu Cenário» the opening, the middle passage and the ending are one alike section, the least percussive of the song (0.07 to 0.09): the sanfona alone with the trio. The other maps do not separate it                          | Low    |

The forró against the literature ([`brega-forro.md`](../research/brega-forro.md),
[`pernambuco-rhythms-feeling.md`](../research/pernambuco-rhythms-feeling.md)):

- **Agrees.** The order of the tempos, xote under baião under the faster forró. The trio led by the
  sanfona, with the triângulo keeping sixteenths. The zabumba's cell of a dotted eighth and a
  sixteenth. The sanfona that plays «melody, intros and interludes».
- **Disagrees.** No tempo range of the sources holds all four: the two xotes sit at 76 and 84,
  between a dissertation's 70 to 80 and a web source's 85 to 110.
- **Not measured.** The mixolydian or dorian mode: the chroma gives a key, not a scale. The
  triângulo's open stroke and the bacalhau: both are inside the bands above 2 kHz.

What the reading could not do:

- Tell the instruments apart. No stems were separated on this Mac.
- Find the bar line: the fold starts on the strongest low stroke.
- Say which passages are the sanfona alone in three of the four songs.

Against the show as it is, rendered through the page and read with the same tool: its tempo, 100
BPM, is the middle of the four. It holds its energy from 60 to 250 Hz, 2 to 4 dB over the
references, and is 5 to 8 dB short from 250 Hz to 2 kHz, where the sanfona's body is: the tune sits
under the zabumba and the bass, as the first round measured. Its onsets repeat at the beat with a
strength of 0.74, above every reference (0.31 to 0.61): it is more even than people play.

The elements proposed for the forró show to exalt, which the owner has not answered yet:

1. **The sanfona as the singer**: one opening riff a room can sing back, stated in the first bars,
   that returns between the parts and closes the piece.
2. **The resfolego**: the bellows pushed and pulled in rhythm, the sanfona's own percussion.
3. **Zabumba and triângulo as one swing**: the maceta low, the bacalhau answering on the off-beat,
   the triângulo opening on the off-beat; under the tune, never over it.
4. **The longing in the mode**: a minor colour with the flat seventh held, as three of the four
   references are in a minor key.
5. **The breque**: one short stop of the whole band, and the sanfona alone bringing it back.

The form proposed, about 1:40 at 100 BPM: the riff with the trio from the first bar; the tune's
first part; the riff again; the second part, on the flat seventh; the jogo de fole, with the
zabumba and the triângulo in front; the breque and the sanfona's pick-up; the first part with
everyone; the riff once more and a held chord. The tempo stays at 100 BPM.

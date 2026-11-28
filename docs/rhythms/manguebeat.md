# Manguebeat

The manguebeat show: `/manguebeat`, package [`src/rhythms/manguebeat.js`](../../src/rhythms/manguebeat.js)
with its background [`src/rhythms/manguebeat-background.js`](../../src/rhythms/manguebeat-background.js).
The spec is [`expansion-decisions.md`](../research/expansion-decisions.md), the `mangue` script of
[`scripts.html`](../sketches/scripts.html) and the `mangue` background of
[`backgrounds.html`](../sketches/backgrounds.html). This page records each choice the build made and
why ([#24](https://github.com/martonpaulo/baque-virado/issues/24)). On 2026-11-17 the music and the
mix were rewritten against the owner's reference recordings, measured: see
[Measured against the references](#measured-against-the-references).

## Contents

- [References](#references)
- [Music](#music)
- [Sound](#sound)
- [Measured against the references](#measured-against-the-references)
- [Visuals](#visuals)
- [Widgets per scene](#widgets-per-scene)
- [Round two: a first reading of the references](#round-two-a-first-reading-of-the-references)
- [Open points](#open-points)

## References

The owner named four recordings, all by Nação Zumbi; no other recording decides anything here.

- «Coco Dub (Afrociberdelia)», Chico Science & Nação Zumbi: the main reference, a dub of a coco.
- «Meu Maracatu Pesa uma Tonelada», «Defeito Perfeito» and «Cicatriz», Nação Zumbi: the later,
  heavier band, with loud alfaias and thick distorted guitars in a full rock mix.

The show takes the groove, the instruments, the density, the balance and the mood from them, and
no melody or riff: every line is original. The target is heavy mangue rock with the dub of the
main reference.

## Music

- **Feeling.** Anger and weight, in a minor key
  ([`expansion-decisions.md`](../research/expansion-decisions.md), Feelings per show).
- **Tempo and metre.** 105 BPM for the whole show, counted on the quarter note: the top of the
  range of [`pernambuco-rhythms-feeling.md`](../research/pernambuco-rhythms-feeling.md), § 4
  («Tempo is about 90 to 105 BPM»), and the nearest to the main reference, which a beat tracker
  reads at 107 («Meu Maracatu Pesa uma Tonelada» also reads near 107). It was 100. 4/4 on a
  16-step wheel, one bar per turn: 2.29 s per turn. 52 bars, 1:59.
- **One track, not a roll call.** The owner's direction of 2026-11-17: the band plays from the
  start, as a real track of the genre does, with the full texture most of the time, and each scene
  brings one characteristic of the rhythm forward, not one instrument entering alone. The show does
  it the way a band does: the other parts drop back (a scene's `gain`: 1.2 for its subject, 0.8
  for the rest), thin out or stop for a few bars, then the full band returns. After the two-bar
  introduction no bar has fewer than three instruments, and 40 of the 52 bars have six voices or
  more (`tests/manguebeat.test.js`).
- **Scenes.** Thirteen:

  | Scene          | Bars | What it brings forward                 | How the band does it                                                 |
  | :------------- | :--- | :------------------------------------- | :------------------------------------------------------------------- |
  | Introdução     | 2    | the sampler and the echo               | the record's noise, one stroke thrown, a guitar's feedback           |
  | Célula         | 4    | the cell, 3 + 3 + 2 twice a bar        | the whole band in; both alfaia hands hit it together, in front       |
  | Mãos           | 4    | the main hand and the answer's pick-up | guitar and bass hold one chord a bar; caixa and ganzá drop back      |
  | Caixa          | 4    | syncopated accents and ghost notes     | the riff is back; the caixa in front, a throw closes the phrase      |
  | Baixo          | 4    | how the bass locks with the alfaia     | the guitars stop; the bass riff over the drums                       |
  | Riff           | 4    | the guitar on the cell's accents       | the whole band, the guitar in front                                  |
  | Dub            | 4    | the drop and the echo                  | the band stops: bass, one stroke a bar, throws, the clean guitar     |
  | Retorno        | 4    | the way back from the drop             | the layers return one per bar                                        |
  | Conversa       | 4    | call and response                      | the riff asks in the first half of the bar, the clean guitar answers |
  | Corte          | 2    | the break                              | a stop into the echo, then a stop-time bar                           |
  | Parte B        | 4    | the second part                        | the riffs move to the fourth and climb back                          |
  | Banda completa | 8    | everything                             | the riff twice, the clean guitar answering                           |
  | Final          | 4    | the dub ending                         | one stroke for all, its echo, silence                                |

- **The cell.** The drums of the main reference were separated and folded on the sixteenth grid:
  the low, middle and high bands are all strong on sixteenths 1, 4 and 7 of each half bar, with a
  pick-up on 8, and weak on beat 2. That is the coco's cell, 3 + 3 + 2, twice a bar, played by the
  whole drum section, with no backbeat. The show's first version had 3 + 3 + 4 + 3 + 3 for the
  alfaia and a backbeat on beats 2 and 4: the reference disagrees, and the reference wins.
- **Alfaias.** The main hand plays the cell (sixteenths 1, 4, 7, 9, 12, 15), heavy. In Célula
  the answer hand plays it too, in unison; from Mãos on it plays the pick-ups before beats 3 and 1
  (sixteenths 8 and 16) and soft strokes between, rolls into every second bar, and fills at the
  end of each four-bar phrase.
- **Caixa.** The same cell, its loudest strokes the syncopated ones (sixteenths 7 and 15), never
  the first beat, with ghost notes around them, two alternating bars and a fill that closes each
  phrase. The studio adds ghosts that come and go.
- **Ganzá.** Every sixteenth, the accents on the cell (it was the third sixteenth of each beat).
- **Bass.** A four-bar riff of its own in E minor, short notes and rests, as the reference's bass
  (a median note of about a quarter of a beat): the tonic and its octave, the seventh and the fifth
  in bars 1 to 3, then the fourth, the third and the flat seventh. A second part starts on the
  fourth and climbs back. It no longer doubles the main hand stroke for stroke; it starts each bar
  with it, an octave under the guitar's first chord.
- **Guitar riff.** Original, four bars: power-chord stabs on strokes of the cell (E5, E5, G5, then
  a rest, then D5 or A5 and G5 leading back), palm-muted chugs between, and rests; the last bar
  goes A5, G5, D5. The second part: A5 and C5, G5 and D5, the tonic bar, then G5 climbing to A5.
  Every chord is one the recorded takes can vary: see Sound.
- **Second guitar.** Clean, in the echo: short answers in E minor pentatonic in the second half
  of the bar, where the riff rests, with one bar of silence in four for the echo to ring. It
  leads in the Dub and answers from Conversa to the end.
- **Dub.** The band stops. One stroke of the alfaia a bar, thrown into the echo, whose repeats play
  the cell (each is three sixteenths after the one before); a bass line with long notes and long
  rests; two caixa throws; the clean guitar's phrases. The bass drops out in the last bar, where
  the answer hand picks the band up.
- **Echo.** A dotted eighth: three sixteenths, 429 ms at 105 BPM. It is a real delay in the studio
  (feedback 0.55, each repeat darker and thinner, a little to the left, into the room), fed by
  throws: single strokes sent into it (the first stroke of the show, the alfaia and the caixa in
  the dub, the last caixa accents of a phrase, the stop, the final stroke). The clean guitar always
  feeds it. The parts still write each repeat as a mark, softer each time, inside its own scene,
  so the wheel and the lanes show the echo as smaller dots; the marks make no sound of their own.
- **Corte and Final.** Corte: everyone on 1, the caixa and the guitar thrown into the echo, and a
  bar of silence; then the band plays only the cell's strokes, together. Final: the band once
  more, one stroke for all with the guitar and the bass held, then only that stroke's echo, then a
  bar of silence.

## Sound

Every voice plays through the studio ([`studio.md`](studio.md)): round robin with no immediate
repeat, velocity layers, a 1/f timing drift led by the main hand, a phrase swell over four bars
and a small room (`sala-pequena`). Sources are in [`CREDITS.md`](../../CREDITS.md).

| Voice          | Takes                                                                                                                                  | Source                          |
| :------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------ |
| alfaia         | per hand, five layers: the repository's deep, click, body and short strokes and an alfaia hit of the zabumba group, tuned down         | the repository                  |
| caixa          | the recorded `caixa` group, all five layers, two takes each, double-tracked                                                            | VSCO 2 CE, VCSL                 |
| ganzá          | small shaker, two forward and two back strokes; the repository's rice ganzá                                                            | VCSL, the repository            |
| baixo          | the recorded `baixo` group: the seven notes of the lines and a fingered low E                                                          | the repository (Freesound)      |
| guitarra       | distorted power chords: three E5 takes, G5, D5, C5 palm-muted; E5 and G5 held, also cut short as stabs; double-tracked, left and right | Freesound, sound-library branch |
| guitarra (eco) | the brega's clean Stratocaster notes, through a drive, a chorus and the echo                                                           | Freesound                       |
| sampler        | a worn record's noise, two takes of 1.2 s, twice a bar                                                                                 | synthesized, seeded             |

- **Balance.** The drums lead, the bass sits under them, the guitars are wide: the measured balance
  of the references. The first version was the reverse: the bass was the loudest thing, the
  top end was 5 to 9 dB short from 1 kHz up, and the mix was almost mono.
- **Alfaias.** Tuned down three semitones (the main hand) and about two (the answer), because the
  references' drums carry their weight an octave band under the repository's recordings; a peak at
  3.5 kHz brings out the stick. The answer hand sits to the right.
- **Caixa.** Louder and brighter (its low-pass opens to 19 kHz, a shelf above 5 kHz, less box at
  480 Hz), a soft drive, and two takes a few milliseconds apart.
- **Bass.** About 5 dB lower than before against the drums, round (low-pass at 3.2 kHz for the
  loudest note), with a soft drive, a shelf under 70 Hz for the weight and a peak at 800 Hz so the
  line reads on a small speaker.
- **Guitars.** The power chords play twice, two different takes, 11 ms and 7 cents apart, hard
  left and right, through a drive. A chord borrows a recorded one at most two semitones away; its
  double, or the same chord played twice running, at most three (`tests/manguebeat.test.js`). The
  riffs use the chords the takes can vary (E5, G5 and A5 freely; D5 and C5 only between other
  chords), so no chord repeats the same pair of recordings at once. The clean guitar's low-pass
  follows its velocity, as a wah pedal opens.
- **Bus.** A shelf of +6 dB under 60 Hz, −2 dB around 600 Hz and −1.5 dB above 2.5 kHz, set by
  the measured difference to the references.
- Timing templates (ms per sixteenth of the beat): the alfaias, the bass and the guitars share
  2, −5, −9, −8 (the off-beats a little early, milder than the maracatu's measured alfaias); the
  ganzá 0, 2, −6, −5; the caixa 0, 2, −2, 0. The sampler stays on the grid.
- The sampler has no instrument to record (the research says it must be synthesized): crackle,
  hiss, a slow wow and a low rumble from a seeded noise source, the same bytes on every run.
- A phone downloads every default take and the room: 52 files and the room, about 493 KB. The limit
  is 520 KB (`tests/manguebeat.test.js`), set by the agent, to confirm with the owner. The second
  guitar's nine takes added 82 KB; the four echo returns are no longer downloaded.

## Measured against the references

Measured with the sound lab of 2026-11-17 (Demucs stems, CLAP embeddings, long-term spectrum), on
the full band (bars 37 to 48: Parte B and Banda completa) and on the whole show's loudest windows.
«References» is the mean of the four recordings' instrumental stems; the CLAP row gives each
recording's similarity to the centre of the four. «Before» is the first version, at 100 BPM, with
the parts entering one at a time.

| Measure                                    | Before               | Full band now           | Whole show now       | References             |
| :----------------------------------------- | :------------------- | :---------------------- | :------------------- | :--------------------- |
| CLAP similarity to the references' centre  | 0.74 to 0.78         | 0.86                    | 0.85                 | 0.84, 0.94, 0.93, 0.91 |
| «Real band or MIDI file» probe             | 0.77 to 0.93         | 1.00                    | 1.00                 | 0.96 to 1.00           |
| Drums, bass, other (Demucs, dB of the sum) | −5.3, −2.0, −11.1    | −1.6, −7.9, −8.3        | not separated        | −2.2, −7.6, −9.5       |
| Side against mid (stereo width), dB        | −20.5                | −11.0                   | −12.1                | −9.2 (main one: −10.8) |
| Onsets a second                            | 4.7                  | 6.3                     | 6.6                  | 6.6                    |
| Crest factor, dB                           | 11.0                 | 11.8                    | 11.3                 | 12.3                   |
| Spectrum, worst band from 60 Hz to 8 kHz   | −7.2 dB (4 to 8 kHz) | +2.8 dB (250 to 500 Hz) | −3.0 dB (2 to 4 kHz) | 0                      |
| Spectrum, 20 to 60 Hz                      | −7.3 dB              | −0.1 dB                 | −0.7 dB              | 0                      |

- The drum grid of the full band, folded as the reference's was (low band, eight sixteenths of a
  half bar): 0.93, 0.45, 0.26, 1.00, 0.32, 0.72, 0.86, 0.43; the main reference: 1.00, 0.37, 0.23,
  0.74, 0.23, 0.36, 0.79, 0.51. Both are the 3 + 3 + 2 cell.
- Solo renders, tagged without training (CLAP): the guitars read as «a distorted electric guitar»
  (0.76) or «a clean electric guitar with delay» (0.18), not «a synthesizer» or «a MIDI keyboard»
  (0.01); the bass as «an electric bass guitar» (0.96); the alfaias as «large bass drums played
  with sticks» (0.99); the caixa as «a marching snare drum with ghost notes» (0.98).
- The similarity goal was 0.85. The band's second part scored 0.73 without the clean guitar and
  0.85 with it, which is why that guitar answers from Conversa to the end.
- Window by window (10 s), the whole show now stays between 0.77 and 0.86 while the band plays,
  and falls to 0.72 only in the dub's drop. With the parts entering one at a time the first 40
  seconds scored 0.58 to 0.73.
- The whole show is a little darker than the full band from 500 Hz to 4 kHz (−2 to −3 dB), because
  the scenes pull the guitars back or out.
- The audio-quality model (Audiobox aesthetics, production quality) gives the full band 6.6 and
  the references 7.0 to 8.0; the first version scored 7.3 to 7.4. The drive and the record's noise
  are the likely cost; it needs the owner's ear.

What the numbers do not show: whether it grooves. No number here replaces the owner's ear.

## Visuals

- Palette from [`colour-and-visuals.md`](../research/colour-and-visuals.md), section 5, Manguebeat:
  ground `#0b0a07`, mud `#3b2f22`, rust `#b3261e`, mangrove `#4f6b3a`, the antenna's pale
  `#d9d2b8`, with iron and cable greys and the crab's orange only on accents. Material colours on
  the wheel: the main hand crab orange, the answer raw leather, the caixa iron, the ganzá mangrove,
  the bass mud, the guitar rust and its echo tide water, each lifted to 3:1 or more on the wheel's
  face and on the ground.
- The background comes out of the wheel and stays circular: a mud and mangrove field from just
  outside it; a grain of mud, concrete and rust that changes on each beat (a nod to a pixel
  collage); an iron ring thrown by each stroke of the main hand, stepping outward on each beat,
  jagged by the scene's fury, rust on the bar's first beat; cables hanging from the wheel that
  shake on the guitar; an antenna on top that grows with the sampler; the echoes as thin mangrove
  rings that step outward. The mud follows the music's energy
  ([#63](https://github.com/martonpaulo/batuque/issues/63)): the tide creeps out from the wheel as
  slow, uneven rings of mangrove green on the energy clock; the cables swing all the time, wider
  the busier the band is; and the field heaves outward in one heavy step a beat. Reduced motion
  drops all three.
- Under the wheel the field is clear: every gradient stop under the wheel keeps the wheel colours at
  3:1 and every shape is born outside it (`tests/manguebeat.test.js`).
- Flash safety: the one bright emission is a pale ring of light on the guitar's first chord of a
  bar, in the scenes with `flash`: at most one a bar (2.29 s), far under 3 a second; the test draws
  the whole show at 30 frames a second and counts them. It starts outside the wheel. No red passes
  R/(R+G+B) 0.8.
- Reduced motion: no bloom, no jitter, the grain stops changing, the rings travel half as far.
- **Graphics of its own** ([#56](https://github.com/martonpaulo/batuque/issues/56),
  [`manguebeat-graphics.js`](../../src/rhythms/manguebeat-graphics.js)), in the stage's main square,
  with the wheel smaller beside the readout:
  - **Tablatura do baixo.** The neck of the bass: the nut, five frets at the instrument's spacing
    and the four strings. The note that sounds lights its string and its place: a dot behind its
    fret, or a ring left of the nut for an open string. Each note sits at its lowest fret, so the
    whole show stays in the first position. Under the neck, the bar's tablature: one line a
    string, a fret number where each note starts and a line for as long as it is held; the note
    that sounds is lit. A bar where the bass rests keeps its four empty lines.
  - **Eco.** The stroke a scene throws into the echo and one circle for each repeat the scene
    marks, four or seven. Each copy has 0.55 of the level of the one before, the delay's feedback,
    and its area follows; a copy lights as it sounds, every three sixteenths, and fades over two
    repeats, in the colour of the instrument whose stroke it is, named under the row. A scene
    with no echo shows the copies at rest, and a scene's copies do not follow into the next.
  - With reduced motion a note or a copy is lit while it sounds and plain otherwise: nothing
    fades or grows. A muted bass dims the tablature and lights nothing, and a muted instrument's
    stroke lights no copy.
  - Every label is the stage's label size as the page renders it, and nothing is drawn outside
    the main circle (`tests/page.test.js`).

## Widgets per scene

| Scene          | Widget                                                    | Why                                   |
| :------------- | :-------------------------------------------------------- | :------------------------------------ |
| Introdução     | tempo, metre, bar length, the echo's length, instruments  | one tempo; the dub delay              |
| Célula         | one row of marks, the cell, the strokes counted from 1    | both hands in unison on 3 + 3 + 2     |
| Mãos           | the two hands' rows, the held chords                      | the answer plays the pick-ups         |
| Caixa          | the main hand's row over the caixa's, accents and ghosts  | the caixa accents the alfaia's cell   |
| Baixo          | a roll of the bass riff, where it meets the alfaia, notes | together on beat 1, then rests        |
| Riff           | a roll of the riff over the bass, key and chords          | the riff and the bass under it        |
| Dub            | the main hand's row with the echo's repeats, the space    | the echo plays the cell; the band out |
| Retorno        | the entering instrument                                   | the layers return one per bar         |
| Conversa       | a roll of the two guitars, who asks and who answers       | call and response inside the bar      |
| Corte          | stop bars and strokes together                            | the break                             |
| Parte B        | a roll of the second part over the bass, its chords       | the variation                         |
| Banda completa | a roll of the riff over the bass for the 8 bars           | the whole band                        |
| Final          | scenes, instruments, bars                                 | the totals                            |

## Round two: a first reading of the references

The manguebeat's reading, made on 2026-11-28 from the whole of the four recordings the owner named
([`references.md`](../research/references.md)), by the method of
[`round-two.md`](../research/round-two.md#how-to-read-four-references), which also says what a reading is: a
proposal, with nothing built. The manguebeat's section maps are in
[`lab/reference-sections.txt`](../../lab/reference-sections.txt) and its pulse periods and level shapes in
[`lab/reference-pulse.txt`](../../lab/reference-pulse.txt). The four weigh the same
now: [References](#references) above still calls «Coco Dub» the main one, as the first round did.
«Meu Maracatu Pesa uma Tonelada» was read in the live television performance the owner's list
names.

What the four manguebeat recordings share, each trait with the trust its measurement earns:

| Trait                        | Evidence                                                                                                                                                                                                                                 | Trust  |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- |
| The weight is in the low end | In every song the two bands from 60 to 250 Hz hold the most energy, and each band above 4 kHz sits 12 dB or more under them                                                                                                              | High   |
| One riff, one key            | «Defeito Perfeito» reads F sharp minor in all seven of its sections and the live «Meu Maracatu Pesa uma Tonelada» reads E in all; «Cicatriz» is two long sections. Once the band is whole, the sections of a song stay within about 1 dB | High   |
| A thin opening               | Three of the four hold their body level only from 14, 28 and 35 seconds. The live recording opens and ends on the drums alone (a percussive share of 0.44 and 0.50, against 0.20 to 0.27 in its body)                                    | Medium |
| The tempo                    | The onsets repeat at a beat of 555 ms, 575 ms and 610 ms in three songs: 108, 104 and 98 BPM. «Cicatriz» repeats at 418 ms: 144 BPM, or 72 felt in half time                                                                             | Medium |
| Threes against the beat      | «Coco Dub» repeats at three sixteenths (412 ms) and at the half bar; «Defeito Perfeito» at six sixteenths, and its low strokes fold three sixteenths apart; the live recording splits its beat in three (192 ms of 575)                  | Medium |
| A drop                       | «Coco Dub» falls 4 dB for 18 seconds with half the onsets (3.9 a second against 6 to 7), then returns whole; «Defeito Perfeito» thins to 4.7 onsets a second for 25 seconds at the same level                                            | Low    |

The manguebeat against the literature ([`frevo-manguebeat-coco.md`](../research/frevo-manguebeat-coco.md),
[`pernambuco-rhythms-feeling.md`](../research/pernambuco-rhythms-feeling.md)):

- **Agrees.** «A thundering drum core, booming bass»: the low end leads. «Riffs, not songs: one or
  two chords»: one key through a song. The dub's space: the drop. The tempo of about 90 to 105
  BPM, which the research marks as inferred: three of the four sit at 98 to 108.
- **Not measured.** The «heavy backbeat» a source describes. The first round found none in the
  separated drums of «Coco Dub»; this reading has no stems and cannot say for the other three.

What the reading could not do:

- Tell the alfaias from the bass, or the guitar from the caixa: no stems were separated on this Mac.
- Fold the bars of «Coco Dub» and «Cicatriz»: the beat tracker read both at 143.6 BPM, which is a
  dotted value of 108 in the first and may be double the felt tempo in the second.
- Read the riffs: their notes and their length before they repeat.

Against the show as it is, rendered through the page and read with the same tool: its tempo, 105
BPM, is inside the three songs' 98 to 108, and its onsets repeat at the same two periods as «Coco
Dub»'s (430 ms and 1144 ms against 412 and 1109). It is 3 dB over the references under 120 Hz and
5 to 7 dB short from 500 Hz to 4 kHz, where the guitars and the caixa are; its percussive share is
0.16 against 0.22 to 0.27. It is whole from its fourth second, where three references open thin.

The elements proposed for the manguebeat show to exalt, which the owner has not answered yet:

1. **The wall**: several alfaias and the bass as one weight, the loudest thing in the mix.
2. **One riff with an identity**: guitar and bass on one chord, two bars long, repeated until it
   is the hook.
3. **Threes against the beat**: the cell 3 + 3 + 2, played by the whole drum section together.
4. **The drop and the echo**: the band stops, one stroke is thrown into the dotted-eighth echo,
   and the band returns whole.
5. **The drums alone at the edges**: the drum section opens the piece and has the last word.

The form proposed, about 1:55 at 105 BPM: four bars of the drum section alone, over the record's
noise; the riff enters with the bass and the band is whole; rounds of the riff, each bringing one
thing forward (the cell, the caixa's ghost notes, the bass under the alfaia, the guitar); the drop
into the echo; the return, one layer a bar; the second part, the riff a fourth up; the whole band
with the clean guitar answering, the loudest round; one stroke for everyone, two bars of the drums
alone, and the last stroke into the echo. The four bars of drums alone are an exception to «the
band plays from the start» ([`../product.md`](../product.md), Rhythm shows), as the bregafunk's
bars of teasing are: the owner decides.

## Open points

- The cell is measured on one recording's separated drums; the bass and guitar riffs are original
  and unchecked by a player. Check them with players.
- Recordings to look for: a real alfaia section in several takes per stroke (today the layers are
  edits of few recordings, tuned down), a metal ganzá, a rock caixa, more distorted chords (D5, C5
  and B5 have one take each, which limits the riff's harmony), a wah guitar, a fuzz bass.
- The echo's repeats ring past the end of their scene; the marks on the wheel stop at it.
- The four echo-return files in `sounds/` are no longer played; they can be deleted.
- Levels are by measurement; they need the owner's ear.

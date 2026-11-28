# Brega

The brega show: Recife's romantic brega, called «brega» on the site. What it plays, what it shows
and why. The package is [`src/rhythms/brega.js`](../../src/rhythms/brega.js), its background
[`src/rhythms/brega-background.js`](../../src/rhythms/brega-background.js) and its rules
[`tests/brega.test.js`](../../tests/brega.test.js). Built in
[#26](https://github.com/martonpaulo/baque-virado/issues/26) from the `brega` entry of
[`docs/sketches/scripts.html`](../sketches/scripts.html) and the notes in
[`docs/research/`](../research/), then rewritten against the owner's reference recordings.

## Contents

- [References](#references)
- [Music](#music)
- [Sound](#sound)
- [Feel](#feel)
- [Measured against the references](#measured-against-the-references)
- [Visuals](#visuals)
- [Widgets per scene](#widgets-per-scene)
- [Round two: a first reading of the references](#round-two-a-first-reading-of-the-references)
- [Open points](#open-points)

## References

The owner named the recordings the show aims at (2026-11-17). They are a reference for the groove,
the instruments, the register, the density and the mood; no melody is taken from them.

- «Uma Mulher É Igual uma Flor», Banda Musa do Calipso: the main reference; two other bands'
  versions of the song were measured with it.
- «Ainda Bem», Banda Lapada: measured on the band's live recording («Áudio da Live»), not on the
  television performance (SuperStar, Globo) the owner named.
  The owner took this song out of the brega's references on 2026-11-17 and put it back the same day;
  the current list is in [`../research/references.md`](../research/references.md).
- «Diz na Minha Cara», Banda Lapada (SuperStar): no recording of the band's was reachable; the
  versions by Banda Torpedo and Tayara Andreza stand in for it.
- «Novo Namorado», Priscila Senna.

Each was heard as a 30-second preview. Banda Lapada is a live band of Recife, so the show aims at
a band on a stage (a drum kit, bass, keyboard, guitar and a brass line), not at a studio keyboard
production.

What the recordings show, and the show follows. Where they disagree with
[`brega-forro.md`](../research/brega-forro.md), which analysed no recording, the recordings win.

| Fact            | Measured on the recordings                                          | The research said                   |
| :-------------- | :------------------------------------------------------------------ | :---------------------------------- |
| Tempo           | 135 to 136 BPM on the main reference and «Ainda Bem»                | 130 to 150, the sketch at 140       |
| Bumbo and caixa | bumbo on steps 1 and 7 of 16, caixa on 13: the bar splits 3 + 3 + 2 | bumbo on 1 and 9, caixa on 5 and 13 |
| Chimbal         | every eighth, about level; loud on the live recording               | off-beat eighths louder             |
| Bass            | about two notes a beat, a leap in half of its moves, G2 to C3       | root, a push on 16, octave jumps    |
| Chords          | short, on the eighths between the bumbos and with the second one    | off-beat stabs                      |
| Harmony         | minor key, down to the dominant (i, VII, VI, V), main reference     | about four chords (I, IV, V)        |

## Music

- **Feeling.** Heartbreak enjoyed together, in a minor key, as
  [`expansion-decisions.md`](../research/expansion-decisions.md) sets it.
- **Tempo.** 4/4 at 136 BPM for the whole show, a 16-step wheel, one bar (1.76 s) per turn. Two
  bumbos and a caixa in each bar give the slow two-step a dancer feels.
- **Form.** 55 bars, 1:37. The band plays from the first bar, as a track of the genre does (the
  owner's direction, 2026-11-17: no show but the maracatu builds up one instrument at a time).
  Each scene shows one thing about the rhythm by arrangement: the other parts rest or drop back,
  the part shown is louder, then the band returns whole. Only two single bars leave one or two
  voices alone: the Virada and the Breque's heartbeat.

  | Scene (bars)     | Shows                                    | How                                             |
  | :--------------- | :--------------------------------------- | :---------------------------------------------- |
  | Introdução (4)   | the whole band and the head of the theme | everyone plays                                  |
  | Base (4)         | the xacumbum, 3 + 3 + 2                  | melody and chords rest, kit louder, bass softer |
  | Baixo (4)        | the bass walking from bumbo to bumbo     | strings rest, bass louder, chords softer        |
  | Teclado (4)      | strings and short chords                 | both louder, the band whole                     |
  | Guitarra (8)     | the guitar in thirds, relative major     | guitar louder over the band                     |
  | Virada (1)       | the tom fill into a section              | toms and bumbo alone for one bar                |
  | Refrão (8)       | the theme, the guitar answering          | everyone plays                                  |
  | Breque (2)       | the break                                | a hit, silence, the bumbo's heartbeat           |
  | Vinheta (8)      | guitar calls, horns answer               | the theme rests                                 |
  | Refrão final (8) | the key change                           | everyone plays, a whole tone up                 |
  | Final (4)        | the ending                               | theme, fill, one held chord                     |

- **Base (xacumbum).** Bumbo on 1 and 7, caixa on 13, the chimbal on every eighth. Every fourth
  bar leads out with a third bumbo on 11, a ghost caixa on 16 and an open chimbal on 15. No swing.
- **Bass.** The root with the first bumbo, the fifth with the second, then eighths through the
  chord (octave, fifth, third) and a note a semitone below the next root. Three shapes take turns
  over a four-bar phrase, six or seven notes a bar.
- **Harmony.** A minor. The band enters on Am, G, F, E7 (i, VII, VI, V7). The theme has one chord
  a bar: Am, Dm, G, C, F, Dm, E7, Am (the minor key's circle through its relative major to its
  dominant). The guitar's part is in the relative major: C, G, Am, Em, F, C, Dm, E7. The strings
  hold one chord a bar; the keyboard plays short chords on five eighths of the bar, never on 1.
- **Melodies.** Original. The theme is eight bars on the trompete: it starts after the beat,
  climbs the chord, pushes notes a sixteenth or an eighth ahead of the beat, bends into its long
  notes, runs in sixteenths into the next phrase, and rests in bars 4 and 8, where the guitar
  answers. Bars 5 and 6 answer bars 1 and 2 from the top note. The guitar plays in thirds, with a
  sixth on phrase ends (G♯ over E7); in the last chorus it doubles the theme's longer notes an
  octave down.
- **Fills and breaks.** A tom fill comes before each chorus: a whole bar (Virada, the toms on the
  base's 3 + 3 + 2) before the first, the last two beats of the Vinheta before the second. The
  Breque: everyone on 1, a bar of silence but for the bumbo's heartbeat, then the Vinheta.
- **Horns.** In the Vinheta the horns answer each guitar bar: three stabs around the second bumbo,
  then the section falls off the note. In the last chorus they punch the theme's two rests.
- **Key change.** The last chorus and the end go up a whole tone (B minor), the research's «key
  change up a step on the last chorus» [I].

## Sound

Every instrument is a real CC0 recording, played through the studio
([`docs/rhythms/studio.md`](studio.md)); the reverb's impulse response is generated. Sources and
edits are in [`CREDITS.md`](../../CREDITS.md).

| Voice    | Takes                                                              | Source               |
| :------- | :----------------------------------------------------------------- | :------------------- |
| bumbo    | three 808-style kicks (reused), cut to 0.13 s                      | Freesound            |
| caixa    | snare with snares, four dynamics, two round robins (reused)        | VSCO 2 CE            |
| chimbal  | four closed and two open hats (reused)                             | Freesound            |
| tom      | high and low tom, two dynamics; the middle tom from both           | VCSL                 |
| baixo    | eight picked electric bass notes, E1 to E2, a fingered G2 (reused) | Freesound            |
| cordas   | eleven viola and violin section notes with vibrato                 | VSCO 2 CE            |
| teclado  | TX81Z FM piano, five notes, two dynamics                           | VCSL                 |
| guitarra | seven clean picked notes and two sustained ones                    | Freesound            |
| tema     | trumpet, sustained with vibrato; a sixteenth plays a staccato take | VSCO 2 CE (reused)   |
| metais   | trumpet and trombone staccato (reused); two section falls          | VSCO 2 CE; Freesound |

- A note plays a take within five semitones, retuned by its playback rate; a voice never plays
  the same take twice in a row while another is near enough (both checked in the test).
- A chord is one take per note; the keyboard rolls its notes by 6 ms, the guitar's two by 12 ms.
- The trompete bends into a marked note: it starts a whole tone low and reaches the note in 70 ms.
- Mix: a plate reverb (a generated impulse response, `tools/make-brega-plate.mjs`: 1.9 s, bright,
  its lows cut), long on the caixa; a dotted-eighth tape echo for the guitar and the trompete;
  chorus on the guitar, the keyboard and the strings; the keyboard and the chimbal to the right,
  the guitar to the left; a bus tone (less under 50 Hz, more above 5 kHz).
- A phone downloads every default take, about 1.16 MB (890 KB before the trompete's sustained
  takes). The limit is 1.2 MB (`tests/brega.test.js`), an agent limit for the owner to confirm.

## Feel

- **Drums on the grid.** The kit holds the grid; [`human-feel.md`](../research/human-feel.md),
  rule 12: «tight quantization is authentic here», with the variation in sample choice. The bumbo,
  caixa, chimbal and toms change take, velocity layer and brightness on every hit, never time. The
  chimbal adds a soft sixteenth in about a third of the bars.
- **Players drift.** The keyboard leads with a 1/f drift; the bass, strings, guitar, trompete and
  horns follow it, each with its own smaller correlated drift (the studio's roles).
- **Dynamics.** In a melody a long note and a pushed note are loud and a passing sixteenth is
  soft; the bass leans on the root; each phrase of eight bars swells and falls (the studio's
  phrase arc).
- **Lengths.** The trompete plays legato, the guitar lifts between notes (90 % of the written
  length), the bass plays 85 %, the keyboard's chords last 1.3 sixteenths.

## Measured against the references

Measured with machine-listening models on offline renders of the page (2026-11-17): CLAP
embeddings for the similarity to the references and for a «studio recording of a live
band, or a cheap MIDI file» probe, Demucs for the balance of drums, bass and the rest, and the
long-term spectrum. The models are noisy: a difference under 0.02 in similarity or under 0.1 in
the probe is nothing.

| Measure                                | Before           | Now              | References       |
| :------------------------------------- | :--------------- | :--------------- | :--------------- |
| Tempo, by the beat tracker (BPM)       | 142.9            | 136.4            | 136.4            |
| Bass notes per beat                    | 1.1              | 2.6              | 1.8 to 3.5       |
| Bass, median pitch (MIDI)              | 38               | 42               | 36 to 48         |
| Notes per beat of the rest of the band | 5.5              | 6.6              | 5.7 to 7.9       |
| Similarity, whole show                 | 0.76             | 0.76             | 0.93             |
| Similarity, chorus                     | 0.71             | 0.79             |                  |
| «Live band, not MIDI», whole show      | 0.02             | 0.01             | 0.90             |
| «Live band, not MIDI», chorus          | 0.00             | 0.13             |                  |
| «Brega band, not a toy keyboard»       | 0.03             | 0.01             | 0.52             |
| Side against mid (dB), whole show      | −19.5            | −13.0            | −15.1            |
| Drums, bass, rest (dB of the sum)      | −2.6, −7.0, −6.0 | −3.0, −5.0, −7.3 | −2.4, −6.6, −7.7 |
| Largest gap in a spectrum band (dB)    | 3.8              | 3.0              |                  |

The reference column is the mean of the seven recordings of [References](#references), or their
range. An earlier render of the same chorus scored 0.60 on the «live band» probe with other takes
of the same notes: that probe sits on its edge here and is no proof.

The tempo, the groove, the bass, the width and the balance now sit on the references. The models
still hear a show far from them: the similarity of the whole show did not move, both probes stay
near zero, and only the scenes where the trompete plays the theme come nearer. The drum sounds and
the keyboard are the likely cause (see [Open points](#open-points)).

Tried and measured on the chorus, not kept:

- The theme on a synthesized keyboard lead (two detuned sawtooths and a pulse, a filter envelope,
  a late vibrato, bends): further from the references than the recorded trompete on the same notes
  (similarity 0.36 against 0.49 alone, 0.73 against 0.74 in the band, against two of the
  references) and judged less a live band (0.29 against 0.81).
- A synthesized string pad: no nearer than the recorded strings (0.70 against 0.72).
- The living-room impulse response the bregafunk uses: a little further than the plate (0.74
  against 0.75).
- A wetter room, louder drums, a driven bass and guitar, no key change: each within the noise.

## Visuals

- Palette from [`colour-and-visuals.md`](../research/colour-and-visuals.md), § 5, brega:
  ground `#0a0b18`, desaturated blue `#2b3566`, wine `#8c3b5a`, muted rose `#c98ba0`, pale light
  `#d8d4e8`: darker, bluer and desaturated, the slow and sad pole. Material colours on the wheel:
  the rhythm section in cold blues and steel, harmony and melodies in roses, the horns in a low
  amber. Each reads at 3:1 or more on the wheel's face and on the ground.
- The background is circular and comes out of the wheel: a blue halo that breathes once every two
  bars, thin rings that contract towards the wheel on each beat (heartbreak pulls inward), rose
  petals that leave the wheel on each new chord and drift out and down, and a soft rose bloom
  outward on a phrase accent only. Long trails (0.9 s).
- Flash safety: the bloom is the only bright change, six in the show, at least four bars apart
  (one per 7 s at most, far under WCAG 2.3.1's three per second). Nothing is drawn under the
  wheel but the ground. No red passes R/(R+G+B) 0.8. Reduced motion stops the rings and petals
  moving, the halo breathing and the blooms.

## Widgets per scene

| Scene        | Widget                                     | Why                         |
| :----------- | :----------------------------------------- | :-------------------------- |
| Introdução   | tempo, metre, bar length, key, theme       | one tempo, A minor          |
| Base         | one bar of bumbo, caixa and chimbal        | the 3 + 3 + 2 of the base   |
| Baixo        | bumbo and bass side by side                | the bass lands on the bumbo |
| Teclado      | the progression, the short chords, the pad | keyboard texture            |
| Guitarra     | a melody roll of both lines                | the thirds                  |
| Virada       | the fill on high, middle and low tom       | how sections join           |
| Refrão       | a melody roll of the theme and the guitar  | the theme and its answer    |
| Breque       | the pause and the heartbeat                | the break                   |
| Vinheta      | a roll of the guitar's calls and the horns | call and answer             |
| Refrão final | a roll of theme and guitar, the key change | a whole tone up             |
| Final        | scenes, voices, bars                       | the totals                  |

## Round two: a first reading of the references

The brega's reading, made on 2026-11-28 from the whole of the five recordings the owner named
([`references.md`](../research/references.md)), by the method of
[`round-two.md`](../research/round-two.md#how-to-read-four-references), which also says what a reading is: a
proposal, with nothing built. The brega's section maps are in
[`lab/reference-sections.txt`](../../lab/reference-sections.txt) and its pulse periods and level shapes in
[`lab/reference-pulse.txt`](../../lab/reference-pulse.txt). The five weigh the same
now: [References](#references) above still calls one of them the main one, as the first round did,
and it measured thirty-second previews, «Ainda Bem» in another recording and «Diz na Minha Cara» in
other bands' versions. This reading has Banda Torpedo's recording and the television performance
(the 144 seconds where the band plays, `lab/full-spans.json`).

What the five brega recordings share, each trait with the trust its measurement earns:

| Trait                        | Evidence                                                                                                                                                                           | Trust  |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- |
| One tempo                    | The onsets repeat at a beat of 424 to 459 ms in all five: 131 to 142 BPM, with a mean of 136. The beat tracker agrees on each                                                      | High   |
| The bumbo on 1 and 7         | In every song the low band, folded on the bar, has its two heavy strokes six sixteenths apart: the bar opens 3 + 3                                                                 | High   |
| A steady level               | Inside a song the sections stay within 1 to 2 dB, and no song has a dip of 8 dB longer than half a second: the drama is in the arrangement, not in the level                       | High   |
| An opening section           | Four of the five open with a section of 23 to 32 seconds before the body's sections start. In «Novo Namorado» it returns at 1:27, and in «Milk Shake» it returns to close the song | Medium |
| A minor key                  | By the chroma all five open in a minor key (C, B, A, A and E minor); two move to the relative major inside the song (E flat, D)                                                    | Medium |
| A full, even spectrum        | The five bands from 20 Hz to 1 kHz hold the energy within 2 dB of each other in the mean of the five, and the percussive share is 0.14 to 0.29                                     | Medium |
| No step up for the last part | No last section reads a whole tone above an earlier one, in any of the five                                                                                                        | Low    |

The brega against the literature ([`brega-forro.md`](../research/brega-forro.md),
[`pernambuco-rhythms-feeling.md`](../research/pernambuco-rhythms-feeling.md)):

- **Agrees.** The keyboard that «plays the hook in the intro and interlude» fits the opening
  section that returns. A tempo of 130 to 150 on the quarter note, which the research marks as
  inferred; the other document's 70 to 100 is the same music counted in half time, the slow
  two-step.
- **Disagrees.** Both are marked as inferred in the research. The xacumbum as a kick on 1 and 9
  with a snare on 5 and 13: all five put the second bumbo on 7. Major ballad progressions with a
  key change up a step on the last chorus: all five read in a minor key, and none shows the step.
- **Not measured.** The drum viradas into the choruses and the lead's vibrato, which the sources
  name as the marks of the genre: both need stems.

What the reading could not do:

- Tell the instruments apart, or the voice from the lead instrument: no stems were separated on
  this Mac, so the opening section is not proven to be the instrumental solinho.
- Read the caixa: its stroke is in the bands above the bumbo, with the chimbal and the voice.
- Hear a key change: the chroma gives one key a section, to within a related key.

Against the show as it is, rendered through the page and read with the same tool: its tempo, 136
BPM, is the mean of the five, and its bumbo is on 1 and 7. It is 3 to 4 dB over the references
under 250 Hz and 4 to 6 dB short from 500 Hz to 4 kHz, where the keyboard, the guitar and the lead
sit. Its onsets repeat at the beat with a strength of 0.89, where the references read 0.36 to
0.53: every bar is too much the same bar. The first round's finding stands: the bumbo is an
808-style kick, the caixa an orchestral snare and the chords an FM piano.

The elements proposed for the brega show to exalt, which the owner has not answered yet:

1. **The solinho**: the opening hook on one lead instrument with character, eight bars; it returns
   between the parts and closes the piece.
2. **The xacumbum**: bumbo on 1 and 7 and caixa on 13 at 136 BPM, the slow two-step a couple
   dances.
3. **A lead that sings**: the theme phrased as a voice, with vibrato, breaths and wide leaps; the
   guitar answers in thirds and sixths where the lead breathes.
4. **Viradas and the breque**: a tom fill into each chorus and one stop of the whole band before
   the last.
5. **Minor to its relative major**: the first part in the minor, the chorus lifting to the
   relative major, the last chorus the fullest.

The form proposed, about 1:40 at 136 BPM: the solinho with the band from the first bar; the
theme's first part, in the minor; four bars where the lead rests and the xacumbum shows; a virada;
the chorus in the relative major, the guitar answering; the solinho again; the breque; the last
chorus with everyone and the horns; the solinho's first phrase and one held chord. The last chorus
stays in its key: the step up a whole tone the show has today is in none of the five references.

## Open points

- The show is still far from the references by the models' measure: see the table above.
- The bumbo is an 808-style kick cut short and the caixa an orchestral snare; a recorded drum kit
  would be closer to a band's drummer. No CC0 kit was reachable from the cloud.
- The guitar's takes reach C5 only, so its part sits lower than a brega guitarist plays it.
- Each horn fall has one recording, so it repeats.
- «Diz na Minha Cara» was not measured, and «Ainda Bem» only on a live recording.
- The preview of a sound picked while paused plays the Refrão final's first bar, where the tom is
  silent.

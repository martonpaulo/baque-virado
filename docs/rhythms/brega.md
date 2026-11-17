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
- [Open points](#open-points)

## References

The owner named the recordings the show aims at (2026-11-17). They are a reference for the groove,
the instruments, the register, the density and the mood; no melody is taken from them.

- «Uma Mulher É Igual uma Flor», Banda Musa do Calipso: the main reference; two other bands'
  versions of the song were measured with it.
- «Ainda Bem», Banda Lapada: measured on the band's live recording («Áudio da Live»), not on the
  television performance (SuperStar, Globo) the owner named.
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
- **Form.** 59 bars, 1:44. Eleven scenes: Introdução (4), Base (4), Baixo (4), Teclado (8),
  Guitarra (8), Virada (1), Refrão (8), Breque (2), Vinheta (8), Refrão final (8), Final (4). The
  parts enter one by one: the trompete's theme alone, then bumbo, caixa and chimbal, the bass, the
  strings and the keyboard's chords, the guitar.
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

| Measure                                | Before           | Now              | References                             |
| :------------------------------------- | :--------------- | :--------------- | :------------------------------------- |
| Tempo, by the beat tracker (BPM)       | 142.9            | 136.4            | 136.4                                  |
| Bass notes per beat                    | 1.1              | 2.4              | 1.8 and 2.4                            |
| Bass, median pitch (MIDI)              | 38               | 42               | 43                                     |
| Notes per beat of the rest of the band | 5.5              | 6.1              | 5.7 and 7.9                            |
| Similarity, whole show                 | 0.67             | 0.66             | 0.92 and 0.94                          |
| Similarity, chorus                     | 0.63             | 0.73             |                                        |
| «Live band, not MIDI», whole show      | 0.02             | 0.01             | 1.00                                   |
| «Live band, not MIDI», chorus          | 0.00             | 0.60             |                                        |
| Side against mid (dB), whole show      | −19.5            | −13.8            | −9.0 and −39.7                         |
| Drums, bass, rest (dB of the sum)      | −2.6, −7.0, −6.0 | −2.7, −5.2, −7.9 | −3.5, −6.9, −4.6 and −1.6, −10.0, −6.9 |

The reference column holds «Uma Mulher É Igual uma Flor» and the live «Ainda Bem», the two
recordings the lab's reference set held when the show was measured. The groove, the bass and the
balance now sit on the references. The models still hear a show far from them: the similarity of
the whole show did not move, and only the chorus, where the trompete plays the theme, is judged a
live band. The drum sounds and the keyboard are the likely cause (see
[Open points](#open-points)).

Tried and measured on the chorus, not kept:

- The theme on a synthesized keyboard lead (two detuned sawtooths and a pulse, a filter envelope,
  a late vibrato, bends): further from the references than the recorded trompete on the same notes
  (similarity 0.36 against 0.49 alone, 0.73 against 0.74 in the band) and judged less a live band
  (0.29 against 0.81).
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

## Open points

- The show is still far from the references by the models' measure: see the table above.
- The bumbo is an 808-style kick cut short and the caixa an orchestral snare; a recorded drum kit
  would be closer to a band's drummer. No CC0 kit was reachable from the cloud.
- The guitar's takes reach C5 only, so its part sits lower than a brega guitarist plays it.
- Each horn fall has one recording, so it repeats.
- «Diz na Minha Cara» was not measured, and «Ainda Bem» only on a live recording.
- The preview of a sound picked while paused plays the Refrão final's first bar, where the tom is
  silent.

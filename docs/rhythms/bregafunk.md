# Bregafunk

The bregafunk show: `/bregafunk`, package `src/rhythms/bregafunk.js`, built in
[#23](https://github.com/martonpaulo/baque-virado/issues/23). It follows the research in
`docs/research/brega-forro.md`, `docs/research/pernambuco-rhythms-feeling.md`,
`docs/research/music-cognition.md` and `docs/research/colour-and-visuals.md`, and the owner's
reference recording, «Viciou na Flauta» ([`references.md`](../research/references.md)). Where the
reference and the research disagree on sound or groove, the reference wins, and this page says so.
Every choice below was made by the agent, as the owner asked, and can be changed.

## Contents

- [Feeling and tempo](#feeling-and-tempo)
- [What the reference showed](#what-the-reference-showed)
- [The beat](#the-beat)
- [Melody and harmony](#melody-and-harmony)
- [Script](#script)
- [Sounds](#sounds)
- [Mix](#mix)
- [Colours](#colours)
- [Background and wheel motion](#background-and-wheel-motion)
- [Widgets](#widgets)
- [Copy](#copy)
- [Engine hooks this rhythm added](#engine-hooks-this-rhythm-added)
- [Round two: a first reading of the references](#round-two-a-first-reading-of-the-references)

## Feeling and tempo

- Feeling: sensuality and provocation. The music cues follow music-cognition rule 15: a dark mode,
  a deep bass groove, a dark timbre on the low end, and a short bright hook on top.
- One tempo for the whole show: 170 BPM, inside the researched 160 to 180
  (`docs/research/brega-forro.md`, Tempo; D26 in `docs/decisions.md`). The reference measures
  170.0. The engine runs one 16-sixteenth bar per turn of the wheel (1.41 s). The HUD shows ♩ = 170
  and the first readout says «170 BPM».
- No swing: the beat is hard-quantized, as it is programmed in FL Studio.

## What the reference showed

Measured on the reference's separated stems (drums, bass, other) with onset detection per band,
note transcription and spectrograms. The show takes groove, density, register, instrumentation and
balance from it, never its melody.

| Fact                     | Reference                                            | The show before        | The show now                        |
| :----------------------- | :--------------------------------------------------- | :--------------------- | :---------------------------------- |
| Drum hits per bar of 170 | bumbo 1 and 9, lata 7 and 13, a clap with the 9      | the cell twice per bar | the reference's cell                |
| Chimbal                  | a few strokes on the eighths                         | all 16 sixteenths      | 4 strokes, a roll at phrase ends    |
| Onsets per second        | about 5                                              | about 10               | about 5 to 6                        |
| Bumbo                    | a click, a fast pitch drop, a 0.35 s tail near 57 Hz | a 48 Hz sine, no click | synthesized to that shape           |
| Bass                     | few clean harmonics, strongest at the octave         | a 32 Hz sine           | sine, octave and third, light drive |
| Lata                     | a body near 450 Hz under a short noise burst         | cans, buckets and pots | synthesized to that shape           |
| Hook                     | a flute: high, short notes, repeated notes, slides   | a trumpet              | a recorded flute                    |
| Mode                     | A minor with a flat second (A Phrygian)              | A minor                | A Phrygian                          |

The research's «bumbo on 1 and 9, lata on 4, 7, 12 and 15» wrote the dembow cell at twice the
reference's speed: in the reference the cell fills the whole 1.41 s bar. That halves the density,
and it is the largest single change in this page.

## The beat

| Voice     | Sixteenths (from 1)                  | Why                                                                                  |
| :-------- | :----------------------------------- | :----------------------------------------------------------------------------------- |
| bumbo     | 1, 9; a pick-up on 15 at phrase ends | Beats 1 and 3, hard and clear (rules 6 and 7)                                        |
| lata      | 7, 13; a second stroke on 14 at ends | With the first bumbo it groups the bar as 3 + 3 + 2 eighths, the dembow-like bounce  |
| palma     | 9                                    | A clap on the second bumbo, the backbeat of the «pancadão»                           |
| chimbal   | 3, 5, 11, 15                         | Few and dry; the last one open every other bar; a 32nd-note roll at phrase ends      |
| grave     | 1 (held), 9, and 13 sliding          | The 808 follows the bumbo; every other bar a note slides into the next bar's root    |
| teclado   | 7, 13                                | The synth stab plays with the lata, as in the reference; a pick-up at phrase ends    |
| tamborzão | 1, 4, 7, 11, 14 (3 3 4 3 3)          | The Rio atabaque line, played alone for 4 bars to show why bregafunk is not Rio funk |

The passinho scene doubles the bumbo (1, 4, 9, 12), answers the lata late (7, 13, 15) and moves
the grave with it (root, its octave, root, and a slide from the fifth).

## Melody and harmony

- A Phrygian (lá, si bemol, dó, ré, mi, fá, sol), the reference's dark colour. Eight bars of
  harmony: lá menor, si bemol, sol menor, lá menor, lá menor, si bemol, sol menor, mi. The last bar
  sits on the dominant, with its sol sustenido, so the phrase falls back to the tonic.
- The hook is original: an eight-bar flute tune of two four-bar phrases. Short tongued notes, pairs
  of fast repeated notes, a slide into each long note, and a rest after each call. The second bar
  repeats the first a step higher; the third runs down and climbs back; the fourth lands and
  leaves room. The second phrase repeats the first two bars, then climbs to sol 6 and runs down
  the dominant in eighths.
- It is stated first, alone (its first phrase), played whole in the batida, varied once on the
  pancadão (its fourth bar stutters the high mi in sixteenths) and comes back in the final (rule
  13). A test pins the form and the flute writing.
- The horns answer the flute where it rests (rule 14), on the pancadão: one stab after each call
  and a three-note pick-up into the second phrase, the frevo nod the sources describe.
- The grave plays the root under the first bumbo and the fifth under the second.

## Script

12 scenes, 65 bars, 1:32. Parts enter one at a time (rule 8), and the density goes build, full,
drop out, return (rule 9): Tema (the flute alone), Bumbo, Lata, Palma e chimbal, Grave, Teclado,
Batida completa, Tamborzão (the Rio contrast), Quebra, Pancadão, Passinho, Final.

- Quebra: the drums and the grave drop out. The flute, the stab and the chimbais go on, the palma
  claps every beat, a noise riser climbs over the last two bars, and in the last bar the flute
  stutters one note in sixteenths, then in 32nd notes, over a lata roll. The last beat is silent.
- Pancadão (the drop): everything comes back, with the horns and an open chimbal on 1.
- Final: the first phrase once more, then everyone on 1 of the last bar and silence.

A voice is drawn on the wheel only in the scenes where it plays, so each entry stands out.

## Sounds

The genre is made in a DAW, so its drum machine and synthesizers are synthesized in the page
(`src/rhythms/bregafunk-synth.js`, the engine's `sounds.synth`); the acoustic parts are recorded
takes played through the studio ([`studio.md`](studio.md)), with sources in
[`CREDITS.md`](../../CREDITS.md). The recorded 808 kicks, 808 subs and cans the show used before
measured as pure low sines and mixed objects, far from the reference.

| Voice                | Sound                                                                                  | Takes      |
| :------------------- | :------------------------------------------------------------------------------------- | :--------- |
| bumbo                | synthesized: a sine dropping from about 230 to 55 Hz, a noise click, soft clipping     | 3 variants |
| lata                 | synthesized: six inharmonic partials from about 440 Hz under a band of noise           | 4 variants |
| palma                | synthesized: three quick bursts of band-passed noise and a tail                        | 3 variants |
| grave                | synthesized: sine, octave and third with a pitch blip at the attack, lightly driven    | 2 per root |
| teclado              | synthesized: three detuned sawtooths through a filter that closes fast; also the riser | 2 per note |
| chimbal              | recorded closed and open hi-hats                                                       | 4 + 2      |
| flauta (the hook)    | recorded concert flute, staccato (two dynamics) and sustained with vibrato             | 15 + 4     |
| metais               | recorded trumpet and tenor trombone staccato                                           | 30         |
| atabaque (tamborzão) | recorded conga and quinto, three dynamics                                              | 15         |

- Every synthesized sound is a pure function of its parameters and a seeded noise. Each instrument
  has several variants and the studio's round robin never plays one twice in a row; a test renders
  them all.
- The flute: short notes play the staccato takes at 82 % of their length, so repeated notes
  separate; a note of three sixteenths or more plays a sustained take, which carries its own late
  vibrato; a slide starts two semitones flat and reaches the note in 45 ms. No note is retuned by
  more than four semitones.
- The grave slides by retuning its take while it sounds, as an 808 glide does.

## Mix

Tuned to the reference with machine listening: the spectrum in nine bands, the balance of the
separated drums, bass and other parts (Demucs), the stereo width, the onsets per second, and the
similarity of CLAP embeddings to the reference. Muting one instrument at a time showed what moved
the similarity, and the levels follow it.

- The drums lead, as in the reference: the bumbo carries the low end with its own 55 Hz tail, and
  the lata and the palma are loud and dry. The grave sits under the bumbo.
- The flute, the stab and the horns sit well under the drums; the horns and the chimbais are
  quiet. Louder, each of them moved the mix away from the reference.
- The bumbo ducks the grave, the stab, the flute and the horns by half for 60 ms.
- Width: a slow stereo chorus on the lata, the palma, the stab and the horns; the chimbal to the
  right; the flute's echo, a dotted eighth behind, to the right.
- The room (the recorded living room) stays low: the genre is dry. One bus filter lowers the
  band around 1.8 kHz by 2 dB.

## Colours

The palette follows `docs/research/expansion-decisions.md` (deep purple, lime on the latas, gold on
the drops, no romantic pink) over the ground `#0d0612` of `docs/research/colour-and-visuals.md`. The
pink `#ff2e88` of that note was dropped: the expansion decision says pink repeats brega.

| Voice     | Colour    | Reading                              |
| :-------- | :-------- | :----------------------------------- |
| bumbo     | `#b81fd6` | the parties' neon purple             |
| grave     | `#7d4dff` | a deeper violet under the bumbo      |
| lata      | `#c6f432` | the lime of the paredão LEDs         |
| palma     | `#3fe0d0` | the turquoise of the LED strips      |
| chimbal   | `#d4dbe0` | the metal of the cymbals             |
| teclado   | `#f1e6cf` | the ivory of the keys                |
| flauta    | `#ff7a3d` | a phone screen lit in the dark       |
| metais    | `#ffd23f` | brass gold, and the gold of the drop |
| tamborzão | `#c4875a` | the atabaque's leather               |

## Background and wheel motion

- `src/rhythms/bregafunk-background.js` replaces the kaleidoscope for this rhythm. Everything comes
  out of the wheel and stays circular: a large dark purple bloom on the bumbo and the grave (the
  sub-bass felt, not flashed), lime rays thrown from where the lata sits on the wheel, three rings
  that lean wide over beats 1 and 2 and tall over 3 and 4, gold rings on the drop's horns, leather
  rings for the tamborzão and small sparks for the chimbais of the quebra.
- The wheel stays readable over it: under the wheel the bloom keeps 30 % of its strength, and the
  rays and the gold and leather rings are born just outside the wheel. Measured on rendered frames,
  the darkest wheel colour, the bumbo's purple, keeps at least 3.5:1 against the brightest pixel
  behind the wheel (WCAG 1.4.11); a test guards the 3:1.
- WCAG 2.3.1: bright emissions keep at least 0.34 s apart, so never more than 3 per second; a test
  runs the whole show to prove it. No full-screen flash.
- The pulse is carried by the wheel itself: it leans 2.5° to one side over beats 1 and 2 and to the
  other over 3 and 4, like hips in the passinho (a lean on every beat would last only 0.35 s at 170),
  and swells 3 % on each bumbo. It depends on the position only.
- Reduced motion: the wheel stays still, and the rays and rings travel half as far.

## Widgets

- Wheel: shapes of the lata over the bumbo.
- Lanes: the voices each scene is about, as in maracatu.
- Readout per scene: the tempo, mode and hook for the tema; the entering part for bumbo, palma,
  grave and teclado; sixteenth rows for the lata, the tamborzão contrast (Rio 3 3 4 3 3 against
  Recife 3 + 3 + 2 eighths) and the passinho; the three registers in the batida; counts on the
  quebra, pancadão and final.
- Not used: the percussion score and the sound waves. The beat is programmed on a grid, and the wheel
  and the sixteenth rows already show it; the swing table, since there is no swing.

## Copy

Brazilian Portuguese, with the producers' and the sources' terms: bumbo, lata, palma, chimbal,
grave, glissando, tamborzão, quebra, pancadão, passinho, naipe de metais.

## Engine hooks this rhythm added

Each is optional, and maracatu, which uses none, is unchanged:

- `sounds.synth`: name → render(sampleRate); the sample bank renders these instead of fetching.
- `voices[voice].pitched`: a melodic voice keeps its tuning, without the per-hit pitch jitter.
- `background.create()`: a rhythm draws its own background layer in place of the kaleidoscope.
- `wheelMotion(position, recent)`: the wheel leans and swells with the pulse.

## Round two: a first reading of the references

A reading made on 2026-11-17 from thirty-second previews, before the full recordings are in the lab
([#48](https://github.com/martonpaulo/baque-virado/issues/48)). All four references were read: «Viciou na Flauta» (two releases), «Tuf Tuf Pof Pof» (MC Reino),
«Dally» (Shevchenko e Elloco) and «Cafajeste» (MC Cego Abusado). Nothing here is built. The method is in
[`../research/round-two.md`](../research/round-two.md).

What the four share, by how far the measurement can be trusted:

| Trait              | Evidence                                                                                                                                                                                                                                                                          | Trust  |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- |
| Two tempos         | 171 BPM felt in «Viciou na Flauta», «Dally» and «Cafajeste»; 150 in «Tuf Tuf Pof Pof» and the second release of «Viciou na Flauta»                                                                                                                                                | High   |
| The drums stop     | In all four the drum stem falls by 15 to 60 dB for one to four bars, about every eight bars, and comes back whole; the bass is absent for whole stretches and enters as an event                                                                                                  | High   |
| Riffs of few notes | Three of the four sit on a minor triad (A with B flat and D in «Viciou na Flauta»; C sharp, E and G sharp in «Tuf Tuf Pof Pof»; B flat, D flat and F in «Dally»), three pitch classes holding 90 % or more of the time. «Cafajeste» uses five (A, C, E, D, G: A minor pentatonic) | High   |
| Minor keys         | A minor twice, C sharp minor, B flat minor                                                                                                                                                                                                                                        | High   |
| A short, low grave | Bass notes of 1.3 to 2.8 sixteenths, from E1 to B2: plucked, not held                                                                                                                                                                                                             | Medium |
| Few hits a bar     | «Tuf Tuf Pof Pof» folds to three strong strokes a bar and three soft ones                                                                                                                                                                                                         | Medium |
| The cell           | Bumbo on 1 and 9, lata on 7 and 13 with a pick-up on 15: clean in «Tuf Tuf Pof Pof», close in «Cafajeste», and what the first round read in «Viciou na Flauta»                                                                                                                    | Medium |

What the reading could not do: the bar fold came out smeared for three of the four excerpts (the
bar line was not found reliably in thirty seconds that start mid-song), so the cell rests on one
clean excerpt, a close one and the first round; and the length of a riff before it repeats did not measure. Both
need the full recordings.

The elements the show exalts (the owner accepted them on 2026-11-17, with the tempo of 171 BPM):

1. **The beat as the hook**: bumbo and lata, few strokes, hard.
2. **The grave**: short, tuned, following the bumbo.
3. **A riff of three notes**, two bars long, repeated: the eight-bar tune of the first round is the
   wrong shape for the genre.
4. **The stop and the drop**: the drums vanish for a bar or two and come back whole.
5. **Space**: what is left out.

The form, accepted the same day, about 1:30, with a 30-second cut that loops: the riff alone for two bars; the beat
drops; riff and beat; a stop; the grave enters; a longer stop with a rise; the drop with everything;
a last stop and the end on the riff.

### The full recordings (2026-11-17)

The owner fetched the whole of each reference; the lab read all four from start to end (bars from
the tracked beats, each bar folded on its own, the drums stem in four bands). The audio is kept by
the owner and is in no repository; its list is in the owner's private `batuque-references`.

| Recording                 | Length         | Tempo felt | Bumbo (low band)    | Lata and snare band | Drum stops                        |
| :------------------------ | :------------- | :--------- | :------------------ | :------------------ | :-------------------------------- |
| «Dally»                   | 2:25, 110 bars | 171        | 1 and 9             | 5, 7 and 13         | 9, the full beat first at 0:31    |
| «Cafajeste»               | 2:56, 110 bars | 171        | 1 and 9, soft on 13 | 7 and 13            | 15, the full beat first near 0:20 |
| «Tuf Tuf Pof Pof» (remix) | 2:42, 106 bars | 150        | 1 and 9, soft on 12 | 5, 13 and 15        | 12, the full beat first at 0:38   |
| «Viciou na Flauta»        | 2:22           | not read   | not read            | not read            | 2 found                           |

What the whole recordings add to the first reading:

- **The cell is confirmed.** In three full recordings the bumbo is on 1 and 9 and the lata on 13;
  the lata's other stroke is on 7 («Dally», «Cafajeste») or 5 («Dally», «Tuf Tuf Pof Pof»), with a
  pick-up on 15 in the remix. Trust is now high.
- **The beat does not open the track.** Each recording runs 20 to 40 seconds on the riff, the voice
  and teasing strokes before the first full beat. The previews, cut from the middle, hid this.
- **Stops are the form.** Nine to fifteen stops in about 110 bars, most of one to three bars, most
  often eight bars apart (then four, then sixteen). «Cafajeste» repeats one order of stops twice,
  44 bars apart: a verse and chorus cycle.
- **The grave plays the riff's notes.** In «Dally» and «Tuf Tuf Pof Pof» the bass and the melodic
  stem hold the same three pitch classes (91 to 95 % of the time): the grave is the riff an octave
  or two down, in short notes (1.1 to 2.1 sixteenths), four to nine a bar, not one note under each
  bumbo.
- **Not read:** «Viciou na Flauta». The beat tracker took it at 158 BPM with bars of 2.0 s, where
  its preview read 171, so its fold is smeared; it needs the bar line set by hand or another
  tracker. And the riff's length before it repeats still does not measure in any of the four.

What this changes in the accepted plan: the grave follows the riff, not only the bumbo; and the
form may tease for a few bars before the first drop, as the references do, while still opening on
the hook ([`../research/round-two.md`](../research/round-two.md), «What is still missing»). The owner
approved both on 2026-11-17 (D39): the grave plays the riff's notes, and four to eight bars tease
before the first drop, no longer, because the show has no voice to hold a listener.

### The pulse periods and the show (2026-11-28)

Read with `lab/sections.py pulse` and `map`
([`lab/reference-pulse.txt`](../../lab/reference-pulse.txt),
[`lab/show-sections.txt`](../../lab/show-sections.txt)), with no stems.

- **«Viciou na Flauta» is read now.** Its onsets repeat at a beat of 366 ms: 164 BPM, between the
  158 the beat tracker took and the 171 of its preview. «Dally» and «Cafajeste» repeat at 354 ms
  (170 BPM) and «Tuf Tuf Pof Pof» at 401 ms (150), as the first reading had them. The accepted
  171 BPM stands: three of the four sit at 164 to 170.
- **The beat does not open the track**, by the level too: «Dally» and «Cafajeste» hold their body
  level only from 27 and 24 seconds.
- **The show as it is**, rendered through the page: it holds its body level from 15.5 s, because
  its parts enter one at a time; it is 3 dB over the references under 250 Hz and 4 to 7 dB short
  from 500 Hz to 4 kHz, where the riff is. The first round measured the same from the stems: the
  flute about 13 dB under the bumbo.

### The rewrite (2026-11-28, branch `wip/bregafunk`)

Written from the accepted elements and form above; it is heard by the owner before it reaches
`main`. What the script is now (`src/rhythms/bregafunk.js`):

- **171 BPM**, 64 bars, 1:30.
- **The riff**: three notes (lá, mi, si bemol: A Phrygian's tonic, fifth and flat second), two bars
  long, on the flute. Its second bar leaves its last beat empty, where the lata and, on the drop,
  the horns answer. The eight-bar tune of the first round is gone; the drop keeps one stuttered bar.
- **The grave** plays the riff's notes two octaves down: five or six notes a bar, each one or two
  sixteenths, with the bumbo on 1 and 9, and its last note slides back to the tonic.
- **The harmony** is the riff's: the stab is the tonic's root, fifth and octave in the first bar and
  the flat second's bare octave in the second. No chord adds a fourth note to the riff's three but
  the horns' third.
- **The form**, nine scenes, each entered as it declares (`leadIn`):

  | Scene         | Bars | What plays                                                                 | How it is entered            |
  | :------------ | :--- | :------------------------------------------------------------------------- | :--------------------------- |
  | Tema          | 4    | the riff alone twice, then teased by a palma and the lata                  | the show's first bar         |
  | Batida        | 4    | the beat whole, without the riff                                           | a pick-up: lata and bumbo    |
  | Tema e batida | 8    | riff and beat; its last bar is a stop                                      | the beat's fill              |
  | Grave         | 8    | the grave enters under riff and beat                                       | the drums drop out for a bar |
  | Parada        | 4    | no bumbo, no grave: palmas, the stab, the rise, a stutter, one silent beat | the beat's fill              |
  | Pancadão      | 16   | everything, with the horns; a stop in its eighth and its last bar          | the silent beat              |
  | Respiro       | 4    | the riff and the grave, with one palma a bar                               | the drums drop out           |
  | Passinho      | 12   | everything, the bumbo doubled; its last bar is a stop                      | a pick-up: lata and bumbo    |
  | Final         | 4    | the riff alone, then everyone on 1                                         | the drums drop out           |

- **Left out**: the Rio tamborzão scene and the one-instrument-at-a-time opening. The tamborzão's
  voice, takes and pattern are still in the package, unused, until the owner approves the form.
- **Not done on this branch**: the show's own graphics
  ([#57](https://github.com/martonpaulo/batuque/issues/57)), and the mix: the first round measured
  the flute about 13 dB under the bumbo, and no level was changed here.

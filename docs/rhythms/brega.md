# Brega

The brega show: Recife's romantic brega, called «brega» on the site. What it plays, what it shows
and why. The package is [`src/rhythms/brega.js`](../../src/rhythms/brega.js), its background
[`src/rhythms/brega-background.js`](../../src/rhythms/brega-background.js) and its rules
[`tests/brega.test.js`](../../tests/brega.test.js). Built in
[#26](https://github.com/martonpaulo/baque-virado/issues/26) from the `brega` entry of
[`docs/sketches/scripts.html`](../sketches/scripts.html) and the notes in
[`docs/research/`](../research/).

## Contents

- [Music](#music)
- [Sound](#sound)
- [Feel](#feel)
- [Visuals](#visuals)
- [Widgets per scene](#widgets-per-scene)
- [Open points](#open-points)

## Music

- **Feeling.** Heartbreak enjoyed together, in a minor key, as
  [`expansion-decisions.md`](../research/expansion-decisions.md) sets it.
- **Tempo.** 4/4 at 140 BPM for the whole show, a 16-step wheel, one bar (1.71 s) per turn.
  [`brega-forro.md`](../research/brega-forro.md), § 1c: «Expect about 130 to 150 BPM on a
  quarter-note pulse»; its show outline and the script sketch both use 140. The bumbo on 1 and 3
  gives the two-step a dancer feels at 70 half notes a minute, inside the «about 70 to 100 BPM» of
  [`pernambuco-rhythms-feeling.md`](../research/pernambuco-rhythms-feeling.md), § 6: the two notes
  count the same pulse at two levels.
- **Form.** 59 bars, 1:41. Eleven scenes, as the script labels them: Introdução (4), Base (4),
  Baixo (4), Teclado (8), Guitarra (8), Virada (1), Refrão (8), Breque (2), Vinheta (8), Refrão
  final (8), Final (4). The parts enter one by one: the keyboard's theme alone, then bumbo, caixa
  and chimbal, the bass, the strings and keyboard chords, the guitar.
- **Base (xacumbum).** Bumbo on 1 and 9 with a soft pick-up on 16; caixa on 5 and 13; chimbal on
  every eighth, the off-beat ones loud (§ 1, «What makes it special»). No swing: the research says
  «none or slight».
- **Bass.** With the bumbo: the root on 1, the fifth on 9, and on 16 the next chord's root.
- **Harmony.** A minor. The base loop is Am, F, Dm, E7 (i, VI, iv, V7); the verse climbs a two-bar
  motif through Am, Dm, G and C to E7; the chorus is F, G, Am, Am, Dm, E7, Am, Am. The strings hold
  one chord a bar; the keyboard stabs it on the four off-beats.
- **Melodies.** Original. The theme is four bars: a wide, singable line that rises to F and sighs
  down to A, with long notes. The chorus is the theme and its answer, which climbs back and lands
  on the tonic. The guitar plays the verse in thirds (the second voice a diatonic third below, G♯
  over E7), the vinheta's calls, and in the last chorus the theme in thirds an octave down.
- **Fills and breaks.** A tom fill comes before each chorus: a whole bar (Virada) before the first,
  the last two beats of the Vinheta before the second. The Breque: everyone on 1, a bar of silence
  but for the bumbo's heartbeat, then the Vinheta.
- **Horns.** In the Vinheta the horns answer each guitar bar: two stabs on the chord, then the
  section falls off the note.
- **Key change.** The last chorus and the end go up a whole tone (B minor), the research's «key
  change up a step on the last chorus» [I].

## Sound

Every sound is a real CC0 recording, played through the studio
([`docs/rhythms/studio.md`](studio.md)). Sources and edits are in [`CREDITS.md`](../../CREDITS.md).

| Voice    | Takes                                                        | Source                     |
| :------- | :----------------------------------------------------------- | :------------------------- |
| bumbo    | three 808-style kicks (reused)                               | Freesound                  |
| caixa    | snare with snares, four dynamics, two round robins (reused)  | VSCO 2 CE                  |
| chimbal  | four closed and two open hats (reused)                       | Freesound                  |
| tom      | high and low tom, two dynamics; the middle tom from both     | VCSL                       |
| baixo    | eight picked electric bass notes, E1 to E2 (reused)          | Freesound                  |
| cordas   | eleven viola and violin section notes with vibrato           | VSCO 2 CE                  |
| teclado  | TX81Z FM piano, five notes, two dynamics; chords and theme   | VCSL                       |
| guitarra | seven clean picked notes and two sustained ones              | Freesound                  |
| metais   | trumpet and trombone staccato (reused); two section falls    | VSCO 2 CE; Freesound       |

- A note plays a take within five semitones, retuned by its playback rate; a voice never plays
  the same take twice in a row while another is near enough (both checked in the test).
- A chord is one take per note; the keyboard rolls its notes by 6 ms, the guitar's thirds by
  12 ms, and the guitar has a dotted-eighth echo.
- Mix: a small room (the forró and coco's), the strings far back, the bass and bumbo dry.
  Measured on an offline render of the whole show in Chromium: peak −0.2 dBFS, no clipped
  sample, the loudest tenth of the one-second windows at −10.7 dBFS RMS (maracatu: −0.2 dBFS peak,
  −6.7 dBFS; frevo: −0.2 dBFS, −13.7 dBFS). Levels are by measurement, not yet by ear.
- A phone downloads every default take, 76 files, about 890 KB. The frevo limit of 400 KB cannot
  hold a band with a string pad; the brega limit is 900 KB (`tests/brega.test.js`), an agent
  limit for the owner to confirm.

## Feel

- **Drums on the grid.** Brega's kits are programmed; [`human-feel.md`](../research/human-feel.md),
  rule 12: «tight quantization is authentic here», with the variation in sample choice. The bumbo,
  caixa, chimbal and toms change take, velocity layer and brightness on every hit, never time.
- **Players drift.** The keyboard leads with a 1/f drift; the bass, strings, guitar, theme and
  horns follow it, each with its own smaller correlated drift (the studio's roles).
- **Dynamics.** The off-beat chimbal and the long melody notes are accented; each phrase of eight
  bars swells and falls (the studio's phrase arc).

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
  (one per 6.9 s at most, far under WCAG 2.3.1's three per second). Nothing is drawn under the
  wheel but the ground. No red passes R/(R+G+B) 0.8. Reduced motion stops the rings and petals
  moving, the halo breathing and the blooms.

## Widgets per scene

| Scene        | Widget                                           | Why                           |
| :----------- | :----------------------------------------------- | :---------------------------- |
| Introdução   | tempo, metre, bar length, key, theme             | one tempo, A minor            |
| Base         | one bar of bumbo, caixa and chimbal              | the off-beat chimbal          |
| Baixo        | bumbo and bass side by side                      | the bass locks to the bumbo   |
| Teclado      | the progression, the off-beat stabs, the pad     | keyboard texture              |
| Guitarra     | a melody roll of both lines                      | the thirds                    |
| Virada       | the fill on high, middle and low tom             | how sections join             |
| Refrão       | a melody roll of the chorus                      | the theme and its answer      |
| Breque       | the pause and the heartbeat                      | the break                     |
| Vinheta      | a roll of the guitar's calls and the horns       | call and answer               |
| Refrão final | a roll of theme and guitar, the key change       | a whole tone up               |
| Final        | scenes, voices, bars                             | the totals                    |

## Open points

- The tempo is the research's estimate; it should be measured on recordings.
- The bumbo is an 808-style kick; a recorded kit kick would be closer to a band's drummer.
- Each horn fall has one recording, so it repeats.
- The preview of a sound picked while paused plays the Refrão final's first bar, where the horns
  and the tom are silent.

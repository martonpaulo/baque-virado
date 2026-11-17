# Brega funk

The brega funk show: `?ritmo=brega-funk`, package `src/rhythms/brega-funk.js`, built in
[#23](https://github.com/martonpaulo/baque-virado/issues/23). It follows the script in
`docs/sketches/scripts.html` and the research in `docs/research/brega-forro.md`,
`docs/research/pernambuco-rhythms-feeling.md`, `docs/research/music-cognition.md` and
`docs/research/colour-and-visuals.md`. Every choice below was made by the agent, as the owner asked,
and can be changed.

## Contents

- [Feeling and tempo](#feeling-and-tempo)
- [The beat](#the-beat)
- [Melody and harmony](#melody-and-harmony)
- [Script](#script)
- [Sounds](#sounds)
- [Colours](#colours)
- [Background and wheel motion](#background-and-wheel-motion)
- [Widgets](#widgets)
- [Copy](#copy)
- [Engine hooks this rhythm added](#engine-hooks-this-rhythm-added)

## Feeling and tempo

- Feeling: sensuality and provocation. The music cues follow music-cognition rule 15: minor mode, a
  deep bass groove, a dark timbre on the low end, and a short bright hook on top.
- One tempo for the whole show: 170 BPM, felt at 170, the top of today's 160 to 170 range
  (`docs/research/brega-forro.md`, Tempo; D26 in `docs/decisions.md`). The engine runs at 170 BPM
  with one 16-sixteenth bar per turn of the wheel (1.41 s): the chimbal runs in sixteenths of 170,
  the bumbo falls on beats 1 and 3, and the lata makes the 3 + 3 + 2 inside each half bar. The HUD
  shows ♩ = 170 and the first readout says «170 BPM». The «old and new» tempo scene of the research
  outline is left out, as the one-tempo decision requires.
- No swing: the beat is hard-quantized, as it is programmed in FL Studio.

## The beat

| Voice     | Sixteenths (from 1)             | Why                                                                                   |
| :-------- | :------------------------------ | :------------------------------------------------------------------------------------ |
| bumbo     | 1, 9; ghost notes on 7 and 15   | Beats 1 and 3 of 170, low and clear (rules 6 and 7)                                   |
| lata      | 4, 7, 12, 15                    | With the bumbo heads it groups each half bar as 3 + 3 + 2, the dembow-like bounce     |
| chimbal   | all 16, the off-beat «e» louder | Chimbais dobrados; 32nd-note rolls (fusas) before the grave and in the quebra         |
| grave     | 1 (held), 7, 9 (gliding)        | The sliding 808: the note on 9 glides into the next bar's root                        |
| teclado   | 5, 13, and a light 15           | Chords on beats 2 and 4, the reggae-like keyboard the sources describe                |
| tamborzão | 1, 4, 7, 11, 14 (3 3 4 3 3)     | The Rio atabaque line, played alone for 4 bars to show why brega funk is not Rio funk |

The passinho scene doubles the bumbo (1, 3, 7, 9, 11, 15) and moves the lata (4, 7, 11, 12, 15).

## Melody and harmony

- A minor. Four bars of harmony under a two-bar hook: lá menor, lá menor, fá, sol. The hook meets two
  harmonies, so its repeats do not sound like a loop.
- The hook is original: a wave contour in the first bar and one leap to E6 in the second (rule 12).
  It is stated first, alone, twice, repeated through the show, varied once on the drop (only its
  second statement there: the second bar climbs back to E6 and holds it; the drop's other
  statements are unchanged) and comes back unchanged in the final (rule 13). A test pins it.
- The horns answer the hook on the drop (rule 14): a stab on its first bar, two pick-ups at the end
  of its second, the frevo nod the sources describe.

## Script

The 11 scenes of `docs/sketches/scripts.html`, each with twice the sketch's bars because a bar at 170
lasts 1.41 s: 68 bars, 1:36. Parts enter one at a time (rule 8),
and the density goes build, full, drop out, return (rule 9): Tema (hook alone), Bumbo, Lata,
Chimbais, Grave, Batida completa, Tamborzão (the Rio contrast), Quebra (hook and chimbais, then one
silent beat on the scene's last bar), Drop (everything, horns, the hook's variation), Passinho,
Final (hook, then a cut on 1 of the last bar).

A voice is drawn on the wheel only in the scenes where it plays, so each entry stands out.

## Sounds

Every voice is a recorded instrument played through the studio
([`studio.md`](studio.md)); sources are in [`CREDITS.md`](../../CREDITS.md).

| Voice                | Recording                                              | Takes |
| :------------------- | :----------------------------------------------------- | :---- |
| bumbo                | three 808 kicks                                        | 3     |
| grave                | 808 subs, retuned, with a glide into the next chord    | 5     |
| lata                 | struck cans, buckets and pots                          | 10    |
| chimbal              | closed and open hi-hats                                | 4 + 2 |
| teclado              | upright piano, two dynamics, two round robins per note | 20    |
| trompete (the hook)  | trumpet, staccato and sustained with vibrato           | 30    |
| metais               | trumpet and tenor trombone staccato                    | 30    |
| atabaque (tamborzão) | conga and quinto, three dynamics                       | 15    |

The hook was a sawtooth synthesizer; it is now a trumpet, with the same dotted-eighth echo. Every
voice stays on the hard grid, as producers program it, and the kick ducks the grave, keys, hook and
horns.

## Colours

The palette follows `docs/research/expansion-decisions.md` (deep purple, lime on the latas, gold on
the drops, no romantic pink) over the ground `#0d0612` of `docs/research/colour-and-visuals.md`. The
pink `#ff2e88` of that note was dropped: the expansion decision says pink repeats brega romântico.

| Voice     | Colour    | Reading                              |
| :-------- | :-------- | :----------------------------------- |
| bumbo     | `#b81fd6` | the parties' neon purple             |
| grave     | `#7d4dff` | a deeper violet under the bumbo      |
| lata      | `#c6f432` | the lime of the paredão LEDs         |
| chimbal   | `#d4dbe0` | the metal of the cymbals             |
| teclado   | `#f1e6cf` | the ivory of the keys                |
| lead      | `#ff7a3d` | a phone screen lit in the dark       |
| metais    | `#ffd23f` | brass gold, and the gold of the drop |
| tamborzão | `#c4875a` | the atabaque's leather               |

## Background and wheel motion

- `src/rhythms/brega-funk-background.js` replaces the kaleidoscope for this rhythm. Everything comes
  out of the wheel and stays circular: a large dark purple bloom on the bumbo and the grave (the
  sub-bass felt, not flashed), lime rays thrown from where the lata sits on the wheel, three rings
  that lean wide over beats 1 and 2 and tall over 3 and 4, gold rings on the drop's horns, leather
  rings for the tamborzão and small sparks for the chimbais of the quebra.
- The wheel stays readable over it: under the wheel the bloom keeps 30 % of its strength, and the
  rays and the gold and leather rings are born just outside the wheel. Measured on rendered frames,
  the darkest wheel colour, the bumbo's purple, keeps at least 3.5:1 against the brightest pixel
  behind the wheel (WCAG 1.4.11); a test guards the 3:1.
- WCAG 2.3.1: bright emissions keep at least 0.34 s apart, so never more than 3 per second; a test
  runs the whole show to prove it. At 170 the lata's second hit of each 3 + 3 + 2 comes 0.26 s after
  the first, so it draws no rays. No full-screen flash.
- The pulse is carried by the wheel itself: it leans 2.5° to one side over beats 1 and 2 and to the
  other over 3 and 4, like hips in the passinho (a lean on every beat would last only 0.35 s at 170),
  and swells 3 % on each bumbo. It depends on the position only.
- Reduced motion: the wheel stays still, and the rays and rings travel half as far.

## Widgets

- Wheel: shapes of the lata over the bumbo, so the 3 + 3 + 2 is a polygon.
- Lanes: the voices each scene is about, as in maracatu.
- Readout per scene: the tempo and key for the tema; the entering part for bumbo, chimbais and grave;
  sixteenth rows for the lata, the tamborzão contrast (Rio 3 3 4 3 3 against Recife 3 3 2) and the
  passinho; the three registers in the batida; counts on the quebra, drop and final.
- Not used: the percussion score and the sound waves. The beat is programmed on a grid, and the wheel
  and the sixteenth rows already show it; the swing table, since there is no swing.

## Copy

Brazilian Portuguese, with the producers' and the sources' terms: bumbo, lata, chimbais dobrados,
grave, glissando, tamborzão, quebra, drop, passinho, fusas, naipe de metais. No song
title, recording or performer is named.

## Engine hooks this rhythm added

Each is optional, and maracatu, which uses none, is unchanged:

- `sounds.synth`: name → render(sampleRate); the sample bank renders these instead of fetching.
- `voices[voice].pitched`: a melodic voice keeps its tuning, without the per-hit pitch jitter.
- `background.create()`: a rhythm draws its own background layer in place of the kaleidoscope.
- `wheelMotion(position, recent)`: the wheel leans and swells with the pulse.

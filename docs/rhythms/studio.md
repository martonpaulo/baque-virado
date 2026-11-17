# The studio: recorded instruments and a human feel

## Contents

- [What it is](#what-it-is)
- [Instruments](#instruments)
- [Feel](#feel)
- [Mix](#mix)
- [Parameters and their sources](#parameters-and-their-sources)
- [What still sounds artificial](#what-still-sounds-artificial)

## What it is

`src/studio.js` plays a rhythm that opts in with `sounds.studio` in its package. The forró, the
coco, the brega funk and the frevo use it. The maracatu does not: its sound path in `src/audio.js` is
unchanged, and `tests/maracatu-sound.test.js` pins every sample, time, rate and level of its
render.

The studio plans the whole show at once, in order, from the script. Every choice it makes (which
take, how late, how loud, how bright) is a pure function of the show position and a per-voice
seed, so the same position always gives the same audio, live, in a preview and offline.

## Instruments

A voice names its strokes; each stroke is a list of recorded takes. A take has a file, a pitch
(MIDI, measured by `tools/prepare-takes.mjs`) when it is melodic, and a velocity layer.

- **Velocity layers.** A hit plays a take from the layers nearest its velocity. Louder layers are
  brighter recordings; the low-pass filter also opens with velocity, so loudness changes the
  colour, not only the level.
- **Round robin.** The candidates are shuffled by the position, and the take this voice played
  last is never played again at once while another exists. A layer with one take borrows from
  the next layer; a note with one take near it borrows one a little further away.
- **Pitch zones.** A note plays a take recorded within four semitones, retuned by the playback
  rate; never further than eight (nine for an 808 sub).
- **Chords and strums.** A chord is several notes, each its own take; a strum spreads them.
- **Shapes.** A held note has a length and a release; an accordion note opens with the bellows
  (45 ms) or a finger (6 ms); a held melodic note can carry a vibrato; an 808 note can glide.
- **Ornaments.** A voice may add quiet ghost strokes with a probability per bar: the forró
  zabumba a pressed ghost on the last sixteenth in half the bars, the coco's second head a soft
  pick-up in 60 % of them. The identifying cell is the rhythm's own script and always plays.

## Feel

- **Style template.** Fixed per-sixteenth offsets that repeat every bar: the forró triângulo's
  off-beats 10 % of a sixteenth late, the coco ganzá's 12 % (a 56 % swing), its second head 6 %.
- **Correlated drift.** The lead voice drifts with 1/f (pink) noise; followers close a share of
  the gap to it every beat and add a smaller drift of their own. Each stroke adds a 1.5 ms pink
  wobble. There is no white noise anywhere.
- **Grid.** The brega funk is programmed: every voice stays on the grid; variation comes from
  takes, velocity and brightness.
- **Dynamics.** A phrase swells from −7 % to +7 % over its bars; each voice's level drifts 6 %
  with 1/f noise; the lead varies its accents by up to 8 % every bar.

## Mix

Each voice has its channel: a pan and a send to one shared room, a convolution reverb with a
recorded impulse response (a small room for forró and coco, a living room for brega funk). The
voices meet in a glue compressor (2:1 from −18 dB), then the site's master chain (gentle
saturation and a compressor). In brega funk the kick ducks the grave, keys, hook and horns by
45 % for 70 ms.

## Parameters and their sources

| Parameter                   | Value                              | Source                                                                           |
| :-------------------------- | :--------------------------------- | :------------------------------------------------------------------------------- |
| Takes per stroke            | 4 to 10 where recordings exist     | Fagerström et al. 2021: one repeated sample is judged unreal, many takes real    |
| Timing noise                | 1/f, eight octaves                 | Hennig 2011: human timing errors are long-range correlated                       |
| Lead drum spread            | 7 ms                               | Räsänen 2015: a top drummer spreads about 8.7 ms                                 |
| Follower spread, correction | 4 ms, 0.22 of the gap per beat     | studies of ensemble synchrony: followers correct 0.2 to 0.25, the lead about 0.1 |
| Lead correction             | 0.1                                | the same                                                                         |
| Forró triângulo lilt        | 10 % of a sixteenth                | `docs/research/brega-forro.md` (8 to 12 % swing)                                 |
| Coco ganzá lilt             | 12 % (56 % swing)                  | `docs/research/frevo-manguebeat-coco.md` (55 to 58 %)                            |
| Brega funk timing           | hard grid                          | `docs/research/brega-forro.md` (hard-quantized)                                  |
| Phrase swell, accents       | ±7 % over the phrase, ±8 % per bar | the owner's brief: accents per bar, swells over 4 to 8 bars                      |
| Vibrato                     | 5 to 7 Hz                          | the owner's brief; the violin and trumpet takes carry their own                  |
| Ducking                     | brega funk only                    | the owner's brief                                                                |

## What still sounds artificial

- The cavaquinho has one strum per chord, and the agogô one bell retuned for its high note: they
  repeat the same recording.
- The sanfona has one take per note; round robin borrows the neighbouring notes, retuned.
- The zabumba's open head is a concert bass drum and alfaia hits, not a zabumba.
- The rabeca is a violin; the bandolim's notes are cut from longer phrases.
- The arrangement changes (a new pattern every few bars, fills) are the rhythm scripts' own; the
  studio adds only ghost strokes.

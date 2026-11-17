# The sound lab: measuring a show against its references

## Contents

- [Why it exists](#why-it-exists)
- [The method](#the-method)
- [What each measure is](#what-each-measure-is)
- [Calibration: does it hear what the owner hears](#calibration-does-it-hear-what-the-owner-hears)
- [What the references showed](#what-the-references-showed)
- [What made the shows sound like MIDI](#what-made-the-shows-sound-like-midi)
- [The shows after the first round](#the-shows-after-the-first-round)
- [Limits of the method](#limits-of-the-method)
- [Getting reference audio and recordings](#getting-reference-audio-and-recordings)
- [How AI can make good music from references](#how-ai-can-make-good-music-from-references)
- [How to run a round](#how-to-run-a-round)
- [Open work](#open-work)

## Why it exists

On 2026-11-17 the owner listened to the site and said the maracatu was great, the coco so-so, and
the other five shows sounded as if «a child had made them with MIDI sounds». The owner asked for
shows «in the vibe» of the reference recordings ([`references.md`](references.md)), tested, with
machine learning.

An agent writes the music and cannot hear it. The lab in [`lab/`](../../lab/README.md) is the
substitute: it renders a show through the real page and compares it with the owner's references
by several independent measures. It does not replace the owner's ear; it tells an agent which way
is nearer before the owner listens.

## The method

1. **Render.** `lab/render.mjs` opens the real page in Chromium and calls
   `window.baque.renderAudio`, so the lab hears what a viewer hears: the same samples, studio, mix
   bus and master chain. It renders the whole show, a bar range, or some instruments alone.
2. **Reference audio.** For each reference the lab holds the official 30-second preview a music
   catalogue serves ([`lab/references.json`](../../lab/references.json)). The audio is used for
   analysis only and never enters the repository.
3. **Separate.** Demucs (`htdemucs`) splits each reference and each render into drums, bass, other
   and vocals. The shows are instrumental, so a reference is compared without its vocal stem.
4. **Compare.** CLAP embeddings, the long-term spectrum, the stem balance, the stereo width, the
   onset density and an aesthetics model give one line of numbers per render, beside the
   references' own.
5. **Style facts.** A beat tracker (`beat_this`) and a transcription model (`basic-pitch`) read
   tempo, the drum pattern per sixteenth in three bands, and the density, register and movement of
   the bass and of the melodic stem. These are facts about a style, taken to write original music;
   no melody is copied ([`lab/reference-style-facts.txt`](../../lab/reference-style-facts.txt)).

## What each measure is

| Measure           | How                                                                                                                | Read it as                                                                                   |
| :---------------- | :----------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| CLAP similarity   | Cosine between the render's CLAP embedding (`laion/clap-htsat-unfused`) and the centroid of the genre's references | Nearness of timbre and texture. The references score 0.86 to 0.96 against their own centroid |
| band-vs-toy       | CLAP zero-shot: «a band of the genre» against «a toy keyboard demo», «a General MIDI file», «chiptune»             | The owner's complaint as a number, 0 to 1                                                    |
| real-vs-midi      | CLAP zero-shot: «a studio recording of a live band» against «a cheap MIDI file»                                    | The same idea; unstable (see Limits)                                                         |
| Tag               | CLAP zero-shot over labels you give, on a solo render                                                              | Does an instrument sound like what it claims to be                                           |
| Bands             | Long-term spectrum in nine bands, in dB against the references' mean                                               | Tonal balance; within about 3 dB is near                                                     |
| Stems             | Energy of Demucs drums, bass and other, in dB of the total                                                         | The balance of percussion, bass and melody; within about 3 dB is near                        |
| Side/mid          | Energy of the stereo difference against the sum, in dB                                                             | Stereo width; −20 dB is nearly mono, −10 dB is wide                                          |
| Onsets per second | Onset detection on the mix                                                                                         | How busy the music is                                                                        |
| Crest, LUFS       | Peak against RMS; integrated loudness                                                                              | Compression                                                                                  |
| Aesthetics        | `audiobox-aesthetics`: production quality, content enjoyment, usefulness, complexity                               | A trained opinion, 1 to 10; it prefers clean sound                                           |
| Style facts       | `style.py`                                                                                                         | Tempo, drum grid, notes per beat, register, leaps                                            |

Every measure is taken on the loudest ten-second windows of the render, so a quiet teaching scene
does not hide the full band.

## Calibration: does it hear what the owner hears

Before any change, the seven shows were scored. The band-vs-toy probe ordered them as the owner had:

| Show       | Owner's verdict | band-vs-toy | real-vs-midi | CLAP similarity |
| :--------- | :-------------- | :---------- | :----------- | :-------------- |
| maracatu   | great           | 1.00        | 0.33         | 0.61            |
| coco       | so-so           | 0.95        | 0.97         | 0.71            |
| frevo      | terrible        | 0.60        | 1.00         | 0.88            |
| forró      | terrible        | 0.47        | 0.75         | 0.85            |
| manguebeat | terrible        | 0.99        | 0.77         | 0.78            |
| brega      | terrible        | 0.03        | 0.02         | 0.80            |
| bregafunk  | terrible        | 0.10        | 0.00         | 0.80            |

No single measure agrees with the owner on every show: band-vs-toy does not see the manguebeat's
problem, real-vs-midi rates the maracatu low, and the frevo scored well on similarity while the
owner called it terrible. The rule that follows: trust several measures that agree, never one.

## What the references showed

Measured on the references of that day; the per-reference facts are in
[`lab/reference-style-facts.txt`](../../lab/reference-style-facts.txt).

- **Tempo.** Several shows were off their reference: the forró ran at 120 BPM and its reference
  reads 97 to 103; the frevo ran at 140 as a frevo de rua, and «Madeira que Cupim Não Rói» is a
  lyrical frevo in a minor key at 120 to 125; the brega ran at 140 and every brega reference reads
  136; the manguebeat ran at 100 and «Coco Dub» reads 107.
- **Percussion against melody.** In the frevo and forró references the melodic stem leads
  (drums about −11 dB of the total); the shows had the drums at −3 dB.
- **Width.** The manguebeat, brega and bregafunk were close to mono (side/mid −20 to −24 dB)
  against −9 to −15 dB in their references.
- **Density.** The bregafunk played 10.2 onsets per second and its reference 5.0: the genre is
  sparse and hard. The manguebeat played 4.7 against 6.6.
- **Drum cells.** «Coco Dub» has no rock backbeat: its drums play the coco's 3 + 3 + 2. The brega
  references put the bumbo on sixteenths 1 and 7 and the caixa on 13, again 3 + 3 + 2. «Viciou na
  Flauta» plays its cell once per bar, not twice.
- **Folding artefact.** `style.py` folds the drum pattern on a two-beat cell. A pattern one bar
  long looks wrong there (the brega's bumbo seemed to fall on steps 0, 2 and 4). Fold on the whole
  bar before writing a drum part from it.

## What made the shows sound like MIDI

Maracatu and coco are percussion only and the owner accepts them; every rejected show has melodic
instruments. Four causes, in the order they were found:

1. **Nursery-rhyme writing.** A two-bar motif on the grid, repeated, in single notes of equal
   length, over a bass that plays root and fifth.
2. **Machine performance.** Every note the same length and level.
3. **Sample abuse.** One staccato take stretched over many semitones; a pure 48 Hz sine as an
   «808 kick», which a phone speaker cannot play; an orchestral instrument standing for a popular one.
4. **Flat mix.** Mono, dry, percussion over the tune.

The cures used: phrases of four and eight bars with pickups, pushed notes, runs and rests; a bass
that walks; velocity and length by musical role; takes kept within a few semitones; a real CC0
recording where one was reachable (a Hohner button accordion, a tenor saxophone and a clarinet
from FreePats, a flute from VSCO 2 CE); in-page synthesis for instruments that are synthesizers
(the bregafunk's kick, lata, clap, grave and stab); and the mix tools added to the studio that day
([`../rhythms/studio.md`](../rhythms/studio.md), Mix).

## The shows after the first round

Whole show, loudest windows, against the owner's references as the lab held them on 2026-11-17.
«Before» is the show as it was that morning.

| Show       | CLAP similarity (refs) | band-vs-toy (refs) | Stems drums / bass / other, dB (refs)                | Side/mid, dB (refs)   | Onsets per second (refs) |
| :--------- | :--------------------- | :----------------- | :--------------------------------------------------- | :-------------------- | :----------------------- |
| manguebeat | 0.74 → 0.85 (0.90)     | 0.99 → 1.00 (1.00) | −5.3 −2.0 −11.1 → −1.4 −7.7 −9.5 (−2.2 −7.6 −9.5)    | −20.5 → −12.1 (−9.2)  | 4.7 → 6.6 (6.6)          |
| brega      | 0.76 → 0.75 (0.93)     | 0.03 → 0.01 (0.57) | −2.6 −7.0 −6.0 → −3.0 −5.1 −7.3 (−2.9 −6.0 −7.9)     | −19.5 → −13.0 (−14.5) | 5.2 → 5.1 (5.2)          |
| bregafunk  | 0.76 → 0.85 (0.96)     | 0.10 → 0.63 (0.34) | −1.9 −5.7 −10.6 → −1.6 −5.5 −15.7 (−0.7 −10.6 −12.3) | −23.7 → −18.1 (−17.8) | 10.2 → 5.7 (5.0)         |

Frevo and forró were deployed from the work their agents had committed when the owner stopped
them; their scores after the change are in the next commit of this file.

What changed in each show is in its own document: [`bregafunk.md`](../rhythms/bregafunk.md),
[`manguebeat.md`](../rhythms/manguebeat.md), [`brega.md`](../rhythms/brega.md),
[`forro.md`](../rhythms/forro.md) and [`../frevo.md`](../frevo.md).

- **Brega did not move on the machine measures** although its tempo, drum cell, bass and mix now
  follow the references. The suspected cause, not measured in isolation: its bumbo is an 808-style
  kick, its caixa an orchestral snare and its chords an FM piano. A recorded drum kit is the next
  step.
- **Manguebeat's aesthetics score fell** (production quality 7.3 to 5.95) while every other
  measure came nearer. The drive and the record crackle are the likely cause; only a listener can
  say whether it is dirty in the right way.
- A recorded trumpet beat a synthesized lead on the brega theme in an A/B test (similarity 0.49
  against 0.36 alone); a generated plate reverb beat the room it replaced.

## Limits of the method

- **Nobody listens.** A number that improves is a reason to show the owner, not a verdict.
- **Few clips.** A genre has two to eight previews of 30 seconds. Two clips of one song score
  0.96 against their own centroid: that is not a ceiling a different song can reach.
- **CLAP noise.** A difference under 0.02 in similarity or 0.1 in a probe is nothing.
- **real-vs-midi is unstable.** The same notes with other takes moved it from 0.60 to 0.13.
- **Demucs has its own ear.** It puts part of a low drum's tail in the bass stem and may put
  clapping or a shaker in the vocal stem, which the comparison then drops.
- **The aesthetics model prefers clean sound** and reads intended distortion as low quality.
- **Never tune a number by breaking the music**, for example noise to raise spectral flatness.
- **Machine load.** Five agents measuring at once on four cores made a ten-minute job miss a
  one-hour limit. Run at most two rhythm agents at a time, and rebuild the reference cache with
  `addrefs.py`, which reuses what is cached.

## Getting reference audio and recordings

- **Previews work.** A music catalogue's public API serves a 30-second preview of most references;
  `lab/fetch-references.py` fetches them by id.
- **YouTube does not work from a cloud session.** It answers «Sign in to confirm you're not a bot»
  to the cloud address, with any downloader. A reference that exists only as a video (Bongar's
  «Mulungu» at «Observa e Toca», Banda Lapada on SuperStar) is fetched on the owner's Mac and kept
  out of the repository.
- **Freesound is not reachable from the cloud** (`AGENTS.md`, Project commands and patterns).
- **Reachable CC0 sources:** `raw.githubusercontent.com` for VSCO 2 CE and VCSL (their folders
  cannot be listed: a path must be known), and freepats.zenvoid.org, where each instrument's page
  states its licence. Read the licence on the page before using a recording.
- **No CC0 drum kit was found** within reach; the brega still needs one.

## How AI can make good music from references

Three ways, as researched on 2026-11-17.

| Way                            | How                                                                                                                              | Fits this site                                                                                                                     |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| Analyse and rebuild (this lab) | Models separate, transcribe and measure the reference; the new music is written from those facts and played with real recordings | Yes: CC0 sound, original melodies, and every note stays on the wheel                                                               |
| Mixing by reference            | A model takes the separate tracks and a reference song and sets EQ, compression, pan and reverb to match it (Diff-MST)           | A candidate when hand mixing by the lab's numbers is not enough                                                                    |
| Direct audio generation        | A model takes a reference clip and generates new audio in its style (MusicGen, Stable Audio Open, HeartMuLa, ElevenLabs Music)   | Not as the site is: one block of audio cannot drive the wheel, breaks «real CC0 recordings first», and may reproduce the reference |

- A listening study found CLAP embeddings the nearest to human judgement of generated music
  among the embeddings it tried, and that the reference set matters
  (<https://arxiv.org/pdf/2311.01616>). No metric replaces listening.
- Diff-MST: <https://arxiv.org/html/2407.08889v1>. An open automatic mixer without a reference:
  <https://github.com/sony/FxNorm-automix>.
- Multi-instrument transcription: YourMT3+ (<https://arxiv.org/html/2407.04822v3>) is the stronger
  model; the lab uses `basic-pitch`, which is lighter and enough for note statistics.

## How to run a round

1. The owner names the reference and the similar songs; record them in
   [`references.md`](references.md) and `lab/references.json`. A show is based only on songs the
   owner names.
2. Measure the references and the show as it is. Read tempo, drum cell, balance, width and density
   before writing a note.
3. One agent per rhythm, each in its own worktree, at most two at a time. It owns its package, its
   test and its document; a change to `src/studio.js` is additive.
4. Render a bar range while working (seconds), the whole show at the end.
5. Send the owner the rendered audio, before and after, and wait for the verdict before the next round.

## Open work

- The owner has not yet judged the first round by ear.
- Frevo, forró and bregafunk still bring their parts in one at a time; the rule since that day is
  that only the maracatu does ([`../product.md`](../product.md), Rhythm shows). Their rewrite waits
  for the owner's similar songs.
- Similar songs still to be named: three for frevo, three for bregafunk, one for forró.
- The brega needs a recorded drum kit and a better keyboard.
- The coco was measured (1 to 8 kHz about 7 to 10 dB over its references) and not changed.
- «Mulungu» and the SuperStar recordings are not in the lab.

# Round two: what the owner asked for after the first deploy

Recorded on 2026-11-17, after the first round of [`sound-lab.md`](sound-lab.md) went live. Nothing
here is built yet: the owner asked to record, research and understand first, and to write no code.

## Contents

- [What the owner asked](#what-the-owner-asked)
- [What listeners said](#what-listeners-said)
- [Full recordings, not excerpts](#full-recordings-not-excerpts)
- [How to read four references](#how-to-read-four-references)
- [Sound in the background on phones](#sound-in-the-background-on-phones)
- [Scene transitions](#scene-transitions)
- [AI music software: what exists](#ai-music-software-what-exists)
- [Order of work](#order-of-work)
- [Open questions for the owner](#open-questions-for-the-owner)

## What the owner asked

1. **Four references per rhythm, equal weight.** No «main reference» and no «similar song»: the
   list is in [`references.md`](references.md). The maracatu is not part of this round.
2. **Every section of every reference.** The first round measured a thirty-second preview of each
   song. The whole recording counts: introduction, verses, chorus, breaks, solos, ending.
3. **Common points, and the literature.** Find what the four share, read it against the academic
   research and the records in this folder, and so learn which elements characterise the rhythm.
   Those are the elements a show brings forward.
4. **Striking, not demonstrative.** The result must be very marked, characteristic and something
   people want to listen to, never only a demonstration.
5. **Research AI music software**: everything that is done today.
6. **Record everything** in documents and issues, publish it, forget nothing, and write no code yet.

## What listeners said

- A friend of the owner, after the first deploy (translated): «I think the transitions, mostly at
  the start, were too abrupt; from the middle to the end it got more fluid; but really cool.»
  ([#46](https://github.com/martonpaulo/baque-virado/issues/46))
- Another problem reported to the owner (translated): «the music gets broken, some instruments do
  not work properly if the phone's browser is not in the foreground, in the background.»
  ([#45](https://github.com/martonpaulo/baque-virado/issues/45))
- The owner's own conclusion: «we have a lot to improve.»

## Full recordings, not excerpts

- The lab holds a thirty-second catalogue preview per song. A preview is one section, often the
  chorus, so the first round never saw an introduction, a break or an ending.
- **YouTube** refuses a cloud session («Sign in to confirm you're not a bot»), with `yt-dlp` or any
  other downloader, because the block is on the cloud address. Working past it would need a signed-in
  account's cookies or a third-party mirror; the agent does not do that.
- **Spotify** cannot give the audio either: its streams are encrypted (DRM) and `yt-dlp` does not
  support it. Tools that claim to «download from Spotify» look the song up on YouTube and download
  from there, so they meet the same block.
- **What works:** the owner downloads the audio on the Mac, where `yt-dlp` runs from a home
  address, and hands the files to the session without putting them in the public repository
  ([#48](https://github.com/martonpaulo/baque-virado/issues/48)). The reference audio is
  copyrighted: it is analysed and never versioned.

## How to read four references

A plan for the analysis, to run once the full recordings are in the lab.

1. **Map each recording.** Mark its sections by ear-equivalent measures: a novelty curve over the
   spectrum and the chroma finds the boundaries; the beat tracker gives bars. Each section gets its
   own row of facts (tempo, instruments present, drum cell, bass figure, harmony, density, loudness).
2. **Weigh the four the same.** Average per song first, then across the four, so a long song or a
   song with more sections does not count more. A reference set's centroid is the mean of four song
   centroids, not of all windows.
3. **Keep what three or four share.** A trait is characteristic when at least three of the four
   show it and the literature names it. A trait only one song has belongs to that song.
4. **Check against the records.** [`pernambuco-rhythms-feeling.md`](pernambuco-rhythms-feeling.md),
   [`frevo-manguebeat-coco.md`](frevo-manguebeat-coco.md), [`brega-forro.md`](brega-forro.md) and
   the academic sources they cite. Where a measurement and a document disagree, say so in the
   rhythm's document; never settle it silently.
5. **Name the three to five elements the show exalts**, per rhythm, before writing a note: each
   becomes a scene's subject ([`../product.md`](../product.md), Rhythm shows, Script).
6. **Write for a listener.** A hook a person can sing back, a form with tension and release
   (introduction, theme, contrast, break, return, ending), dynamics that build, and an ending that
   lands. The teaching is in what the scenes point at; the music has to stand without the screen.

## Sound in the background on phones

Reported: with the browser in the background the music breaks and some instruments stop.

The likely cause, read from the code and not yet measured on a phone:

- `createPlayer` in `src/audio.js` schedules hits with a timer: every 25 ms it schedules the
  hits of the next 150 ms.
- A browser slows the timers of a page that is not in front: Chrome fires them at most once a
  second, and less after five minutes. The scheduler then covers 150 ms of every second, so most
  hits are never scheduled; the ones that are sound on time. That is «broken, some instruments
  missing».
- iOS can also suspend the page's audio and its event loop altogether in the background.

Options to weigh when the code is written (none chosen yet):

| Option                                                      | Gain                                                    | Cost or risk                                                                    |
| :---------------------------------------------------------- | :------------------------------------------------------ | :------------------------------------------------------------------------------ |
| Schedule far ahead while the page is hidden                 | Small change; keeps the show going for the time ahead   | A sound choice or a volume change made meanwhile comes late; many nodes at once |
| Run the scheduler's clock in a Web Worker                   | Worker timers are throttled less                        | iOS may still suspend everything                                                |
| Pause the show when the page is hidden, resume on return    | Never plays wrong                                       | No listening with the screen off                                                |
| Play the offline render through a media element when hidden | Real background and lock-screen playback, with controls | Rendering a show takes minutes today; the choices and volumes are fixed in it   |

What the page should do in the background is the owner's choice: keep playing (as a music app) or
pause (as a video). It is asked in [#45](https://github.com/martonpaulo/baque-virado/issues/45).

## Scene transitions

Reported: abrupt at the start, more fluid from the middle on.

What the code does today, as a starting point for the diagnosis:

- A scene is a list of bars with its own voices; at a scene boundary the parts that play change on
  the bar line, with no fill, no pickup and no change of level leading into it, unless the rhythm's
  script writes one.
- The first scenes of a show are the short ones that set the band up; the later ones are longer
  and already had fills at phrase ends. In frevo, forró and bregafunk the first scenes still bring
  one part in at a time.
- The background crossfades over about three seconds (`CROSSFADE_BARS` in `src/background.js`) and
  the title swaps in about 0.4 s: the picture is already softer than the sound.

What a band does at a boundary, to be written into every script: a fill or a pickup in the last
bar, a breath or a held note, parts that fade or drop a bar early, a cymbal or an echo that rings
over the bar line, and never a new texture arriving cold on beat one.

## AI music software: what exists

Researched on 2026-11-17 from product comparisons, which are vendor-adjacent and disagree in
places; check a vendor's own page before relying on a detail.

| Kind                            | Examples                                                                                                                            | What it gives                                                                           | For this site                                                                                                                        |
| :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| Full songs from text            | Suno, Udio                                                                                                                          | A finished song with voice; Udio's downloads were reported switched off since late 2025 | Not usable: one block of audio, no licence fit, no control of each part                                                              |
| Instrumental and audio-to-audio | Stable Audio (open weights for its smaller models), ElevenLabs Music (sections, inpainting, an audio reference), Google Lyria (API) | Instrumentals; some take a reference clip and follow its sound                          | Could draft ideas to listen to; the output cannot drive the wheel and is not a CC0 recording                                         |
| Open models to run yourself     | MusicGen (Meta AudioCraft), Stable Audio Open, ACE-Step, HeartMuLa                                                                  | The same, on your own machine                                                           | The same limits; heavy for a cloud session without a GPU                                                                             |
| Symbolic (notes, MIDI)          | AIVA (exports MIDI), Music Transformer, MuseNet, multi-track models such as MMM                                                     | Notes per instrument, editable                                                          | The nearest fit: notes can drive the wheel and play the site's recordings; styles of Pernambuco are unlikely to be in their training |
| Stems and transcription         | Demucs, Moises, LALAL.AI, RipX; basic-pitch, MT3, YourMT3+                                                                          | A recording split into parts, and its notes                                             | In use: this is the lab                                                                                                              |
| Mixing by reference             | Diff-MST; FxNorm-automix (no reference)                                                                                             | Mix settings that match a reference song                                                | A candidate for the mix step                                                                                                         |
| Judging                         | CLAP, MERT, audiobox-aesthetics, Fréchet Audio Distance                                                                             | A number for nearness or quality                                                        | In use; never a verdict                                                                                                              |

Sources: <https://beatstorapon.com/blog/best-ai-music-generators-2026/>,
<https://soundgen.ai/ai-music-models>, <https://gudz.ai/posts/ai-music-generation-2026>,
<https://www.avocadoai.co/blog/comparison/ai-music-generator-comparison-2026>,
<https://blog.staccato.ai/leading-ai-midi-tools-2026>,
<https://www.songscription.ai/blog/ai-music-tools-for-producers>, and those of
[`sound-lab.md`](sound-lab.md).

The conclusion so far: no product writes a Pernambuco rhythm that teaches its own parts. The lab's
way (analyse the references, write the notes, play real recordings) stays; a symbolic model or an
audio model may serve as a sketch pad to compare ideas, if the owner wants to try one.

## Order of work

1. The owner sends the full recordings ([#48](https://github.com/martonpaulo/baque-virado/issues/48)).
2. Section maps and per-song facts for the four references of each rhythm; the common elements,
   checked against the literature; the three to five elements each show exalts
   ([#47](https://github.com/martonpaulo/baque-virado/issues/47)).
3. The owner approves each rhythm's elements and form before any note is written.
4. Background playback ([#45](https://github.com/martonpaulo/baque-virado/issues/45)) and
   transitions ([#46](https://github.com/martonpaulo/baque-virado/issues/46)) are engine and script
   work that every rhythm shares; they come before the rewrites.
5. One rhythm at a time, at most two agents, audio sent to the owner before each deploy.

## Open questions for the owner

- The brega has five songs named and the owner counts four: which four?
- In the background, should a show keep playing or pause?
- May the unfinished work of the stopped frevo, forró and bregafunk agents be pushed as `wip/`
  branches, so a recycled session does not lose it?

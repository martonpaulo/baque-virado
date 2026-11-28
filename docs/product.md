# Batuque — product definition

## Contents

- [What it is](#what-it-is)
- [Who it is for](#who-it-is-for)
- [The job](#the-job)
- [What it does](#what-it-does)
- [What it will never do](#what-it-will-never-do)
- [How you know it worked](#how-you-know-it-worked)
- [Constraints](#constraints)
- [Rhythm shows](#rhythm-shows)
- [Limits the owner set](#limits-the-owner-set)
- [Alternatives considered](#alternatives-considered)
- [Evidence on hand](#evidence-on-hand)
- [Accepted evidence gaps](#accepted-evidence-gaps)

## What it is

A one-page, animated and audible explainer of maracatu de baque virado: it plays the band with real
drum samples and shows, as it plays, which instrument hits where, how far each hit sits off the
straight grid, and how seven baques differ.

## Who it is for

Batuqueiros learning their first baques, and curious listeners who have heard maracatu and want to
see what makes it swing. They open a link on a phone, usually from a social post, and give it
about two minutes.

## The job

Understand by ear and eye what an alfaia, caixa, agbê, ganzá and agogô each play, where the
contratempo is, and why a band does not sound like a metronome. Today they learn by imitation at a
rehearsal or from videos of whole bands, where the parts cannot be told apart.

## What it does

- Plays a fixed two-minute show in sections: the mestre's whistle and the caixa roll, the
  ensemble entering one voice at a time, the measured swing, the contratempo, seven baques with
  their viradas and a cut, and a summary.
- Shows each bar on a 16-sixteenth wheel, a scrolling multitrack view and, for each baque, its
  percussion score with a moving cursor.
- Plays the swing measured on a real workshop recording, and shows the straight grid next to it.
- On desktop, lists the scenes as one timeline to jump through and lets the viewer swap each
  instrument's sound; a phone shows the reel alone, which plays and pauses on a tap and shows the time played and the total while paused,
  with the default sounds. The page never scrolls; on a narrow desktop the reel narrows instead.
- On desktop, exports the show as a 9:16 video with its sound, made in the browser (an MP4 where the
  browser encodes H.264 and AAC, else a WebM), named after the rhythm; phones have no export
  ([#19](https://github.com/martonpaulo/baque-virado/issues/19)).

## What it will never do

| Non-goal                                            | Reason                                                                        | Reopens when                                  |
| :-------------------------------------------------- | :---------------------------------------------------------------------------- | :-------------------------------------------- |
| Present one nação's baques as the canonical version | Each nação plays its own; the patterns come from one published hand table     | A mestre or nação provides patterns to credit |
| Be an editor or sequencer                           | The job is to understand a performance, not to compose one                    | Never, by the owner's choice                  |
| Offer sound choices on phones                       | Phones download only the default samples, so the page loads on mobile data    | Never, by the owner's choice                  |
| Show anything outside the reel on phones            | The owner wants the phone page to be the reel alone, tap to play (2026-11-16) | The owner asks for controls on phones         |
| Translate the interface                             | The audience is Brazilian; the copy is pt-BR only                             | Readers outside Brazil ask for it             |

## How you know it worked

A viewer who watched it can say which hand of the alfaia plays on the contratempo in the marcação,
and the page plays smoothly to the end on a recent iPhone and an Android phone.

## Constraints

- Static files only, served by GitHub Pages at https://batuque.martonpaulo.com; no backend.
- Chromium and WebKit are the acceptance engines (Android, desktop, iPhone).
- Every sample is public domain (CC0); credits in [`CREDITS.md`](../CREDITS.md).
- The sound, the notes, the score, the wheel and the lanes are a function of the show position, so
  the video export matches playback. The background is the exception: its feedback trail depends on
  the frames before it, so both exports (`src/export.js` and `tools/export-video.mjs`) warm up for
  4 s before a late first frame
  ([#7](https://github.com/martonpaulo/baque-virado/issues/7)).
- On an iPhone or iPad the page asks for the «playback» audio session when the viewer taps Play
  (`useMediaPlayback` in `src/audio.js`): Web Audio alone plays in the «ambient» session, which the
  ringer switch mutes in every browser there, and the show stayed silent until another site had
  played a video.
- With the page in the background a playing show pauses, as a video does, and resumes where it
  stopped when the page is shown again; a show paused before stays paused (`pauseWhileHidden` in
  `src/util.js`, [#45](https://github.com/martonpaulo/baque-virado/issues/45), D35). A hidden
  page's timers are throttled, and the look-ahead scheduler would drop most hits.
- The background takes its centre from the wheel's place in the stage, and measures again when the
  wheel moves without a stage resize (`sizeKey` in `src/main.js`): on a phone the column's padding
  follows the safe-area inset, which changes when the browser's bars hide.

## Rhythm shows

The rules every rhythm package in `src/rhythms/` follows.

- **Feeling.** Each rhythm has its own feeling, from
  [`pernambuco-rhythms-feeling.md`](research/pernambuco-rhythms-feeling.md); no show copies
  another's mood.
- **Script.** Only the maracatu brings its instruments in one at a time. Every other show starts
  with the band already playing, as a track of the genre does, and each scene gives a highlight to
  one characteristic of the rhythm (an accent, a cell, a call and response, a break), not
  necessarily to an instrument: the other parts drop back for a few bars, then the band returns. A
  show never leaves one instrument alone for long: some rhythms sound empty that way.
- **Music.** Instrumental only. Every melody is original. Each show follows the owner's four
  references in [`references.md`](research/references.md), which weigh the same; what they share,
  read against the literature, is what the show brings forward. A show must be striking,
  characteristic and something people want to listen to, never only a demonstration, and one scene
  leads into the next as a band does, never cold on the bar line. One tempo for the whole show. A 2/4
  rhythm draws its bar on an 8-step wheel.
- **Lead-ins.** A scene declares how it is entered (`leadIn` in its package: a fill, a pickup, parts
  that drop out, or a sound that rings over the bar line), and its script writes the bar that leads
  into it; the engine hands the declaration to the script and invents nothing. A boundary that
  changes more than a quarter of the voices without a declared lead-in is cold
  (`COLD_BOUNDARY_SHARE` in `src/show.js`). `tests/rhythms.test.js` lists the cold boundaries each
  show still has; a list only shrinks, and a show's round-two rewrite empties its own
  ([#46](https://github.com/martonpaulo/batuque/issues/46)). The maracatu is outside this rule.
- **Felt tempo.** The tempo a listener feels sits inside the genre's researched range in
  [`brega-forro.md`](research/brega-forro.md) and
  [`frevo-manguebeat-coco.md`](research/frevo-manguebeat-coco.md), and the agent checks it before
  the owner listens.
- **Graphics.** A show's musical graphics belong to its own instruments: a score, tablature, the
  strings, keys, buttons or valves being played, the hands' position, a vibration, a comparison
  between instruments. The wheel, lanes and counts were made for the maracatu; no other show
  repeats that set unchanged: the wheel stays in every show, smaller, as the site's mark, and the
  rhythm's own graphic takes the main space ([#49](https://github.com/martonpaulo/baque-virado/issues/49)).
- **Background.** Circular, coming out of the central wheel, in the rhythm's palette from section 5
  of [`colour-and-visuals.md`](research/colour-and-visuals.md): brega in desaturated blue
  and muted rose, bregafunk in purple, magenta and gold. The approved backgrounds are a sketch to
  improve, not a finished design. Flashes stay within WCAG 2.3.1.
- **Sound.** Real CC0 recordings first. A synthesized voice must sound like the real instrument.
  One sample repeated unchanged is not acceptable: use round robin, velocity layers, humanised
  timing and a mix bus, as [`human-feel.md`](research/human-feel.md) and
  [`software-music-feel.md`](research/software-music-feel.md) describe.
- **Coco.** The pandeiro and the palmas are viewer options, like the maracatu caixa options, with
  `couro` and `roda` as defaults. The atabaques are a trio: rum, rumpi and lê. Rufadas open the
  show.
- **Video export.** Every rhythm exports from the page on desktop, as «What it does» says
  ([#19](https://github.com/martonpaulo/baque-virado/issues/19)).

## Limits the owner set

| Limit                            | Value                                                                                             | Owned by                       | Decision                                                                        | Status                                                                            |
| :------------------------------- | :------------------------------------------------------------------------------------------------ | :----------------------------- | :------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------- |
| Samples a phone downloads        | the 11 default files, under 100 KB ([#3](https://github.com/martonpaulo/baque-virado/issues/3))   | `tests/sounds.test.js`         | owner, 2026-11-13                                                               | current                                                                           |
| Title transition                 | ≈0.12 s out, ≈0.25 s in                                                                           | `src/title.js`                 | owner, 2026-11-12                                                               | current                                                                           |
| Stage label size on phones       | at least 11 px                                                                                    | `styles.css` `--label-floor`   | owner, 2026-11-13, [#4](https://github.com/martonpaulo/baque-virado/issues/4)   | replaced, 2026-11-16: a phone draws the desktop stage, smaller                    |
| Instruments in a show            | percussion and instruments only, no voice                                                         | `docs/product.md` Rhythm shows | owner, 2026-11-17                                                               | current                                                                           |
| Reference recordings             | the repository names no song, recording or performer as a model for a show                        | `docs/product.md` Rhythm shows | owner, 2026-11-17                                                               | replaced, 2026-11-17: the repository names the references and similar songs (D29) |
| Reference recordings, named      | the owner's references live in [`references.md`](research/references.md); melodies stay original  | `docs/research/references.md`  | owner, 2026-11-17                                                               | current                                                                           |
| Flashes                          | WCAG 2.3.1, three flashes or below threshold                                                      | `docs/product.md` Rhythm shows | owner, 2026-11-17                                                               | current                                                                           |
| Felt tempo                       | inside the genre's researched range, checked before the owner listens                             | `docs/product.md` Rhythm shows | owner, 2026-11-17                                                               | current                                                                           |
| Sound                            | real CC0 recordings first; a synthesized voice sounds like the instrument; no identical repeats   | `docs/product.md` Rhythm shows | owner, 2026-11-17                                                               | current                                                                           |
| Samples a phone downloads, frevo | the 43 default files, under 400 KB ([#25](https://github.com/martonpaulo/baque-virado/issues/25)) | `tests/frevo.test.js`          | agent, 2026-11-17, to confirm with the owner                                    | replaced, 2026-11-17: sustained takes, so the horns hold their notes              |
| Samples a phone downloads, frevo | the 78 default files, under 880 KB                                                                | `tests/frevo.test.js`          | agent, 2026-11-17, to confirm with the owner                                    | current                                                                           |
| Maracatu sound                   | identical to before the studio: same samples, times, rates and levels                             | `tests/maracatu-sound.test.js` | owner, 2026-11-17, [#36](https://github.com/martonpaulo/baque-virado/issues/36) | current                                                                           |
| References per rhythm            | four, of equal weight, named only by the owner; the whole of each recording counts                | `docs/research/references.md`  | owner, 2026-11-17                                                               | current                                                                           |
| A show is music first            | striking, characteristic, something people want to listen to; not a demonstration                 | `docs/product.md` Rhythm shows | owner, 2026-11-17                                                               | current                                                                           |

## Alternatives considered

The new-project gate was skipped: the project was built before setup, at the owner's request,
on 2026-11-12.

## Evidence on hand

- Measured swing: median offsets per sixteenth from a phone recording of a Batuk Nagô workshop
  (YouTube `hxW-td9bNsg`), in `src/rhythms/maracatu.js`.
- Patterns: the alfaia hand table at lansdownsoftware.com; not yet checked by a batuqueiro.
- No screenshots, user figures or quotes exist yet.

## Accepted evidence gaps

- Accessibility: no automated accessibility test runs; the markup and `src/controls.js` are the
  evidence (labelled stage, `aria-pressed` sound chips, an `aria-current` scene timeline, focus outlines, reduced
  motion). Accepted by the owner on 2026-11-13 for a single static page.

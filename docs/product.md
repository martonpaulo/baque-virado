# O Baque Virado — product definition

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

## What it will never do

| Non-goal                                            | Reason                                                                            | Reopens when                                  |
| :-------------------------------------------------- | :-------------------------------------------------------------------------------- | :-------------------------------------------- |
| Present one nação's baques as the canonical version | Each nação plays its own; the patterns come from one published hand table         | A mestre or nação provides patterns to credit |
| Be an editor or sequencer                           | The job is to understand a performance, not to compose one                        | Never, by the owner's choice                  |
| Generate video in the page                          | The page stays light on phones; video is made offline by `tools/export-video.mjs` | Never, by the owner's choice                  |
| Offer sound choices on phones                       | Phones download only the default samples, so the page loads on mobile data        | Never, by the owner's choice                  |
| Show anything outside the reel on phones            | The owner wants the phone page to be the reel alone, tap to play (2026-11-16)     | The owner asks for controls on phones         |
| Translate the interface                             | The audience is Brazilian; the copy is pt-BR only                                 | Readers outside Brazil ask for it             |

## How you know it worked

A viewer who watched it can say which hand of the alfaia plays on the contratempo in the marcação,
and the page plays smoothly to the end on a recent iPhone and an Android phone.

## Constraints

- Static files only, served by GitHub Pages at https://batuque.martonpaulo.com; no backend.
- Chromium and WebKit are the acceptance engines (Android, desktop, iPhone).
- Every sample is public domain (CC0); credits in [`CREDITS.md`](../CREDITS.md).
- The sound, the notes, the score, the wheel and the lanes are a function of the show position, so
  the video export matches playback. The background is the exception: its feedback trail depends on
  the frames before it, so `tools/export-video.mjs` warms up for 4 s before the first frame
  ([#7](https://github.com/martonpaulo/baque-virado/issues/7)).

## Rhythm shows

The rules every rhythm package in `src/rhythms/` follows.

- **Feeling.** Each rhythm has its own feeling, from
  [`pernambuco-rhythms-feeling.md`](research/pernambuco-rhythms-feeling.md); no show copies
  another's mood.
- **Music.** Instrumental only. Every melody is original. One tempo for the whole show. A 2/4
  rhythm draws its bar on an 8-step wheel.
- **Felt tempo.** The tempo a listener feels sits inside the genre's researched range in
  [`brega-forro.md`](research/brega-forro.md) and
  [`frevo-manguebeat-coco.md`](research/frevo-manguebeat-coco.md), and the agent checks it before
  the owner listens.
- **Background.** Circular, coming out of the central wheel, in the rhythm's palette from section 5
  of [`colour-and-visuals.md`](research/colour-and-visuals.md): brega romântico in desaturated blue
  and muted rose, brega funk in purple, magenta and gold. The approved backgrounds are a sketch to
  improve, not a finished design. Flashes stay within WCAG 2.3.1.
- **Sound.** Real CC0 recordings first. A synthesized voice must sound like the real instrument.
  One sample repeated unchanged is not acceptable: use round robin, velocity layers, humanised
  timing and a mix bus, as [`human-feel.md`](research/human-feel.md) and
  [`software-music-feel.md`](research/software-music-feel.md) describe.
- **Coco.** The pandeiro and the palmas are viewer options, like the maracatu caixa options, with
  `couro` and `roda` as defaults. The atabaques are a trio: rum, rumpi and lê. Rufadas open the
  show.
- **Video export.** Parked ([#19](https://github.com/martonpaulo/baque-virado/issues/19),
  [#20](https://github.com/martonpaulo/baque-virado/issues/20)).

## Limits the owner set

| Limit                      | Value                                                                                           | Owned by                       | Decision                                                                      | Status                                                         |
| :------------------------- | :---------------------------------------------------------------------------------------------- | :----------------------------- | :---------------------------------------------------------------------------- | :------------------------------------------------------------- |
| Samples a phone downloads  | the 11 default files, under 100 KB ([#3](https://github.com/martonpaulo/baque-virado/issues/3)) | `tests/sounds.test.js`         | owner, 2026-11-13                                                             | current                                                        |
| Title transition           | ≈0.12 s out, ≈0.25 s in                                                                         | `src/title.js`                 | owner, 2026-11-12                                                             | current                                                        |
| Stage label size on phones | at least 11 px                                                                                  | `styles.css` `--label-floor`   | owner, 2026-11-13, [#4](https://github.com/martonpaulo/baque-virado/issues/4) | replaced, 2026-11-16: a phone draws the desktop stage, smaller |
| Instruments in a show      | percussion and instruments only, no voice                                                       | `docs/product.md` Rhythm shows | owner, 2026-11-17                                                             | current                                                        |
| Reference recordings       | the repository names no song, recording or performer as a model for a show                      | `docs/product.md` Rhythm shows | owner, 2026-11-17                                                             | current                                                        |
| Flashes                    | WCAG 2.3.1, three flashes or below threshold                                                    | `docs/product.md` Rhythm shows | owner, 2026-11-17                                                             | current                                                        |
| Felt tempo                 | inside the genre's researched range, checked before the owner listens                           | `docs/product.md` Rhythm shows | owner, 2026-11-17                                                             | current                                                        |
| Sound                      | real CC0 recordings first; a synthesized voice sounds like the instrument; no identical repeats | `docs/product.md` Rhythm shows | owner, 2026-11-17                                                             | current                                                        |

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

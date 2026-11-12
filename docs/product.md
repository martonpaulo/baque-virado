# O Baque Virado — product definition

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
- On desktop, lets the viewer swap each instrument's sound; phones always use the chosen defaults.

## What it will never do

| Non-goal | Reason | Reopens when |
| :--- | :--- | :--- |
| Present one nação's baques as the canonical version | Each nação plays its own; the patterns come from one published hand table | A mestre or nação provides patterns to credit |
| Be an editor or sequencer | The job is to understand a performance, not to compose one | Never, by the owner's choice |
| Generate video in the page | The page stays light on phones; video is made offline by `tools/export-video.mjs` | Never, by the owner's choice |
| Offer sound choices on phones | Phones download only the default samples, so the page loads on mobile data | Never, by the owner's choice |
| Translate the interface | The audience is Brazilian; the copy is pt-BR only | Readers outside Brazil ask for it |

## How you know it worked

A viewer who watched it can say which hand of the alfaia plays on the contratempo in the marcação,
and the page plays smoothly to the end on a recent iPhone and an Android phone.

## Constraints

- Static files only, served by GitHub Pages at https://baquevirado.martonpaulo.com; no backend.
- Chromium and WebKit are the acceptance engines (Android, desktop, iPhone).
- Every sample is public domain (CC0); credits in [`CREDITS.md`](../CREDITS.md).
- Sound and image are deterministic for a given position, so the video export matches playback.

## Limits the owner set

| Limit | Value | Owned by | Decision | Status |
| :--- | :--- | :--- | :--- | :--- |
| Samples a phone downloads | the 11 default files | `tests/sounds.test.js` | owner, 2026-11-13 | current |
| Title transition | ≈0.12 s out, ≈0.25 s in | `src/title.js` | owner, 2026-11-12 | current |

## Alternatives considered

The new-project gate was skipped: the project was built before setup, at the owner's request,
on 2026-11-12.

## Evidence on hand

- Measured swing: median offsets per sixteenth from a phone recording of a Batuk Nagô workshop
  (YouTube `hxW-td9bNsg`), in `src/music.js`.
- Patterns: the alfaia hand table at lansdownsoftware.com; not yet checked by a batuqueiro.
- No screenshots, user figures or quotes exist yet.

## Accepted evidence gaps

- Accessibility: no automated accessibility test runs; the markup and `src/controls.js` are the
  evidence (labelled stage, `aria-pressed` and `aria-current` chips, focus outlines, reduced
  motion). Accepted by the owner on 2026-11-13 for a single static page.

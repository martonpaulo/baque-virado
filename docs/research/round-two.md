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
- [What the owner answered](#what-the-owner-answered)
- [What is still missing](#what-is-still-missing)
- [Musical graphics per rhythm](#musical-graphics-per-rhythm)
- [Which agent writes the music](#which-agent-writes-the-music)
- [Unfinished work kept](#unfinished-work-kept)

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

The owner chose: in the background a show pauses, as a video does
([#45](https://github.com/martonpaulo/baque-virado/issues/45), D35).

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

The owner agreed to this order on 2026-11-17.

1. **Hook and form first, timbre after.** They change a listener's reaction the most and need no
   new recording.
2. **One rhythm at a time, until the owner approves it by ear.** The bregafunk is first: its hook
   is the beat, every sound is synthesized in the page, and it waits for no recording.
3. **A short cut that loops**, 20 to 40 seconds, as soon as a rhythm is approved.

Before a rhythm's notes are written:

1. Its full recordings are in the lab ([#48](https://github.com/martonpaulo/baque-virado/issues/48)).
2. Section maps and per-song facts for its references; the common elements, checked against the
   literature; the three to five elements the show exalts
   ([#47](https://github.com/martonpaulo/baque-virado/issues/47)).
3. The owner approves the elements and the form.

Background playback ([#45](https://github.com/martonpaulo/baque-virado/issues/45)), transitions
([#46](https://github.com/martonpaulo/baque-virado/issues/46)) and the graphics
([#49](https://github.com/martonpaulo/baque-virado/issues/49)) are work every rhythm shares. At most
two agents run at once, and the rendered audio goes to the owner before each deploy.

## What the owner answered

- **Brega:** five references. The owner took «Ainda Bem» out and put it back the same day
  (2026-11-17), in Banda Lapada's performance on SuperStar; «Diz na Minha Cara» is Banda Torpedo's
  recording (D40).
- **Bregafunk:** the fourth reference is «Cafajeste», MC Cego Abusado.
- **In the background a show pauses, as a video does**, and resumes where it stopped when the viewer
  comes back ([#45](https://github.com/martonpaulo/baque-virado/issues/45), D35).
- **The owner accepted every decision the agent proposed** (2026-11-17, D37): the reading under
  «What is still missing» is the direction of round two (a hook; one instrument that takes the
  singer's place and phrases as a voice; a form; phrases played by people; weight and loudness); the
  bregafunk's five elements, its form and 171 BPM ([`../rhythms/bregafunk.md`](../rhythms/bregafunk.md));
  the wheel stays in every show, smaller, as the site's mark, and each rhythm's own graphic takes
  the main space ([#49](https://github.com/martonpaulo/baque-virado/issues/49)); the order of work below.
- **Every usable idea, and code, from AI music software is to be used** (D38), within the site's
  rules: the notes still drive the graphics, the recordings stay CC0 and the melodies original.

## What is still missing

The agent's own reading on 2026-11-17, after the first round, asked by the owner in two roles. It
is judgement from the measurements, the references' facts and knowledge of the genres; nobody has
listened. The owner accepted it as the direction of round two (D37). The maracatu is not
part of it.

### As a producer who only releases hits

What every show lacks:

1. **A hook.** The tunes were written to match style facts (density, register, harmony), so they
   are correct and forgettable. A hit has one short idea a person hums after one hearing, stated in
   the first ten seconds and brought back.
2. **Someone singing.** Every one of these genres is sung, and the shows are instrumental by the
   owner's rule. So one lead instrument has to take the singer's place and phrase like a voice
   (breath, call and answer, a refrain), not play a line among others.
3. **A shape.** Tension and release: an opening that grabs, a build, a break, a drop, a last chorus
   bigger than the first, an ending that lands. The shows are a row of scenes at one level.
4. **Played phrases.** The parts are single recorded hits placed on a grid. A groove lives in what
   a player does between the hits (ghost notes, drags, the push of a bellows, a horn fall). Short
   recorded phrases or loops by real players would carry more than any amount of humanising.
5. **Weight and loudness.** A finished master: low end you feel, glue, level near the references.

Per rhythm:

| Rhythm     | What makes the crowd react in the genre                                                                                                                                    | What the show lacks                                                                                                         |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| Frevo      | The fanfare everyone knows by the second bar; brass and reeds answering each other at speed; the tarol's rolling rufo pushing; a key change that lifts; the final chord    | A section sound (four or five players per part, not one sample); the bite and falls of the brass; a driving tarol; the lift |
| Forró      | The sanfona's opening riff, which the room sings; the resfolego of the bellows; zabumba and triângulo swinging together; a refrain as simple as a song                     | A sanfona that breathes and leads as a singer; an opening riff as the hook; percussion under the tune, not over it          |
| Manguebeat | One riff of bass or guitar with an identity; alfaias as a wall of several drums; a snare with ghost notes in the pocket; stops and re-entries; noise and samples as colour | A riff to hum; the mass of many alfaias; dynamics between verse-level and chorus-level energy                               |
| Brega      | The keyboard or sax solinho of the introduction; the weeping chorused guitar; dramatic breques before the chorus; the last chorus a tone higher                            | A real drum kit; a lead timbre with character; the introduction riff as the hook; drama in the stops                        |
| Bregafunk  | The beat itself is the hook: the lata's pattern, the tuned grave with its slides, a two-bar riff repeated to hypnosis, silence before the drop                             | Sound design with punch and grit; a two-bar riff in place of an eight-bar tune; space; a drop that hits                     |
| Coco       | The pisada (feet on the floor), palmas and the roda answering; the ganzá leading; the bombo's viradas; the roda heating up                                                 | The feet and the room; an answer to the call that is not a voice; a build; less brightness, more drum body                  |

A question this raises for the owner: wordless voices (a shout, a chorus on «ê», a chopped syllable)
are part of the sound of several of these genres and would give back much of what the rule against
voice removes. The rule stands until the owner says otherwise.

### As a maker of catchy music videos

What every show lacks:

1. **The first three seconds.** A show opens on a title and a quiet wheel. A clip opens on its
   strongest picture and sound together.
2. **One moment to share.** A drop where the picture answers the sound with everything it has.
3. **A short cut.** Two minutes is long for a feed: a 20 to 40 second version of each show, built
   around the hook and the drop, that loops cleanly from its end to its start.
4. **A figure.** Something that moves as a body moves: a dancer's silhouette, feet, hands, an
   umbrella. The wheel shows the rhythm; nothing shows what the rhythm does to people.
5. **Camera.** Pushes, cuts and shakes on the accents, a new look every four or eight bars.
6. **Fewer, bigger words.** One idea on screen at a time, set large, moving with the beat.
7. **An end card.** The rhythm's name and the site, held long enough to read.

Per rhythm, pictures that belong to it:

| Rhythm     | Picture                                                                                            |
| :--------- | :------------------------------------------------------------------------------------------------- |
| Frevo      | The sombrinha's colours spinning; confetti and streamers bursting on brass hits; a passista's leap |
| Forró      | A lamp-lit sala de reboco; the bellows opening and closing; a couple turning as one silhouette     |
| Manguebeat | The antenna in the mud, crabs, a worn video-tape look; the picture hit by each alfaia stroke       |
| Brega      | Neon, a mirror ball, a slow push in; a heart that breaks on the breque                             |
| Bregafunk  | A paredão's speaker cones pumping; passinho footwork in silhouette; hard cuts and bold captions    |
| Coco       | The roda seen from above; feet raising dust; hands meeting on the off-beat                         |

Flashes stay within WCAG 2.3.1 and reduced motion is respected, as today.

## Musical graphics per rhythm

The owner, on 2026-11-17 (translated): «Vary the musical graphics: you are always using the same
ones. You can show a score, tablature, other musical notations, the strings that are played,
vibrations, comparisons between instruments, the position of the hands, the valves pressed on the
instruments. You were using exactly the same things as for the maracatu, and we should not use the
same in every rhythm.» ([#49](https://github.com/martonpaulo/baque-virado/issues/49), D36)

Today every show draws the wheel of sixteenths, the scrolling lanes and a readout of counts; frevo,
manguebeat and brega add a melody roll. They were made for the maracatu, a show of percussion parts
on a cycle.

A starting list to choose from with the owner, each tied to the rhythm's own instruments:

| Rhythm     | Graphics                                                                                                                                                                                             |
| :--------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forró      | The sanfona's keyboard and bass buttons lighting as pressed, and its bellows opening and closing; the zabumba's two heads, maceta above and bacalhau below; the triângulo's hand closing and opening |
| Frevo      | A score of the tune with a cursor; the trumpet's three valves pressed for each note; the trombone's slide position; the saxophone's keys; brass and reeds as two staves answering                    |
| Manguebeat | Bass tablature and the guitar's fretboard with the power-chord shapes; the echo's repeats as fading copies; the alfaia's two hands                                                                   |
| Brega      | The guitar's tablature for the thirds and sixths; the keyboard's keys for the theme; a map of the drum kit lighting; the chord symbols as they change                                                |
| Bregafunk  | A producer's step grid and piano roll; the grave's pitch curve with its slides; the bumbo's waveform; the bar's 3 + 3 + 2 as blocks                                                                  |
| Coco       | The hand on the pandeiro (thumb, fingers, slap); the feet of the pisada; the three atabaques side by side, compared by pitch and role; palmas as two hands meeting                                   |

Across rhythms: a string or a drum head vibrating at the note's pitch; two instruments' waveforms
or spectra side by side; the same cell in two notations.

Each graphic stays a function of the show position, so the video export matches playback, reads on
a phone and respects reduced motion. The wheel stays in every show, smaller, as the site's
mark, and the rhythm's own graphic takes the main space (the owner, D37).

## Which agent writes the music

Asked by the owner on 2026-11-17; read from Anthropic's model reference of that date.

| Role                                                    | Model                                                                             | Effort                                   | Why                                                                                                                                                                                                                                 |
| :------------------------------------------------------ | :-------------------------------------------------------------------------------- | :--------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Writes a rhythm: the hook, the form, the parts, the mix | Claude Fable 5.2 (`claude-fable-5-2`), the most capable model generally available | `high`                                   | Composition and arrangement are the hard, long-horizon judgement here. Anthropic's guidance for this model is to start at `high`: gains above it are uneven, `xhigh` only where a gain is measured, `max` only to measure a ceiling |
| The same, on a smaller budget                           | Claude Opus 5.5 (`claude-opus-5-5`)                                               | `high` (its default is `medium`: set it) | Half the price per token; the strongest Opus                                                                                                                                                                                        |
| Measures, renders, fetches, runs the gates              | Claude Sonnet 5.5 or Claude Haiku 5.5                                             | `medium` or `low`                        | Mechanical work; cheap and fast                                                                                                                                                                                                     |

- No Claude model hears or generates audio. The agent writes notes, synthesis and mix settings as
  code, and the lab measures the result; the owner's ear decides.
- One writing agent per rhythm, at most two at once ([`sound-lab.md`](sound-lab.md), Limits).
- A session's default model applies to an agent that names none; the owner sets it for the session.

## Unfinished work kept

The rewrites of the frevo, forró and bregafunk scripts that the owner stopped on 2026-11-17 are on
GitHub as the branches `wip/frevo`, `wip/forro` and `wip/bregafunk` (pushed with the owner's
permission). Each is one commit ahead of `main`, does not pass its test, and is a starting point
for round two, not something to merge as it is.

The owner's view of the first round: every show but the maracatu still has a lot to improve, the
delivered ones included.

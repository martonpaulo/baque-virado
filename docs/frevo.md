# Frevo show

The frevo de rua show: what it plays, what it shows and why. The package is
[`src/rhythms/frevo.js`](../src/rhythms/frevo.js); open it with `?ritmo=frevo`. Built in
[#25](https://github.com/martonpaulo/baque-virado/issues/25) from the script in
[`docs/sketches/scripts.html`](sketches/scripts.html) and the notes in [`docs/research/`](research/).

## Contents

- [Music](#music)
- [Sound](#sound)
- [Visuals](#visuals)
- [Widgets per scene](#widgets-per-scene)
- [Open points](#open-points)

## Music

- Frevo de rua, instrumental. 2/4 at 140 BPM for the whole show, an 8-step wheel, one bar per
  turn. 104 bars, 1:29.
- Twelve scenes, as the script lists them: Introdução, Surdo, Caixa, Pandeiro, Tuba, Metais,
  Lá e cá, Ventania, Bambeando, Fotografia, Abafo, Final. The parts enter one by one: surdo,
  caixa, pandeiro, tuba, then the metais, then the palhetas.
- Percussion: the cell of two bars that the sources give for every Pernambuco frevo, twelve
  sixteenths and then the caixa's rufo. The accents follow the 3+3+2 grouping (an inference, as
  in the research). The surdo is muted on beat 1 and open on beat 2; the pandeiro plays grave on
  the beats and platinela between.
- No swing. The sources say the push comes from anticipations, not swing, and no measured frevo
  swing exists, so none is invented.
- Key B♭ major: euphoria is fast, major, high and bright, and B♭ keeps every line inside the
  recorded range of its instrument.
- The melodies are original. The hook: a pickup of three notes that bursts in, then two bars
  with a wave contour and accents on 1, 4 and 7. It is stated in Metais, repeated, varied once in
  Lá e cá (ends on G, a register higher), and comes back unchanged to open the Final.
- Metais is the A part of 16 bars; its peak, the Alto da Sé, is bars 9 to 12 on the IV chord
  (E♭), as the composition source describes. A chromatic diminished chord leads out of it.
- The trombones punch every accent of the trompetes with the chord's guide tone (third or
  seventh); an accent on the last eighth already takes the next chord. The tuba walks root and
  fifth on the eighths, with a chromatic approach into each new chord.
- Bambeando: the trompetes, trombones and tuba all land the next chord on the last eighth of the
  bar, and the tuba ties that note over the next downbeat.
- Abafo: the trompetes hold long notes in a rising line (F, G, A, B♭) and the trombones hold
  theirs one beat later, so two lines compete in volume, as in the clash of two bands.

## Sound

Every sound is a real CC0 recording; nothing is synthesized. Freesound refuses this environment,
but two CC0 libraries on GitHub were reachable, so recordings replaced synthesis. Sources and
edits are in [`CREDITS.md`](../CREDITS.md).

| Voice    | Sample                                                     | Source               |
| :------- | :--------------------------------------------------------- | :------------------- |
| surdo    | concert bass drum, open and muted (default); the dry surdo | VCSL; the repository |
| caixa    | rope-tension snare (tarol, default); two repository caixas | VCSL; the repository |
| pandeiro | small frame drum mixed with a tambourine; tambourine alone | VCSL                 |
| tuba     | staccato, 6 pitches                                        | VSCO 2 CE            |
| trombone | tenor trombone staccato (4) and sustained (4)              | VSCO 2 CE            |
| trompete | trumpet staccato (7) and sustained (5)                     | VSCO 2 CE            |
| saxofone | tenor sax staccato, 10 pitches                             | VCSL                 |

- Each pitched sample was measured, retuned to the exact note and trimmed so the note starts at
  0. A note plays the nearest sample, retuned by its playback rate, never more than two semitones
  (`tests/frevo.test.js` checks every note of the show).
- Every voice plays through the studio ([`rhythms/studio.md`](rhythms/studio.md)): a repeated
  note alternates with the neighbouring recorded note when one is within two semitones, the surdo
  and caixa alternate two takes each, the pandeiro adds one coco stroke per kind, and the band
  follows the surdo with a correlated drift. One option per instrument: the surdo seco and the
  repository caixas are no longer choices.
- Levels were set by measuring an offline render, not yet by ear.
- A phone downloads every default sample, 47 files, about 397 KB. The maracatu limit of 100 KB
  cannot hold a melodic show; the frevo limit is 400 KB (`docs/product.md`, Limits).

## Visuals

- Palette from [`colour-and-visuals.md`](research/colour-and-visuals.md): night blue ground
  `#0a1230`, the four colours of Pernambuco's flag and brass gold. Material colours on the wheel:
  the brass in golds from bright (trompete) to deep (tuba), the saxofone green, the surdo red, the
  caixa chrome, the pandeiro a lifted blue. Each reads at 3:1 or more on the wheel's face.
- The background is the frevo's own (`src/rhythms/frevo-background.js`), circular and centred on
  the wheel: sombrinhas in the flag colours circle it on two rings, confetti bursts out of the
  wheel on the surdo's open beat (once per bar), the trompetes throw gold spikes, and the sax runs
  leave green arcs (the ventania). The number of sombrinhas follows the density curve; the Abafo
  shakes them (fury); a cut freezes them (the fotografia's pose).
- Flash safety: no full-screen flash. The beat is carried by motion: the sombrinhas snap forward
  on each beat. The ring turns a whole fraction of the beat (1 turn per 16 and per 32 beats).
  Reduced motion halves the rotation and drops the jitter, confetti and spikes. No red passes
  R/(R+G+B) 0.8.
- The engine change this needed: a rhythm may give `background.create`; the maracatu keeps its
  kaleidoscope and feedback tunnel unchanged.

## Widgets per scene

Chosen by what each scene teaches, not by the maracatu set.

| Scene      | Widget                                              | Why                                   |
| :--------- | :-------------------------------------------------- | :------------------------------------ |
| Introdução | tempo, metre, bar length, voices                    | one tempo, 2/4 on 8 steps             |
| Surdo      | the two-bar cell, open and muted beats              | the accent on beat 2                  |
| Caixa      | the two-bar cell with accents and the rufo          | twelve sixteenths, then the rufo      |
| Pandeiro   | one bar, grave and platinela                        | the sixteenth ostinato                |
| Tuba       | the chord progression                               | the bass carries the harmony          |
| Metais     | a melody roll of the 16 bars, the Alto da Sé shaded | the hook repeats; where the peak sits |
| Lá e cá    | a melody roll, metais and palhetas in their colours | call and response alternate           |
| Ventania   | a melody roll of the sax runs                       | 8 of 8 sixteenths                     |
| Bambeando  | a melody roll; the anticipation step                | the push on the last eighth           |
| Fotografia | stop bars and attacks                               | the break and the pose                |
| Abafo      | a melody roll of the long notes                     | two lines one beat apart              |
| Final      | scenes, voices, bars                                | the totals                            |

The melody roll ([`src/roll.js`](../src/roll.js)) is new: pitch against time, with the score's
cursor. The wheel, lanes, scene list and centre cues (RUFO, PARADA, the tópica's name) are the
engine's.

## Open points

- Recordings to look for, as `needs a real recording`: a real Brazilian surdo (open on 2, muted
  on 1), a real pandeiro (thumb, slap and platinelas), an alto sax (the palhetas lead), and a
  trumpet section fall or shake for the Abafo.
- Levels and the default caixa are by measurement; they need the owner's ear.

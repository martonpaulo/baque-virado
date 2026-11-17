# Sound credits

All sounds are in the public domain (CC0). Some were trimmed, mixed or retuned. The maracatu sounds
come from [Freesound](https://freesound.org); the frevo sounds (`sounds/frevo-*`) from two sample
libraries.

- Alfaia, caixa, agogô (short bell), shekere: Sassaby
- Dry surdo: gilblack1234
- Cabasa: sgossner
- Caixa choices: gilblack1234 (with snares, Brazilian caixa), Sassaby (tarol rim)
- Maracatu agbê: manoel98
- Shekere: jonopodmore
- Rice ganzá: Ilson_Junior · Dry ganzá: mattyharm · Jingle shaker: CamTarn · Caxixi: REVERBERA
- Agogô bells: Sadiquecat, curesforbrokenhearts, amy2018, BlueCircleSounds
- Caixa snares: Uberproduktion · Roll: bigjoedrummer · Stick: LudwigMueller
- Whistles: juliojunior77, SpliceSound, strongbot, Rosa-Orenes256, LudwigMueller

Frevo, each note measured, retuned to its exact pitch, trimmed to start on the note, faded and
level-matched; the frevo show also uses the dry surdo and two caixas above:

- Trumpet, tenor trombone and tuba: [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE)
  by Versilian Studios (CC0)
- Tenor saxophone, rope-tension snare (tarol), bass drum (surdo), small frame drum and tambourine
  (pandeiro): [VCSL](https://github.com/sgossner/VCSL) (CC0). The caixa's rufo is built from the
  same snare's strokes.

Alfaia patterns: the table at lansdownsoftware.com. Swing measured on a Batuk Nagô workshop recording.

## Coco da Xambá

- Alfaia, caixa, ganzá, agogô and abê reuse the samples above; the second alfaia head is the
  answer sample played at a higher pitch.
- Pandeiro, palmas and atabaques are studio takes (below). The coco's own recordings, each one hit
  cut from a Freesound recording, normalised, with a 60 ms fade out:

  | File                   | Plays                                | Recording                                                     | Author          |
  | :--------------------- | :----------------------------------- | :------------------------------------------------------------ | :-------------- |
  | `pandeiro-grave-1`     | «pandeiro grave»                     | [844751](https://freesound.org/s/844751/), the hit at 38.23 s | MeanRaccoon     |
  | `pandeiro-grave-2`     | «pandeiro de couro»                  | [609770](https://freesound.org/s/609770/)                     | Ilson_Junior    |
  | `pandeiro-grave-3`     | «pandeiro seco»                      | [90078](https://freesound.org/s/90078/)                       | menegass        |
  | `pandeiro-platinela-1` | «pandeiro de platinela», the jingles | [527967](https://freesound.org/s/527967/)                     | katusm          |
  | `palmas-1`             | «uma palma»                          | [537735](https://freesound.org/s/537735/)                     | steeltowngaming |
  | `palmas-2`             | «palmas da roda»                     | [531693](https://freesound.org/s/531693/)                     | junioraragaki   |
  | `palmas-3`             | «palma abafada»                      | [154399](https://freesound.org/s/154399/)                     | semccab         |
  | `palmas-4`             | «palma com pulseira»                 | [557368](https://freesound.org/s/557368/)                     | launchsite      |
  | `atabaque-grave-7`     | the rum                              | [49991](https://freesound.org/s/49991/)                       | la.terror       |
  | `atabaque-agudo-7`     | the rumpi                            | [373411](https://freesound.org/s/373411/)                     | sgossner        |
  | `atabaque-agudo-8`     | the lé                               | [99740](https://freesound.org/s/99740/)                       | menegass        |

  The roda also claps with `palmas-5` and `palmas-6`, the rumpi with the conga takes
  `atabaque-grave-1` to `-6` and the lé with the quinto takes `atabaque-agudo-1` to `-6` (VSCO 2 CE,
  below).
- Sources: Tainá Menezes Castro, «Nação Xambá: identidade negra, tradição religiosa e estratégias
  de difusão da sua cultura», ANPPOM 2018
  (<https://anppom.org.br/anais/anaiscongresso_anppom_2018/5434/public/5434-18196-1-PB.pdf>);
  Revista Continente, «O coco ancestral do Bongar». Neither writes the parts out: the patterns
  in `src/rhythms/coco-xamba.js` are this project's reading.

The score renderer (`src/score.js`) is original to this project, written in 2026-11.

## Studio instruments

The forró, coco and bregafunk play recorded takes through the studio (`src/studio.js`,
[`docs/rhythms/studio.md`](docs/rhythms/studio.md)). `tools/prepare-takes.mjs` cut, trimmed and
normalised each take from its source and names every source file. All are CC0.

From the orchestral library VSCO 2 Community Edition (CC0, Versilian Studios and Sam Gossner):
triângulo (Triangle 3 and 6, open and muted), the zabumba's open head (concert bass drum), caixa
(Snare 2 with snares), pandeiro jingles (Tambourine 1), atabaques of the tamborzão (conga and
quinto), rabeca (solo violin, arco with vibrato and spiccato), keys (Upright Nr1 piano), lead
trumpet (sustained with vibrato and staccato) and the horns (trumpet and tenor trombone staccato).

From Freesound:

- Sanfona notes and bass buttons: Miles_Thompson
- Zabumba: Sassaby (alfaia hits), sgossner (muted bass drum), gilblack1234 (short surdo)
- Bacalhau: Sassaby, sgossner, DanVGC++, KEVOY
- Bandolim: lucasgonze, gollybob
- Cavaquinho chords: Sadiquecat (ukulele)
- Baixo: Ixwolf, mat_the_glad, SirBagel
- Pandeiro: katusm, Ilson_Junior, menegass, MeanRaccoon
- Palmas: steeltowngaming, semccab, launchsite, junioraragaki, pomeroyjoshua
- Atabaques: la.terror, sgossner, menegass
- 808 kicks and subs: menegass, voxlab, derickgtwk, Simonaudiosuite, rorymceachan, darealwollen
- Latas: RemyMarshal, lartti, lmr9, Anthousai, KJose
- Hi-hats: blakengouda
- Rooms (impulse responses): Tim_Verberne (small room), Nox_Sound (living room)

## Manguebeat

The manguebeat show (`sounds/manguebeat-*`, [`docs/rhythms/manguebeat.md`](docs/rhythms/manguebeat.md))
reuses the alfaia recordings above, two alfaia hits of the zabumba group, and the studio's caixa and
baixo groups. Its own files were trimmed to start on the stroke, faded, normalised to −1 dBFS and,
for the guitar, retuned to equal temperament after measuring each chord's spectrum. All are CC0.

- Distorted guitar power chords, from Freesound: SpeedY (E5, E5 up-strum, E5 two strings, D5 and
  C5 palm-muted; freesound.org/s/11970, 11971, 11982, 11966, 11950) and stomachache (G5 and D♯5
  held, the D♯5 retuned up to E5; freesound.org/s/49280, 49277).
- Ganzá: the small shaker of [VCSL](https://github.com/sgossner/VCSL) (CC0, Sam Gossner), faster
  strokes forward and back, two takes each.
- Echo returns: the VCSL rope-tension snare (low, snares on, loudest layer, two takes) band-passed
  from 500 Hz to 2.6 kHz; the repository's deep alfaia main and answer strokes band-passed from
  90 Hz to 700 Hz.
- Sampler: a worn record's crackle, hiss and rumble, synthesized for this project from a seeded noise
  source (original, 2026-11).

## Brega

The brega show (`sounds/brega-*`, cut by `tools/prepare-takes.mjs`: trimmed to the hit, faded and
normalised; each pitched note measured) also reuses the bumbo, caixa, chimbal, baixo, trompete
(sustained and staccato) and trombone takes above. All CC0.

- Toms (high and low, stick, two dynamics) and the keyboard (Yamaha TX81Z «FM Piano», five notes, two
  dynamics each): [VCSL](https://github.com/sgossner/VCSL) by Versilian Studios
- String pad (viola and violin sections, sustained with vibrato):
  [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE) by Versilian Studios
- Guitar (clean Stratocaster notes): guitarmaster; two sustained notes: owstu (Freesound)
- Horn falls (five-horn section, unison A and E major): flakdemier (Freesound)
- Reverb (`sounds/brega-plate`): not a recording; the impulse response of a plate reverb, generated
  for this project by `tools/make-brega-plate.mjs` (decaying noise from the site's own hash). CC0.

## Fonts

Space Grotesk (Copyright 2020 The Space Grotesk Project Authors) and JetBrains Mono (Copyright 2020
The JetBrains Mono Project Authors) are served from `fonts/` under the SIL Open Font License 1.1:
[`fonts/OFL-space-grotesk.txt`](fonts/OFL-space-grotesk.txt) and
[`fonts/OFL-jetbrains-mono.txt`](fonts/OFL-jetbrains-mono.txt). The files are the Latin subsets of the
variable fonts, as packaged by Fontsource 5.3.0.

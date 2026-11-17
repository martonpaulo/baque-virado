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
- Pandeiro and palmas are recordings listed under «Studio instruments» below.
- Sources: Tainá Menezes Castro, «Nação Xambá: identidade negra, tradição religiosa e estratégias
  de difusão da sua cultura», ANPPOM 2018
  (<https://anppom.org.br/anais/anaiscongresso_anppom_2018/5434/public/5434-18196-1-PB.pdf>);
  Revista Continente, «O coco ancestral do Bongar». Neither writes the parts out: the patterns
  in `src/rhythms/coco-xamba.js` are this project's reading.

The score renderer (`src/score.js`) is original to this project, written in 2026-11.

## Studio instruments

The forró, coco and brega funk play recorded takes through the studio (`src/studio.js`,
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

## Fonts

Space Grotesk (Copyright 2020 The Space Grotesk Project Authors) and JetBrains Mono (Copyright 2020
The JetBrains Mono Project Authors) are served from `fonts/` under the SIL Open Font License 1.1:
[`fonts/OFL-space-grotesk.txt`](fonts/OFL-space-grotesk.txt) and
[`fonts/OFL-jetbrains-mono.txt`](fonts/OFL-jetbrains-mono.txt). The files are the Latin subsets of the
variable fonts, as packaged by Fontsource 5.3.0.

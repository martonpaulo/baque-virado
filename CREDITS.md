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

The forró triângulo, sanfona, rabeca, bandolim, cavaquinho and baixo are synthesized for this
project by `tools/synth-forro.mjs`; its zabumba reuses the alfaia, surdo and stick recordings above
([`docs/rhythms/forro.md`](docs/rhythms/forro.md)).

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
- Pandeiro and palmas are synthesized by `tools/make-coco-sounds.mjs` (original to this project,
  2026-11): no CC0 recording could be fetched for them.
- Sources: Tainá Menezes Castro, «Nação Xambá: identidade negra, tradição religiosa e estratégias
  de difusão da sua cultura», ANPPOM 2018
  (<https://anppom.org.br/anais/anaiscongresso_anppom_2018/5434/public/5434-18196-1-PB.pdf>);
  Revista Continente, «O coco ancestral do Bongar». Neither writes the parts out: the patterns
  in `src/rhythms/coco-xamba.js` are this project's reading.

The score renderer (`src/score.js`) is original to this project, written in 2026-11.

The brega funk sounds are synthesized in the page by `src/rhythms/brega-funk-sounds.js`, original to
this project; its «tarol» lata choice reuses the tarol rim recording above.

## Fonts

Space Grotesk (Copyright 2020 The Space Grotesk Project Authors) and JetBrains Mono (Copyright 2020
The JetBrains Mono Project Authors) are served from `fonts/` under the SIL Open Font License 1.1:
[`fonts/OFL-space-grotesk.txt`](fonts/OFL-space-grotesk.txt) and
[`fonts/OFL-jetbrains-mono.txt`](fonts/OFL-jetbrains-mono.txt). The files are the Latin subsets of the
variable fonts, as packaged by Fontsource 5.3.0.

# Sound lab

The tools that measure a show's sound against the owner's reference recordings
([`docs/research/references.md`](../docs/research/references.md)). An agent cannot hear: this lab
is its ear. The method, what each number means and what was learned are in
[`docs/research/sound-lab.md`](../docs/research/sound-lab.md).

The lab is a research instrument, not part of the site or of `pnpm validate`. Its reference audio is
copyrighted: it stays in `lab/.data/` (ignored by Git), or in the folder `BATUQUE_LAB_DATA` names.

## Set up

```sh
python3 -m venv lab/.data/venv && source lab/.data/venv/bin/activate
pip install --index-url https://download.pytorch.org/whl/cpu torch torchaudio
pip install -r lab/requirements.txt
pip install --no-deps basic-pitch==0.4.0
python lab/fetch-references.py                 # 30-second official previews of references.json
python lab/sep.py lab/.data/refs/*/*.wav       # Demucs stems beside each file
python lab/addrefs.py                          # the reference features cache
```

The first run downloads the models (Demucs, CLAP, audiobox-aesthetics, beat_this) from their
public hosts. Everything runs on a CPU.

## Use

```sh
export NODE_PATH=$(npm root -g)                # Playwright is installed globally in a cloud session
node lab/render.mjs "$PWD" out/tutti.wav forro --from 60 --to 76        # a bar range: seconds
node lab/render.mjs "$PWD" out/solo.wav forro --from 60 --to 76 --only sanfona
node lab/render.mjs "$PWD" out/full.wav forro                           # the whole show: about 2 min
python lab/analyze.py one out/full.wav forro   # similarity, bands, stems, width, density, aesthetics
python lab/toy.py out/full.wav forro           # «a band» against «a toy keyboard»
python lab/analyze.py tag out/solo.wav "an accordion" "a harmonica" "a synthesizer" "an organ"
python lab/style.py --window 0 30 out/full.stems                        # tempo, drum grid, note facts
python lab/analyze.py refs                     # the references scored against themselves
```

| File                        | What it does                                                                          |
| :-------------------------- | :------------------------------------------------------------------------------------ |
| `render.mjs`                | Renders a show, or bars of it, or some instruments, through the real page to a WAV    |
| `sep.py`                    | Separates a WAV into drums, bass, other and vocals with Demucs; writes `inst.wav` too |
| `analyze.py`                | Scores a render against the genre's references; zero-shot tags a render with CLAP     |
| `toy.py`                    | The probe that follows the owner's complaint: a band of the genre or a toy keyboard   |
| `style.py`                  | Tempo, the drum grid per sixteenth in three bands, bass and melody note facts         |
| `addrefs.py`                | Rebuilds the reference features after `references.json` or the audio changes          |
| `fetch-references.py`       | Downloads the previews `references.json` lists                                        |
| `references.json`           | The owner's references the lab holds, each with its catalogue id                      |
| `reference-style-facts.txt` | `style.py` over every reference, as measured on 2026-11-17                            |

Add a reference: put its row in `references.json` (the key is `<genre>/<index>-<id>`), then run
`fetch-references.py`, `sep.py` on the new file and `addrefs.py`.

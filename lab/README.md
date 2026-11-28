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

## Full recordings

Round two reads the whole of each reference
([`docs/research/round-two.md`](../docs/research/round-two.md#how-to-read-four-references)). The
full recordings are on the owner's Mac only, as YouTube refuses a cloud session:

- `lab/.data/refs-full/<rhythm>/<NN>-<name> [<YouTube id>].webm`: Opus at 48 kHz, as
  `yt-dlp -f bestaudio` saved it. A number that ends in «x» is an extra version of a song and is
  not one of the rhythm's counted references.
- `lab/.data/refs-full/manifest.tsv`: one line per file with its id, length, channel and title.
- Which video stands for which reference is listed in the owner's private `batuque-references`
  (`audio/README.md`). Fetch a missing one by the id listed there, never from a search:

```sh
yt-dlp --no-playlist -f bestaudio -o "lab/.data/refs-full/<rhythm>/<NN>-<name> [%(id)s].%(ext)s" "https://www.youtube.com/watch?v=<id>"
```

`sections.py` needs only ffmpeg, NumPy, SciPy and librosa, so a Mac that will not hold the models
can still map the recordings:

```sh
python3 -m venv lab/.data/venv && lab/.data/venv/bin/pip install librosa==1.0.1 scipy==1.18.1
lab/.data/venv/bin/python lab/sections.py selftest
lab/.data/venv/bin/python lab/sections.py map "lab/.data/refs-full/forro/04-numa-sala-de-reboco [Y8I75h26EIw].webm"
lab/.data/venv/bin/python lab/sections.py rhythm forro      # each song's map, each song's mean, then the mean of the songs
lab/.data/venv/bin/python lab/sections.py pulse forro       # each song's pulse periods and the shape of its level
```

A beat tracker may lock on a dotted value or on half the beat: `reference-sections.txt` says so on
its tempo column. `pulse` settles it: the shortest strong period its onsets repeat at is the
subdivision that is played, and the felt beat is a multiple of it. It also gives the second from
which a recording holds its body level (whether a piece opens whole or thin) and its dips (stops).

## Use

`render.mjs` opens the browser the page tests use (`tests/support/browser.js`: the pinned Chrome
`node tools/install-browser.mjs` downloads, a cloud session's Chromium, or the one `CHROME_PATH`
names), so it needs nothing beyond `pnpm install`.

```sh
node lab/render.mjs out/tutti.wav forro --from 60 --to 76               # a bar range: seconds
node lab/render.mjs out/solo.wav forro --from 60 --to 76 --only sanfona
node lab/render.mjs out/full.wav forro                                  # the whole show: two to five minutes
lab/.data/venv/bin/python lab/sections.py map out/full.wav              # the show in the same facts as a reference's map
lab/.data/venv/bin/python lab/sections.py pulse out/full.wav            # and its pulse periods and level shape
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
| `sections.py`               | Maps a recording into sections with facts; weighs a rhythm's songs the same; pulse    |
| `full-spans.json`           | The spans that are music in a recording that holds several songs, or some talk        |
| `reference-sections.txt`    | `sections.py rhythm` over every counted full recording, as measured on 2026-11-28     |
| `reference-pulse.txt`       | `sections.py pulse` over every counted full recording, as measured on 2026-11-28      |
| `show-sections.txt`         | `sections.py map` and `pulse` over each show's own render, as measured on 2026-11-28  |
| `addrefs.py`                | Rebuilds the reference features after `references.json` or the audio changes          |
| `fetch-references.py`       | Downloads the previews `references.json` lists                                        |
| `references.json`           | The owner's references the lab holds, each with its catalogue id                      |
| `reference-style-facts.txt` | `style.py` over every reference, as measured on 2026-11-17                            |
| `second-ear-prompt.md`      | The prompt the owner gives an audio-capable model, as a second, descriptive ear       |

Add a reference: put its row in `references.json` (the key is `<genre>/<index>-<id>`), then run
`fetch-references.py`, `sep.py` on the new file and `addrefs.py`.

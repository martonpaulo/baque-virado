# The section map of a full recording, the facts of each section, and a rhythm's references weighed
# the same (docs/research/round-two.md, «How to read four references», steps 1 and 2).
# Needs ffmpeg, numpy, scipy and librosa only: no model is downloaded and no stem is separated.
# usage: python sections.py map <audio file> [--from S] [--to S]   one recording
#        python sections.py rhythm <rhythm>                        every counted full recording of it
#        python sections.py selftest                               the checks at the end of this file
# A full recording is <data>/refs-full/<rhythm>/<NN>-<name> [<YouTube id>].webm; a name whose number
# ends in «x» is an extra version and is not counted. full-spans.json names, for a recording that
# holds more than one song or some talk, the spans that are music: each span weighs as one song.
import glob, json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get('BATUQUE_LAB_DATA') or os.path.join(HERE, '.data')
SR, HOP, NFFT = 22050, 512, 2048
FPS = SR / HOP
MAP_HZ = 2                     # frames a second of the features the map is cut from
KERNEL_S, MIN_SECTION_S = 12, 8  # half-width of the novelty kernel; no section shorter than this
SAME_SECTION = 0.75            # two sections this alike (cosine of their scaled facts) share a letter
EMPTY_BAND = -40               # dB share under which a band is empty: its exact value is noise
GUARD_S = 1.0                  # a section's facts are read this far inside its cuts
SILENT_DB = -80                # a section under this level is silence (a video's empty tail), not music
SILENCE_S = 2                  # and a silence is this long or longer
BANDS = [(20, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000), (4000, 8000), (8000, 11025)]  # analyze.py's, to this rate's limit
CELL_BANDS = [('low', 20, 200), ('mid', 200, 2000), ('high', 2000, 11025)]
CELL_BEATS, CELL_STEPS = 4, 16  # the drum cell: four beats in sixteenths, starting where the low band is strongest
MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])  # Krumhansl and Kessler's key profiles
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
NUMERIC = ['bpm', 'rms', 'crest', 'onsets', 'percussive', 'pulse']  # the facts a mean is taken of


def load(path, start=None, end=None):
    """The recording as mono float32 at SR, decoded by ffmpeg (Opus in WebM, WAV, anything it reads)."""
    cut = (['-ss', str(start)] if start else []) + (['-to', str(end)] if end else [])
    raw = subprocess.run(['ffmpeg', '-v', 'error', *cut, '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def novelty(features):
    """Foote's novelty: a checkerboard kernel slid along the diagonal of the self-similarity matrix."""
    unit = features / (np.linalg.norm(features, axis=0, keepdims=True) + 1e-9)
    similarity = unit.T @ unit
    half = int(KERNEL_S * MAP_HZ)
    axis = np.arange(-half, half + 1)
    taper = np.exp(-0.5 * (axis / (half / 2)) ** 2)
    kernel = np.outer(taper, taper) * np.outer(np.sign(axis), np.sign(axis))
    padded = np.pad(similarity, half, mode='edge')
    return np.array([(padded[i:i + 2 * half + 1, i:i + 2 * half + 1] * kernel).sum() for i in range(similarity.shape[0])])


def boundaries(curve, seconds):
    """Section starts and ends, in seconds: the novelty peaks that stand out, none closer than MIN_SECTION_S."""
    gap = int(MIN_SECTION_S * MAP_HZ)
    floor = curve.mean() + curve.std() / 2
    peaks = [i for i in range(gap, len(curve) - gap) if curve[i] >= floor and curve[i] == curve[max(0, i - gap):i + gap + 1].max()]
    return [0.0, *[p / MAP_HZ for p in peaks], seconds]


def silence_edges(audio):
    """Where silence starts and ends, in seconds: a stretch under SILENT_DB for SILENCE_S or longer."""
    step = SR // MAP_HZ
    level = np.array([10 * np.log10(float(np.mean(audio[at:at + step] ** 2)) + 1e-20) for at in range(0, len(audio) - step + 1, step)])
    quiet = level < SILENT_DB
    edges, start = [], None
    for i, flag in enumerate([*quiet, False]):
        if flag and start is None:
            start = i
        elif not flag and start is not None:
            if (i - start) / MAP_HZ >= SILENCE_S:
                edges += [start / MAP_HZ, i / MAP_HZ]
            start = None
    seconds = len(audio) / SR
    return [edge for edge in edges if 0 < edge < seconds - 1 / MAP_HZ]


def letters(means):
    """A letter per section: a section alike an earlier one takes its letter, so the form shows (A B A C)."""
    out, firsts = [], []
    for mean in means:
        unit = mean / (np.linalg.norm(mean) + 1e-9)
        alike = [float(unit @ first) for first in firsts]
        if alike and max(alike) >= SAME_SECTION:
            out.append(chr(ord('A') + int(np.argmax(alike))))
        else:
            firsts.append(unit)
            out.append(chr(ord('A') + len(firsts) - 1))
    return out


def key_of(chroma):
    """The key whose profile the mean chroma follows best, as «A» or «Am»."""
    best = max(((np.corrcoef(np.roll(profile, shift), chroma)[0, 1], NOTES[shift] + suffix) for shift in range(12) for profile, suffix in ((MAJOR, ''), (MINOR, 'm'))))
    return best[1]


def drum_cell(flux, beats, first, last):
    """Onset strength of each band folded onto four beats in sixteenths, each band scaled to its own peak."""
    inside = [b for b in beats if first <= b < last]
    cell = np.zeros((len(CELL_BANDS), CELL_STEPS))
    if len(inside) < CELL_BEATS + 1:
        return None
    steps_per_beat = CELL_STEPS // CELL_BEATS
    for i in range(len(inside) - 1):
        for step in range(steps_per_beat):
            a = inside[i] + (inside[i + 1] - inside[i]) * step / steps_per_beat
            b = inside[i] + (inside[i + 1] - inside[i]) * (step + 1) / steps_per_beat
            cell[:, (i % CELL_BEATS) * steps_per_beat + step] += flux[:, int(a):max(int(a) + 1, int(b))].max(axis=1)
    start = int(np.argmax([cell[0, beat * steps_per_beat] for beat in range(CELL_BEATS)])) * steps_per_beat
    cell = np.roll(cell, -start, axis=1)
    return cell / (cell.max(axis=1, keepdims=True) + 1e-9)


def read(audio):
    """Everything the map needs, computed once over the recording, a minute at a time to bound the memory."""
    import librosa
    block = 60 * SR
    mel, chroma, flux, share, onset = [], [], [], [], []
    freqs = librosa.fft_frequencies(sr=SR, n_fft=NFFT)
    for at in range(0, len(audio), block):
        piece = audio[at:at + block + NFFT]
        if len(piece) < NFFT:
            break
        spectrum = np.abs(librosa.stft(piece, n_fft=NFFT, hop_length=HOP, center=False))
        frames = min(spectrum.shape[1], block // HOP)
        spectrum = spectrum[:, :frames]
        harmonic, percussive = librosa.decompose.hpss(spectrum)
        share.append((percussive ** 2).sum(axis=0) / ((harmonic ** 2).sum(axis=0) + (percussive ** 2).sum(axis=0) + 1e-12))
        mel.append(librosa.power_to_db(librosa.feature.melspectrogram(S=spectrum ** 2, sr=SR, n_mels=40) + 1e-10))
        chroma.append(librosa.feature.chroma_stft(S=spectrum ** 2, sr=SR))
        rise = np.maximum(0, np.diff(np.log1p(spectrum), axis=1, prepend=np.log1p(spectrum[:, :1])))
        flux.append(np.array([rise[(freqs >= low) & (freqs < high)].sum(axis=0) for _name, low, high in CELL_BANDS]))
        onset.append(rise.sum(axis=0))
    mel, chroma, flux = np.concatenate(mel, axis=1), np.concatenate(chroma, axis=1), np.concatenate(flux, axis=1)
    share, onset = np.concatenate(share), np.concatenate(onset)
    _tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=SR, hop_length=HOP)
    return dict(mel=mel, chroma=chroma, flux=flux, share=share, onset=onset, beats=np.asarray(beats))


def pulse_of(onset, period):
    """How strongly the onsets repeat at the beat's period: their autocorrelation there, 0 to 1."""
    if period <= 0 or len(onset) <= 2 * period:
        return 0.0
    centred = onset - onset.mean()
    return float(max(0, (centred[:-period] * centred[period:]).sum() / ((centred ** 2).sum() + 1e-12)))


def section_facts(audio, got, start, end):
    """One section's row of facts, from `start` to `end` seconds, read GUARD_S inside its cuts: a cut is
    found to about half a second, and a second of the next section would colour the facts."""
    import librosa
    from scipy.signal import welch
    cut_start, cut_end = start, end
    if end - start > 4 * GUARD_S:
        start, end = start + GUARD_S, end - GUARD_S
    first, last = int(start * FPS), max(int(start * FPS) + 1, int(end * FPS))
    piece = audio[int(start * SR):int(end * SR)]
    beats = got['beats'][(got['beats'] >= first) & (got['beats'] < last)]
    period = float(np.median(np.diff(beats))) if len(beats) > 2 else 0
    freqs, power = welch(piece, SR, nperseg=min(8192, max(256, len(piece))))
    energy = np.array([power[(freqs >= low) & (freqs < high)].sum() for low, high in BANDS])
    onsets = librosa.onset.onset_detect(onset_envelope=got['onset'][first:last], sr=SR, hop_length=HOP)
    rms = float(np.sqrt((piece ** 2).mean()) + 1e-9)
    cell = drum_cell(got['flux'], got['beats'], first, last)
    return dict(
        start=round(cut_start, 1), end=round(cut_end, 1),
        silent=bool(20 * np.log10(rms) < SILENT_DB),
        beats=int(len(beats)),
        bpm=round(60 * FPS / period, 1) if period else float('nan'),
        rms=round(20 * np.log10(rms), 1),
        crest=round(20 * np.log10(float(np.abs(piece).max()) / rms + 1e-9), 1),
        onsets=round(len(onsets) / max(1e-9, end - start), 2),
        percussive=round(float(got['share'][first:last].mean()), 3),
        pulse=round(pulse_of(got['onset'][first:last], int(round(period))), 3),
        key='-' if 20 * np.log10(rms) < SILENT_DB else key_of(got['chroma'][:, first:last].mean(axis=1)),
        bands=[round(float(v), 1) for v in 10 * np.log10(energy / (energy.sum() + 1e-20) + 1e-12)],
        cell=None if cell is None else [[round(float(v), 2) for v in band] for band in cell],
    )


def section_map(audio):
    """The recording's sections, in order, each with its letter and its facts."""
    got = read(audio)
    seconds = len(audio) / SR
    step = int(FPS / MAP_HZ)
    count = got['mel'].shape[1] // step
    if count < 4 * KERNEL_S * MAP_HZ:  # too short to cut: one section
        cuts = [0.0, seconds]
        slow = None
    else:
        stacked = np.concatenate([got['mel'], got['chroma'] * 12])
        slow = np.array([np.median(stacked[:, i * step:(i + 1) * step], axis=1) for i in range(count)]).T
        slow = np.nan_to_num((slow - slow.mean(axis=1, keepdims=True)) / (slow.std(axis=1, keepdims=True) + 1e-9))
        edges = silence_edges(audio)
        # a cut the texture gives near where silence starts or ends is that same edge, found less exactly
        cuts = sorted({*edges, *[cut for cut in boundaries(novelty(slow), seconds) if all(abs(cut - edge) > MIN_SECTION_S for edge in edges)]})
    rows = [section_facts(audio, got, a, b) for a, b in zip(cuts, cuts[1:])]
    # alike sections: the band shares and the facts that tell a texture, each scaled by its spread over the recording
    sounding = [row for row in rows if not row['silent']]
    table = np.array([[*np.maximum(row['bands'], EMPTY_BAND), row['percussive'], row['onsets'], row['pulse'], row['rms']] for row in sounding])
    scaled = (table - table.mean(axis=0)) / (table.std(axis=0) + 1e-9) if sounding else []
    for row in rows:
        row['section'] = '-'  # silence takes no letter
    for row, letter in zip(sounding, letters(list(scaled))):
        row['section'] = letter
    return rows


def song_mean(rows):
    """One song's facts: each of its sounding seconds weighs the same, so a long section counts for its
    length and silence counts for nothing."""
    rows = [row for row in rows if not row.get('silent')]
    weights = np.array([row['end'] - row['start'] for row in rows])
    out = {}
    for name in NUMERIC:
        values = np.array([row[name] for row in rows], dtype=float)
        known = ~np.isnan(values)
        out[name] = float((values[known] * weights[known]).sum() / weights[known].sum()) if known.any() else float('nan')
    out['bands'] = (np.array([row['bands'] for row in rows]) * weights[:, None]).sum(axis=0) / weights.sum()
    out['seconds'] = float(weights.sum())
    out['sections'] = len(rows)
    out['form'] = ''.join(row['section'] for row in rows)
    return out


def set_mean(songs):
    """A rhythm's facts: the mean of its songs' means, so a long song or one with more sections counts once."""
    out = {name: float(np.nanmean([song[name] for song in songs])) for name in NUMERIC}
    out['bands'] = np.mean([song['bands'] for song in songs], axis=0)
    return out


def counted(rhythm):
    """The rhythm's full recordings that count, as (name, path, [[from, to], ...] or None)."""
    spans = json.load(open(os.path.join(HERE, 'full-spans.json')))
    out = []
    for path in sorted(glob.glob(os.path.join(DATA, 'refs-full', rhythm, '*.webm'))):
        name = os.path.basename(path).rsplit(' [', 1)[0]
        if name.split('-', 1)[0].endswith('x'):
            continue
        out.append((name, path, spans.get(f'{rhythm}/{name}', {}).get('spans')))
    return out


def show(rows):
    print('  sec  start    end  beats    bpm    rms  crest  onsets/s  perc  pulse  key   low cell (16 sixteenths)')
    for row in rows:
        cell = ''.join(' .:-=+*#@'[min(8, int(v * 8.99))] for v in row['cell'][0]) if row['cell'] else '-'
        print(f"  {row['section']:>3}  {row['start']:5.0f}  {row['end']:5.0f}  {row['beats']:5d}  {row['bpm']:5.1f}  {row['rms']:5.1f}  {row['crest']:5.1f}  {row['onsets']:8.2f}  {row['percussive']:.2f}  {row['pulse']:5.2f}  {row['key']:<4}  {cell}")


def line(name, facts):
    return f"  {name:<58}  bpm {facts['bpm']:5.1f}  rms {facts['rms']:5.1f}  crest {facts['crest']:4.1f}  onsets/s {facts['onsets']:4.2f}  perc {facts['percussive']:.2f}  pulse {facts['pulse']:.2f}  bands " + ' '.join(f'{v:+5.1f}' for v in facts['bands'])


def selftest():
    # the weighing: one long song and one short song count the same; inside a song, seconds do
    long_song = song_mean([dict(start=0, end=90, section='A', bands=[0.0] * len(BANDS), **{name: 10.0 for name in NUMERIC}), dict(start=90, end=100, section='B', bands=[0.0] * len(BANDS), **{name: 20.0 for name in NUMERIC})])
    short_song = song_mean([dict(start=0, end=10, section='A', bands=[0.0] * len(BANDS), **{name: 31.0 for name in NUMERIC})])
    assert abs(long_song['bpm'] - 11.0) < 1e-9, long_song['bpm']
    assert abs(set_mean([long_song, short_song])['bpm'] - 21.0) < 1e-9
    assert long_song['form'] == 'AB'
    tail = dict(start=100, end=160, section='-', silent=True, bands=[-120.0] * len(BANDS), **{name: -180.0 for name in NUMERIC})
    with_tail = song_mean([dict(start=0, end=100, section='A', bands=[0.0] * len(BANDS), **{name: 10.0 for name in NUMERIC}), tail])
    assert with_tail['bpm'] == 10.0 and with_tail['seconds'] == 100 and with_tail['form'] == 'A', with_tail  # a silent tail counts for nothing
    # the map: 24 s of clicks at 120 a minute, 24 s of a held chord, 24 s of clicks: three sections, the first and third alike
    t = np.arange(24 * SR) / SR
    clicks = np.zeros(len(t), dtype=np.float32)
    for beat in np.arange(0, 24, 0.5):
        at = int(beat * SR)
        clicks[at:at + 400] = np.hanning(400) * np.sin(2 * np.pi * 90 * np.arange(400) / SR)
    chord = sum(np.sin(2 * np.pi * f * t) for f in (220, 277.18, 329.63)).astype(np.float32) / 6
    rows = section_map(np.concatenate([clicks, chord, clicks]))
    cuts = [row['start'] for row in rows[1:]]
    assert len(rows) == 3, [(row['start'], row['end']) for row in rows]
    assert abs(cuts[0] - 24) <= 2 and abs(cuts[1] - 48) <= 2, cuts
    assert rows[0]['section'] == rows[2]['section'] != rows[1]['section'], [row['section'] for row in rows]
    assert abs(rows[0]['bpm'] - 120) < 3 or abs(rows[0]['bpm'] - 60) < 2 or abs(rows[0]['bpm'] - 240) < 6, rows[0]['bpm']
    assert rows[0]['percussive'] > rows[1]['percussive'], (rows[0]['percussive'], rows[1]['percussive'])
    assert rows[1]['key'] in ('A', 'Am', 'F#m', 'C#m', 'E'), rows[1]['key']  # an A major triad
    rows = section_map(np.concatenate([clicks, clicks, np.zeros(30 * SR, dtype=np.float32)]))
    assert rows[-1]['silent'] and rows[-1]['section'] == '-' and not rows[0]['silent'], [(row['start'], row['silent']) for row in rows]
    assert abs(song_mean(rows)['seconds'] - 48) <= 3, song_mean(rows)['seconds']
    print('selftest: ok')


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    if mode == 'selftest':
        selftest()
    elif mode == 'map':
        options = dict(zip(sys.argv[3::2], sys.argv[4::2]))
        start, end = float(options.get('--from', 0)) or None, float(options.get('--to', 0)) or None
        print(f'# {os.path.basename(sys.argv[2])}' + (f' from {start} to {end}' if start or end else ''))
        show(section_map(load(sys.argv[2], start, end)))
    elif mode == 'rhythm':
        rhythm, songs = sys.argv[2], []
        for name, path, spans in counted(rhythm):
            for index, (start, end) in enumerate(spans or [[None, None]]):
                title = name + (f' ({index + 1})' if spans and len(spans) > 1 else '')
                rows = section_map(load(path, start, end))
                print(f'\n# {rhythm}/{title}' + (f' from {start} s to {end} s' if start or end else ''))
                show(rows)
                songs.append((title, song_mean(rows)))
        print(f'\n# {rhythm}: each song, then the mean of the songs (bands: dB share of {len(BANDS)} bands from {BANDS[0][0]} Hz)')
        for title, facts in songs:
            print(line(f"{title} [{facts['form']}]", facts))
        print(line(f'mean of {len(songs)} songs', set_mean([facts for _title, facts in songs])))
    else:
        sys.exit(__doc__ or 'usage: python sections.py map <audio> | rhythm <rhythm> | selftest')

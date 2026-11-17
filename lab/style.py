# Style facts of a separated recording: tempo, drum grid per band, bass and melody note statistics.
# usage: python style.py <stemsDir>... ; prints one block per recording and caches json next to stems.
import sys, os, json, pathlib, numpy as np, soundfile as sf, librosa, scipy.signal as ss, warnings, logging
warnings.filterwarnings('ignore'); logging.disable(logging.WARNING)
from beat_this.inference import File2Beats
from basic_pitch.inference import predict, Model
from basic_pitch import ICASSP_2022_MODEL_PATH
BP = Model(pathlib.Path(ICASSP_2022_MODEL_PATH).parent / 'nmp.onnx'); BT = File2Beats(device='cpu', dbn=False)
NOTE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]); MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
def band_env(x, lo, hi, sr=44100):
    sos = ss.butter(4, [lo, hi], 'bandpass', fs=sr, output='sos'); y = ss.sosfilt(sos, x)
    o = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256); return o
def grid(env, beats, sub=4, sr=44100, hop=256):
    # mean onset strength at each 16th of a 2-beat cell, normalised to its max
    acc = np.zeros(2 * sub); n = np.zeros(2 * sub)
    for i in range(len(beats) - 1):
        for k in range(sub):
            t = beats[i] + (beats[i + 1] - beats[i]) * k / sub; f = int(round(t * sr / hop))
            if 2 <= f < len(env) - 2: acc[(i % 2) * sub + k] += env[f - 2:f + 3].max(); n[(i % 2) * sub + k] += 1
    g = acc / np.maximum(n, 1); return g / (g.max() + 1e-9)
def facts(d, window=None):
    out = {}
    def rd(n):
        x, sr = sf.read(f'{d}/{n}.wav', dtype='float32', always_2d=True); x = x.mean(1)
        return x[int(window[0] * sr):int(window[1] * sr)] if window else x
    tmp = f'{d}/_inst_win.wav'; sf.write(tmp, rd('inst'), 44100)
    beats, down = BT(tmp); out['bpm'] = float(60 / np.median(np.diff(beats))) if len(beats) > 3 else 0
    dr = rd('drums')
    # try both phases of the 2-beat cell: pick the one whose low band is strongest on step 0
    for name, (lo, hi) in {'low': (35, 140), 'mid': (180, 2500), 'high': (6000, 15000)}.items():
        out['grid_' + name] = [round(float(v), 2) for v in grid(band_env(dr, lo, hi), beats)]
    if out['grid_low'][4] > out['grid_low'][0]:
        for k in ['low', 'mid', 'high']: g = out['grid_' + k]; out['grid_' + k] = g[4:] + g[:4]
    # swing of the off sixteenths: timing of high-band onsets relative to the 16th grid
    for stem in ['bass', 'other']:
        tmp = f'{d}/_{stem}_win.wav'; sf.write(tmp, rd(stem), 44100)
        _, _, notes = predict(tmp, BP, onset_threshold=0.5, frame_threshold=0.3, minimum_note_length=60)
        if len(notes) < 4: out[stem] = None; continue
        on = np.array([n[0] for n in notes]); off = np.array([n[1] for n in notes]); p = np.array([n[2] for n in notes]); dur = len(rd(stem)) / 44100
        order = np.argsort(on); iv = np.abs(np.diff(p[order]))
        beat_len = 60 / out['bpm'] if out['bpm'] else 0.5
        out[stem] = dict(notes_per_beat=round(len(notes) / dur * beat_len, 2), dur_beats_median=round(float(np.median(off - on)) / beat_len, 2),
                         pitch_p10=int(np.percentile(p, 10)), pitch_med=int(np.median(p)), pitch_p90=int(np.percentile(p, 90)),
                         step_share=round(float((iv <= 2).mean()), 2), leap_share=round(float((iv >= 5).mean()), 2), repeat_share=round(float((iv == 0).mean()), 2))
        if stem == 'other':
            ch = np.zeros(12)
            for a, b, q in zip(on, off, p): ch[q % 12] += b - a
            best = max(((np.corrcoef(np.roll(prof, k), ch)[0, 1], NOTE[k] + m) for k in range(12) for prof, m in ((MAJ, ''), (MIN, 'm'))))
            out['key'] = best[1]; out['chroma'] = ' '.join(f'{NOTE[i]}:{v:.2f}' for i, v in enumerate(ch / ch.sum()) if v / ch.sum() > 0.06)
            # polyphony: mean simultaneous notes while any sounds
            t = np.arange(0, dur, 0.05); poly = np.array([((on <= s) & (off > s)).sum() for s in t]); out['polyphony'] = round(float(poly[poly > 0].mean()), 2) if (poly > 0).any() else 0
    return out
if __name__ == '__main__':
    args = sys.argv[1:]; window = None
    if args[0] == '--window': window = (float(args[1]), float(args[2])); args = args[3:]
    for d in args:
        c = f'{d}/style.json'
        f = json.load(open(c)) if os.path.exists(c) and not window else facts(d, window)
        if not window: json.dump(f, open(c, 'w'))
        print('\n#', d, f"bpm={f['bpm']:.1f}", 'key=' + str(f.get('key')), 'poly=' + str(f.get('polyphony')))
        for k in ['low', 'mid', 'high']: print(f'   drums {k:4s}', ' '.join(f'{v:.2f}' for v in f['grid_' + k]))
        print('   bass ', f['bass']); print('   other', f['other']); print('   chroma', f.get('chroma'))

# Compare a render to the genre's reference recordings (lab/README.md).
# usage: python analyze.py refs | one <wav> <genre> | tag <wav> <label>... | <renderDir> [ids...]
import sys, os, glob, json, numpy as np, soundfile as sf, torch, librosa, pyloudnorm, warnings
warnings.filterwarnings('ignore')
from transformers import ClapModel, ClapProcessor
# Reference audio, stems and caches live outside Git: lab/.data, or the folder BATUQUE_LAB_DATA names.
S = os.environ.get('BATUQUE_LAB_DATA') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '.data')
OWNER = set(json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'references.json'))))  # the owner's references only
GENRES = ['maracatu', 'coco', 'frevo', 'forro', 'manguebeat', 'brega', 'bregafunk']
BANDS = [(20, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000), (4000, 8000), (8000, 16000)]
torch.set_num_threads(4)
clap = ClapModel.from_pretrained('laion/clap-htsat-unfused').eval(); proc = ClapProcessor.from_pretrained('laion/clap-htsat-unfused')
PROBES = {
 'real_vs_midi': ('a professional studio recording of a live band with real instruments', 'a cheap MIDI file played with General MIDI sounds'),
 'rich_vs_thin': ('a full, warm, punchy, well mixed music production', 'a thin, weak, amateur, poorly mixed demo'),
}
def load(p):
    x, sr = sf.read(p, dtype='float32', always_2d=True); assert sr == 44100; return x
def windows(x, n, sec=10, hop=5):
    L = sec * 44100
    if len(x) <= L: return [x]
    cands = [(float(np.sqrt((x[i:i + L] ** 2).mean())), i) for i in range(0, len(x) - L, hop * 44100)]
    return [x[i:i + L] for _, i in sorted(cands, reverse=True)[:n]]
def embed(ws):
    a = [librosa.resample(w.mean(1), orig_sr=44100, target_sr=48000) for w in ws]
    with torch.no_grad():
        e = clap.get_audio_features(**proc(audio=a, sampling_rate=48000, return_tensors='pt'))
    e = e.pooler_output if hasattr(e, 'pooler_output') else e
    return torch.nn.functional.normalize(e, dim=-1).numpy()
def text(ts):
    with torch.no_grad(): e = clap.get_text_features(**proc(text=ts, return_tensors='pt', padding=True))
    e = e.pooler_output if hasattr(e, 'pooler_output') else e
    return torch.nn.functional.normalize(e, dim=-1).numpy()
def bands(ws):
    out = []
    for w in ws:
        f, P = __import__('scipy.signal', fromlist=['welch']).welch(w.mean(1), 44100, nperseg=8192)
        e = np.array([P[(f >= a) & (f < b)].sum() for a, b in BANDS]); out.append(10 * np.log10(e / e.sum() + 1e-12))
    return np.mean(out, 0)
def misc(ws):
    m = pyloudnorm.Meter(44100); r = []
    for w in ws:
        mid, side = (w[:, 0] + w[:, 1]) / 2, (w[:, 0] - w[:, 1]) / 2
        on = librosa.onset.onset_strength(y=w.mean(1), sr=44100)
        r.append([m.integrated_loudness(w), 20 * np.log10(np.abs(w).max() / (np.sqrt((w ** 2).mean()) + 1e-9)),
                  10 * np.log10((side ** 2).mean() / ((mid ** 2).mean() + 1e-12) + 1e-12),
                  float(librosa.feature.spectral_flatness(y=w.mean(1)).mean()), float(len(librosa.onset.onset_detect(onset_envelope=on, sr=44100)) / 10)])
    return np.mean(r, 0)
def stems(d, pick):
    e = {}
    for s in ['drums', 'bass', 'other']:
        x = load(f'{d}/{s}.wav'); e[s] = float((x ** 2).mean())
    t = sum(e.values()); return np.array([10 * np.log10(e[s] / t + 1e-12) for s in ['drums', 'bass', 'other']])
def aes(ws):
    try:
        global AES
        if 'AES' not in globals():
            from audiobox_aesthetics.infer import initialize_predictor; AES = initialize_predictor()
        o = AES.forward([{'path': torch.from_numpy(w.T.copy()), 'sample_rate': 44100} for w in ws])
        return np.mean([[d['PQ'], d['CE'], d['CU'], d['PC']] for d in o], 0)
    except Exception as ex:
        return np.array([np.nan] * 4)
def features(path, n, stemdir=None, want_aes=True):
    x = load(path); ws = windows(x, n)
    return dict(emb=embed(ws), bands=bands(ws), misc=misc(ws), stems=stems(stemdir, None) if stemdir and os.path.exists(stemdir + '/drums.wav') else np.full(3, np.nan), aes=aes(ws) if want_aes else np.full(4, np.nan))
cache = S + '/refs/features-owner.npy'
if os.path.exists(cache): REF = np.load(cache, allow_pickle=True).item()
else:
    REF = {}
    for g in GENRES:
        REF[g] = []
        for p in sorted(glob.glob(f'{S}/refs/{g}/*.wav')):
            key = f'{g}/' + os.path.basename(p)[:-4]
            if key not in OWNER: continue
            d = p[:-4] + '.stems'; f = features(d + '/inst.wav', 3, d); f['key'] = key; REF[g].append(f); print('ref', key, flush=True)
    np.save(cache, REF)
CENT = {g: (lambda c: c / np.linalg.norm(c))(np.concatenate([f['emb'] for f in REF[g]]).mean(0)) for g in GENRES}
T = {k: text(list(v)) for k, v in PROBES.items()}
def probe(emb):
    out = []
    for k in PROBES:
        s = emb @ T[k].T * 50; pr = np.exp(s[:, 0]) / np.exp(s).sum(1); out.append(pr.mean())
    return out
def report(name, g, f, ref=None):
    sims = {h: float((f['emb'] @ CENT[h]).mean()) for h in GENRES}
    near = max(sims, key=sims.get)
    pr = probe(f['emb'])
    print(f"\n## {name}  [{g}]  CLAP sim own={sims[g]:.3f} nearest={near}({sims[near]:.3f})  real-vs-midi={pr[0]:.2f} rich-vs-thin={pr[1]:.2f}")
    print(f"   aesthetics PQ={f['aes'][0]:.2f} CE={f['aes'][1]:.2f} CU={f['aes'][2]:.2f} PC={f['aes'][3]:.2f}")
    rb = np.mean([r['bands'] for r in REF[g]], 0); rm = np.mean([r['misc'] for r in REF[g]], 0); rs = np.nanmean([r['stems'] for r in REF[g]], 0)
    print('   band dB vs ref: ' + '  '.join(f"{a}-{b}:{d:+.1f}" for (a, b), d in zip(BANDS, f['bands'] - rb)))
    print(f"   LUFS {f['misc'][0]:.1f} (ref {rm[0]:.1f})  crest {f['misc'][1]:.1f} (ref {rm[1]:.1f})  side/mid {f['misc'][2]:.1f} dB (ref {rm[2]:.1f})  flat {f['misc'][3]:.4f} (ref {rm[3]:.4f})  onsets/s {f['misc'][4]:.1f} (ref {rm[4]:.1f})")
    print(f"   stems dB drums/bass/other {np.round(f['stems'], 1)} (ref {np.round(rs, 1)})")
    return dict(sim=sims[g], near=near, midi=pr[0], rich=pr[1], aes=f['aes'].tolist(), bands=(f['bands'] - rb).tolist())
if __name__ == '__main__':
    d = sys.argv[1]; ids = sys.argv[2:] or GENRES
    if d == 'refs':
        for g in GENRES:
            pr = np.mean([probe(r['emb']) for r in REF[g]], 0); a = np.nanmean([r['aes'] for r in REF[g]], 0)
            own = np.mean([(r['emb'] @ CENT[g]).mean() for r in REF[g]])
            print(f"{g:11s} refs: sim-own={own:.3f} real-vs-midi={pr[0]:.2f} rich-vs-thin={pr[1]:.2f} PQ={a[0]:.2f} CE={a[1]:.2f} CU={a[2]:.2f} PC={a[3]:.2f}")
        sys.exit()
    if d == 'one':   # one <wav> <genre>: separate if needed, then report
        wav, g = sys.argv[2], sys.argv[3]; st = wav[:-4] + '.stems'
        if not os.path.exists(st + '/inst.wav'): os.system(f'{sys.executable} {os.path.dirname(os.path.abspath(__file__))}/sep.py {wav} > /dev/null 2>&1')
        x = load(wav); n = max(1, min(4, int(len(x) / 44100 / 10)))
        report(wav, g, features(wav, n, st)); sys.exit()
    if d == 'tag':   # tag <wav> label... : zero-shot CLAP over the labels (softmax), over the wav's loudest windows
        wav, labels = sys.argv[2], sys.argv[3:]; x = load(wav); e = embed(windows(x, 3)); t = text(labels)
        s_ = (e @ t.T * 30); pr = (np.exp(s_) / np.exp(s_).sum(1, keepdims=True)).mean(0)
        for l, v, c in sorted(zip(labels, pr, (e @ t.T).mean(0)), key=lambda z: -z[1]): print(f'   {v:.2f}  cos={c:.3f}  {l}')
        sys.exit()
    out = {}
    for g in ids:
        p = f'{d}/{g}.wav'
        if not os.path.exists(p): continue
        out[g] = report(os.path.basename(d) + '/' + g, g, features(p, 4, p[:-4] + '.stems'))
    json.dump(out, default=float, fp=open(f'{d}/scores.json', 'w'), indent=1)

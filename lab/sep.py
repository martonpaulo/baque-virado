# Separate wavs with htdemucs; write <stem>.wav files + instrumental (no vocals) next to a cache dir.
import sys, os, torch, soundfile as sf, numpy as np
from demucs.pretrained import get_model
from demucs.apply import apply_model
model = get_model('htdemucs'); model.eval()
torch.set_num_threads(4)
def separate(path, out):
    if os.path.exists(f'{out}/inst.wav'): return
    os.makedirs(out, exist_ok=True)
    x, sr = sf.read(path, dtype='float32', always_2d=True); assert sr == 44100
    w = torch.from_numpy(x.T.copy())[None]
    with torch.no_grad(): s = apply_model(model, w, split=True, overlap=0.1, progress=False)[0]
    for name, stem in zip(model.sources, s): sf.write(f'{out}/{name}.wav', stem.T.numpy(), sr)
    inst = sum(stem for name, stem in zip(model.sources, s) if name != 'vocals')
    sf.write(f'{out}/inst.wav', inst.T.numpy(), sr)
for p in sys.argv[1:]:
    out = os.path.splitext(p)[0] + '.stems'
    separate(p, out); print('sep', p, flush=True)

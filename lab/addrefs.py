# Rebuild the owner-only reference features, reusing every cached entry; new files get CLAP + bands only.
import numpy as np, glob, os, analyze as A
old = {f['key']: f for g in A.GENRES for src in ('features-owner.npy',) if os.path.exists(f'{A.S}/refs/features-owner.npy') for f in np.load(f'{A.S}/refs/{src}', allow_pickle=True).item()[g]}
REF = {}
for g in A.GENRES:
    REF[g] = []
    for p in sorted(glob.glob(f'{A.S}/refs/{g}/*.wav')):
        key = f'{g}/' + os.path.basename(p)[:-4]
        if key not in A.OWNER: continue
        d = p[:-4] + '.stems'
        if key in old: f = old[key]
        elif os.path.exists(d + '/inst.wav'): f = A.features(d + '/inst.wav', 2, d, want_aes=False); f['key'] = key
        else: print('NOT SEPARATED', key); continue
        REF[g].append(f)
    print(g, [f['key'] for f in REF[g]], flush=True)
np.save(f'{A.S}/refs/features-owner.tmp.npy', REF); os.replace(f'{A.S}/refs/features-owner.tmp.npy', f'{A.S}/refs/features-owner.npy')

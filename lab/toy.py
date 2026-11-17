# "Toy" calibration: for each genre, probability of the genre label vs toy/MIDI labels, refs vs a render.
import sys, numpy as np, analyze as A
L = {'forro': 'a forró band with accordion, zabumba and triangle', 'frevo': 'a frevo brass orchestra at carnival', 'manguebeat': 'a rock band with heavy drums, bass and distorted guitar',
     'brega': 'a romantic brega pop band with keyboards, guitar and drums', 'bregafunk': 'a brega funk dance beat with heavy bass', 'coco': 'a coco percussion group with hand drums and clapping', 'maracatu': 'a maracatu drum ensemble'}
TOY = ['a toy keyboard demo song', 'a General MIDI file played on a cheap synthesizer', 'video game chiptune music']
def toy(emb, g):
    t = A.text([L[g]] + TOY); s = emb @ t.T * 30; pr = np.exp(s) / np.exp(s).sum(1, keepdims=True); return float(pr[:, 0].mean())
if __name__ == '__main__':
    if len(sys.argv) == 1:
        for g in A.GENRES: print(f"{g:11s} refs band-vs-toy = {np.mean([toy(r['emb'], g) for r in A.REF[g]]):.2f}")
    else:
        wav, g = sys.argv[1], sys.argv[2]; x = A.load(wav); print(f"{wav} band-vs-toy = {toy(A.embed(A.windows(x, 4)), g):.2f}")

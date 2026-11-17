#!/usr/bin/env node
// Write sounds/brega-plate.wav: the impulse response of the brega band's reverb, a bright digital
// plate as a stage rack unit makes it. An impulse response of this kind is decaying noise, so it is
// generated, not recorded: a short gap, then dense noise whose top end dies faster than its middle,
// its lows cut. The «noise» is the site's integer hash, so the file is the same on every run.
// Usage: node tools/make-brega-plate.mjs   (needs ffmpeg), then node tools/encode-sounds.mjs brega-plate
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash } from '../src/util.js';
import { RATE, writeWav } from './audio-file.mjs';

const OUTPUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sounds', 'brega-plate.wav');
const TAU = 2 * Math.PI;
const PLATE = {
  seconds: 1.9,
  gap: 0.018,
  decay: 0.3, // seconds per e-fold: about two seconds to −60 dB
  bright: { from: 12000, to: 3500, over: 0.6 }, // the low-pass closes as the tail decays
  lowCut: 260,
  build: 0.006,
  peak: 0.9,
};
const PLATE_SEED = 4409;
const onePole = hz => 1 - Math.exp((-TAU * hz) / RATE);

const out = new Float32Array(Math.floor(PLATE.seconds * RATE)),
  gap = Math.floor(PLATE.gap * RATE),
  lowCut = onePole(PLATE.lowCut);
let low = 0,
  lows = 0,
  peak = 0;
for (let i = gap; i < out.length; i++) {
  const t = (i - gap) / RATE,
    noise = hash(PLATE_SEED + i) * 2 - 1;
  const hz = PLATE.bright.to + (PLATE.bright.from - PLATE.bright.to) * Math.exp(-t / PLATE.bright.over);
  low += onePole(hz) * (noise - low);
  lows += lowCut * (low - lows);
  out[i] = (low - lows) * (1 - Math.exp(-t / PLATE.build)) * Math.exp(-t / PLATE.decay);
  peak = Math.max(peak, Math.abs(out[i]));
}
for (let i = 0; i < out.length; i++) out[i] *= PLATE.peak / peak;
writeWav(OUTPUT, out);
console.log(`make-brega-plate: ${out.length} samples written to ${OUTPUT}`);

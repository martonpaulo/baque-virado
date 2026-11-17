#!/usr/bin/env node
// Synthesize the coco's pandeiro and palmas: no CC0 recording of them could be fetched, so they are
// made here, deterministically (a seeded noise source), as 44.1 kHz mono 16-bit WAV masters.
// Usage: node tools/make-coco-sounds.mjs && node tools/encode-sounds.mjs, then keep only the new
// .m4a files: another ffmpeg build can re-encode an unchanged WAV to different bytes.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOUNDS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sounds');
const RATE = 44100;
const PEAK = 0.89; // −1 dBFS, the level the other masters peak near

/** A seeded uniform noise source in [−1, 1] (mulberry32), so every run writes the same bytes. */
function noise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/** A biquad band-pass filter (RBJ cookbook, constant 0 dB peak gain). */
function bandPass(frequency, q) {
  const w = (2 * Math.PI * frequency) / RATE,
    alpha = Math.sin(w) / (2 * q),
    a0 = 1 + alpha;
  const b0 = alpha / a0,
    b2 = -alpha / a0,
    a1 = (-2 * Math.cos(w)) / a0,
    a2 = (1 - alpha) / a0;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  return x => {
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

const decay = (t, seconds) => Math.exp(-t / seconds);

/** The pandeiro's jingles (platinelas): metallic band-passed noise with a few rattles. */
function jingles(t, random, filters) {
  const rattle = 1 + 0.6 * Math.sin(2 * Math.PI * 38 * t) * decay(t, 0.04);
  const metal = filters.reduce((sum, filter) => sum + filter(random()), 0);
  return metal * rattle * decay(t, 0.045);
}

const SOUND_MAKERS = {
  // the open low stroke of the thumb: the skin's pitch drops as it rings, the jingles answer
  'pandeiro-grave': {
    seconds: 0.32,
    seed: 11,
    voice: (t, random, filters) => {
      const pitch = 118 + 60 * decay(t, 0.025);
      const skin = Math.sin(2 * Math.PI * pitch * t + 0.8 * Math.sin(2 * Math.PI * 230 * t) * decay(t, 0.01)) * decay(t, 0.11);
      return skin + 0.45 * jingles(t, random, filters);
    },
  },
  // the fingertips: the jingles alone, short
  'pandeiro-platinela': { seconds: 0.14, seed: 23, voice: (t, random, filters) => jingles(t, random, filters) },
  // a clap: three quick reflections of the hands, then a short room tail
  palmas: {
    seconds: 0.18,
    seed: 37,
    voice: (t, random, filters) => {
      const burst = [0, 0.009, 0.018].reduce((sum, start, i) => (t >= start ? sum + (1 - i * 0.25) * decay(t - start, 0.004) : sum), 0);
      return filters[0](random()) * (burst + 0.35 * decay(t, 0.05));
    },
  },
};
const FILTERS = {
  'pandeiro-grave': [bandPass(6200, 6), bandPass(8800, 7), bandPass(11200, 8)],
  'pandeiro-platinela': [bandPass(6400, 6), bandPass(9100, 7), bandPass(11600, 8)],
  palmas: [bandPass(1250, 1.2)],
};

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (const [i, sample] of samples.entries()) data.writeInt16LE(Math.round(sample * 32767), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

for (const [name, { seconds, seed, voice }] of Object.entries(SOUND_MAKERS)) {
  const random = noise(seed),
    filters = FILTERS[name],
    length = Math.round(seconds * RATE);
  const raw = Array.from({ length }, (_, i) => voice(i / RATE, random, filters));
  const fadeOut = Math.round(0.01 * RATE); // no click at the cut
  const peak = Math.max(...raw.map(Math.abs));
  const samples = raw.map((sample, i) => (sample / peak) * PEAK * Math.min(1, (length - i) / fadeOut));
  writeFileSync(path.join(SOUNDS, `${name}.wav`), wav(samples));
}
console.log(`make-coco-sounds: ${Object.keys(SOUND_MAKERS).length} files written`);

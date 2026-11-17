#!/usr/bin/env node
// Synthesize the forró instruments that have no free recording in sounds/ (triângulo, sanfona,
// rabeca, bandolim, cavaquinho, baixo) as WAV masters: 44.1 kHz, 16-bit, mono. The output is fixed:
// every random value comes from a seeded generator, so a rerun writes the same bytes.
// Usage: node tools/synth-forro.mjs, then node tools/encode-sounds.mjs <the names it prints>.
// A melodic sample is one note at its BASE pitch; the page retunes it with the playback rate.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash } from '../src/util.js';

const SOUNDS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sounds');
const RATE = 44100;
const PEAK = 0.89; // every sample is normalised to this peak; the rhythm package sets the gains
const PCM_MAX = 32767;
// A canonical 44-byte PCM WAV header: field offsets in bytes.
const WAV = {
  headerBytes: 44,
  fmtBytes: 16,
  pcm: 1,
  channels: 1,
  bits: 16,
  bytesPerSample: 2,
  at: { riffSize: 4, wave: 8, fmtSize: 16, format: 20, channels: 22, rate: 24, byteRate: 28, blockAlign: 32, bits: 34, data: 36, dataSize: 40 },
};
const TAU = Math.PI * 2;
const CENTS_PER_OCTAVE = 1200;
const SEMITONES = 12;
const A4 = { midi: 69, hertz: 440 };
const SEED = 20261117;
const FADE_OUT_SECONDS = 0.012; // the last moment of every file fades to silence, so no click

// ---------- shared tools ----------
const hertzOf = midi => A4.hertz * 2 ** ((midi - A4.midi) / SEMITONES);
const cents = c => 2 ** (c / CENTS_PER_OCTAVE);
const samplesOf = seconds => Math.round(seconds * RATE);

// The repository's seeded hash (src/util.js) is the one random source: the same sequence on every run.
let draws = SEED;
const NOISE = () => hash(draws++);
const noise = () => NOISE() * 2 - 1;

const BIQUAD = { q: Math.SQRT1_2, dbPerAmplitude: 40 };
/** An RBJ biquad over a buffer, in place: 'lowpass', 'highpass', 'bandpass' or 'peak' (gain in dB). */
function biquad(buffer, type, frequency, q = BIQUAD.q, gainDb = 0) {
  const w = (TAU * frequency) / RATE,
    alpha = Math.sin(w) / (2 * q),
    cos = Math.cos(w),
    a = 10 ** (gainDb / BIQUAD.dbPerAmplitude);
  const k = {
    lowpass: [(1 - cos) / 2, 1 - cos, (1 - cos) / 2, 1 + alpha, -2 * cos, 1 - alpha],
    highpass: [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha],
    bandpass: [alpha, 0, -alpha, 1 + alpha, -2 * cos, 1 - alpha],
    peak: [1 + alpha * a, -2 * cos, 1 - alpha * a, 1 + alpha / a, -2 * cos, 1 - alpha / a],
  }[type];
  const [b0, b1, b2, , a1, a2] = k.map(value => value / k[3]);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < buffer.length; i++) {
    const x = buffer[i],
      y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    buffer[i] = y;
  }
  return buffer;
}

/** Attack, then hold, then release, as a gain per sample (linear attack, exponential-looking release). */
function envelope(length, attack, release) {
  const out = new Float32Array(length),
    a = samplesOf(attack),
    r = samplesOf(release);
  for (let i = 0; i < length; i++) {
    const rise = i < a ? i / a : 1,
      fall = i > length - r ? ((length - i) / r) ** 2 : 1;
    out[i] = rise * fall;
  }
  return out;
}

/** Band-limited additive tone: `amplitude(n, hertz)` per harmonic, `pitch(i)` a frequency factor per sample. */
function additive(length, hertz, amplitude, pitch = () => 1, ceiling = RATE / 2 - RATE / 10) {
  const out = new Float32Array(length);
  const harmonics = [];
  for (let n = 1; n * hertz < ceiling; n++) harmonics.push([n, amplitude(n, n * hertz)]);
  const phase = new Float64Array(harmonics.length);
  for (let i = 0; i < length; i++) {
    const f = hertz * pitch(i);
    let sum = 0;
    harmonics.forEach(([n, amp], h) => {
      phase[h] += (TAU * n * f) / RATE;
      sum += amp * Math.sin(phase[h]);
    });
    out[i] = sum;
  }
  return out;
}

/** A plucked string (Karplus–Strong with a fractional delay and a loop low-pass). */
function pluck(length, hertz, { loss, brightness, pickPosition }) {
  const out = new Float32Array(length),
    // the loop low-pass delays the wave by (1 − brightness) / brightness samples: take it off the line
    period = RATE / hertz - (1 - brightness) / brightness,
    size = Math.ceil(period) + 2,
    line = new Float32Array(size);
  // the excitation: noise shaped by the pick position (a comb), so the string is not all harmonics
  const comb = Math.max(1, Math.round(period * pickPosition));
  for (let i = 0; i < size; i++) line[i] = noise();
  for (let i = size - 1; i >= comb; i--) line[i] -= line[i - comb];
  let write = 0,
    last = 0;
  const frac = period - Math.floor(period);
  for (let i = 0; i < length; i++) {
    const readA = (write - Math.floor(period) + size) % size,
      readB = (readA - 1 + size) % size;
    const delayed = line[readA] * (1 - frac) + line[readB] * frac;
    const filtered = brightness * delayed + (1 - brightness) * last;
    last = filtered;
    line[write] = filtered * loss;
    write = (write + 1) % size;
    out[i] = delayed;
  }
  return out;
}

const mixInto = (target, source, gain = 1, offset = 0) => {
  for (let i = 0; i < source.length && i + offset < target.length; i++) target[i + offset] += source[i] * gain;
  return target;
};

function writeWav(name, buffer) {
  const fade = samplesOf(FADE_OUT_SECONDS);
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (!Number.isFinite(buffer[i])) throw new Error(`${name}: not a number at sample ${i}`);
    if (i > buffer.length - fade) buffer[i] *= (buffer.length - i) / fade;
    peak = Math.max(peak, Math.abs(buffer[i]));
  }
  const scale = PEAK / peak,
    data = Buffer.alloc(WAV.headerBytes + buffer.length * WAV.bytesPerSample);
  data.write('RIFF', 0);
  data.writeUInt32LE(data.length - WAV.at.riffSize, WAV.at.riffSize);
  data.write('WAVEfmt ', WAV.at.wave);
  data.writeUInt32LE(WAV.fmtBytes, WAV.at.fmtSize);
  data.writeUInt16LE(WAV.pcm, WAV.at.format);
  data.writeUInt16LE(WAV.channels, WAV.at.channels);
  data.writeUInt32LE(RATE, WAV.at.rate);
  data.writeUInt32LE(RATE * WAV.bytesPerSample, WAV.at.byteRate);
  data.writeUInt16LE(WAV.bytesPerSample, WAV.at.blockAlign);
  data.writeUInt16LE(WAV.bits, WAV.at.bits);
  data.write('data', WAV.at.data);
  data.writeUInt32LE(buffer.length * WAV.bytesPerSample, WAV.at.dataSize);
  for (let i = 0; i < buffer.length; i++) data.writeInt16LE(Math.round(buffer[i] * scale * PCM_MAX), WAV.headerBytes + i * WAV.bytesPerSample);
  writeFileSync(path.join(SOUNDS, `${name}.wav`), data);
  return name;
}

// ---------- triângulo ----------
// A bent steel rod: inharmonic modes of a free bar (ratios near (2n+1)²/9), each split in two by the
// bends, so neighbouring partials beat. Open rings; closed is the same strike damped by the hand.
const TRIANGLE = {
  fundamental: 760,
  modes: [1, 2.76, 5.41, 8.94, 13.35, 18.6],
  split: 0.006, // the second partial of each split mode, as a frequency ratio above the first
  ringSeconds: { open: 1.3, closed: 0.05 },
  lengthSeconds: { open: 1.5, closed: 0.22 },
  modeDecay: 0.75, // each higher mode rings this fraction as long as the one below
  modeLevel: 0.82, // and this much quieter
  tick: { seconds: 0.004, highpass: 4200, level: 0.5 },
  air: { highpass: 7000, level: 0.04 },
};
function triangle(kind) {
  const length = samplesOf(TRIANGLE.lengthSeconds[kind]),
    out = new Float32Array(length);
  TRIANGLE.modes.forEach((ratio, m) => {
    for (const [detune, level] of [
      [1, 1],
      [1 + TRIANGLE.split * (m + 1), TRIANGLE.modeLevel],
    ]) {
      const hertz = TRIANGLE.fundamental * ratio * detune,
        tau = TRIANGLE.ringSeconds[kind] * TRIANGLE.modeDecay ** m,
        amp = level * TRIANGLE.modeLevel ** m,
        phase = NOISE() * TAU;
      for (let i = 0; i < length; i++) out[i] += amp * Math.exp(-i / RATE / tau) * Math.sin(phase + (TAU * hertz * i) / RATE);
    }
  });
  const tick = new Float32Array(length);
  for (let i = 0; i < samplesOf(TRIANGLE.tick.seconds); i++) tick[i] = noise();
  mixInto(out, biquad(tick, 'highpass', TRIANGLE.tick.highpass), TRIANGLE.tick.level);
  return out;
}

// ---------- sanfona (accordion) ----------
// Free reeds: a bright spectrum with a formant near 1.5 kHz, two reeds a few cents apart (the beating
// of a slightly open tremolo) and a quieter reed an octave below. The bellows give a soft attack and a
// small swell; a little air noise sits under it.
const SANFONA = {
  baseMidi: 74, // D5: the melody's middle
  noteSeconds: { short: 0.32, long: 0.72 },
  release: 0.05,
  attack: 0.022,
  rolloff: 0.85, // harmonic n has amplitude 1 / n^rolloff
  formants: [
    [1500, 700, 1.6],
    [3000, 900, 0.6],
  ], // [centre Hz, width Hz, boost]
  reeds: [
    [0, 1, 1],
    [9, 1, 0.8],
    [0, 0.5, 0.35],
  ], // [cents, octave factor, level]
  swell: 0.15, // the bellows swell over a note
  air: { centre: 2500, q: 0.7, level: 0.015 },
  ceiling: 9000,
  bass: { midi: 43, seconds: 0.26, reeds: [0, -12], formant: 700 }, // a left-hand bass button, G2 with its octave
  chord: { seconds: 0.2, level: 0.8 }, // a left-hand chord button
};
function reedTone(hertz, seconds, formants = SANFONA.formants) {
  const length = samplesOf(seconds + SANFONA.release),
    out = new Float32Array(length);
  const amplitude = (n, f) =>
    (1 / n ** SANFONA.rolloff) * (1 + formants.reduce((sum, [centre, width, boost]) => sum + boost * Math.exp(-(((f - centre) / width) ** 2)), 0));
  for (const [cent, octave, level] of SANFONA.reeds)
    mixInto(
      out,
      additive(length, hertz * octave * cents(cent), amplitude, () => 1, SANFONA.ceiling),
      level,
    );
  const env = envelope(length, SANFONA.attack, SANFONA.release);
  const air = new Float32Array(length);
  for (let i = 0; i < length; i++) air[i] = noise();
  biquad(air, 'bandpass', SANFONA.air.centre, SANFONA.air.q);
  for (let i = 0; i < length; i++) out[i] = (out[i] * (1 + (SANFONA.swell * i) / length) + air[i] * SANFONA.air.level * PEAK) * env[i];
  return out;
}
const sanfonaNote = kind => reedTone(hertzOf(SANFONA.baseMidi), SANFONA.noteSeconds[kind]);
function sanfonaBass() {
  const { midi, seconds, reeds, formant } = SANFONA.bass,
    out = new Float32Array(samplesOf(seconds + SANFONA.release));
  for (const shift of reeds) mixInto(out, reedTone(hertzOf(midi + shift), seconds, [[formant, formant, 1]]));
  return out;
}
const sanfonaChord = notes =>
  notes.reduce(
    (out, midi) => mixInto(out, reedTone(hertzOf(midi), SANFONA.chord.seconds), SANFONA.chord.level),
    new Float32Array(samplesOf(SANFONA.chord.seconds + SANFONA.release)),
  );

// ---------- rabeca ----------
// A bowed fiddle: a band-limited sawtooth (the Helmholtz motion of a bowed string), a short slide up
// into the note, delayed vibrato, bow noise and a nasal body (resonances near 280 Hz and 2.8 kHz).
const RABECA = {
  baseMidi: 74,
  noteSeconds: { short: 0.3, long: 0.74 },
  attack: 0.035,
  release: 0.08,
  scoop: { cents: -30, seconds: 0.05 },
  vibrato: { rate: 5.6, cents: 14, delay: 0.14, rise: 0.2 },
  bowJitter: { level: 0.06, smooth: 0.995, gain: 12 }, // gain undoes the smoothing's loss of level
  bowNoise: { highpass: 2000, level: 0.025 },
  body: [
    ['peak', 280, 1.2, 6],
    ['peak', 520, 1.5, 3],
    ['peak', 1100, 2, 2],
    ['peak', 2800, 1.4, 7],
    ['lowpass', 6500, 0.7, 0],
  ],
};
function rabeca(kind) {
  const seconds = RABECA.noteSeconds[kind],
    length = samplesOf(seconds + RABECA.release),
    { scoop, vibrato } = RABECA;
  const pitch = i => {
    const t = i / RATE,
      slide = t < scoop.seconds ? scoop.cents * (1 - t / scoop.seconds) : 0,
      depth = vibrato.cents * Math.min(1, Math.max(0, (t - vibrato.delay) / vibrato.rise));
    return cents(slide + depth * Math.sin(TAU * vibrato.rate * t));
  };
  const out = additive(length, hertzOf(RABECA.baseMidi), n => 1 / n, pitch);
  // the bow's pressure is never perfectly steady
  let jitter = 0;
  const bow = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    jitter = RABECA.bowJitter.smooth * jitter + (1 - RABECA.bowJitter.smooth) * noise();
    out[i] *= 1 + RABECA.bowJitter.level * RABECA.bowJitter.gain * jitter;
    bow[i] = noise();
  }
  mixInto(out, biquad(bow, 'highpass', RABECA.bowNoise.highpass), RABECA.bowNoise.level);
  for (const [type, frequency, q, gain] of RABECA.body) biquad(out, type, frequency, q, gain);
  const env = envelope(length, RABECA.attack, RABECA.release);
  for (let i = 0; i < length; i++) out[i] *= env[i];
  return out;
}

// ---------- bandolim and cavaquinho ----------
// Plucked steel strings. The bandolim has double courses (two strings a few cents apart); its long
// note is a tremolo, the pick going down and up about 13 times a second. The cavaquinho plays a
// strummed chord cut short by the hand (the dry chop of the forró cavaquinho).
const BANDOLIM = {
  baseMidi: 72, // C5
  courseCents: 3,
  string: { loss: 0.9965, brightness: 0.62, pickPosition: 0.18 },
  noteSeconds: { short: 0.5, long: 0.8 },
  tremoloSeconds: 0.075,
  tremoloLevels: [1, 0.72],
  body: [
    ['peak', 420, 1.2, 5],
    ['peak', 2600, 1.5, 3],
    ['highpass', 140, 0.7, 0],
  ],
  release: 0.06,
};
function bandolimPluck(length) {
  const out = new Float32Array(length);
  for (const sign of [-1, 1]) mixInto(out, pluck(length, hertzOf(BANDOLIM.baseMidi) * cents(sign * BANDOLIM.courseCents), BANDOLIM.string), 1 / 2);
  return out;
}
function bandolim(kind) {
  const length = samplesOf(BANDOLIM.noteSeconds[kind]);
  let out;
  if (kind === 'short') out = bandolimPluck(length);
  else {
    out = new Float32Array(length);
    const step = samplesOf(BANDOLIM.tremoloSeconds);
    for (let k = 0, offset = 0; offset < length; k++, offset += step) {
      // each new pick stops the string it lands on, so a pluck lasts one tremolo step
      const strike = bandolimPluck(step),
        level = BANDOLIM.tremoloLevels[k % BANDOLIM.tremoloLevels.length];
      mixInto(out, strike, level, offset);
    }
  }
  for (const [type, frequency, q, gain] of BANDOLIM.body) biquad(out, type, frequency, q, gain);
  const env = envelope(length, 0, BANDOLIM.release);
  for (let i = 0; i < length; i++) out[i] *= env[i];
  return out;
}

const CAVAQUINHO = {
  seconds: 0.2,
  chopAt: 0.085, // the hand stops the strings here
  chopSeconds: 0.03,
  strumSeconds: 0.007, // between strings, from the lowest
  string: { loss: 0.995, brightness: 0.7, pickPosition: 0.12 },
  body: [
    ['peak', 520, 1.2, 5],
    ['peak', 3000, 1.5, 4],
    ['highpass', 200, 0.7, 0],
  ],
  scratch: { highpass: 3000, seconds: 0.012, level: 0.25 },
};
function cavaquinho(notes) {
  const length = samplesOf(CAVAQUINHO.seconds),
    out = new Float32Array(length);
  notes.forEach((midi, k) => {
    mixInto(out, pluck(length, hertzOf(midi), CAVAQUINHO.string), 1 / notes.length, samplesOf(k * CAVAQUINHO.strumSeconds));
  });
  const scratch = new Float32Array(length);
  for (let i = 0; i < samplesOf(CAVAQUINHO.scratch.seconds); i++) scratch[i] = noise();
  mixInto(out, biquad(scratch, 'highpass', CAVAQUINHO.scratch.highpass), CAVAQUINHO.scratch.level);
  for (const [type, frequency, q, gain] of CAVAQUINHO.body) biquad(out, type, frequency, q, gain);
  const chop = samplesOf(CAVAQUINHO.chopAt),
    span = samplesOf(CAVAQUINHO.chopSeconds);
  for (let i = chop; i < length; i++) out[i] *= Math.exp(-(i - chop) / span);
  return out;
}

// ---------- baixo ----------
// A plucked bass: a dark string (a strong loop low-pass) over a sine at the fundamental, which
// keeps the low end round on small speakers' upper harmonics.
const BAIXO = {
  baseMidi: 43, // G2
  seconds: 0.62,
  string: { loss: 0.998, brightness: 0.35, pickPosition: 0.2 },
  sine: { level: 0.6, decay: 0.4 },
  lowpass: 1800,
  release: 0.08,
};
function baixo() {
  const length = samplesOf(BAIXO.seconds),
    hertz = hertzOf(BAIXO.baseMidi);
  const out = pluck(length, hertz, BAIXO.string);
  for (let i = 0; i < length; i++) out[i] += BAIXO.sine.level * Math.exp(-i / RATE / BAIXO.sine.decay) * Math.sin((TAU * hertz * i) / RATE);
  biquad(out, 'lowpass', BAIXO.lowpass);
  const env = envelope(length, 0, BAIXO.release);
  for (let i = 0; i < length; i++) out[i] *= env[i];
  return out;
}

// ---------- the files ----------
// The chords of the show: I, ♭VII and IV of G mixolydian (src/rhythms/forro.js names them).
const CHORDS = {
  sanfona: { G: [55, 59, 62], F: [53, 57, 60], C: [52, 55, 60] }, // the left hand's chord buttons
  cavaquinho: { G: [62, 67, 71, 74], F: [60, 65, 69, 72], C: [60, 64, 67, 72] }, // D–G–B–D tuning, in first position
};
const FILES = {
  'triangulo-aberto': () => triangle('open'),
  'triangulo-fechado': () => triangle('closed'),
  'sanfona-curta': () => sanfonaNote('short'),
  'sanfona-longa': () => sanfonaNote('long'),
  'sanfona-baixo': sanfonaBass,
  ...Object.fromEntries(Object.entries(CHORDS.sanfona).map(([name, notes]) => [`sanfona-acorde-${name.toLowerCase()}`, () => sanfonaChord(notes)])),
  'rabeca-curta': () => rabeca('short'),
  'rabeca-longa': () => rabeca('long'),
  'bandolim-curta': () => bandolim('short'),
  'bandolim-longa': () => bandolim('long'),
  ...Object.fromEntries(Object.entries(CHORDS.cavaquinho).map(([name, notes]) => [`cavaquinho-${name.toLowerCase()}`, () => cavaquinho(notes)])),
  baixo,
};

const names = Object.entries(FILES).map(([name, make]) => writeWav(name, make()));
console.log(names.join(' '));

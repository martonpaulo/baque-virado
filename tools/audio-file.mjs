// Shared helpers for the sound tools: decode any audio file to mono 44.1 kHz samples with ffmpeg,
// write a 16-bit mono WAV, find the hits in a recording and estimate a note's pitch.
import { spawnSync } from 'node:child_process';

export const RATE = 44100;
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const MAX_BUFFER = 1 << 28;
const RAW_INPUT = ['-f', 'f32le', '-ar', String(RATE), '-ac', '1']; // mono float samples on stdin
const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT;

/** Mono float samples of `file` at 44.1 kHz. */
export function decode(file) {
  const result = spawnSync(FFMPEG, ['-nostdin', '-loglevel', 'error', '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', '-'], {
    maxBuffer: MAX_BUFFER,
  });
  if (result.status !== 0) throw new Error(`ffmpeg could not decode ${file}: ${result.stderr}`);
  const bytes = result.stdout;
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / FLOAT_BYTES).slice();
}

/** Write `samples` as a 16-bit mono WAV, by ffmpeg. */
export function writeWav(file, samples) {
  const bytes = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  const result = spawnSync(
    FFMPEG,
    ['-nostdin', '-loglevel', 'error', '-y', ...RAW_INPUT, '-i', '-', '-c:a', 'pcm_s16le', '-map_metadata', '-1', '-fflags', '+bitexact', file],
    {
      input: bytes,
      maxBuffer: MAX_BUFFER,
    },
  );
  if (result.status !== 0) throw new Error(`ffmpeg could not write ${file}: ${result.stderr}`);
}

const FRAME = 512;
// Onsets: a frame at least `ratio` times the energy of the 4 before it, above a floor, 80 ms apart.
const ONSET = { ratio: 4, floorDb: -40, gapSeconds: 0.08, lookBack: 4, tiny: 1e-12, startFraction: 0.1, preRoll: 32 };
// Pitch: YIN over 4096 samples, 80 ms after the attack, between 40 and 1500 Hz, threshold 0.15.
const YIN = { size: 4096, skipSeconds: 0.08, min: 40, max: 1500, threshold: 0.15 };
const A4 = { midi: 69, hz: 440 };
const SEMITONES = 12;
const MIDI_OCTAVE_OFFSET = 1; // MIDI 60 is C4
/** Start times (samples) of the hits in `samples`: frames whose energy jumps well above the frames before. */
export function onsets(samples, { ratio = ONSET.ratio, floorDb = ONSET.floorDb, gapSeconds = ONSET.gapSeconds } = {}) {
  const energies = [];
  for (let i = 0; i + FRAME <= samples.length; i += FRAME) {
    let sum = 0;
    for (let j = i; j < i + FRAME; j++) sum += samples[j] * samples[j];
    energies.push(sum / FRAME);
  }
  const peak = Math.max(...energies),
    floor = peak * 10 ** (floorDb / 10),
    found = [];
  const gapFrames = Math.ceil((gapSeconds * RATE) / FRAME);
  if (energies[0] > floor) found.push(0); // a recording that starts on its hit
  for (let f = 1; f < energies.length; f++) {
    const before = Math.max(ONSET.tiny, ...energies.slice(Math.max(0, f - ONSET.lookBack), f));
    if (energies[f] > floor && energies[f] > ratio * before && (!found.length || f - found.at(-1) >= gapFrames)) found.push(f);
  }
  // step back to where the sound starts inside the frame before the jump
  return found.map(f => {
    const from = Math.max(0, (f - 1) * FRAME),
      to = (f + 1) * FRAME;
    let max = 0;
    for (let i = from; i < to; i++) max = Math.max(max, Math.abs(samples[i]));
    for (let i = from; i < to; i++) if (Math.abs(samples[i]) > max * ONSET.startFraction) return Math.max(0, i - ONSET.preRoll);
    return from;
  });
}

/** The fundamental (Hz) of a held note from `start`, by the YIN difference function, or 0. */
export function pitchOf(samples, start = 0, { min = YIN.min, max = YIN.max } = {}) {
  const size = YIN.size,
    from = start + Math.floor(YIN.skipSeconds * RATE);
  if (from + size * 2 > samples.length) return 0;
  const minLag = Math.floor(RATE / max),
    maxLag = Math.ceil(RATE / min);
  const diff = new Float64Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < size; i++) {
      const d = samples[from + i] - samples[from + i + lag];
      sum += d * d;
    }
    diff[lag] = sum;
  }
  let running = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    running += diff[lag];
    diff[lag] = (diff[lag] * lag) / (running || 1);
  }
  for (let lag = minLag; lag < maxLag; lag++)
    if (diff[lag] < YIN.threshold && diff[lag] <= diff[lag + 1]) {
      const a = diff[lag - 1],
        b = diff[lag],
        c = diff[lag + 1];
      return RATE / (lag + (a - c) / (2 * (a - 2 * b + c) || 1));
    }
  return 0;
}

const NOTE_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** MIDI number (with cents as a fraction) of a frequency. */
export const midiOfHz = hz => A4.midi + SEMITONES * Math.log2(hz / A4.hz);
export const nameOfMidi = midi =>
  `${NAMES[((Math.round(midi) % SEMITONES) + SEMITONES) % SEMITONES]}${Math.floor(Math.round(midi) / SEMITONES) - MIDI_OCTAVE_OFFSET}`;
/** MIDI number of a label such as 'C3' or 'F#4'. */
export const midiOfLabel = label => SEMITONES * (Number(label.slice(-1)) + MIDI_OCTAVE_OFFSET) + NOTE_PITCH[label[0]] + (label[1] === '#' ? 1 : 0);
export { SEMITONES };

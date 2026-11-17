// The bregafunk's drum machine and synthesizers, rendered in the page (`sounds.synth`): the bumbo, the
// «lata», the palma, the 808 «grave», the keyboard stab and the riser. The genre is made in a DAW, so
// these ARE its instruments; the flute, the horns, the hats and the atabaques stay recorded takes.
// Every sound is a pure function of its parameters and a seeded noise: no clock, no Math.random.
// Each instrument has several variants, so the studio's round robin never repeats one hit unchanged.
// Design notes and what the reference recordings showed: docs/rhythms/bregafunk.md, Sounds.
const TAU = 2 * Math.PI;
const SEMITONES = 12;
const A4 = { midi: 69, hz: 440 };
const hzOf = midi => A4.hz * 2 ** ((midi - A4.midi) / SEMITONES);
const FADE_SECONDS = 0.008; // every sound ends on a short fade, never on a step
const LCG = { multiplier: 1664525, increment: 1013904223, range: 2 ** 31 }; // Numerical Recipes' generator

/** A seeded white noise source: values in [−1, 1). */
function noiseOf(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, LCG.multiplier) + LCG.increment) >>> 0;
    return state / LCG.range - 1;
  };
}
/** The coefficient of a one-pole low-pass at `hz`. */
const poleOf = (hz, rate) => 1 - Math.exp((-TAU * hz) / rate);
const softClip = (x, drive) => Math.tanh(drive * x) / Math.tanh(drive);

/** `seconds` of sound from `sampleAt(time, index)`, peak-normalised to `peak`, with a fade at the end. */
function render(rate, seconds, peak, sampleAt) {
  const out = new Float32Array(Math.round(seconds * rate)),
    fade = Math.round(FADE_SECONDS * rate);
  let max = 0;
  for (let i = 0; i < out.length; i++) {
    out[i] = sampleAt(i / rate, i);
    max = Math.max(max, Math.abs(out[i]));
  }
  for (let i = 0; i < out.length; i++) out[i] *= (peak / (max || 1)) * Math.min(1, (out.length - 1 - i) / fade);
  return out;
}

// ---------- bumbo: a hard kick, a sine that drops from `from` to `to` Hz, a click, soft-clipped ----------
// `sweep`: time constant of the pitch drop; `hold` then `decay`: the body's envelope; `click`: level of
// the noise tick at the attack; `drive`: clipping, which adds the odd harmonics a phone can play.
const KICKS = [
  { from: 230, to: 55, sweep: 0.03, hold: 0.07, decay: 0.12, click: 1.3, drive: 2.2, seed: 11 },
  { from: 215, to: 54, sweep: 0.033, hold: 0.075, decay: 0.125, click: 1.2, drive: 2, seed: 12 },
  { from: 245, to: 56, sweep: 0.028, hold: 0.065, decay: 0.115, click: 1.4, drive: 2.4, seed: 13 },
];
const KICK = { seconds: 0.6, clickDecay: 0.009, peak: 0.95 };
function kick(spec, rate) {
  const noise = noiseOf(spec.seed);
  let phase = 0,
    last = 0;
  return render(rate, KICK.seconds, KICK.peak, time => {
    phase += (TAU * (spec.to + (spec.from - spec.to) * Math.exp(-time / spec.sweep))) / rate;
    const envelope = time < spec.hold ? 1 : Math.exp(-(time - spec.hold) / spec.decay),
      white = noise(),
      tick = (white - last / 2) * spec.click * Math.exp(-time / KICK.clickDecay); // half-differenced: a bright tick
    last = white;
    return softClip(Math.sin(phase), spec.drive) * envelope + tick;
  });
}

// ---------- lata: the metallic snare, inharmonic partials over a noise burst ----------
// `base`: the lowest partial in Hz; `ratios`: the partials, as on a struck can (not a harmonic series);
// `ring`: how long the lowest partial rings, the others shorter in proportion; `noise`: the burst's level.
const LATAS = [
  { base: 432, ratios: [1, 1.47, 2.09, 2.83, 3.71, 5.2], ring: 0.055, noise: 0.42, seed: 21 },
  { base: 455, ratios: [1, 1.52, 2.17, 2.76, 3.9, 5.05], ring: 0.05, noise: 0.46, seed: 22 },
  { base: 418, ratios: [1, 1.44, 2.02, 2.91, 3.63, 5.4], ring: 0.06, noise: 0.4, seed: 23 },
  { base: 470, ratios: [1, 1.5, 2.13, 2.7, 3.82, 4.9], ring: 0.048, noise: 0.5, seed: 24 },
];
// `drop`: the partials start this much sharp and fall in `dropSeconds` (the «tok» of the stick);
// the burst is noise between `noiseFloorHz` and `noiseCeilingHz`, decaying over `noiseDecay`.
const LATA = {
  seconds: 0.3,
  peak: 0.9,
  drop: 0.45,
  dropSeconds: 0.012,
  noiseFloorHz: 1200,
  noiseCeilingHz: 6500,
  noiseDecay: 0.045,
  drive: 1.8,
  partialFall: 0.82,
};
function lata(spec, rate) {
  const noise = noiseOf(spec.seed),
    phases = spec.ratios.map(() => 0),
    pole = poleOf(LATA.noiseFloorHz, rate),
    ceiling = poleOf(LATA.noiseCeilingHz, rate);
  let low = 0,
    band = 0,
    smooth = 0;
  return render(rate, LATA.seconds, LATA.peak, time => {
    const bend = 1 + LATA.drop * Math.exp(-time / LATA.dropSeconds);
    let ringing = 0;
    for (let k = 0; k < phases.length; k++) {
      phases[k] += (TAU * spec.base * spec.ratios[k] * bend) / rate;
      ringing += Math.sin(phases[k]) * LATA.partialFall ** k * Math.exp(-time / (spec.ring * LATA.partialFall ** k));
    }
    const white = noise();
    band += ceiling * (white - band); // two poles under the ceiling
    smooth += ceiling * (band - smooth);
    low += pole * (smooth - low);
    return softClip(ringing / phases.length + (smooth - low) * spec.noise * Math.exp(-time / LATA.noiseDecay), LATA.drive);
  });
}

// ---------- palma: an electronic clap, three quick bursts of band-passed noise and a tail ----------
const CLAPS = [
  { bursts: [0, 0.009, 0.019], lowHz: 900, highHz: 4200, tail: 0.075, seed: 31 },
  { bursts: [0, 0.011, 0.021], lowHz: 820, highHz: 3800, tail: 0.085, seed: 32 },
  { bursts: [0, 0.008, 0.017], lowHz: 980, highHz: 4600, tail: 0.07, seed: 33 },
];
const CLAP = { seconds: 0.32, peak: 0.9, burstDecay: 0.005, tailLevel: 0.55, drive: 2 };
function clap(spec, rate) {
  const noise = noiseOf(spec.seed),
    lowPole = poleOf(spec.lowHz, rate),
    highPole = poleOf(spec.highHz, rate),
    lastBurst = spec.bursts.at(-1);
  let low = 0,
    high = 0,
    first = 0;
  return render(rate, CLAP.seconds, CLAP.peak, time => {
    const white = noise();
    first += highPole * (white - first);
    high += highPole * (first - high); // below highHz, two poles
    low += lowPole * (high - low); // and what of that is below lowHz
    let envelope = time >= lastBurst ? CLAP.tailLevel * Math.exp(-(time - lastBurst) / spec.tail) : 0;
    for (const start of spec.bursts) if (time >= start) envelope = Math.max(envelope, Math.exp(-(time - start) / CLAP.burstDecay));
    return softClip((high - low) * envelope, CLAP.drive);
  });
}

// ---------- grave: the 808 bass, a sine with its octave, driven so its harmonics sit at 80 to 300 Hz ----------
// `octave`: level of the second harmonic beside the fundamental (the references' bass is strongest
// there); `drive`: the saturation; `blip`: how sharp the attack starts, falling in `blipSeconds`.
const BASSES = [
  { octave: 0.7, third: 0.3, drive: 1.3, blip: 1.2 },
  { octave: 0.8, third: 0.25, drive: 1.2, blip: 1 },
];
const BASS = { seconds: 1.3, peak: 0.9, blipSeconds: 0.018, attack: 0.004, decay: 1.1, third: 3 };
export const BASS_ROOTS = [31, 33, 34, 38, 40, 41, 45]; // G1 to A2: every root the bass line plays, and its octave slide
function bass(spec, midi, rate) {
  const hz = hzOf(midi);
  let phase = 0;
  return render(rate, BASS.seconds, BASS.peak, time => {
    phase += (TAU * hz * (1 + spec.blip * Math.exp(-time / BASS.blipSeconds))) / rate;
    const body = Math.sin(phase) + spec.octave * Math.sin(2 * phase) + spec.third * Math.sin(BASS.third * phase);
    return softClip((body / (1 + spec.octave + spec.third)) * Math.min(1, time / BASS.attack) * Math.exp(-time / BASS.decay), spec.drive);
  });
}

// ---------- teclado: the off-beat stab, three detuned sawtooths through a filter that closes fast ----------
const STABS = [
  { cents: [-9, 0, 8], open: 7000, closed: 1100, close: 0.07, decay: 0.16, seed: 41 },
  { cents: [-7, 0, 11], open: 6200, closed: 950, close: 0.08, decay: 0.17, seed: 42 },
];
const STAB = { seconds: 0.5, peak: 0.85, attack: 0.002, cents: 1200, sub: 0.15, drive: 1.6 };
export const STAB_ROOTS = [64, 67, 69, 70, 71, 74, 76, 77, 79, 81, 82]; // E4 to A#5: every chord tone the stab plays
/** One band-limited sawtooth sample at `phase` (0 to 1) advancing `step` per sample (polyBLEP). */
function saw(phase, step) {
  let value = 2 * phase - 1;
  if (phase < step) value += (phase / step - 1) ** 2;
  else if (phase > 1 - step) value -= ((phase - 1) / step + 1) ** 2;
  return value;
}
function stab(spec, midi, rate) {
  const steps = spec.cents.map(cents => (hzOf(midi) * 2 ** (cents / STAB.cents)) / rate),
    phases = spec.cents.map((_cents, i) => noiseOf(spec.seed + midi + i)() / 2 + 1 / 2); // free-running oscillators
  let sub = 0,
    first = 0,
    second = 0;
  return render(rate, STAB.seconds, STAB.peak, time => {
    let saws = 0;
    for (let k = 0; k < phases.length; k++) {
      phases[k] = (phases[k] + steps[k]) % 1;
      saws += saw(phases[k], steps[k]);
    }
    sub += (TAU * hzOf(midi)) / 2 / rate; // a sine an octave below, for the body
    const pole = poleOf(spec.closed + (spec.open - spec.closed) * Math.exp(-time / spec.close), rate);
    first += pole * (saws / phases.length + STAB.sub * Math.sin(sub) - first);
    second += pole * (first - second);
    return softClip(second * Math.min(1, time / STAB.attack) * Math.exp(-time / spec.decay), STAB.drive);
  });
}

// ---------- subida: the riser before the drop, noise through a band that climbs ----------
const RISER = { fromHz: 350, toHz: 7000, resonance: 0.35, peak: 0.7, seed: 51, curve: 2 };
function riser(seconds, rate) {
  const noise = noiseOf(RISER.seed);
  let low = 0,
    band = 0;
  return render(rate, seconds, RISER.peak, time => {
    const along = time / seconds,
      f = 2 * Math.sin((Math.PI * RISER.fromHz * (RISER.toHz / RISER.fromHz) ** along) / rate); // a state-variable filter
    low += f * band;
    band += f * (noise() - low - RISER.resonance * band);
    return band * along ** RISER.curve;
  });
}

const named = (prefix, specs, make) => Object.fromEntries(specs.map((spec, i) => [`${prefix}-${i + 1}`, rate => make(spec, rate)]));
const pitched = (prefix, specs, roots, make) =>
  Object.fromEntries(roots.flatMap(midi => specs.map((spec, i) => [`${prefix}-${midi}-${i + 1}`, rate => make(spec, midi, rate)])));
const RISER_NAME = 'bf-subida';

/** The synthesized sounds of the show, name → render(sampleRate); `riserSeconds`: the riser's length. */
export const synthOf = riserSeconds => ({
  ...named('bf-bumbo', KICKS, kick),
  ...named('bf-lata', LATAS, lata),
  ...named('bf-palma', CLAPS, clap),
  ...pitched('bf-grave', BASSES, BASS_ROOTS, bass),
  ...pitched('bf-stab', STABS, STAB_ROOTS, stab),
  [RISER_NAME]: rate => riser(riserSeconds, rate),
});

const unpitchedTakes = (prefix, specs) => specs.map((_spec, i) => ({ file: `${prefix}-${i + 1}` }));
const pitchedTakes = (prefix, specs, roots) => roots.flatMap(root => specs.map((_spec, i) => ({ file: `${prefix}-${root}-${i + 1}`, root })));
/** The studio takes of each synthesized instrument (src/studio.js): one per variant, and per root when pitched. */
export const SYNTH_TAKES = {
  bumbo: unpitchedTakes('bf-bumbo', KICKS),
  lata: unpitchedTakes('bf-lata', LATAS),
  palma: unpitchedTakes('bf-palma', CLAPS),
  grave: pitchedTakes('bf-grave', BASSES, BASS_ROOTS),
  stab: pitchedTakes('bf-stab', STABS, STAB_ROOTS),
  riser: [{ file: RISER_NAME }],
};

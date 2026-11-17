// The sounds of brega funk, synthesized in the page. A Recife producer programs the beat in a DAW
// with drum-machine kicks, a sub-bass «grave», a metallic «lata» and MIDI keys, horns and leads, so
// most of these voices are synthetic in the music itself. Each render returns one mono hit as a
// Float32Array at the context's sample rate; the noise is seeded, so every render is identical.

const TAU = Math.PI * 2;
const SEMITONES = 12;
const CENTS_PER_OCTAVE = 1200;
const A4 = { midi: 69, hz: 440 };
const NOTE_STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_NAME = /^([A-G])(b|#)?(-?\d)$/;
const ACCIDENTAL = { b: -1, '#': 1 };
const OCTAVE_OFFSET = 1; // MIDI octave −1 is note 0
// one noise seed per instrument, so no two share a noise
const SEEDS = { kick: 0x2f6b1d, lata: 0x2f6b1e, hat: 0x2f6b1f, atabaque: 0x2f6b20 };
const RANDOM = { increment: 0x6d2b79f5, shiftA: 15, shiftB: 7, shiftC: 14, orA: 1, orB: 61, range: 4294967296 };

/** The frequency of a note name such as `A1`, `Bb4` or `C#6`. */
export function noteFrequency(name) {
  const [, letter, accidental, octave] = NOTE_NAME.exec(name);
  const midi = (Number(octave) + OCTAVE_OFFSET) * SEMITONES + NOTE_STEPS[letter] + (ACCIDENTAL[accidental] || 0);
  return A4.hz * 2 ** ((midi - A4.midi) / SEMITONES);
}

const cents = amount => 2 ** (amount / CENTS_PER_OCTAVE);

/** A seeded uniform noise source in −1..1 (mulberry32), the same for every render. */
function noiseSource(seed) {
  let state = seed;
  return () => {
    state = (state + RANDOM.increment) | 0;
    let t = Math.imul(state ^ (state >>> RANDOM.shiftA), state | RANDOM.orA);
    t ^= t + Math.imul(t ^ (t >>> RANDOM.shiftB), t | RANDOM.orB);
    return (((t ^ (t >>> RANDOM.shiftC)) >>> 0) / RANDOM.range) * 2 - 1;
  };
}

/** A state-variable filter (topology-preserving transform) whose cutoff may change every sample. */
function filter(sampleRate) {
  let state1 = 0,
    state2 = 0;
  return (input, cutoff, q) => {
    const g = Math.tan((Math.PI * Math.min(cutoff, sampleRate * FILTER_LIMIT)) / sampleRate),
      k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)),
      a2 = g * a1,
      a3 = g * a2;
    const v3 = input - state2,
      band = a1 * state1 + a2 * v3,
      low = state2 + a2 * state1 + a3 * v3;
    state1 = 2 * band - state1;
    state2 = 2 * low - state2;
    return { low, band: band * k, high: input - k * band - low };
  };
}
const FILTER_LIMIT = 0.45; // of the sample rate: the cutoff never reaches Nyquist

/** A band-limited sawtooth (polyBLEP), phase in cycles. */
function saw(phase, increment) {
  const p = phase % 1;
  let value = 2 * p - 1;
  if (p < increment) {
    const t = p / increment;
    value -= t + t - t * t - 1;
  } else if (p > 1 - increment) {
    const t = (p - 1) / increment;
    value -= t * t + t + t + 1;
  }
  return value;
}

const softClip = (value, drive) => Math.tanh(drive * value) / Math.tanh(drive);
const decay = (t, constant) => Math.exp(-t / constant);
const rise = (t, constant) => 1 - Math.exp(-t / constant);

/** A buffer of `seconds`, filled by `sample(t, i)`, then levelled to `peak`. */
function render(sampleRate, seconds, sample, peak = HIT_PEAK) {
  const out = new Float32Array(Math.ceil(seconds * sampleRate));
  for (let i = 0; i < out.length; i++) out[i] = sample(i / sampleRate, i);
  let max = 0;
  for (const value of out) max = Math.max(max, Math.abs(value));
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] *= peak / max;
  // a short fade-out, so the last sample never clicks
  const fade = Math.min(out.length, Math.round(sampleRate * TAIL_FADE));
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return out;
}
const HIT_PEAK = 0.9;
const TAIL_FADE = 0.004; // seconds

// ---------- the bumbo: a drum-machine kick ----------
const KICK = {
  seconds: 0.62,
  low: 46, // Hz, where the body settles
  high: 165, // Hz, the attack
  sweep: 0.032, // s, pitch fall
  attack: 0.0015,
  body: 0.34, // s, amplitude decay
  click: 0.004, // s, the beater click
  clickLevel: 0.28,
  clickCutoff: 3200,
  drive: 1.8,
};
export function kick(sampleRate) {
  const noise = noiseSource(SEEDS.kick),
    clickFilter = filter(sampleRate);
  let phase = 0;
  return render(sampleRate, KICK.seconds, t => {
    phase += (KICK.low + (KICK.high - KICK.low) * decay(t, KICK.sweep)) / sampleRate;
    const body = Math.sin(TAU * phase) * rise(t, KICK.attack) * decay(t, KICK.body);
    const click = clickFilter(noise(), KICK.clickCutoff, 1).high * decay(t, KICK.click) * KICK.clickLevel;
    return softClip(body + click, KICK.drive);
  });
}

// ---------- the lata: a struck tin can, the metallic snare of brega funk ----------
// Inharmonic plate modes of a thin can (Hz, decay in s, level), a bright noise crack and a short body.
const LATA_MODES = [
  [612, 0.11, 0.5],
  [1047, 0.09, 0.8],
  [1693, 0.075, 0.7],
  [2381, 0.06, 0.55],
  [3302, 0.045, 0.45],
  [4519, 0.032, 0.35],
  [6087, 0.022, 0.25],
];
const LATA = {
  seconds: 0.34,
  attack: 0.0008,
  crack: 0.018, // s, the click at the hit
  crackLevel: 1.1,
  crackCentre: 3800,
  crackQ: 0.8,
  rattle: 0.09, // s, the loose seam buzzing
  rattleLevel: 0.22,
  rattleCutoff: 5200,
  body: 196, // Hz
  bodyDecay: 0.028,
  bodyLevel: 0.35,
  detune: 0.012, // the modes bend down this fraction as the can rings out
  bendTime: 0.05,
  drive: 1.4,
};
export function lata(sampleRate) {
  const noise = noiseSource(SEEDS.lata),
    crackFilter = filter(sampleRate),
    rattleFilter = filter(sampleRate);
  const phases = LATA_MODES.map(() => 0);
  return render(sampleRate, LATA.seconds, t => {
    const bend = 1 + LATA.detune * decay(t, LATA.bendTime);
    let ring = 0;
    LATA_MODES.forEach(([hz, time, level], i) => {
      phases[i] += (hz * bend) / sampleRate;
      ring += Math.sin(TAU * phases[i]) * level * decay(t, time);
    });
    const n = noise();
    const crack = crackFilter(n, LATA.crackCentre, LATA.crackQ).band * decay(t, LATA.crack) * LATA.crackLevel;
    const rattle = rattleFilter(n, LATA.rattleCutoff, 1).high * decay(t, LATA.rattle) * LATA.rattleLevel;
    const body = Math.sin(TAU * LATA.body * t) * decay(t, LATA.bodyDecay) * LATA.bodyLevel;
    return softClip((ring + crack + rattle + body) * rise(t, LATA.attack), LATA.drive);
  });
}

// ---------- the chimbal: drum-machine hi-hats, closed, open and a 32nd-note double ----------
const HAT_PARTIALS = [205.3, 304.4, 369.6, 522.7, 540, 800]; // Hz, the classic six square oscillators
const HAT = {
  ratio: 1.7, // the metal set, raised for a brighter hat
  centre: 10500,
  q: 1.2,
  cutoff: 7200,
  closed: 0.032, // s
  open: 0.21,
  noiseLevel: 0.35,
  attack: 0.0005,
};
/** `kind`: `closed`, `open`, or `double` (two closed hits half a step apart, a 32nd-note roll). */
export function hat(sampleRate, kind, stepSeconds) {
  const noise = noiseSource(SEEDS.hat),
    band = filter(sampleRate),
    high = filter(sampleRate);
  const length = kind === 'open' ? HAT.open : HAT.closed,
    gap = stepSeconds / 2;
  const envelope = t => {
    const first = decay(t, length);
    return kind === 'double' && t >= gap ? Math.max(first, decay(t - gap, length) * HAT_DOUBLE_SECOND) : first;
  };
  return render(sampleRate, (kind === 'double' ? gap : 0) + length * HAT_TAIL, t => {
    let metal = 0;
    for (const hz of HAT_PARTIALS) metal += Math.sign(Math.sin(TAU * hz * HAT.ratio * t));
    const source = metal / HAT_PARTIALS.length + noise() * HAT.noiseLevel;
    const shaped = high(band(source, HAT.centre, HAT.q).band, HAT.cutoff, 1).high;
    return shaped * envelope(t) * rise(t, HAT.attack);
  });
}
const HAT_DOUBLE_SECOND = 0.8; // the second hit of a double is a little softer
const HAT_TAIL = 6; // decay constants rendered

// ---------- the grave: the sliding 808 sub-bass ----------
const GRAVE = {
  attack: 0.004,
  release: 0.06,
  punch: 0.55, // the pitch starts this fraction higher...
  punchTime: 0.018, // ...and falls in this time
  glide: 0.35, // of the note's length, the last part glides to the next root
  drive: 2.2, // the harmonics that let a phone speaker hear it
  sustain: 1.6, // s, a slow fall while held
};
/** One grave note of `seconds`, from `from` gliding to `to` at its end. */
export function grave(sampleRate, from, to, seconds) {
  const start = noteFrequency(from),
    end = noteFrequency(to),
    glideAt = seconds * (1 - GRAVE.glide);
  let phase = 0;
  return render(sampleRate, seconds + GRAVE.release * HAT_TAIL, t => {
    const slide = t < glideAt ? 0 : Math.min(1, (t - glideAt) / (seconds - glideAt));
    const hz = start * (end / start) ** (slide * slide) * (1 + GRAVE.punch * decay(t, GRAVE.punchTime));
    phase += hz / sampleRate;
    const held = t < seconds ? 1 : decay(t - seconds, GRAVE.release);
    return softClip(Math.sin(TAU * phase), GRAVE.drive) * rise(t, GRAVE.attack) * decay(t, GRAVE.sustain) * held;
  });
}

// ---------- the teclado: a MIDI electric piano, the off-beat chords ----------
const KEYS = {
  ratio: 1, // FM modulator : carrier
  index: 2.4, // brightness at the hit...
  indexFloor: 0.35, // ...settling here
  indexTime: 0.09,
  tine: 7.1, // the bell of the tine, an inharmonic partial
  tineLevel: 0.08,
  tineTime: 0.025,
  attack: 0.002,
  ring: 0.7, // s
  release: 0.07,
  spread: 3, // cents between the chord's notes, for width
};
/** One chord of `notes` held `seconds`. */
export function keys(sampleRate, notes, seconds) {
  const voices = notes.map((note, i) => noteFrequency(note) * cents((i - 1) * KEYS.spread));
  return render(sampleRate, seconds + KEYS.release * HAT_TAIL, t => {
    const index = KEYS.indexFloor + KEYS.index * decay(t, KEYS.indexTime);
    const held = t < seconds ? 1 : decay(t - seconds, KEYS.release);
    let sum = 0;
    for (const hz of voices) {
      const modulator = Math.sin(TAU * hz * KEYS.ratio * t) * index;
      sum += Math.sin(TAU * hz * t + modulator) + Math.sin(TAU * hz * KEYS.tine * t) * KEYS.tineLevel * decay(t, KEYS.tineTime);
    }
    return sum * rise(t, KEYS.attack) * decay(t, KEYS.ring) * held;
  });
}

// ---------- the sintetizador: the lead of the hook ----------
const LEAD = {
  detune: 7, // cents, between the two saws
  subLevel: 0.25, // a square one octave down
  cutoffHigh: 5600, // Hz, the filter at the hit...
  cutoffLow: 1700, // ...closing to here
  cutoffTime: 0.14,
  q: 1.8,
  attack: 0.005,
  release: 0.09,
  vibratoRate: 5.4, // Hz
  vibratoDepth: 14, // cents
  vibratoAfter: 0.2, // s
  echoes: 2,
  echoLevel: 0.3,
  drive: 1.3,
};
/** One lead note held `seconds`, with an echo `echoSeconds` behind it. */
export function lead(sampleRate, note, seconds, echoSeconds) {
  const hz = noteFrequency(note),
    tone = filter(sampleRate);
  const voice = t => {
    if (t < 0 || t > seconds + LEAD.release * HAT_TAIL) return 0;
    return t < seconds ? rise(t, LEAD.attack) : rise(seconds, LEAD.attack) * decay(t - seconds, LEAD.release);
  };
  let phaseA = 0,
    phaseB = 0,
    phaseSub = 0;
  const dry = render(
    sampleRate,
    seconds + LEAD.release * HAT_TAIL,
    t => {
      const vibrato = t > LEAD.vibratoAfter ? cents(LEAD.vibratoDepth * Math.sin(TAU * LEAD.vibratoRate * (t - LEAD.vibratoAfter))) : 1;
      const step = (hz * vibrato) / sampleRate;
      phaseA += step * cents(LEAD.detune);
      phaseB += step / cents(LEAD.detune);
      phaseSub += step / 2;
      const raw = saw(phaseA, step) + saw(phaseB, step) + Math.sign(Math.sin(TAU * phaseSub)) * LEAD.subLevel;
      const cutoff = LEAD.cutoffLow + (LEAD.cutoffHigh - LEAD.cutoffLow) * decay(t, LEAD.cutoffTime);
      return softClip(tone(raw, cutoff, LEAD.q).low, LEAD.drive) * voice(t);
    },
    1,
  );
  const gap = Math.round(echoSeconds * sampleRate);
  return render(sampleRate, (dry.length + gap * LEAD.echoes) / sampleRate, (_t, i) => {
    let value = 0;
    for (let echo = 0; echo <= LEAD.echoes; echo++) value += (dry[i - echo * gap] || 0) * LEAD.echoLevel ** echo;
    return value;
  });
}

// ---------- the metais: a MIDI horn section, the frevo nod on the drop ----------
const BRASS = {
  detune: [-9, 0, 8], // cents, three players per note
  scoop: -45, // cents, each note starts below and lips up...
  scoopTime: 0.03, // ...in this time
  cutoffBase: 650, // Hz
  cutoffBlat: 3600, // the bright «blat» of the attack
  blatTime: 0.22,
  blatRise: 0.018,
  q: 1.1,
  attack: 0.012,
  release: 0.11,
  drive: 1.6,
};
/** One horn chord of `notes` held `seconds`. */
export function brass(sampleRate, notes, seconds) {
  const players = notes.flatMap(note => BRASS.detune.map(amount => ({ hz: noteFrequency(note) * cents(amount), phase: 0 })));
  const tone = filter(sampleRate);
  return render(sampleRate, seconds + BRASS.release * HAT_TAIL, t => {
    const scoop = cents(BRASS.scoop * decay(t, BRASS.scoopTime));
    let sum = 0;
    for (const player of players) {
      const step = (player.hz * scoop) / sampleRate;
      player.phase += step;
      sum += saw(player.phase, step);
    }
    const cutoff = BRASS.cutoffBase + BRASS.cutoffBlat * rise(t, BRASS.blatRise) * decay(t, BRASS.blatTime);
    const held = t < seconds ? 1 : decay(t - seconds, BRASS.release);
    return softClip(tone(sum / players.length, cutoff, BRASS.q).low, BRASS.drive) * rise(t, BRASS.attack) * held;
  });
}

// ---------- the tamborzão: the atabaque hits of the Rio beat, for the contrast ----------
// A hand drum: membrane modes (ratios of the fundamental, decay in s, level), open or slapped.
const DRUM_MODES = [
  [1, 0.22, 1],
  [1.59, 0.11, 0.5],
  [2.14, 0.075, 0.35],
  [2.3, 0.06, 0.25],
  [2.65, 0.045, 0.2],
];
const ATABAQUE = {
  grave: { hz: 98, slap: 0.15, seconds: 0.5 },
  agudo: { hz: 196, slap: 0.75, seconds: 0.32 },
  bend: 0.1, // the skin's pitch falls this fraction after the hit
  bendTime: 0.03,
  slapTime: 0.012,
  slapCentre: 2100,
  slapQ: 0.9,
  attack: 0.001,
  drive: 1.3,
};
/** `tone`: `grave` (open, low) or `agudo` (slapped, high). */
export function atabaque(sampleRate, tone) {
  const { hz, slap, seconds } = ATABAQUE[tone],
    noise = noiseSource(SEEDS.atabaque),
    slapFilter = filter(sampleRate);
  const phases = DRUM_MODES.map(() => 0);
  return render(sampleRate, seconds, t => {
    const bend = 1 + ATABAQUE.bend * decay(t, ATABAQUE.bendTime);
    let skin = 0;
    DRUM_MODES.forEach(([ratio, time, level], i) => {
      phases[i] += (hz * ratio * bend) / sampleRate;
      skin += Math.sin(TAU * phases[i]) * level * decay(t, time);
    });
    const crack = slapFilter(noise(), ATABAQUE.slapCentre, ATABAQUE.slapQ).band * decay(t, ATABAQUE.slapTime) * slap;
    return softClip((skin + crack) * rise(t, ATABAQUE.attack), ATABAQUE.drive);
  });
}

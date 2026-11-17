// The studio: recorded multi-sample instruments, a human feel and a mix bus, for a rhythm that opts in
// with `sounds.studio` (src/rhythms/). A rhythm without it (the maracatu) never reaches this module.
//
// Everything a hit does here (which take, how late, how loud, how bright) is a pure function of the
// show position and a per-voice seed: the whole show is planned at once, in order, from the script.
// Research and the chosen values: docs/rhythms/studio.md.
import { meterOf } from './music.js';
import { clamp, hash } from './util.js';

const MS = 0.001;
// Odd constants that spread an index, a seed or an octave over the hash's input: any distinct primes do.
const SALT = { index: 7919, seed: 104729, octave: 31, ordinal: 13, take: 7907, ghost: 4099, bar: 64 };
// Each humanised quantity reads its own noise stream of the voice's seed.
const STREAM = { drift: 1, step: 2, velocity: 3, accent: 4, vibrato: 5 };
const MID_LAYER = 0.5; // a take with no layer sits in the middle
const DEFAULT_RELEASE = 0.08; // seconds a held note takes to fade
const DEFAULT_SEND = 0.15; // the room send of a voice that names none
const VIBRATO_SPREAD = 0.05; // each held note's vibrato rate differs by up to 5 %
const VIBRATO_RAMP = 0.2; // seconds the vibrato takes to reach its depth
const CENTS_PER_OCTAVE = 1200;
const TIME_CONSTANTS = 3; // an exponential fade reaches 5 % in three time constants
const PINK_OCTAVES = 8; // 1/f over 1 to 128 beats
const UNIFORM_VARIANCE = 1 / 3; // of a value in [−1, 1]
/** A value in [−1, 1] for an integer index and a seed. */
const noise = (n, seed) => hash(Math.imul(n, SALT.index) + Math.imul(seed, SALT.seed)) * 2 - 1;
/**
 * 1/f (pink) noise at the integer index `n`, with unit spread: the Voss–McCartney sum of octaves, the
 * octave `o` holding one value for 2^o indices. Timing drift built from it is long-range correlated,
 * as measured in human playing (Hennig 2011), never white.
 */
export function pink(n, seed) {
  let sum = 0;
  for (let o = 0; o < PINK_OCTAVES; o++) sum += noise(Math.floor(n / 2 ** o), seed * SALT.octave + o);
  return sum / Math.sqrt(PINK_OCTAVES * UNIFORM_VARIANCE);
}

// How each role drifts, in milliseconds of spread, and how much of the gap to the lead a follower
// closes per beat (Rasanen 2015: a top drummer spreads about 8.7 ms; followers correct 0.2 to 0.25
// of the gap per beat, the lead drum about 0.1).
export const ROLES = {
  lead: { spreadMs: 7, correction: 0.1 },
  follower: { spreadMs: 4, correction: 0.22 },
  grid: { spreadMs: 0, correction: 1 },
};
const STEP_SPREAD_MS = 1.5; // the pink wobble of each stroke inside the beat, on top of the drift
const VELOCITY_DRIFT = 0.06; // a slow 1/f swing of each voice's loudness
const BAR_ACCENT = 0.08; // the lead varies its accents every bar
const SWELL = 0.07; // a phrase swells from −7 % to +7 % over its bars
const DEFAULT_PHRASE_BARS = 8;
const DEFAULT_ZONE = 4; // a note may borrow a take recorded up to this many semitones away
const MAX_ZONE = 8; // never further (a rate of 1.59), to keep the timbre
const LAYER_WINDOW = 0.2; // velocity layers this close to the hit's velocity may play it
const DEFAULT_BRIGHT = [2500, 16000]; // low-pass at velocity 0 and 1, in Hz
const MIN_VELOCITY = 0.05;
const MAX_VELOCITY = 1.25;
const SEMITONES = 12;

/** The velocity layer group of takes nearest to `velocity`, widened by LAYER_WINDOW. */
function byLayer(takes, velocity) {
  if (!takes.some(take => take.layer !== undefined)) return takes;
  const distance = take => Math.abs((take.layer ?? MID_LAYER) - velocity);
  const nearest = Math.min(...takes.map(distance));
  return takes.filter(take => distance(take) <= nearest + LAYER_WINDOW);
}
/** The takes that may sound `note`: those recorded near it, else the nearest one. */
function byZone(takes, note, zone) {
  if (note === null) return takes;
  const distance = take => Math.abs(take.root - note);
  const near = takes.filter(take => distance(take) <= zone);
  if (near.length) return near;
  const nearest = Math.min(...takes.map(distance));
  return takes.filter(take => distance(take) === nearest);
}

/**
 * Pick one take: shuffled by the position, never the one this voice played last when another exists
 * (Fagerström et al. 2021: one repeated sample sounds dead; many takes sound real).
 */
function pickTake(candidates, seed, ordinal, avoid) {
  let index = Math.floor(hash(Math.imul(ordinal, SALT.ordinal) + Math.imul(seed, SALT.take)) * candidates.length);
  if (candidates.length > 1)
    for (let tries = 0; tries < candidates.length && avoid.has(candidates[index].file); tries++) index = (index + 1) % candidates.length;
  return candidates[index];
}

/** Each beat's timing offset (seconds) for every voice: the lead drifts, followers chase it. */
function timingOf(studio, totalBeats) {
  const voices = Object.keys(studio.voices),
    lead = studio.lead,
    out = {};
  const leadSpread = ROLES.lead.spreadMs * MS;
  const leadDrift = beat => leadSpread * pink(beat, studio.voices[lead]?.seed ?? 0);
  for (const voice of voices) {
    const spec = studio.voices[voice],
      role = ROLES[spec.role || 'follower'],
      drift = new Float64Array(totalBeats);
    if (spec.role === 'grid') {
      out[voice] = drift;
      continue;
    }
    if (voice === lead) {
      for (let beat = 0; beat < totalBeats; beat++) drift[beat] = leadDrift(beat);
    } else {
      let chase = 0;
      for (let beat = 0; beat < totalBeats; beat++) {
        chase += role.correction * (leadDrift(beat) - chase);
        drift[beat] = chase + role.spreadMs * MS * pink(beat, spec.seed + STREAM.drift);
      }
    }
    out[voice] = drift;
  }
  return out;
}

/**
 * Plan every hit of the show for one set of sound choices: a map from the show's step to its
 * events. An event names its sources (file, playback rate, level, delay) and how it is shaped.
 */
export function planStudio(rhythm, show, choice) {
  const studio = rhythm.sounds.studio,
    meter = meterOf(rhythm),
    stepSeconds = meter.beatSeconds / rhythm.stepsPerBeat;
  const totalBeats = show.TOTAL_BARS * rhythm.beatsPerBar,
    timing = timingOf(studio, totalBeats),
    phraseBars = studio.phraseBars || DEFAULT_PHRASE_BARS;
  const ordinals = {},
    last = {},
    plan = new Map();
  const add = (step, event) => {
    if (!plan.has(step)) plan.set(step, []);
    plan.get(step).push(event);
  };
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) {
    const { scene } = show.barTimeline(bar),
      hits = [...show.hitsInBar(bar)];
    // sound-only ornaments: quiet strokes that come and go with their probability
    for (const voice of new Set(hits.map(h => h.voice)))
      for (const ghost of studio.voices[voice]?.ghosts || [])
        if (
          !hits.some(h => h.voice === voice && h.hit.step === ghost.step) &&
          hash(bar * SALT.bar + ghost.step + studio.voices[voice].seed * SALT.ghost) < ghost.probability
        )
          hits.push({ voice, hit: { step: ghost.step, velocity: ghost.velocity, tone: ghost.tone }, swing: 0 });
    hits.sort((a, b) => a.hit.step - b.hit.step);
    const swell = 1 + SWELL * Math.sin((2 * Math.PI * (bar % phraseBars)) / phraseBars - Math.PI / 2);
    for (const { voice, hit, swing } of hits) {
      const spec = studio.voices[voice];
      if (!spec) continue;
      const step = bar * meter.stepsPerBar + hit.step,
        beat = Math.floor(step / rhythm.stepsPerBeat);
      ordinals[voice] = (ordinals[voice] ?? -1) + 1;
      const ordinal = ordinals[voice];
      const human = spec.role === 'grid' ? 0 : timing[voice][beat] + STEP_SPREAD_MS * MS * pink(step, spec.seed + STREAM.step);
      const template = (spec.template?.[hit.step] ?? 0) * MS;
      let velocity = hit.velocity * swell * (1 + VELOCITY_DRIFT * pink(step, spec.seed + STREAM.velocity));
      if (voice === studio.lead) velocity *= 1 + BAR_ACCENT * noise(bar * SALT.bar + hit.step, spec.seed + STREAM.accent);
      velocity = clamp(velocity, MIN_VELOCITY, MAX_VELOCITY);
      const shaped = spec.shape ? spec.shape(hit.tone, choice, { bar, step: hit.step, velocity }) : {};
      if (shaped === null) continue; // a mark that stays silent
      const strokeName = shaped.stroke ?? hit.tone ?? 'hit';
      const takes = spec.strokes(choice)[strokeName];
      if (!takes) throw new Error(`studio: ${voice} has no stroke ${strokeName}`);
      const notes = shaped.notes ?? [null];
      const avoid = new Set(last[voice] || []),
        played = [];
      const sources = notes.map((note, i) => {
        const zone = spec.zone ?? DEFAULT_ZONE;
        let candidates = byZone(byLayer(takes, Math.min(1, velocity)), note, zone);
        // a layer with one take would repeat it: borrow from the neighbouring layers instead
        if (candidates.every(take => avoid.has(take.file))) candidates = byZone(takes, note, zone);
        // and a note with one take near it borrows one a little further away
        for (let wider = zone + 1; wider <= (spec.maxZone ?? MAX_ZONE) && candidates.every(take => avoid.has(take.file)); wider++)
          candidates = byZone(takes, note, wider);
        const take = pickTake(candidates, spec.seed + i, ordinal * 8 + i, avoid);
        avoid.add(take.file);
        played.push(take.file);
        const rate = (take.rate ?? 1) * (note === null ? 1 : 2 ** ((note - take.root) / SEMITONES));
        // `only`: no other take was near enough, so this one may repeat
        return { file: take.file, rate, gain: take.gain ?? 1, delay: i * (shaped.strum ?? 0), only: candidates.length === 1 };
      });
      if (shaped.echo) sources.push(...sources.map(source => ({ ...source, delay: source.delay + shaped.echo.delay, gain: source.gain * shaped.echo.gain })));
      last[voice] = played;
      const [low, high] = spec.bright || DEFAULT_BRIGHT;
      add(step, {
        voice,
        stroke: strokeName,
        offset: swing * stepSeconds + template + human,
        sources,
        gain: (spec.gain ?? 1) * velocity * (scene.gain?.[voice] || 1) * (shaped.gain ?? 1),
        cutoff: low * (high / low) ** clamp(velocity, 0, 1),
        attack: shaped.attack ?? spec.attack ?? 0,
        length: shaped.length ?? null,
        release: spec.release ?? DEFAULT_RELEASE,
        glide: shaped.glide ? { ratio: 2 ** (shaped.glide.semitones / SEMITONES), at: shaped.glide.at, over: shaped.glide.over } : null,
        vibrato:
          shaped.length && spec.vibrato ? { ...spec.vibrato, hz: spec.vibrato.hz * (1 + VIBRATO_SPREAD * noise(ordinal, spec.seed + STREAM.vibrato)) } : null,
      });
    }
  }
  return plan;
}

const GLUE = { threshold: -18, ratio: 2, attack: 0.01, release: 0.15 };
const DUCK_ATTACK = 0.004;
const DEFAULT_OUTPUT = 0.7; // into the master chain: peaks near −1 dBFS, not into its saturation

/** The mix bus feeding `destination`: one channel per voice (pan, send), the room, glue compression. */
export function createStudioMix(context, destination, buffers, studio) {
  const glue = context.createDynamicsCompressor();
  glue.threshold.value = GLUE.threshold;
  glue.ratio.value = GLUE.ratio;
  glue.attack.value = GLUE.attack;
  glue.release.value = GLUE.release;
  const output = context.createGain();
  output.gain.value = studio.output ?? DEFAULT_OUTPUT;
  glue.connect(output).connect(destination);
  const room = context.createConvolver();
  room.buffer = buffers[studio.room] || null;
  const roomLevel = context.createGain();
  roomLevel.gain.value = studio.roomLevel ?? 1;
  room.connect(roomLevel).connect(glue);
  const duck = context.createGain(); // the voices that make room for the kick
  duck.connect(glue);
  const channels = {};
  for (const [voice, spec] of Object.entries(studio.voices)) {
    const input = context.createGain(),
      pan = context.createStereoPanner(),
      send = context.createGain();
    pan.pan.value = spec.pan ?? 0;
    send.gain.value = spec.send ?? DEFAULT_SEND;
    input.connect(pan).connect(studio.duck && spec.ducked ? duck : glue);
    pan.connect(send).connect(room);
    channels[voice] = input;
  }
  return {
    /** Play one planned event at `time` at the level `level`. */
    play(event, time, level) {
      const start = Math.max(time, context.currentTime);
      if (studio.duck && event.voice === studio.duck.by) {
        duck.gain.setTargetAtTime(1 - studio.duck.depth, start, DUCK_ATTACK);
        duck.gain.setTargetAtTime(1, start + studio.duck.hold, studio.duck.release);
      }
      for (const source of event.sources) {
        const buffer = buffers[source.file];
        if (!buffer) continue;
        const at = start + source.delay,
          node = context.createBufferSource(),
          tone = context.createBiquadFilter(),
          envelope = context.createGain();
        node.buffer = buffer;
        node.playbackRate.value = source.rate;
        if (event.glide) {
          node.playbackRate.setValueAtTime(source.rate, at + event.glide.at);
          node.playbackRate.exponentialRampToValueAtTime(source.rate * event.glide.ratio, at + event.glide.at + event.glide.over);
        }
        tone.type = 'lowpass';
        tone.frequency.value = event.cutoff;
        const peak = event.gain * source.gain * level;
        if (event.attack > 0) {
          envelope.gain.setValueAtTime(0, at);
          envelope.gain.linearRampToValueAtTime(peak, at + event.attack);
        } else envelope.gain.value = peak;
        node.connect(tone).connect(envelope).connect(channels[event.voice]);
        node.start(at);
        if (event.length) {
          const end = at + event.length;
          envelope.gain.setTargetAtTime(0, end, event.release / TIME_CONSTANTS);
          node.stop(end + event.release * 2);
          if (event.vibrato) {
            const wobble = context.createOscillator(),
              depth = context.createGain();
            wobble.frequency.value = event.vibrato.hz;
            depth.gain.setValueAtTime(0, at);
            depth.gain.setValueAtTime(0, at + event.vibrato.delay);
            depth.gain.linearRampToValueAtTime(source.rate * (2 ** (event.vibrato.cents / CENTS_PER_OCTAVE) - 1), at + event.vibrato.delay + VIBRATO_RAMP);
            wobble.connect(depth).connect(node.playbackRate);
            wobble.start(at);
            wobble.stop(end + event.release * 2);
          }
        }
      }
    },
  };
}

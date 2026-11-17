// Sound: real one-shot recordings (public domain), scheduled sample-accurately with Web Audio.
// The same scheduler drives live playback and the offline render used by the video exporter.
import { BAR_SECONDS, BEAT_SECONDS, STEPS_PER_BAR, STEPS_PER_BEAT, VOICE_ORDER, VOICES } from './music.js';
import { RHYTHM } from './rhythms/index.js';
import { barTimeline, hitsInBar, sceneById, TOTAL_BARS } from './show.js';
import { createStudioMix, planStudio } from './studio.js';
import { hash } from './util.js';

// Sounds the viewer can swap on desktop, the samples that never change, and which sample each hit
// plays: the rhythm's sound choices (src/rhythms/).
export const SOUND_CHOICES = RHYTHM.sounds.choices;
const FIXED_FILES = RHYTHM.sounds.fixedFiles;
// Sounds the rhythm synthesizes in the page instead of fetching: name → render(sampleRate), which
// returns the samples of one mono hit. They download nothing, so phones pay nothing for them.
const SYNTH = RHYTHM.sounds.synth || {};
const isSynth = name => Object.hasOwn(SYNTH, name);
/** Every recorded file the page can fetch (the synthesized sounds are not files). */
export const ALL_SOUND_FILES = [...SOUND_CHOICES.flatMap(choice => choice.options.flatMap(([option]) => choice.files(option))), ...FIXED_FILES].filter(
  name => !isSynth(name),
);
export const DEFAULT_CHOICES = Object.fromEntries(SOUND_CHOICES.map(choice => [choice.id, choice.defaultOption]));

// voice → [sample, gain, playback rate] for one hit, or null for a mark that stays silent
const SAMPLE_FOR = RHYTHM.sounds.sampleFor;
const VOICE_SEED = Object.fromEntries(VOICE_ORDER.map((voice, i) => [voice, i]));

// Each instrument's volume on desktop, as a multiplier of its sound: four steps the ear hears as even
// (−6 dB, 0 dB, +3.5 dB), with normal the level chosen for the show. Never above 1.5: the alfaia is
// already the loudest sound, and more would distort on the master bus.
export const VOLUME_LEVELS = [
  ['mute', 0],
  ['low', 0.5],
  ['normal', 1],
  ['high', 1.5],
];
export const DEFAULT_VOLUME = 'normal';
// one owner: VOICES[voice].instrument (the whistle has no volume of its own, so it always sounds)
const VOICE_INSTRUMENT = Object.fromEntries(VOICE_ORDER.map(voice => [voice, VOICES[voice].instrument]));
/** A voice's volume multiplier; `volume` maps a SOUND_CHOICES id to a VOLUME_LEVELS name. */
const volumeOf = (volume, voice) => {
  const level = VOLUME_LEVELS.find(([name]) => name === volume[VOICE_INSTRUMENT[voice]]);
  return level ? level[1] : 1;
};
// How strongly the wheel and the lanes draw a voice at each volume: a muted voice shows as disabled,
// a faint grey trace (owner, 2026-11-16), a low one fainter; loud draws like normal.
const VISUAL_AT_LEVEL = { mute: 0.15, low: 0.55, normal: 1, high: 1 };
/** Whether a voice sounds at all at its instrument's volume. */
export const isHeard = (volume, voice) => volumeOf(volume, voice) > 0;
/** The drawing strength (0 to 1) of a voice at its instrument's volume. */
export const visualOf = (volume, voice) => VISUAL_AT_LEVEL[volume[VOICE_INSTRUMENT[voice]]] ?? 1;

/** Light saturation and compression on the master bus. Returns the bus input. */
function masterChain(context) {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -15;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.12;
  const saturation = context.createWaveShaper(),
    curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = i / 511.5 - 1;
    curve[i] = Math.tanh(1.4 * x) / Math.tanh(1.4);
  }
  saturation.curve = curve;
  const input = context.createGain();
  input.gain.value = 0.9;
  input.connect(saturation).connect(compressor).connect(context.destination);
  return input;
}

// A pitched voice (a melody, a chord, a bass line) keeps its tuning: only its level varies per hit.
const isPitched = voice => Boolean(VOICES[voice].pitched);

function playSample(context, buffers, name, time, gain, rate, destination, variation, pitched = false) {
  const buffer = buffers[name];
  if (!buffer) return;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = pitched ? rate : rate * (1 + (variation - 0.5) * 0.02);
  const level = context.createGain();
  level.gain.value = gain * (0.92 + variation * 0.16);
  source.connect(level).connect(destination);
  source.start(Math.max(time, context.currentTime));
}

// A rhythm with a studio (src/studio.js) plays recorded multi-sample instruments with a human feel
// through its own mix bus; the plan for one set of choices is made once and reused.
const STUDIO = RHYTHM.sounds.studio || null;
const SHOW = { barTimeline, hitsInBar, TOTAL_BARS };
const plans = new Map();
const studioPlan = choice => {
  const key = JSON.stringify(choice);
  if (!plans.has(key)) plans.set(key, planStudio(RHYTHM, SHOW, choice));
  return plans.get(key);
};
const mixes = new WeakMap(); // destination → its studio mix
const mixFor = (context, buffers, destination) => {
  if (!mixes.has(destination)) mixes.set(destination, createStudioMix(context, destination, buffers, STUDIO));
  return mixes.get(destination);
};
/** Play the planned studio events of `step` at `time`, only those of `voices` when given. */
function scheduleStudio(context, buffers, destination, step, time, choice, volume, voices = null) {
  const mix = mixFor(context, buffers, destination);
  for (const event of studioPlan(choice).get(step) || []) {
    const level = volumeOf(volume, event.voice);
    if (level > 0 && (!voices || voices.includes(event.voice))) mix.play(event, time + event.offset, level);
  }
}

/** Schedule every hit of one sixteenth of the show (`step` counts from the start) at `time`. */
function scheduleStep(context, buffers, destination, step, time, choice, volume = {}) {
  if (STUDIO) return scheduleStudio(context, buffers, destination, step, time, choice, volume);
  const bar = Math.floor(step / STEPS_PER_BAR),
    sixteenth = step % STEPS_PER_BAR,
    { scene } = barTimeline(bar);
  for (const { voice, hit, swing } of hitsInBar(bar)) {
    if (hit.step !== sixteenth) continue;
    const variation = hash(step * 8 + VOICE_SEED[voice]);
    const level = volumeOf(volume, voice);
    const sample = level > 0 && SAMPLE_FOR[voice](choice, hit.velocity * (scene.gain[voice] || 1) * level, hit.tone, variation);
    if (sample)
      playSample(context, buffers, sample[0], time + (swing / STEPS_PER_BEAT) * BEAT_SECONDS, sample[1], sample[2], destination, variation, isPitched(voice));
  }
}

/** The sample files one set of choices needs (mobile downloads only these). */
export const filesFor = choice => [...SOUND_CHOICES.flatMap(c => c.files(choice[c.id])), ...FIXED_FILES];

// The page fetches AAC at 96 kbps (#3); `tools/encode-sounds.mjs` makes each one from its WAV master.
export const SOUND_EXTENSION = '.m4a';

/** Fetches samples on demand and decodes them once per audio context; a synthesized sound is rendered instead. */
export function createSampleBank(baseUrl = 'sounds/', synth = SYNTH) {
  const downloads = new Map(),
    decoded = new WeakMap();
  const MAX_ATTEMPTS = 3;
  const fetchSample = async name => {
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await fetch(`${baseUrl}${name}${SOUND_EXTENSION}`);
        if (!response.ok) throw new Error(`missing sound: ${name} (${response.status})`);
        return await response.arrayBuffer();
      } catch (error) {
        if (attempt >= MAX_ATTEMPTS) throw error; // a dropped connection on a phone network is retried
      }
    }
  };
  const download = name => {
    if (!downloads.has(name)) {
      const pending = fetchSample(name);
      pending.catch(() => downloads.delete(name)); // never cache a failure: the next play tries again
      downloads.set(name, pending);
    }
    return downloads.get(name);
  };
  return {
    /** Start downloading without decoding (no audio context needed yet). */
    prefetch: names => {
      for (const name of names) if (!Object.hasOwn(synth, name)) download(name).catch(() => {});
    },
    /** Decode `names` for `context`; resolves to that context's buffer map. */
    async load(context, names) {
      if (!decoded.has(context)) decoded.set(context, {});
      const buffers = decoded.get(context);
      await Promise.all(
        names
          .filter(name => !buffers[name])
          .map(async name => {
            if (Object.hasOwn(synth, name)) {
              const samples = synth[name](context.sampleRate),
                buffer = context.createBuffer(1, samples.length, context.sampleRate);
              buffer.copyToChannel(samples, 0);
              buffers[name] = buffer;
              return;
            }
            buffers[name] = await context.decodeAudioData((await download(name)).slice(0));
          }),
      );
      return buffers;
    },
  };
}

// A sound picked while paused is previewed in place (#5).
const PREVIEW_BARS = 1.5; // a pick plays one and a half cycles of its instrument (owner, 2026-11-16)
const PREVIEW_BAR = sceneById(RHYTHM.sounds.previewScene).start; // every instrument plays its basic part there
const PREVIEW_RING_MS = 1500; // a preview's last hit rings this long before the context may sleep
const MS_PER_SECOND = 1000;

/**
 * Live playback with a look-ahead scheduler. `choice` maps each SOUND_CHOICES id to an option; the
 * caller changes it only after `prepare(next)` has decoded the new samples, so no hit goes silent.
 * `volume` maps an instrument to a VOLUME_LEVELS name; the caller changes it in place and the next
 * scheduled hits follow it.
 */
export function createPlayer(bank, choice, volume = {}) {
  const LOOKAHEAD = 0.15,
    TICK_MS = 25,
    START_DELAY = 0.12,
    FADE_SECONDS = 0.02,
    RELEASE_MS = 400;
  let context = null,
    loading = null,
    buffers = null,
    master = null,
    bus = null,
    timer = 0;
  let playing = false,
    startTime = 0,
    startBar = 0,
    nextStep = 0,
    awakeUntil = 0, // performance.now() until which a preview still sounds
    previewBus = null; // the bus of the preview sounding now, cut by the next pick or by Play
  /** Fade out the preview that is sounding, if any. */
  const cutPreview = () => {
    previewBus?.gain.setTargetAtTime(0, context.currentTime, FADE_SECONDS);
    previewBus = null;
  };
  /** Let the audio thread sleep after `ms`, unless the show or a preview is sounding by then. */
  const sleepLater = (ms, then = () => {}) =>
    setTimeout(() => {
      then();
      if (!playing && performance.now() >= awakeUntil) context.suspend();
    }, ms);
  const stepTime = step => startTime + (step / STEPS_PER_BAR - startBar) * BAR_SECONDS;
  function tick() {
    const horizon = context.currentTime + LOOKAHEAD;
    while (nextStep < TOTAL_BARS * STEPS_PER_BAR && stepTime(nextStep) <= horizon) {
      scheduleStep(context, buffers, bus, nextStep, stepTime(nextStep), choice, volume);
      nextStep++;
    }
  }
  /** One audio context for the visit; concurrent callers share the same creation. */
  function open() {
    if (!loading) {
      loading = (async () => {
        const fresh = new (window.AudioContext || window.webkitAudioContext)();
        try {
          buffers = await bank.load(fresh, filesFor(choice));
        } catch (error) {
          fresh.close();
          loading = null;
          throw error;
        }
        context = fresh;
        master = masterChain(context);
      })();
    }
    return loading;
  }
  return {
    get playing() {
      return playing;
    },
    /** Current position in bars (only meaningful while playing); never before the bar it started at. */
    position: () => Math.max(startBar, startBar + (context.currentTime - (context.outputLatency || 0) - startTime) / BAR_SECONDS),
    /** Decode the samples of `next` (default: the current choices) and wake the audio context. */
    async prepare(next = choice) {
      await open();
      await bank.load(context, filesFor(next));
      await context.resume();
    },
    /** Start at `fromBar`. Call after `prepare()` has resolved. */
    start(fromBar) {
      clearInterval(timer);
      context.resume(); // a stop's delayed suspend may have landed after prepare()
      cutPreview();
      bus = context.createGain();
      bus.connect(master);
      startBar = fromBar;
      startTime = context.currentTime + START_DELAY;
      nextStep = Math.ceil(fromBar * STEPS_PER_BAR - 1e-6);
      playing = true;
      tick();
      timer = setInterval(tick, TICK_MS);
    },
    /** Stops and returns the position it stopped at. The context sleeps once the fade ends. */
    stop() {
      if (!playing) return null;
      const at = this.position();
      playing = false;
      clearInterval(timer);
      const fading = bus;
      fading.gain.setTargetAtTime(0, context.currentTime, FADE_SECONDS);
      sleepLater(RELEASE_MS, () => fading.disconnect());
      return at;
    },
    /**
     * Play one and a half cycles of `voices` alone, with the choices `next`, without starting the show: a
     * sound picked while paused is heard in its own part, with its swing. A new pick cuts the last
     * one. Rejects when the samples did not load.
     */
    async preview(next, voices) {
      await this.prepare(next);
      cutPreview();
      const bus = context.createGain();
      bus.connect(master);
      previewBus = bus;
      const start = context.currentTime + START_DELAY;
      if (STUDIO) {
        for (let at = 0; at < PREVIEW_BARS * STEPS_PER_BAR; at++)
          scheduleStudio(
            context,
            buffers,
            bus,
            PREVIEW_BAR * STEPS_PER_BAR + (at % STEPS_PER_BAR),
            start + (at / STEPS_PER_BAR) * BAR_SECONDS,
            next,
            volume,
            voices,
          );
      } else
        for (let cycle = 0; cycle < PREVIEW_BARS; cycle++)
          for (const { voice, hit, swing } of hitsInBar(PREVIEW_BAR)) {
            const level = volumeOf(volume, voice);
            // a part cycle (1.25, 1.5) stops where its fraction of the bar ends
            if (!voices.includes(voice) || level === 0 || cycle * STEPS_PER_BAR + hit.step >= PREVIEW_BARS * STEPS_PER_BAR) continue;
            const variation = hash((cycle * STEPS_PER_BAR + hit.step) * 8 + VOICE_SEED[voice]);
            const sample = SAMPLE_FOR[voice](next, hit.velocity * level, hit.tone, variation);
            const at = start + (cycle + (hit.step + swing) / STEPS_PER_BAR) * BAR_SECONDS;
            if (sample) playSample(context, buffers, sample[0], at, sample[1], sample[2], bus, variation, isPitched(voice));
          }
      const ringMs = (START_DELAY + PREVIEW_BARS * BAR_SECONDS) * MS_PER_SECOND + PREVIEW_RING_MS;
      awakeUntil = Math.max(awakeUntil, performance.now() + ringMs);
      sleepLater(ringMs);
    },
  };
}

/** The whole show rendered offline as a 16-bit stereo WAV (for the video exporter). */
export async function renderShowWav(bank, choice, leadIn) {
  const sampleRate = 44100,
    length = Math.ceil((TOTAL_BARS * BAR_SECONDS + 1.2) * sampleRate);
  const context = new OfflineAudioContext(2, length, sampleRate);
  const buffers = await bank.load(context, filesFor(choice)),
    master = masterChain(context);
  for (let step = 0; step < TOTAL_BARS * STEPS_PER_BAR; step++)
    scheduleStep(context, buffers, master, step, leadIn + (step / STEPS_PER_BAR) * BAR_SECONDS, choice);
  return encodeWav(await context.startRendering());
}

function encodeWav(audio) {
  const frames = audio.length,
    data = new DataView(new ArrayBuffer(44 + frames * 4));
  const text = (offset, s) => {
    for (let i = 0; i < s.length; i++) data.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  data.setUint32(4, 36 + frames * 4, true);
  text(8, 'WAVEfmt ');
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, 2, true);
  data.setUint32(24, audio.sampleRate, true);
  data.setUint32(28, audio.sampleRate * 4, true);
  data.setUint16(32, 4, true);
  data.setUint16(34, 16, true);
  text(36, 'data');
  data.setUint32(40, frames * 4, true);
  const left = audio.getChannelData(0),
    right = audio.getChannelData(1);
  for (let i = 0; i < frames; i++) {
    data.setInt16(44 + i * 4, Math.max(-1, Math.min(1, left[i])) * 32767, true);
    data.setInt16(46 + i * 4, Math.max(-1, Math.min(1, right[i])) * 32767, true);
  }
  return data.buffer;
}

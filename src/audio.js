// Sound: real one-shot recordings (public domain), scheduled sample-accurately with Web Audio.
// The same scheduler drives live playback and the offline render used by the video exporter.
import { BAR_SECONDS, BEAT_SECONDS, barHits, STEPS_PER_BAR, swingOffset, VOICE_ORDER } from './music.js';
import { sceneAt, TOTAL_BARS } from './show.js';
import { hash } from './util.js';

// Sounds the viewer can swap on desktop. `files(option)` lists the samples of one option.
// The first-listed default is the version chosen by ear for the show.
export const SOUND_CHOICES = [
  {
    id: 'alfaia',
    label: 'alfaia',
    defaultOption: 'deep-click',
    preview: ['marcacao', 0],
    files: o => [`alfaia-${o}-main`, `alfaia-${o}-answer`],
    options: [
      ['deep', 'alfaia grave'],
      ['dry-surdo', 'surdo seco'],
      ['blend', 'meio a meio'],
      ['deep-click', 'grave com estalo'],
      ['deep-short', 'grave curta'],
      ['deeper', 'grave mais funda'],
      ['dry-body', 'seco encorpado'],
      ['dry-low', 'seco grave'],
    ],
  },
  {
    id: 'ganza',
    label: 'ganzá',
    defaultOption: 'rice',
    preview: ['ensemble', 3],
    files: o => [`ganza-${o}`],
    options: [
      ['rice', 'ganzá de arroz'],
      ['dry', 'ganzá seco'],
      ['platinela', 'chocalho de platinela'],
      ['caxixi', 'caxixi'],
    ],
  },
  {
    id: 'agbe',
    label: 'agbê',
    defaultOption: 'maracatu',
    preview: ['ensemble', 2],
    files: o => [`agbe-${o}`],
    options: [
      ['soft-shekere', 'xequerê suave'],
      ['maracatu', 'agbê de maracatu'],
      ['struck-shekere', 'xequerê batido'],
      ['played-shekere', 'xequerê tocado'],
    ],
  },
  {
    id: 'whistle',
    label: 'apito',
    defaultOption: 'gym',
    preview: ['opening', 0],
    files: o => ['long', 'short', 'trill'].map(kind => `whistle-${o}-${kind}`),
    options: [
      ['referee', 'apito de juiz'],
      ['gym', 'apito de ginásio'],
      ['metal', 'apito de metal'],
      ['dry', 'apito seco'],
    ],
  },
  {
    id: 'agogo',
    label: 'agogô',
    defaultOption: 'short-bell',
    preview: ['agogo', 0],
    files: o => [`agogo-${o}`],
    options: [
      ['big-bell', 'sino grande'],
      ['stick-bell', 'sino com baqueta'],
      ['short-bell', 'sino curto'],
      ['low-agogo', 'agogô grave'],
    ],
  },
];
const FIXED_FILES = ['stick', 'caixa', 'caixa-roll'];
export const ALL_SOUND_FILES = [...SOUND_CHOICES.flatMap(choice => choice.options.flatMap(([option]) => choice.files(option))), ...FIXED_FILES];
export const DEFAULT_CHOICES = Object.fromEntries(SOUND_CHOICES.map(choice => [choice.id, choice.defaultOption]));

// voice → [sample, gain, playback rate] for one hit, or null for a mark that stays silent
const SAMPLE_FOR = {
  main: (choice, velocity) => [`alfaia-${choice.alfaia}-main`, 1.1 * velocity, 1],
  answer: (choice, velocity) => [`alfaia-${choice.alfaia}-answer`, 0.95 * velocity, 1],
  stick: (_choice, velocity) => ['stick', 0.85 * velocity, 1],
  caixa: (_choice, velocity, tone) => (tone === 'muted' ? null : tone === 'roll' ? ['caixa-roll', 0.75, 1] : ['caixa', 0.55 * velocity ** 1.4, 1]),
  agbe: (choice, velocity) => [`agbe-${choice.agbe}`, 0.9 * velocity, 1],
  ganza: (choice, velocity) => [`ganza-${choice.ganza}`, 0.75 * velocity, 1],
  whistle: (choice, velocity, tone, variation) => [`whistle-${choice.whistle}-${tone || 'short'}`, 0.5 * velocity, 0.995 + variation * 0.01], // one note, tiny drift
  agogo: (choice, velocity, tone) => [`agogo-${choice.agogo}`, 0.62 * velocity, tone === 'low' ? 1 : 1.19],
};
const VOICE_SEED = Object.fromEntries(VOICE_ORDER.map((voice, i) => [voice, i]));

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

function playSample(context, buffers, name, time, gain, rate, destination, variation) {
  const buffer = buffers[name];
  if (!buffer) return;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate * (1 + (variation - 0.5) * 0.02);
  const level = context.createGain();
  level.gain.value = gain * (0.92 + variation * 0.16);
  source.connect(level).connect(destination);
  source.start(Math.max(time, context.currentTime));
}

/** Schedule every hit of one sixteenth of the show (`step` counts from the start) at `time`. */
function scheduleStep(context, buffers, destination, step, time, choice) {
  const bar = Math.floor(step / STEPS_PER_BAR),
    scene = sceneAt(bar),
    barInScene = bar - scene.start,
    sixteenth = step % STEPS_PER_BAR;
  const hits = barHits(scene, barInScene),
    swingOn = scene.swing(barInScene);
  for (const voice of scene.voices(barInScene)) {
    for (const h of hits[voice]) {
      if (h.step !== sixteenth) continue;
      const variation = hash(step * 8 + VOICE_SEED[voice]);
      const sample = SAMPLE_FOR[voice](choice, h.velocity * (scene.gain[voice] || 1), h.tone, variation);
      if (sample)
        playSample(
          context,
          buffers,
          sample[0],
          time + (swingOffset(voice, sixteenth, swingOn) / 4) * BEAT_SECONDS,
          sample[1],
          sample[2],
          destination,
          variation,
        );
    }
  }
}

/** The sample files one set of choices needs (mobile downloads only these). */
export const filesFor = choice => [...SOUND_CHOICES.flatMap(c => c.files(choice[c.id])), ...FIXED_FILES];

/** Fetches samples on demand and decodes them once per audio context. */
export function createSampleBank(baseUrl = 'sounds/') {
  const downloads = new Map(),
    decoded = new WeakMap();
  const MAX_ATTEMPTS = 3;
  const fetchSample = async name => {
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await fetch(`${baseUrl}${name}.wav`);
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
      for (const name of names) download(name).catch(() => {});
    },
    /** Decode `names` for `context`; resolves to that context's buffer map. */
    async load(context, names) {
      if (!decoded.has(context)) decoded.set(context, {});
      const buffers = decoded.get(context);
      await Promise.all(
        names
          .filter(name => !buffers[name])
          .map(async name => {
            buffers[name] = await context.decodeAudioData((await download(name)).slice(0));
          }),
      );
      return buffers;
    },
  };
}

/** Live playback with a look-ahead scheduler. `choice` maps each SOUND_CHOICES id to an option. */
export function createPlayer(bank, choice) {
  const LOOKAHEAD = 0.15,
    TICK_MS = 25,
    START_DELAY = 0.12;
  let context = null,
    buffers = null,
    master = null,
    bus = null,
    timer = 0;
  let playing = false,
    startTime = 0,
    startBar = 0,
    nextStep = 0;
  const stepTime = step => startTime + (step / STEPS_PER_BAR - startBar) * BAR_SECONDS;
  function tick() {
    const horizon = context.currentTime + LOOKAHEAD;
    while (nextStep < TOTAL_BARS * STEPS_PER_BAR && stepTime(nextStep) <= horizon) {
      scheduleStep(context, buffers, bus, nextStep, stepTime(nextStep), choice);
      nextStep++;
    }
  }
  return {
    get playing() {
      return playing;
    },
    /** Current position in bars (only meaningful while playing). */
    position: () => startBar + (context.currentTime - (context.outputLatency || 0) - startTime) / BAR_SECONDS,
    async load() {
      if (context) return;
      const fresh = new (window.AudioContext || window.webkitAudioContext)();
      try {
        buffers = await bank.load(fresh, filesFor(choice));
      } catch (error) {
        fresh.close();
        throw error;
      }
      context = fresh;
      master = masterChain(context);
    },
    /** Make sure the samples of the current choices are decoded (after a sound change). */
    async refresh() {
      if (context) await bank.load(context, filesFor(choice));
    },
    async start(fromBar) {
      await this.load();
      await this.refresh();
      await context.resume();
      bus = context.createGain();
      bus.connect(master);
      startBar = fromBar;
      startTime = context.currentTime + START_DELAY;
      nextStep = Math.ceil(fromBar * STEPS_PER_BAR - 1e-6);
      playing = true;
      tick();
      timer = setInterval(tick, TICK_MS);
    },
    /** Stops and returns the position it stopped at. */
    stop() {
      if (!playing) return null;
      const at = this.position();
      playing = false;
      clearInterval(timer);
      const fading = bus;
      fading.gain.setTargetAtTime(0, context.currentTime, 0.02);
      setTimeout(() => fading.disconnect(), 400);
      return at;
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

// Bregafunk: everything the engine plays and shows that belongs to this rhythm (Recife, since about
// 2009). 171 BPM: one 16-sixteenth bar per turn of the wheel (1.40 s). Sparse and hard, as the
// reference recordings are: the bumbo on 1 and 9, the metallic «lata» on 7 and 13 (bumbo and lata
// group the bar as 3 + 3 + 2 eighths), a palma with the second bumbo, a few dry chimbais, a flute
// riff of three notes two bars long (A Phrygian: lá, si bemol, mi), the short 808 «grave» that plays
// the riff's notes, and a keyboard stab with the lata. Round two (#47): the riff opens the show, the
// beat drops whole, and the drums stop for a bar and come back, as the four references do.
// Hard-quantized: no swing.
// Research and choices: docs/research/brega-forro.md, docs/rhythms/bregafunk.md.
import { label, row, stat, stats } from '../readout-markup.js';
import { BEATS_PER_LEAN, createBregafunkBackground, PALETTE } from './bregafunk-background.js';
import { SYNTH_TAKES, synthOf } from './bregafunk-synth.js';
import { straightMeter } from './meter.js';
import { midiOf, recordedChoices, studioSounds, takes } from './studio-kit.js';

// Three of the four references sit at 164 to 170 BPM felt, the fourth at 150; the owner accepted 171
// for round two (docs/rhythms/bregafunk.md, Round two). The research range is 160 to 180.
const BPM = 171;
const BEATS_PER_BAR = 4;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const STEP_SECONDS = 60 / BPM / STEPS_PER_BEAT;
const BAR_SECONDS = STEP_SECONDS * STEPS_PER_BAR;
const SIXTEENTHS = [...Array(STEPS_PER_BAR).keys()];
const STEPS_PER_EIGHTH = 2;
const ID = 'bregafunk';

// ring/size: where and how big the voice sits on the wheel. register: the band it fills (grave,
// médio, agudo). pitched: a melodic voice keeps its tuning on every hit.
// guide: false: no ring line of its own (the tamborzão shares the lata's ring; they never play together).
export const VOICES = {
  bumbo: { instrument: 'bumbo', ring: 98, size: 5.6, swing: null, color: PALETTE.purple, boom: 1, register: 'low' },
  grave: { instrument: 'grave', ring: 90, size: 4.8, swing: null, color: PALETTE.violet, pitched: true, register: 'low' },
  lata: { instrument: 'lata', ring: 82, size: 4.6, swing: null, color: PALETTE.lime, crack: true, register: 'mid' },
  palma: { instrument: 'palma', ring: 74, size: 3.8, swing: null, color: PALETTE.aqua, register: 'mid' },
  chimbal: { instrument: 'chimbal', ring: 66, size: 2.4, swing: null, color: PALETTE.tin, register: 'high', toneScale: { double: 1.25, open: 1.5 } },
  teclado: { instrument: 'teclado', ring: 58, size: 3.4, swing: null, color: PALETTE.ivory, pitched: true, register: 'mid' },
  flauta: { instrument: 'flauta', ring: 50, size: 3.4, swing: null, color: PALETTE.orange, pitched: true, register: 'high' },
  metais: { instrument: 'metais', ring: 42, size: 4, swing: null, color: PALETTE.gold, pitched: true, spark: true, register: 'mid' },
  tamborzao: { instrument: 'tamborzao', ring: 82, size: 4.6, swing: null, color: PALETTE.leather, guide: false, register: 'low' },
};
// The order also seeds the per-hit variation of the sound: keep it stable.
const VOICE_ORDER = Object.keys(VOICES);

// ---------- the beat ----------
const hit = (step, velocity, tone) => (tone ? { step, velocity, tone } : { step, velocity });
const at = part => part.steps.map((step, i) => hit(step, part.velocity[i % part.velocity.length]));

// What the reference's drums play, per sixteenth of 170 (docs/rhythms/bregafunk.md, The beat): the
// bumbo on 1 and 9, the lata on 7 and 13, a palma with the second bumbo. A phrase's last bar («turn»)
// adds a pick-up bumbo and a second lata stroke.
export const BEAT = {
  bumbo: { steps: [0, 8], velocity: [1, 0.92] },
  lata: { steps: [6, 12], velocity: [1, 0.9] },
  palma: { steps: [8], velocity: [0.9] },
};
const TURN = {
  bumbo: { steps: [0, 8, 14], velocity: [1, 0.92, 0.7] },
  lata: { steps: [6, 12, 13], velocity: [1, 0.9, 0.6] },
  palma: BEAT.palma,
};
// The passinho variation: the bumbo doubled into the lata's own 3 + 3 + 2, the lata answered late.
export const PASSINHO = {
  bumbo: { steps: [0, 3, 8, 11], velocity: [1, 0.72, 0.92, 0.72] },
  lata: { steps: [6, 12, 14], velocity: [1, 0.9, 0.7] },
  palma: BEAT.palma,
};
// The Rio tamborzão, for the contrast: an atabaque line (grave and agudo) over a kick, no lata.
export const TAMBORZAO = {
  bumbo: { steps: [0, 3, 10, 13], velocity: [1, 0.7, 0.95, 0.7] },
  drum: { steps: [0, 3, 6, 10, 13], tones: ['grave', 'agudo', 'agudo', 'grave', 'agudo'] },
};
// The chimbal: four dry strokes between the drums, the last one open every other bar, a short roll
// at the end of a phrase. [step, velocity, tone]
const HATS = {
  plain: [
    [2, 0.5, 'closed'],
    [4, 0.7, 'closed'],
    [10, 0.5, 'closed'],
    [14, 0.62, 'closed'],
  ],
  open: [
    [2, 0.5, 'closed'],
    [4, 0.7, 'closed'],
    [10, 0.5, 'closed'],
    [14, 0.7, 'open'],
  ],
  turn: [
    [2, 0.5, 'closed'],
    [4, 0.7, 'closed'],
    [10, 0.5, 'closed'],
    [14, 0.6, 'double'],
    [15, 0.75, 'double'],
  ],
};
const PHRASE_BARS = 4; // drums and keys turn every four bars
const SILENT_FROM = 12; // the parada's last beat is silent
const DROP_OPEN_HAT = 0.9;
const BUILD_CLAPS = { steps: [0, 4, 8, 12], velocity: [0.7, 0.75, 0.8, 0.9] }; // the parada: palmas on every beat
const BREAK_ROLL = { steps: [8, 9, 10, 11], velocity: [0.55, 0.7, 0.85, 1] }; // and a lata roll into the silence

// ---------- the riff, the grave and the harmony ----------
// A Phrygian, the dark mode of the references. The riff has three notes (lá, mi, si bemol) and is two
// bars long: bar 1 on the tonic, bar 2 leaning on the flat second. Nothing else is harmony.
const PROGRESSION = ['Am', 'Bb'];
const TONIC = 'Am';
export const ROOTS = { Am: 'A1', Bb: 'Bb1' };
// The stab: root, fifth and octave on the tonic, the bare octave on the flat second, so the keys add
// no fourth note to the riff's three.
const STAB_CHORDS = { Am: ['A4', 'E5', 'A5'], Bb: ['Bb4', 'Bb5'] };
const HORN_CHORDS = { Am: ['E4', 'A4', 'C5'] };
// The riff, original to this show: [step, note, length in sixteenths, slide?]. Short tongued notes,
// one repeated, a slide into the long one, and room at the end of its second bar, where the lata and
// the horns answer.
const SLIDE = 'g';
export const HOOK = [
  [
    [0, 'A4', 2],
    [3, 'A4', 1],
    [4, 'E5', 2],
    [6, 'E5', 3, SLIDE],
    [10, 'Bb4', 2],
    [12, 'A4', 3],
  ],
  [
    [0, 'A4', 2],
    [3, 'A4', 1],
    [4, 'E5', 2],
    [6, 'Bb4', 3, SLIDE],
    [10, 'A4', 2],
  ],
];
// Its one variation, on the drop: the fourth bar stutters its high note, as the genre's edits do.
const VARIED_BAR = 3;
export const HOOK_VARIED_BAR = [
  [0, 'E5', 1],
  [1, 'E5', 1],
  [2, 'E5', 1],
  [3, 'E5', 1],
  [4, 'E5', 2],
  [6, 'Bb4', 3, SLIDE],
  [10, 'A4', 2],
];
// The parada's last bar: the riff's high note stuttered in sixteenths, then twice as fast, then silence.
const STUTTER = { note: 'E5', single: [0, 2, 4, 5, 6, 7], rolled: [8, 9, 10, 11] };
const ROLLED = 'r';
const FINAL_NOTE = ['A4', STEPS_PER_BAR / 2]; // the cut: one held tonic
const LONG_STEPS = 3; // a riff note this long or longer is held, with vibrato; shorter ones are tongued
const HOOK_VELOCITY = { long: 0.95, onBeat: 0.9, between: 0.74 };
// The grave plays the riff's own notes two octaves down, in short strokes with the drums: in the
// references the bass holds the riff's pitch classes in notes of one to two sixteenths, four to nine
// a bar. The last one slides into the next bar's tonic. [step, note, length, velocity, slide to]
export const GRAVE_RIFF = [
  [
    [0, 'A1', 2, 1],
    [3, 'A1', 1, 0.8],
    [6, 'E2', 2, 0.9],
    [8, 'A1', 2, 0.92],
    [11, 'Bb1', 1, 0.8],
    [12, 'A1', 2, 0.85],
  ],
  [
    [0, 'A1', 2, 1],
    [3, 'A1', 1, 0.8],
    [6, 'Bb1', 2, 0.9],
    [8, 'A1', 2, 0.92],
    [12, 'E2', 2, 0.85, 'A1'],
  ],
];
// The stab plays with the lata; a phrase's last bar adds a two-note pick-up. [step, length, velocity]
const STAB_AT = [
  [6, 2, 0.9],
  [12, 2, 0.82],
];
const STAB_TURN = [
  [14, 1, 0.6],
  [15, 1, 0.75],
];
// The horns answer the riff in the room its second bar leaves. [step, length]
const HORNS_AT = [
  [],
  [
    [13, 1],
    [14, 2],
  ],
];
const HORN_VELOCITY = 0.9;
// The riser: noise climbing over the parada's last two bars, up to its silent beat.
const RISER = { fromBar: 2, steps: STEPS_PER_BAR + SILENT_FROM, velocity: 0.8, tone: 'subida' };
// The strokes that tease the beat before it drops: a palma and the lata; a pick-up adds a second
// lata stroke and the bumbo that pulls the next bar. A stop leaves the riff alone, with one palma.
const TEASE = { palma: { steps: [8], velocity: [0.8] }, lata: { steps: [12], velocity: [0.85] } };
const PICKUP = { palma: TEASE.palma, lata: { steps: [12, 13], velocity: [0.9, 0.7] }, bumbo: { steps: [14], velocity: [0.8] } };
const STOP = { palma: { steps: [12], velocity: [0.8] } };
const SPARSE = { tease: TEASE, pickup: PICKUP, stop: STOP };

const chordOf = barInScene => PROGRESSION[barInScene % PROGRESSION.length];
const nextChordOf = barInScene => PROGRESSION[(barInScene + 1) % PROGRESSION.length];
const TONE = /^([^:]+):(\d+)(?::(\w))?$/; // a pitched hit's tone: what it plays, its length in sixteenths, an ornament
const silentBar = () => Object.fromEntries(VOICE_ORDER.map(voice => [voice, []]));
const hookVelocity = (step, length) => (length >= LONG_STEPS ? HOOK_VELOCITY.long : step % STEPS_PER_BEAT === 0 ? HOOK_VELOCITY.onBeat : HOOK_VELOCITY.between);
const hookHits = notes =>
  notes.map(([step, note, length, ornament]) => hit(step, hookVelocity(step, length), `${note}:${length}${ornament ? `:${ornament}` : ''}`));

function hookBar(scene, barInScene) {
  const index = barInScene % HOOK.length;
  return hookHits(scene.hookVaried && barInScene === VARIED_BAR ? HOOK_VARIED_BAR : HOOK[index]);
}
const graveTone = (from, to, length) => `${from}>${to}:${length}`;
const graveBar = barInScene =>
  GRAVE_RIFF[barInScene % GRAVE_RIFF.length].map(([step, note, length, velocity, to = note]) => hit(step, velocity, graveTone(note, to, length)));
const isTurn = barInScene => barInScene % PHRASE_BARS === PHRASE_BARS - 1;
const stabBar = barInScene =>
  [...STAB_AT, ...(isTurn(barInScene) ? STAB_TURN : [])].map(([step, length, velocity]) =>
    hit(step, velocity, `${step >= STAB_TURN[0][0] ? nextChordOf(barInScene) : chordOf(barInScene)}:${length}`),
  );
const hornsBar = barInScene => HORNS_AT[barInScene % HORNS_AT.length].map(([step, length]) => hit(step, HORN_VELOCITY, `${TONIC}:${length}`));
const hatsBar = barInScene => HATS[isTurn(barInScene) ? 'turn' : barInScene % 2 ? 'open' : 'plain'].map(([step, velocity, tone]) => hit(step, velocity, tone));

// Bar modes: normal; tease and pickup (the riff with a few strokes of the beat to come); stop (the
// drums and the grave vanish for the bar: the riff alone); break (the parada's last bar: a stutter,
// a roll, then one silent beat); cut (everyone on 1, then silence: the end). `scene.pattern` picks
// the beat: brega (the basic one) or passinho.
export function barHits(scene, barInScene) {
  const hits = allHits(scene, barInScene),
    playing = new Set(scene.voices(barInScene));
  // a voice that has not entered yet is not on the wheel: each entry stands out on its own
  return Object.fromEntries(VOICE_ORDER.map(voice => [voice, playing.has(voice) ? hits[voice] : []]));
}
function cutBar() {
  const [note, length] = FINAL_NOTE;
  return {
    ...silentBar(),
    bumbo: [hit(0, 1)],
    lata: [hit(0, 1)],
    palma: [hit(0, 1)],
    chimbal: [hit(0, DROP_OPEN_HAT, 'open')],
    grave: [hit(0, 1, graveTone(ROOTS[TONIC], ROOTS[TONIC], length))],
    teclado: [hit(0, 1, `${TONIC}:${length}`)],
    flauta: [hit(0, HOOK_VELOCITY.long, `${note}:${length}`)],
    metais: [hit(0, HORN_VELOCITY, `${TONIC}:${length}`)],
  };
}
function breakBar() {
  return {
    ...silentBar(),
    lata: at(BREAK_ROLL),
    palma: at(BUILD_CLAPS).filter(h => h.step < BREAK_ROLL.steps[0]),
    flauta: [
      ...STUTTER.single.map(step => hit(step, HOOK_VELOCITY.onBeat, `${STUTTER.note}:1`)),
      ...STUTTER.rolled.map(step => hit(step, HOOK_VELOCITY.long, `${STUTTER.note}:1:${ROLLED}`)),
    ],
  };
}
function allHits(scene, barInScene) {
  const mode = scene.mode(barInScene);
  if (mode === 'cut') return cutBar();
  if (mode === 'break') return breakBar();
  if (SPARSE[mode])
    return {
      ...silentBar(),
      flauta: hookBar(scene, barInScene),
      grave: mode === 'stop' ? [] : graveBar(barInScene),
      ...Object.fromEntries(Object.entries(SPARSE[mode]).map(([voice, part]) => [voice, at(part)])),
    };
  const drums = scene.pattern === 'passinho' ? PASSINHO : isTurn(barInScene) ? TURN : BEAT;
  const hats = hatsBar(barInScene);
  if (scene.openHat && barInScene === 0) hats.unshift(hit(0, DROP_OPEN_HAT, 'open'));
  const stabs = stabBar(barInScene);
  if (scene.build && barInScene === RISER.fromBar) stabs.unshift(hit(0, RISER.velocity, `${RISER.tone}:${RISER.steps}`));
  return {
    ...silentBar(),
    bumbo: at(drums.bumbo),
    lata: at(drums.lata),
    palma: at(scene.build && barInScene > 0 ? BUILD_CLAPS : drums.palma),
    chimbal: hats,
    grave: graveBar(barInScene),
    teclado: stabs,
    flauta: hookBar(scene, barInScene),
    metais: hornsBar(barInScene),
  };
}

// ---------- the show script, one tempo throughout ----------
// The form the owner accepted for round two (docs/rhythms/bregafunk.md): the riff alone, teased by a
// few strokes; the beat drops whole; riff and beat, then a stop; the grave enters; a longer stop with
// a rise; the drop with everything, stopped once in its middle; a breath on the riff and the grave;
// the beat again with the bumbo doubled; a last stop, and the end on the riff. 64 bars: 1:30.
// Each scene declares how it is entered, and the bar before it is written to lead in.
const always = value => () => value;
const DRUMS = ['bumbo', 'lata', 'palma', 'chimbal'];
const BEAT_VOICES = [...DRUMS, 'grave'];
const FULL = [...BEAT_VOICES, 'teclado', 'flauta'];
const TEASED = ['flauta', 'palma', 'lata', 'bumbo'];
const lastBarIs = (bars, mode) => bar => (bar === bars - 1 ? mode : 'normal');
const TEMA_BARS = 4;
const PARADA_BARS = 4;
const DROP_BARS = 16;
const RESPIRO_BARS = 4;
const PASSINHO_BARS = 12;
const FINAL_BARS = 4;
const SCENE_LIST = [
  {
    id: 'tema',
    bars: TEMA_BARS,
    voices: bar => (bar < TEMA_BARS / 2 ? ['flauta'] : TEASED), // twice alone, then teased
    mode: bar => ['normal', 'normal', 'tease', 'pickup'][bar],
    lanes: ['flauta', 'lata', 'bumbo'],
  },
  { id: 'batida', bars: 4, leadIn: 'pickup', voices: always(DRUMS), lanes: ['bumbo', 'lata', 'palma', 'chimbal'] },
  { id: 'juntos', bars: 8, leadIn: 'fill', voices: always([...DRUMS, 'flauta']), mode: lastBarIs(8, 'stop'), lanes: ['bumbo', 'lata', 'palma', 'flauta'] },
  { id: 'grave', bars: 8, leadIn: 'dropOut', voices: always([...BEAT_VOICES, 'flauta']), lanes: ['bumbo', 'grave', 'lata', 'flauta'] },
  {
    id: 'parada',
    bars: PARADA_BARS,
    leadIn: 'fill',
    build: true,
    voices: bar => (bar === PARADA_BARS - 1 ? ['lata', 'palma', 'flauta'] : ['palma', 'chimbal', 'teclado', 'flauta']), // the drums drop out
    mode: lastBarIs(PARADA_BARS, 'break'),
    lanes: ['flauta', 'teclado', 'palma', 'lata'],
  },
  {
    id: 'drop',
    bars: DROP_BARS,
    leadIn: 'dropOut',
    voices: always([...FULL, 'metais']),
    openHat: true,
    hookVaried: true,
    mode: bar => (bar % (DROP_BARS / 2) === DROP_BARS / 2 - 1 ? 'stop' : 'normal'), // a stop every eight bars
    lanes: ['bumbo', 'lata', 'grave', 'flauta', 'metais'],
  },
  {
    id: 'respiro',
    bars: RESPIRO_BARS,
    leadIn: 'dropOut',
    voices: bar => (bar === RESPIRO_BARS - 1 ? ['grave', ...TEASED] : ['grave', 'flauta', 'palma']),
    mode: bar => (bar === RESPIRO_BARS - 1 ? 'pickup' : 'tease'),
    lanes: ['flauta', 'grave', 'palma'],
  },
  {
    id: 'passinho',
    bars: PASSINHO_BARS,
    leadIn: 'pickup',
    pattern: 'passinho',
    voices: always(FULL),
    mode: lastBarIs(PASSINHO_BARS, 'stop'),
    lanes: ['bumbo', 'lata', 'grave', 'flauta'],
  },
  {
    id: 'final',
    bars: FINAL_BARS,
    leadIn: 'dropOut',
    voices: bar => (bar === FINAL_BARS - 1 ? [...FULL, 'metais'] : ['flauta']), // the riff alone, then everyone on 1
    mode: lastBarIs(FINAL_BARS, 'cut'),
    lanes: ['flauta', 'bumbo', 'grave'],
    isEnd: true,
  },
];
// The background is the rhythm's own (bregafunk-background.js); the looks keep only the speed of
// its clock, which the engine reads, at real time.
const LOOK = { zoom: 0, rot: 0, hue: 0, keep: 0, seg: 0, warp: 0, pal: 0, speed: 1 };
const SCENE_LOOKS = Object.fromEntries(SCENE_LIST.map(scene => [scene.id, LOOK]));

// ---------- sound: a drum machine, synthesizers and recorded takes in the studio (src/studio.js) ----------
// The bumbo, lata, palma, grave, stab and riser are synthesized (bregafunk-synth.js): the genre is
// made in a DAW. The flute, the horns, the chimbais and the atabaques are recorded takes (CC0).
// Programmed, as producers do: every voice on the hard grid, the bumbo ducks the melodic voices.
// Sources: CREDITS.md; choices: docs/rhythms/bregafunk.md, Sounds.
const parse = tone => {
  const [, what, length, ornament] = TONE.exec(tone);
  return { what, seconds: Number(length) * STEP_SECONDS, ornament };
};
const ROLL = { notes: 2, gain: 0.8 }; // a «double» hat or a rolled flute note: two strokes in one sixteenth
// A slide into a long flute note: it starts two semitones flat and reaches the note in 45 ms.
const FLUTE_SLIDE = { semitones: 2, at: 0, over: 0.045 };
const TONGUED = 0.82; // a short flute note sounds for this share of its length, so repeated notes separate
const GRAVE_GLIDE = { at: 0.3, over: 0.5 }; // where in the note the 808 starts to slide, and for how long (shares)
const STAB_STRUM = 0.003;
// Width: a slow stereo chorus puts a copy of the voice on each side, as a producer's widener does.
const WIDE = { rate: 0.4, depth: 0.0015, mix: 0.5 };
const WIDER = { rate: 0.6, depth: 0.0025, mix: 0.6 };
const STUDIO = {
  room: 'sala-viva',
  roomLevel: 0.55,
  lead: 'bumbo',
  output: 1.15,
  duck: { by: 'bumbo', depth: 0.5, hold: 0.06, release: 0.07 },
  echo: { time: 3 * STEP_SECONDS, feedback: 0.34, level: 0.55, pan: 0.45, highpass: 500, lowpass: 4500 }, // a dotted eighth behind
  tone: [{ type: 'peaking', frequency: 1800, gain: -2, Q: 0.4 }], // the bus balance, tilted to the reference's darker middle
  voices: {
    bumbo: { seed: 31, role: 'grid', gain: 1, send: 0.02, bright: [9000, 18000], strokes: () => ({ hit: SYNTH_TAKES.bumbo }) },
    grave: {
      seed: 32,
      role: 'grid',
      gain: 0.5,
      send: 0.02,
      ducked: true,
      bright: [900, 2400],
      zone: 0,
      release: 0.05,
      strokes: () => ({ nota: SYNTH_TAKES.grave }),
      shape: tone => {
        const { what, seconds } = parse(tone),
          [from, to] = what.split('>'),
          semitones = midiOf(to) - midiOf(from);
        return {
          stroke: 'nota',
          notes: [midiOf(from)],
          length: seconds,
          glide: semitones ? { semitones, at: seconds * GRAVE_GLIDE.at, over: seconds * GRAVE_GLIDE.over } : null,
        };
      },
    },
    lata: {
      seed: 33,
      role: 'grid',
      gain: 0.95,
      pan: 0.1,
      send: 0.12,
      chorus: WIDE,
      strokes: () => ({ hit: SYNTH_TAKES.lata }),
    },
    palma: {
      seed: 39,
      role: 'grid',
      gain: 0.9,
      pan: -0.08,
      send: 0.2,
      chorus: WIDER,
      strokes: () => ({ hit: SYNTH_TAKES.palma }),
    },
    chimbal: {
      seed: 34,
      role: 'grid',
      gain: 0.18,
      pan: 0.3,
      send: 0.06,
      bright: [5000, 18000],
      strokes: () => ({ closed: takes('chimbal-fechado'), open: takes('chimbal-aberto') }),
      shape: tone =>
        tone === 'double'
          ? { stroke: 'closed', notes: Array(ROLL.notes).fill(null), strum: STEP_SECONDS / ROLL.notes, gain: ROLL.gain }
          : { stroke: tone === 'open' ? 'open' : 'closed' },
    },
    teclado: {
      seed: 35,
      role: 'grid',
      gain: 0.1,
      pan: -0.1,
      send: 0.18,
      echo: 0.2,
      ducked: true,
      zone: 0,
      bright: [5000, 14000],
      chorus: WIDER,
      strokes: () => ({ acorde: SYNTH_TAKES.stab, subida: SYNTH_TAKES.riser }),
      shape: tone => {
        const { what, seconds } = parse(tone);
        return what === RISER.tone
          ? { stroke: 'subida', length: seconds }
          : { stroke: 'acorde', notes: STAB_CHORDS[what].map(midiOf), length: seconds, strum: STAB_STRUM };
      },
    },
    flauta: {
      seed: 36,
      role: 'grid',
      gain: 0.21,
      pan: -0.05,
      send: 0.28,
      echo: 0.4,
      ducked: true,
      release: 0.05,
      bright: [6000, 16000],
      strokes: () => ({ curta: takes('flauta-stac'), longa: takes('flauta-sus') }),
      shape: tone => {
        const { what, seconds, ornament } = parse(tone),
          note = midiOf(what);
        if (ornament === ROLLED)
          return { stroke: 'curta', notes: Array(ROLL.notes).fill(note), strum: STEP_SECONDS / ROLL.notes, length: seconds, gain: ROLL.gain };
        if (seconds < LONG_STEPS * STEP_SECONDS) return { stroke: 'curta', notes: [note], length: seconds * TONGUED };
        return ornament === SLIDE
          ? { stroke: 'longa', notes: [note - FLUTE_SLIDE.semitones], length: seconds, glide: FLUTE_SLIDE }
          : { stroke: 'longa', notes: [note], length: seconds };
      },
    },
    metais: {
      seed: 37,
      role: 'grid',
      gain: 0.13,
      pan: 0.12,
      send: 0.22,
      ducked: true,
      chorus: WIDE,
      strokes: () => ({ acorde: takes('trompete-stac', 'trombone-stac') }),
      shape: tone => {
        const { what, seconds } = parse(tone);
        return { stroke: 'acorde', notes: HORN_CHORDS[what].map(midiOf), length: seconds };
      },
    },
    tamborzao: {
      seed: 38,
      role: 'grid',
      gain: 0.75,
      pan: -0.1,
      send: 0.1,
      strokes: () => ({ grave: takes('atabaque-grave'), agudo: takes('atabaque-agudo') }),
    },
  },
};
const SOUND_CHOICES = recordedChoices(STUDIO, [
  ['bumbo', 'bumbo', ['bumbo'], 'bumbo sintetizado'],
  ['grave', 'grave', ['grave'], 'grave 808 sintetizado'],
  ['lata', 'lata', ['lata'], 'lata sintetizada'],
  ['palma', 'palma', ['palma'], 'palma eletrônica'],
  ['chimbal', 'chimbal', ['chimbal'], 'chimbal gravado'],
  ['teclado', 'teclado', ['teclado'], 'sintetizador'],
  ['flauta', 'flauta', ['flauta'], 'flauta gravada'],
  ['metais', 'naipe de metais', ['metais'], 'trompete e trombone'],
  ['tamborzao', 'atabaque', ['tamborzao'], 'atabaques gravados'],
]);

// ---------- the wheel's motion: the hips of the passinho ----------
// At 170 a lean on every beat would be 0.35 s: the hips lean one way over beats 1 and 2 and the
// other over 3 and 4 (BEATS_PER_LEAN), as the passinho dances it.
const SWAY_DEGREES = 2.5;
const KICK_SWELL = 0.03; // and swells a little on each bumbo
const KICK_SWELL_SECONDS = 0.14;
/** The wheel at `position` (bars), from its beat and the hits just heard. */
function wheelMotion(position, recent = []) {
  const beats = position * BEATS_PER_BAR,
    lean = Math.sin((Math.PI * beats) / BEATS_PER_LEAN);
  let swell = 0;
  for (const h of recent) if (h.voice === 'bumbo') swell = Math.max(swell, h.hit.velocity * Math.exp(-h.age / KICK_SWELL_SECONDS));
  return { rotate: SWAY_DEGREES * lean * Math.abs(lean), scale: 1 + KICK_SWELL * swell };
}

// ---------- copy ----------
const NOTE_NAMES = { A: 'lá', B: 'si', C: 'dó', D: 'ré', E: 'mi', F: 'fá', G: 'sol' };
const noteName = note => NOTE_NAMES[note[0]] + (note[1] === 'b' ? ' bemol' : '');
const countFromOne = steps => steps.map(step => step + 1).join(' · ');
const intervals = steps => steps.map((step, i) => (steps[(i + 1) % steps.length] - step + STEPS_PER_BAR) % STEPS_PER_BAR || STEPS_PER_BAR);
// The 3 + 3 + 2: the first bumbo and the two latas, counted in eighths.
const TRESILLO = [BEAT.bumbo.steps[0], ...BEAT.lata.steps];
const GROUPING = intervals(TRESILLO).map(sixteenths => sixteenths / STEPS_PER_EIGHTH);
const DRUMMING = new Set(SCENE_LIST.flatMap(scene => [...Array(scene.bars).keys()].flatMap(scene.voices)));
const sceneOf = id => SCENE_LIST.find(scene => scene.id === id);
const RIFF_NOTES = [...new Set(HOOK.flat().map(([, note]) => note.slice(0, -1)))]; // the riff's three notes, in the order it plays them
const READ = {
  tempo: 'andamento',
  tempoValue: `${BPM} BPM`,
  cycle: '1 ciclo',
  cycleValue: seconds => `${STEPS_PER_BAR} semicolcheias = ${seconds} s`,
  key: 'modo',
  keyValue: 'lá frígio',
  hook: 'tema',
  hookValue: `${RIFF_NOTES.length} notas em ${HOOK.length} compassos, na flauta`,
  enters: 'entra',
  entersMuted: 'sem som',
  heads: 'no tempo',
  grouping: 'agrupamento',
  groupingValue: GROUPING.join(' + '),
  groupingUnit: 'colcheias',
  withKick: 'com o bumbo',
  few: 'chimbais',
  fewValue: `${HATS.plain.length} por compasso, secos`,
  notes: 'notas',
  notesValue: RIFF_NOTES.map(noteName).join(' · '),
  likeRiff: 'as notas do tema',
  likeRiffValue: 'duas oitavas abaixo, curtas',
  riff: 'tema',
  stop: 'parada',
  stopValue: 'a bateria some por 1 compasso',
  breath: 'sem bateria',
  breathValue: 'tema e grave',
  ending: 'final',
  endingValue: 'o tema sozinho',
  withLata: 'com a lata',
  stabNotes: 'acorde',
  stabNotesValue: 'tônica, quinta e oitava',
  low: 'grave',
  mid: 'médio',
  high: 'agudo',
  silentBeat: 'tempo em silêncio',
  voices: 'vozes',
  horns: 'metais',
  hornsValue: 'respondem a flauta',
  hookChange: 'o tema muda',
  hookChangeValue: 'gagueja no agudo, uma vez',
  doubled: 'bumbo dobrado',
  bars: 'compassos',
};
const SCENE_COPY = {
  tema: { chip: 'Tema', eyebrow: 'bregafunk', title: 'Tema' },
  batida: { chip: 'Batida', eyebrow: READ.groupingValue, title: 'Batida' },
  juntos: { chip: 'Tema e batida', eyebrow: 'flauta, bumbo e lata', title: 'Tema e batida' },
  grave: { chip: 'Grave', eyebrow: 'grave 808', title: 'Grave' },
  parada: { chip: 'Parada', eyebrow: `1 ${READ.silentBeat}`, title: 'Parada' },
  drop: { chip: 'Pancadão', eyebrow: 'com metais', title: 'Pancadão' },
  respiro: { chip: 'Respiro', eyebrow: READ.breath, title: 'Respiro' },
  passinho: { chip: 'Passinho', eyebrow: READ.doubled, title: 'Passinho' },
  final: { chip: 'Final', eyebrow: '', title: 'Fim' },
};
const COPY = {
  name: 'bregafunk',
  description: 'Bregafunk do Recife a 171 BPM: um tema de três notas na flauta, bumbo e lata em 3 + 3 + 2, o grave, as paradas e o pancadão.', // the page's search and preview description
  themeColor: PALETTE.ground, // the page's theme-color: the rhythm's own ground colour
  feminineInstruments: ['lata', 'palma', 'flauta'], // "som da lata", "som do bumbo"
  scenes: SCENE_COPY,
  patterns: {},
  voices: {
    bumbo: 'bumbo',
    grave: 'grave',
    lata: 'lata',
    palma: 'palma',
    chimbal: 'chimbal',
    teclado: 'teclado',
    flauta: 'flauta',
    metais: 'metais',
    tamborzao: 'atabaque',
  },
  instruments: {},
  hands: {},
  centre: { break: 'QUEBRA', cut: 'CORTE', end: 'FIM' },
  read: READ,
};

// ---------- readout layouts ----------
const T = READ;
const beatSeparator = step => (step % STEPS_PER_BEAT === STEPS_PER_BEAT - 1 && step < STEPS_PER_BAR - 1 ? '|' : '');
const sequence = (steps, color) =>
  `<span class="seq" style="color:${color}">${SIXTEENTHS.map(step => (steps.includes(step) ? '●' : '·') + beatSeparator(step)).join('')}</span>`;
const notationRow = (text, steps, voice) =>
  `${label(text, VOICES[voice].color, voice)}${sequence(steps, VOICES[voice].color)}<span class="n">${steps.length}</span>`;
const notation = (...rows) => `<div class="notation">${rows.join('')}</div>`;
const entry = `<div data-entry></div>`;
const LAYOUTS = {
  tema: () =>
    row(label(T.tempo), T.tempoValue) +
    row(label(T.cycle), T.cycleValue(BAR_SECONDS.toFixed(2).replace('.', ','))) +
    row(label(T.key), T.keyValue) +
    row(label(T.hook), T.hookValue, 'flauta'),
  batida: () =>
    notation(notationRow(COPY.voices.bumbo, BEAT.bumbo.steps, 'bumbo'), notationRow(COPY.voices.lata, BEAT.lata.steps, 'lata')) +
    row(label(T.grouping), `${T.groupingValue} ${T.groupingUnit}`) +
    row(label(T.withKick), countFromOne(BEAT.palma.steps), 'palma'),
  juntos: () => row(label(T.riff), T.notesValue, 'flauta') + row(label(T.stop), T.stopValue) + row(label(T.few), T.fewValue, 'chimbal'),
  grave: () => entry + row(label(T.likeRiff), T.notesValue, 'grave') + row(label(T.low), T.likeRiffValue, 'grave'),
  parada: () => stats('two', stat(1, T.silentBeat, PALETTE.gold), stat(sceneOf('parada').voices().length, T.voices, PALETTE.tin)),
  drop: () =>
    stats('two', stat(sceneOf('drop').voices().length, T.voices, PALETTE.gold), stat(BPM, 'BPM', PALETTE.lime)) +
    row(label(T.horns, PALETTE.gold), T.hornsValue, 'metais') +
    row(label(T.hookChange), T.hookChangeValue, 'flauta'),
  respiro: () => row(label(T.breath), T.breathValue) + row(label(T.likeRiff), T.notesValue, 'grave'),
  passinho: () =>
    notation(
      notationRow(COPY.voices.bumbo, BEAT.bumbo.steps, 'bumbo'),
      notationRow(T.doubled, PASSINHO.bumbo.steps, 'bumbo'),
      notationRow(COPY.voices.lata, PASSINHO.lata.steps, 'lata'),
    ),
  final: show =>
    stats('', stat(DRUMMING.size, T.voices, PALETTE.lime), stat(show.totalBars, T.bars, PALETTE.ivory), stat(BPM, 'BPM', PALETTE.gold)) +
    row(label(T.ending), T.endingValue, 'flauta'),
};
const FOCUS = { tema: 'flauta', grave: 'grave' };
const readout = (scene, show) => ({ markup: (LAYOUTS[scene.id] || (() => ''))(show), score: null, focus: FOCUS[scene.id] || '' });

export const BREGAFUNK = {
  id: ID,
  ...straightMeter(BPM, BEATS_PER_BAR, STEPS_PER_BEAT),
  voices: VOICES,
  shapeVoices: ['lata', 'bumbo'], // the 3 + 3 + 2: the lata's shape over the bumbo's
  barHits,
  sceneDefaults: { pattern: 'brega' },
  scenes: SCENE_LIST,
  looks: SCENE_LOOKS,
  background: { create: createBregafunkBackground },
  wheelMotion,
  readout,
  waves: null,
  sounds: { ...studioSounds(STUDIO, SOUND_CHOICES, 'drop'), synth: synthOf(RISER.steps * STEP_SECONDS) },
  copy: COPY,
};

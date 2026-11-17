// Bregafunk: everything the engine plays and shows that belongs to this rhythm (Recife, since about
// 2009). 170 BPM, felt at 170: one 16-sixteenth bar per turn of the wheel (1.41 s), the bumbo on 1
// and 3, the metallic «lata» in 3 + 3 + 2 per half bar, chimbais in sixteenths, the sliding «grave»,
// keys on 2 and 4 and a short minor hook. Hard-quantized, as it is programmed: no swing.
// Research and choices: docs/research/brega-forro.md, docs/rhythms/bregafunk.md.
import { label, row, stat, stats } from '../readout-markup.js';
import { BEATS_PER_LEAN, createBregafunkBackground, PALETTE } from './bregafunk-background.js';
import { straightMeter } from './meter.js';
import { midiOf, recordedChoices, studioSounds, takes } from './studio-kit.js';

// The top of today's 160 to 170 (docs/research/brega-forro.md, Tempo; D26 in docs/decisions.md):
// the wheel is one bar at that tempo, so the bumbo, lata and chimbal are felt at 170 (#23).
const BPM = 170;
const BEATS_PER_BAR = 4;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const STEP_SECONDS = 60 / BPM / STEPS_PER_BEAT;
const BAR_SECONDS = STEP_SECONDS * STEPS_PER_BAR;
const SIXTEENTHS = [...Array(STEPS_PER_BAR).keys()];
const ID = 'bregafunk';

// ring/size: where and how big the voice sits on the wheel. register: the band it fills (grave,
// médio, agudo: one layer per band). pitched: a melodic voice keeps its tuning on every hit.
// guide: false: no ring line of its own (the tamborzão shares the lata's ring; they never play together).
export const VOICES = {
  bumbo: { instrument: 'bumbo', ring: 98, size: 5.6, swing: null, color: PALETTE.purple, boom: 1, register: 'low' },
  grave: { instrument: 'grave', ring: 89, size: 4.8, swing: null, color: PALETTE.violet, pitched: true, register: 'low' },
  lata: { instrument: 'lata', ring: 79, size: 4.6, swing: null, color: PALETTE.lime, crack: true, register: 'high' },
  chimbal: { instrument: 'chimbal', ring: 70, size: 2.2, swing: null, color: PALETTE.tin, register: 'high', toneScale: { double: 1.25, open: 1.4 } },
  teclado: { instrument: 'teclado', ring: 61, size: 3.4, swing: null, color: PALETTE.ivory, pitched: true, register: 'mid' },
  lead: { instrument: 'lead', ring: 52, size: 3.4, swing: null, color: PALETTE.orange, pitched: true, register: 'high' },
  metais: { instrument: 'metais', ring: 43, size: 4, swing: null, color: PALETTE.gold, pitched: true, spark: true, register: 'mid' },
  tamborzao: { instrument: 'tamborzao', ring: 79, size: 4.6, swing: null, color: PALETTE.leather, guide: false, register: 'low' },
};
// The order also seeds the per-hit variation of the sound: keep it stable.
const VOICE_ORDER = Object.keys(VOICES);

// ---------- the beat ----------
const hit = (step, velocity, tone) => (tone ? { step, velocity, tone } : { step, velocity });
const at = (steps, velocities) => steps.map((step, i) => hit(step, velocities[i % velocities.length]));

// The bumbo on 1 and 9 with ghost notes on 7 and 15; the lata on 4, 7, 12 and 15 (counted from 1),
// so bumbo and lata group each half bar as 3 + 3 + 2.
export const BEAT = {
  bumbo: { steps: [0, 6, 8, 14], velocity: [1, 0.5, 0.95, 0.5] },
  lata: { steps: [3, 6, 11, 14], velocity: [1, 0.8, 1, 0.8] },
};
// The passinho variation: the bumbo doubled, the lata pushed earlier in the second half.
export const PASSINHO = {
  bumbo: { steps: [0, 2, 6, 8, 10, 14], velocity: [1, 0.6, 0.55, 0.95, 0.6, 0.55] },
  lata: { steps: [3, 6, 10, 11, 14], velocity: [1, 0.8, 0.7, 1, 0.8] },
};
// The Rio tamborzão, for the contrast: an atabaque line (grave and agudo) over a kick, no lata.
export const TAMBORZAO = {
  bumbo: { steps: [0, 3, 10, 13], velocity: [1, 0.7, 0.95, 0.7] },
  drum: { steps: [0, 3, 6, 10, 13], tones: ['grave', 'agudo', 'agudo', 'grave', 'agudo'] },
};
const HAT_VELOCITY = [0.6, 0.45, 0.8, 0.45]; // per sixteenth of a beat: the off-beat «e» accented
const ROLL_FROM = { chimbais: 12, quebra: 8 }; // where the 32nd-note roll starts in a scene's last bar
const SILENT_FROM = 12; // the quebra's last beat is silent
const KEYS_AT = [hit(4, 0.9, 2), hit(12, 0.9, 2), hit(14, 0.55, 1)]; // tone: length in sixteenths
const DROP_OPEN_HAT = 0.9;

// ---------- harmony, hook and bass ----------
// A minor; four bars of harmony under a two-bar hook, so the hook meets two harmonies.
const PROGRESSION = ['Am', 'Am', 'F', 'G'];
export const ROOTS = { Am: 'A1', F: 'F1', G: 'G1' };
const KEY_CHORDS = { Am: ['A3', 'C4', 'E4'], F: ['F3', 'A3', 'C4'], G: ['G3', 'B3', 'D4'] };
const HORN_CHORDS = { Am: ['E4', 'A4', 'C5'], F: ['F4', 'A4', 'C5'], G: ['D4', 'G4', 'B4'] };
// The hook: [step, note, length in sixteenths], a wave that leaps to E6 in its second bar.
export const HOOK = [
  [
    [0, 'E5', 2],
    [3, 'A5', 3],
    [6, 'C6', 2],
    [8, 'B5', 2],
    [10, 'A5', 1],
    [11, 'G5', 3],
    [14, 'E5', 2],
  ],
  [
    [0, 'A5', 3],
    [3, 'C6', 3],
    [6, 'E6', 2],
    [8, 'D6', 2],
    [10, 'C6', 1],
    [11, 'B5', 3],
    [14, 'G5', 2],
  ],
];
// Its one variation, on the drop: the second bar climbs back to E6 and holds it instead of falling.
export const HOOK_VARIED = [
  HOOK[0],
  [
    [0, 'A5', 3],
    [3, 'C6', 3],
    [6, 'E6', 2],
    [8, 'D6', 2],
    [10, 'C6', 1],
    [11, 'D6', 1],
    [12, 'E6', 4],
  ],
];
const FINAL_NOTE = ['A5', STEPS_PER_BAR / 2]; // the cut: one held tonic
const HOOK_VELOCITY = 0.9;
// The grave: the root on 1 held to the ghost note on 7, a short hit on 7, and on 9 a long note that
// glides into the next bar's root.
const GRAVE_AT = [
  [0, 6, 1, false],
  [6, 2, 0.7, false],
  [8, 8, 0.95, true],
]; // [step, length, velocity, glides]
// The horns answer the hook: a stab on the hook's first bar, two pick-ups at the end of its second.
const HORNS_AT = [
  [[0, 2]],
  [
    [11, 1],
    [14, 2],
  ],
]; // per hook bar: [step, length]
const HORN_VELOCITY = 0.9;

const chordOf = barInScene => PROGRESSION[barInScene % PROGRESSION.length];
const nextChordOf = barInScene => PROGRESSION[(barInScene + 1) % PROGRESSION.length];
const TONE = /^(.+):(\d+)$/; // a pitched hit's tone: what it plays, then its length in sixteenths
const silentBar = () => Object.fromEntries(VOICE_ORDER.map(voice => [voice, []]));

const VARIED_STATEMENT = 1; // the drop varies its second statement of the hook only, then goes back
function hookBar(scene, barInScene) {
  const bars = scene.hookVaried && Math.floor(barInScene / HOOK.length) === VARIED_STATEMENT ? HOOK_VARIED : HOOK;
  return bars[barInScene % 2].map(([step, note, length]) => hit(step, HOOK_VELOCITY, `${note}:${length}`));
}
function graveBar(barInScene) {
  const chord = chordOf(barInScene);
  return GRAVE_AT.map(([step, length, velocity, glides]) =>
    hit(step, velocity, `${ROOTS[chord]}>${ROOTS[glides ? nextChordOf(barInScene) : chord]}:${length}`),
  );
}
const keysBar = barInScene => KEYS_AT.map(({ step, velocity, tone }) => hit(step, velocity, `${chordOf(barInScene)}:${tone}`));
function hornsBar(barInScene) {
  const pickUp = barInScene % 2 === 1;
  return HORNS_AT[barInScene % 2].map(([step, length]) => hit(step, HORN_VELOCITY, `${pickUp ? nextChordOf(barInScene) : chordOf(barInScene)}:${length}`));
}
function hatsBar(rollFrom = STEPS_PER_BAR, silentFrom = STEPS_PER_BAR) {
  return SIXTEENTHS.filter(step => step < silentFrom).map(step =>
    hit(step, step >= rollFrom ? HAT_VELOCITY[2] : HAT_VELOCITY[step % STEPS_PER_BEAT], step >= rollFrom ? 'double' : 'closed'),
  );
}

// Bar modes: normal, break (the quebra's bar: a roll, then one silent beat), cut (everyone on 1, then
// silence: the end). `scene.pattern` picks the beat: brega (the basic one), passinho or tamborzao.
export function barHits(scene, barInScene) {
  const hits = allHits(scene, barInScene),
    playing = new Set(scene.voices(barInScene));
  // a voice that has not entered yet is not on the wheel: each entry stands out on its own
  return Object.fromEntries(VOICE_ORDER.map(voice => [voice, playing.has(voice) ? hits[voice] : []]));
}
function allHits(scene, barInScene) {
  const mode = scene.mode(barInScene),
    bars = { brega: BEAT, passinho: PASSINHO }[scene.pattern];
  if (mode === 'cut') {
    const [note, length] = FINAL_NOTE;
    return {
      ...silentBar(),
      bumbo: [hit(0, 1)],
      lata: [hit(0, 1)],
      chimbal: [hit(0, DROP_OPEN_HAT, 'open')],
      grave: [hit(0, 1, `${ROOTS.Am}>${ROOTS.Am}:${length}`)],
      lead: [hit(0, HOOK_VELOCITY, `${note}:${length}`)],
    };
  }
  if (scene.pattern === 'tamborzao')
    return {
      ...silentBar(),
      bumbo: at(TAMBORZAO.bumbo.steps, TAMBORZAO.bumbo.velocity),
      tamborzao: TAMBORZAO.drum.steps.map((step, i) => hit(step, 1, TAMBORZAO.drum.tones[i])),
    };
  const lastBar = barInScene === scene.bars - 1;
  const hats =
    mode === 'break' ? hatsBar(ROLL_FROM.quebra, SILENT_FROM) : hatsBar(lastBar && ROLL_FROM[scene.id] !== undefined ? ROLL_FROM[scene.id] : STEPS_PER_BAR);
  if (scene.openHat && barInScene === 0) hats[0] = hit(0, DROP_OPEN_HAT, 'open');
  const hook = hookBar(scene, barInScene);
  // the quebra's notes stop where its silent beat starts
  const clipped = hook
    .filter(h => h.step < SILENT_FROM)
    .map(h => {
      const [, note, length] = TONE.exec(h.tone);
      return { ...h, tone: `${note}:${Math.min(Number(length), SILENT_FROM - h.step)}` };
    });
  return {
    ...silentBar(),
    bumbo: at(bars.bumbo.steps, bars.bumbo.velocity),
    lata: at(bars.lata.steps, bars.lata.velocity),
    chimbal: hats,
    grave: graveBar(barInScene),
    teclado: keysBar(barInScene),
    lead: mode === 'break' ? clipped : hook,
    metais: hornsBar(barInScene),
  };
}

// ---------- the show script (docs/sketches/scripts.html), one tempo throughout ----------
// Each scene of the sketch has twice its bars: a bar lasts half as long at 170, and the show stays
// between 1:30 and 2:00. A scene's mode reads its last bar from its own length.
const always = value => () => value;
const BEAT_VOICES = ['bumbo', 'lata', 'chimbal', 'grave'];
const FULL = [...BEAT_VOICES, 'teclado', 'lead'];
const SCENE_LIST = [
  { id: 'tema', bars: 4, voices: always(['lead']), lanes: ['lead'] },
  { id: 'bumbo', bars: 4, voices: always(['bumbo']), lanes: ['bumbo'] },
  { id: 'lata', bars: 8, voices: always(['bumbo', 'lata']), lanes: ['bumbo', 'lata'] },
  { id: 'chimbais', bars: 4, voices: always(['bumbo', 'lata', 'chimbal']), lanes: ['bumbo', 'lata', 'chimbal'] },
  { id: 'grave', bars: 8, voices: always(BEAT_VOICES), lanes: ['bumbo', 'grave', 'lata', 'chimbal'] },
  { id: 'batida', bars: 8, voices: always(FULL), lanes: ['bumbo', 'grave', 'lata', 'teclado', 'lead'] },
  { id: 'tamborzao', bars: 4, pattern: 'tamborzao', voices: always(['bumbo', 'tamborzao']), lanes: ['bumbo', 'tamborzao', 'lata'] },
  { id: 'quebra', bars: 4, voices: always(['chimbal', 'lead']), mode: bar => (bar === 3 ? 'break' : 'normal'), lanes: ['lead', 'chimbal'] },
  { id: 'drop', bars: 8, voices: always([...FULL, 'metais']), openHat: true, hookVaried: true, lanes: ['bumbo', 'lata', 'lead', 'metais'] },
  { id: 'passinho', bars: 8, pattern: 'passinho', voices: always([...BEAT_VOICES, 'lead']), lanes: ['bumbo', 'lata', 'grave', 'lead'] },
  {
    id: 'final',
    bars: 8,
    voices: always([...BEAT_VOICES, 'lead']),
    mode: bar => (bar === 7 ? 'cut' : 'normal'),
    lanes: ['bumbo', 'lata', 'grave', 'lead'],
    isEnd: true,
  },
];
// The background is the rhythm's own (bregafunk-background.js); the looks keep only the speed of
// its clock, which the engine reads, at real time.
const LOOK = { zoom: 0, rot: 0, hue: 0, keep: 0, seg: 0, warp: 0, pal: 0, speed: 1 };
const SCENE_LOOKS = Object.fromEntries(SCENE_LIST.map(scene => [scene.id, LOOK]));

// ---------- sound: recorded instruments in the studio (src/studio.js) ----------
// Recorded takes (CC0) for every voice: 808 kicks and subs, cans for the lata, hi-hats, an upright
// piano for the keys, a trumpet for the hook, trumpet and trombone for the horns, congas for the
// tamborzão. Programmed, as producers do: every voice on the hard grid, the kick ducks the rest.
// Sources: CREDITS.md; choices: docs/rhythms/studio.md.
const lengthOf = tone => Number(TONE.exec(tone)[2]) * STEP_SECONDS;
const noteOf = tone => TONE.exec(tone)[1];
const ECHO = { delay: 3 * STEP_SECONDS, gain: 0.32 }; // the lead's echo, a dotted eighth behind
const STACCATO_STEPS = 2; // a hook note this short or shorter is tongued short
const ROLL = { notes: 2, gain: 0.8 }; // a «double» hat: two strokes in one sixteenth
const STUDIO = {
  room: 'sala-viva',
  roomLevel: 0.7,
  lead: 'bumbo',
  duck: { by: 'bumbo', depth: 0.45, hold: 0.07, release: 0.06 },
  voices: {
    bumbo: { seed: 31, role: 'grid', gain: 0.95, send: 0.03, bright: [6000, 18000], strokes: () => ({ hit: takes('bumbo') }) },
    grave: {
      seed: 32,
      role: 'grid',
      gain: 0.7,
      send: 0.02,
      ducked: true,
      bright: [600, 3000],
      zone: 6,
      maxZone: 9, // a sine sub keeps its sound when retuned further
      strokes: () => ({ nota: takes('grave808') }),
      shape: tone => {
        const [from, to] = noteOf(tone).split('>'),
          length = lengthOf(tone),
          semitones = midiOf(to) - midiOf(from);
        return { stroke: 'nota', notes: [midiOf(from)], length, glide: semitones ? { semitones, at: length * 0.55, over: length * 0.4 } : null };
      },
    },
    lata: { seed: 33, role: 'grid', gain: 0.6, pan: 0.15, send: 0.14, strokes: () => ({ hit: takes('lata') }) },
    chimbal: {
      seed: 34,
      role: 'grid',
      gain: 1.1,
      pan: 0.35,
      send: 0.08,
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
      gain: 0.3,
      pan: -0.3,
      send: 0.2,
      ducked: true,
      bright: [1500, 7000],
      strokes: () => ({ acorde: takes('piano') }),
      shape: tone => ({ stroke: 'acorde', notes: KEY_CHORDS[noteOf(tone)].map(midiOf), length: lengthOf(tone), strum: 0.004 }),
    },
    lead: {
      seed: 36,
      role: 'grid',
      gain: 0.42,
      pan: 0.1,
      send: 0.22,
      ducked: true,
      strokes: () => ({ curta: takes('trompete-stac'), longa: takes('trompete-sus') }),
      shape: tone => {
        const length = lengthOf(tone);
        return { stroke: length > STACCATO_STEPS * STEP_SECONDS ? 'longa' : 'curta', notes: [midiOf(noteOf(tone))], length, echo: ECHO };
      },
    },
    metais: {
      seed: 37,
      role: 'grid',
      gain: 0.45,
      pan: -0.15,
      send: 0.2,
      ducked: true,
      strokes: () => ({ acorde: takes('trompete-stac', 'trombone-stac') }),
      shape: tone => ({ stroke: 'acorde', notes: HORN_CHORDS[noteOf(tone)].map(midiOf), length: lengthOf(tone) }),
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
  ['bumbo', 'bumbo', ['bumbo'], 'bumbo 808'],
  ['grave', 'grave', ['grave'], 'grave 808'],
  ['lata', 'lata', ['lata'], 'latas gravadas'],
  ['chimbal', 'chimbal', ['chimbal'], 'chimbal gravado'],
  ['teclado', 'teclado', ['teclado'], 'piano gravado'],
  ['lead', 'trompete', ['lead'], 'trompete gravado'],
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
const noteName = note => NOTE_NAMES[note[0]];
const countFromOne = steps => steps.map(step => step + 1).join(' · ');
const intervals = steps => steps.map((step, i) => (steps[(i + 1) % steps.length] - step + STEPS_PER_BAR) % STEPS_PER_BAR || STEPS_PER_BAR);
const BUMBO_HEADS = BEAT.bumbo.steps.filter((_step, i) => BEAT.bumbo.velocity[i] > HAT_VELOCITY[2]);
const GROUPING = intervals([...new Set([...BUMBO_HEADS, ...BEAT.lata.steps])].sort((a, b) => a - b));
const RIO_GROUPING = intervals(TAMBORZAO.drum.steps);
const DRUMMING = new Set(SCENE_LIST.flatMap(scene => scene.voices()));
const READ = {
  tempo: 'andamento',
  tempoValue: `${BPM} BPM`,
  cycle: '1 ciclo',
  cycleValue: seconds => `${STEPS_PER_BAR} semicolcheias = ${seconds} s`,
  key: 'tom',
  keyValue: 'lá menor',
  hook: 'tema',
  hookValue: `${HOOK.length} compassos, ${HOOK.flat().length} notas`,
  enters: 'entra',
  entersMuted: 'sem som',
  heads: 'no tempo',
  ghosts: 'notas fantasma',
  grouping: 'agrupamento',
  groupingValue: GROUPING.slice(0, GROUPING.length / 2).join(' + '),
  accent: 'acento',
  accentValue: 'no contratempo',
  roll: 'rufo',
  rollValue: 'em fusas, no fim',
  notes: 'notas',
  notesValue: PROGRESSION.map(chord => noteName(ROOTS[chord])).join(' · '),
  glide: 'glissando',
  glideValue: 'para a nota do compasso seguinte',
  low: 'grave',
  mid: 'médio',
  high: 'agudo',
  backbeatKeys: 'teclado nos tempos 2 e 4',
  rio: 'Rio',
  recife: 'Recife',
  rioNoLata: 'sem lata',
  silentBeat: 'tempo em silêncio',
  voices: 'vozes',
  horns: 'metais',
  hornsValue: `no ${countFromOne(HORNS_AT[0].map(([step]) => step))}, no ${countFromOne(HORNS_AT[1].map(([step]) => step))}`,
  hookChange: 'o tema muda',
  hookChangeValue: 'sobe no fim, uma vez',
  doubled: 'bumbo dobrado',
  bars: 'compassos',
};
const SCENE_COPY = {
  tema: { chip: 'Tema', eyebrow: 'bregafunk', title: 'Tema' },
  bumbo: { chip: 'Bumbo', eyebrow: 'no 1 e no 3', title: 'Bumbo' },
  lata: { chip: 'Lata', eyebrow: READ.groupingValue, title: 'Lata' },
  chimbais: { chip: 'Chimbais', eyebrow: 'chimbais dobrados', title: 'Chimbais' },
  grave: { chip: 'Grave', eyebrow: 'grave 808', title: 'Grave' },
  batida: { chip: 'Batida', eyebrow: `${FULL.length} instrumentos`, title: 'Batida completa' },
  tamborzao: { chip: 'Tamborzão', eyebrow: 'funk carioca', title: 'Tamborzão' },
  quebra: { chip: 'Quebra', eyebrow: `1 ${READ.silentBeat}`, title: 'Quebra' },
  drop: { chip: 'Drop', eyebrow: 'com metais', title: 'Drop' },
  passinho: { chip: 'Passinho', eyebrow: READ.doubled, title: 'Passinho' },
  final: { chip: 'Final', eyebrow: '', title: 'Fim' },
};
const COPY = {
  name: 'bregafunk',
  description: 'Bregafunk do Recife a 170 BPM: bumbo, lata em 3 + 3 + 2, chimbal e grave, camada por camada, até a batida completa.', // the page's search and preview description
  feminineInstruments: ['lata'], // "som da lata", "som do bumbo"
  scenes: SCENE_COPY,
  patterns: {},
  voices: {
    bumbo: 'bumbo',
    grave: 'grave',
    lata: 'lata',
    chimbal: 'chimbal',
    teclado: 'teclado',
    lead: 'sintetizador',
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
const registerRow = (band, text) =>
  row(
    label(text),
    FULL.filter(voice => VOICES[voice].register === band)
      .map(voice => COPY.voices[voice])
      .join(', '),
  );
const LAYOUTS = {
  tema: () =>
    row(label(T.tempo), T.tempoValue) +
    row(label(T.cycle), T.cycleValue(BAR_SECONDS.toFixed(2).replace('.', ','))) +
    row(label(T.key), T.keyValue) +
    row(label(T.hook), T.hookValue, 'lead'),
  bumbo: () => `<div data-entry></div>${row(label(T.heads), countFromOne(BUMBO_HEADS), 'bumbo')}`,
  lata: () =>
    notation(notationRow(COPY.voices.bumbo, BEAT.bumbo.steps, 'bumbo'), notationRow(COPY.voices.lata, BEAT.lata.steps, 'lata')) +
    row(label(T.grouping), GROUPING.join(' ')),
  chimbais: () => `<div data-entry></div>${row(label(T.accent), T.accentValue, 'chimbal')}${row(label(T.roll), T.rollValue, 'chimbal')}`,
  grave: () => `<div data-entry></div>${row(label(T.notes), T.notesValue, 'grave')}${row(label(T.glide), T.glideValue, 'grave')}`,
  batida: () =>
    registerRow('low', T.low) +
    registerRow('mid', T.mid) +
    registerRow('high', T.high) +
    row(label(T.backbeatKeys), countFromOne(KEYS_AT.filter(h => h.velocity > HAT_VELOCITY[2]).map(h => h.step)), 'teclado'),
  tamborzao: () =>
    notation(
      notationRow(T.rio, TAMBORZAO.drum.steps, 'tamborzao'),
      notationRow(
        T.recife,
        [...BUMBO_HEADS, ...BEAT.lata.steps].sort((a, b) => a - b),
        'lata',
      ),
    ) +
    row(label(T.rio), RIO_GROUPING.join(' ')) +
    row(label(T.recife), GROUPING.join(' ')),
  quebra: () => stats('two', stat(1, T.silentBeat, PALETTE.gold), stat(SCENE_LIST.find(scene => scene.id === 'quebra').voices().length, T.voices, PALETTE.tin)),
  drop: () =>
    stats('two', stat(SCENE_LIST.find(scene => scene.id === 'drop').voices().length, T.voices, PALETTE.gold), stat(BPM, 'BPM', PALETTE.lime)) +
    row(label(T.horns, PALETTE.gold), T.hornsValue, 'metais') +
    row(label(T.hookChange), T.hookChangeValue, 'lead'),
  passinho: () =>
    notation(
      notationRow(COPY.voices.bumbo, BEAT.bumbo.steps, 'bumbo'),
      notationRow(T.doubled, PASSINHO.bumbo.steps, 'bumbo'),
      notationRow(COPY.voices.lata, PASSINHO.lata.steps, 'lata'),
    ),
  final: show => stats('', stat(DRUMMING.size, T.voices, PALETTE.lime), stat(show.totalBars, T.bars, PALETTE.ivory), stat(BPM, 'BPM', PALETTE.gold)),
};
const FOCUS = { bumbo: 'bumbo', lata: 'lata', chimbais: 'chimbal', grave: 'grave' };
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
  sounds: studioSounds(STUDIO, SOUND_CHOICES, 'drop'),
  copy: COPY,
};

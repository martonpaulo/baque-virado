// Brega funk: everything the engine plays and shows that belongs to this rhythm (Recife, since about
// 2009). A half-time beat at 170 BPM, written as 85 BPM with one 16-sixteenth bar per turn of the
// wheel: the bumbo on 1 and 9, the metallic «lata» in 3 + 3 + 2, doubled chimbais, the sliding
// «grave», off-beat keys and a short minor hook. Hard-quantized, as it is programmed: no swing.
// Research and choices: docs/research/brega-forro.md, docs/rhythms/brega-funk.md.
import { label, row, stat, stats } from '../readout-markup.js';
import { createBregaFunkBackground, PALETTE } from './brega-funk-background.js';
import { atabaque, brass, grave, hat, keys, kick, lata, lead } from './brega-funk-sounds.js';

const BPM = 85;
const SHOWN_BPM = BPM * 2; // the tempo producers name; the wheel turns once per half-time bar
const BEATS_PER_BAR = 4;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const STEP_SECONDS = 60 / BPM / STEPS_PER_BEAT;
const BAR_SECONDS = STEP_SECONDS * STEPS_PER_BAR;
const SIXTEENTHS = [...Array(STEPS_PER_BAR).keys()];
const ID = 'brega-funk';

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

function hookBar(scene, barInScene) {
  const bars = scene.hookVaried && barInScene >= 2 ? HOOK_VARIED : HOOK;
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
const always = value => () => value;
const BEAT_VOICES = ['bumbo', 'lata', 'chimbal', 'grave'];
const FULL = [...BEAT_VOICES, 'teclado', 'lead'];
const SCENE_LIST = [
  { id: 'tema', bars: 2, voices: always(['lead']), lanes: ['lead'] },
  { id: 'bumbo', bars: 2, voices: always(['bumbo']), lanes: ['bumbo'] },
  { id: 'lata', bars: 4, voices: always(['bumbo', 'lata']), lanes: ['bumbo', 'lata'] },
  { id: 'chimbais', bars: 2, voices: always(['bumbo', 'lata', 'chimbal']), lanes: ['bumbo', 'lata', 'chimbal'] },
  { id: 'grave', bars: 4, voices: always(BEAT_VOICES), lanes: ['bumbo', 'grave', 'lata', 'chimbal'] },
  { id: 'batida', bars: 4, voices: always(FULL), lanes: ['bumbo', 'grave', 'lata', 'teclado', 'lead'] },
  { id: 'tamborzao', bars: 2, pattern: 'tamborzao', voices: always(['bumbo', 'tamborzao']), lanes: ['bumbo', 'tamborzao', 'lata'] },
  { id: 'quebra', bars: 2, voices: always(['chimbal', 'lead']), mode: bar => (bar === 1 ? 'break' : 'normal'), lanes: ['lead', 'chimbal'] },
  { id: 'drop', bars: 4, voices: always([...FULL, 'metais']), openHat: true, hookVaried: true, lanes: ['bumbo', 'lata', 'lead', 'metais'] },
  { id: 'passinho', bars: 4, pattern: 'passinho', voices: always([...BEAT_VOICES, 'lead']), lanes: ['bumbo', 'lata', 'grave', 'lead'] },
  {
    id: 'final',
    bars: 4,
    voices: always([...BEAT_VOICES, 'lead']),
    mode: bar => (bar === 3 ? 'cut' : 'normal'),
    lanes: ['bumbo', 'lata', 'grave', 'lead'],
    isEnd: true,
  },
];
// The background is the rhythm's own (brega-funk-background.js); the looks keep only the speed of
// its clock, which the engine reads, at real time.
const LOOK = { zoom: 0, rot: 0, hue: 0, keep: 0, seg: 0, warp: 0, pal: 0, speed: 1 };
const SCENE_LOOKS = Object.fromEntries(SCENE_LIST.map(scene => [scene.id, LOOK]));

// ---------- sound: synthesized in the page (brega-funk-sounds.js) ----------
const NAME = `${ID}-`;
const lengthOf = tone => Number(TONE.exec(tone)[2]) * STEP_SECONDS;
const noteOf = tone => TONE.exec(tone)[1];
const ECHO_STEPS = 3; // the lead's echo, a dotted eighth behind
/** Each voice's synthesized sound: the sample name for one tone, and how to render it. */
const SYNTH_VOICES = {
  bumbo: { name: () => `${NAME}bumbo`, render: () => sampleRate => kick(sampleRate) },
  lata: { name: () => `${NAME}lata`, render: () => sampleRate => lata(sampleRate) },
  chimbal: { name: tone => `${NAME}chimbal-${tone}`, render: tone => sampleRate => hat(sampleRate, tone, STEP_SECONDS) },
  grave: {
    name: tone => `${NAME}grave-${tone.replace('>', '-').replace(':', '-')}`,
    render: tone => sampleRate => {
      const [from, to] = noteOf(tone).split('>');
      return grave(sampleRate, from, to, lengthOf(tone));
    },
  },
  teclado: {
    name: tone => `${NAME}teclado-${tone.replace(':', '-')}`,
    render: tone => sampleRate => keys(sampleRate, KEY_CHORDS[noteOf(tone)], lengthOf(tone)),
  },
  lead: {
    name: tone => `${NAME}lead-${tone.replace(':', '-')}`,
    render: tone => sampleRate => lead(sampleRate, noteOf(tone), lengthOf(tone), ECHO_STEPS * STEP_SECONDS),
  },
  metais: {
    name: tone => `${NAME}metais-${tone.replace(':', '-')}`,
    render: tone => sampleRate => brass(sampleRate, HORN_CHORDS[noteOf(tone)], lengthOf(tone)),
  },
  tamborzao: { name: tone => `${NAME}tamborzao-${tone}`, render: tone => sampleRate => atabaque(sampleRate, tone) },
};
// Levels chosen by ear against the bumbo; the lead's echo and the horns' chords sum louder.
const LEVEL = { bumbo: 0.85, grave: 0.62, lata: 0.6, chimbal: 0.28, teclado: 0.3, lead: 0.36, metais: 0.42, tamborzao: 0.7, tarol: 0.55 };
const SAMPLED_LATA = 'caixa-aro'; // the tarol rim, a CC0 recording, as the other lata

/** Every tone each voice plays in the show, from the script itself: the sounds to synthesize. */
function tonesInShow() {
  const tones = Object.fromEntries(VOICE_ORDER.map(voice => [voice, new Set()]));
  for (const definition of SCENE_LIST) {
    const scene = { mode: always('normal'), pattern: 'brega', ...definition };
    for (let bar = 0; bar < scene.bars; bar++) {
      const hits = barHits(scene, bar);
      for (const voice of VOICE_ORDER) for (const h of hits[voice]) tones[voice].add(h.tone || '');
    }
  }
  return tones;
}
const TONES = tonesInShow();
const synthNames = voice => [...TONES[voice]].map(tone => SYNTH_VOICES[voice].name(tone));
const SYNTH = Object.fromEntries(
  VOICE_ORDER.flatMap(voice => [...TONES[voice]].map(tone => [SYNTH_VOICES[voice].name(tone), SYNTH_VOICES[voice].render(tone)])),
);

// One choice per instrument, so the desktop gives each its volume; only the lata has two sounds.
// A single option names what the sound is.
const choiceOf = (id, text, preview, options) => ({
  id,
  label: text,
  defaultOption: options[0][0],
  preview,
  files: option => (option === 'synth' ? preview.flatMap(synthNames) : [SAMPLED_LATA]),
  options,
});
const SOUND_CHOICES = [
  choiceOf('bumbo', 'bumbo', ['bumbo'], [['synth', 'bumbo 808']]),
  choiceOf('grave', 'grave', ['grave'], [['synth', 'grave 808']]),
  choiceOf(
    'lata',
    'lata',
    ['lata'],
    [
      ['synth', 'lata'],
      ['tarol', 'tarol'],
    ],
  ),
  choiceOf('chimbal', 'chimbal', ['chimbal'], [['synth', 'chimbal 808']]),
  choiceOf('teclado', 'teclado', ['teclado'], [['synth', 'piano elétrico']]),
  choiceOf('lead', 'sintetizador', ['lead'], [['synth', 'dente de serra']]),
  choiceOf('metais', 'naipe de metais', ['metais'], [['synth', 'metais MIDI']]),
  choiceOf('tamborzao', 'atabaque', ['tamborzao'], [['synth', 'atabaque do tamborzão']]),
];
const synthHit = (voice, level) => (_choice, velocity, tone) => [SYNTH_VOICES[voice].name(tone || ''), level * velocity, 1];
const SAMPLE_FOR = {
  ...Object.fromEntries(VOICE_ORDER.map(voice => [voice, synthHit(voice, LEVEL[voice])])),
  lata: (choice, velocity) => (choice.lata === 'tarol' ? [SAMPLED_LATA, LEVEL.tarol * velocity, 1] : [SYNTH_VOICES.lata.name(), LEVEL.lata * velocity, 1]),
};

// ---------- the wheel's motion: the hips of the passinho ----------
const SWAY_DEGREES = 2.5; // the wheel leans left on one beat and right on the next
const KICK_SWELL = 0.03; // and swells a little on each bumbo
const KICK_SWELL_SECONDS = 0.14;
/** The wheel at `position` (bars), from its beat and the hits just heard. */
function wheelMotion(position, recent = []) {
  const beats = position * BEATS_PER_BAR,
    lean = Math.sin(Math.PI * beats);
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
  tempoValue: `${SHOWN_BPM} BPM, em meio tempo`,
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
  offbeatKeys: 'teclado no contratempo',
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
  tema: { chip: 'Tema', eyebrow: 'brega funk', title: 'Tema' },
  bumbo: { chip: 'Bumbo', eyebrow: 'meio tempo', title: 'Bumbo' },
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
  name: 'brega funk',
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
    row(label(T.offbeatKeys), countFromOne(KEYS_AT.filter(h => h.velocity > HAT_VELOCITY[2]).map(h => h.step)), 'teclado'),
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
    stats('two', stat(SCENE_LIST.find(scene => scene.id === 'drop').voices().length, T.voices, PALETTE.gold), stat(SHOWN_BPM, 'BPM', PALETTE.lime)) +
    row(label(T.horns, PALETTE.gold), T.hornsValue, 'metais') +
    row(label(T.hookChange), T.hookChangeValue, 'lead'),
  passinho: () =>
    notation(
      notationRow(COPY.voices.bumbo, BEAT.bumbo.steps, 'bumbo'),
      notationRow(T.doubled, PASSINHO.bumbo.steps, 'bumbo'),
      notationRow(COPY.voices.lata, PASSINHO.lata.steps, 'lata'),
    ),
  final: show => stats('', stat(DRUMMING.size, T.voices, PALETTE.lime), stat(show.totalBars, T.bars, PALETTE.ivory), stat(SHOWN_BPM, 'BPM', PALETTE.gold)),
};
const FOCUS = { bumbo: 'bumbo', lata: 'lata', chimbais: 'chimbal', grave: 'grave' };
const readout = (scene, show) => ({ markup: (LAYOUTS[scene.id] || (() => ''))(show), score: null, focus: FOCUS[scene.id] || '' });

export const BREGA_FUNK = {
  id: ID,
  bpm: BPM,
  beatsPerBar: BEATS_PER_BAR,
  stepsPerBeat: STEPS_PER_BEAT,
  swing: {},
  voices: VOICES,
  shapeVoices: ['lata', 'bumbo'], // the 3 + 3 + 2: the lata's shape over the bumbo's
  barHits,
  sceneDefaults: { pattern: 'brega' },
  scenes: SCENE_LIST,
  looks: SCENE_LOOKS,
  background: { create: createBregaFunkBackground },
  wheelMotion,
  readout,
  waves: null,
  sounds: {
    choices: SOUND_CHOICES,
    fixedFiles: [],
    synth: SYNTH,
    sampleFor: SAMPLE_FOR,
    previewScene: 'drop',
  },
  copy: COPY,
};

// Maracatu de baque virado: everything the engine plays and shows that belongs to this rhythm.
// The engine (music.js, show.js and the views) reads it as one rhythm object; nothing outside
// src/rhythms/ names a maracatu voice, pattern or scene.
// Positions are sixteenths of a 4/4 bar (0–15); a two-bar pattern uses 0–31.
import { label, row, stat, stats } from '../readout-markup.js';
import { renderScore } from '../score.js';
import { COLORS, fgAlpha, ROLES } from '../theme.js';

const BPM = 115;
const BEATS_PER_BAR = 4;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const BEAT_SECONDS = 60 / BPM;
const BAR_SECONDS = BEAT_SECONDS * BEATS_PER_BAR;
const SIXTEENTHS = [...Array(STEPS_PER_BAR).keys()];
const MS_PER_SECOND = 1000;

// Median offset of each sixteenth from the straight grid, in beats, measured on a workshop
// recording (Batuk Nagô). "high" drives caixa, agbê and ganzá; "low" drives the alfaias.
export const SWING = {
  high: [-0.003, 0.031, -0.016, -0.005],
  low: [0.005, -0.016, -0.029, -0.027],
};

/** The measured swing of one group, in whole milliseconds. */
export const swingMilliseconds = group => SWING[group].map(beats => Math.round(beats * BEAT_SECONDS * MS_PER_SECOND));

// ring/size: where and how big the voice sits on the wheel (0 = not drawn). swing: which group it follows.
// instrument: the instrument the voice belongs to (the alfaia has three voices: two hands and the stick).
// The roles the views read: hand (a hand of the lead drum: contratempo marks, the instrument named
// over the hand), boom (how hard the hit shakes the background), crack (an accent flash), spark (a
// spark on the comb), strobe (flashes the screen), calls (calls the band: not drumming, its own cue),
// guide: false (no ring line of its own), toneScale (dot size per tone).
export const VOICES = {
  main: { instrument: 'alfaia', ring: 98, size: 5.6, swing: 'low', color: ROLES.mainHand, hand: true, boom: 1 },
  answer: { instrument: 'alfaia', ring: 87, size: 4.8, swing: 'low', color: ROLES.answerHand, hand: true, boom: 0.7 },
  stick: { instrument: 'alfaia', ring: 87, size: 4.2, swing: 'low', color: COLORS.bone, boom: 1, strobe: true, guide: false },
  caixa: { instrument: 'caixa', ring: 75, size: 3.2, swing: 'high', color: COLORS.ice, crack: true },
  agbe: { instrument: 'agbe', ring: 65, size: 3.2, swing: 'high', color: COLORS.magenta },
  ganza: { instrument: 'ganza', ring: 56, size: 2.6, swing: 'high', color: COLORS.violet },
  agogo: { instrument: 'agogo', ring: 45, size: 4.4, swing: null, color: COLORS.acid, spark: true, toneScale: { high: 0.7 } },
  whistle: { instrument: 'whistle', ring: 0, size: 0, swing: null, color: COLORS.white, calls: true },
};
// The order also seeds the per-hit variation of the sound: keep it stable.
const VOICE_ORDER = Object.keys(VOICES);
const DRUMMING = VOICE_ORDER.filter(voice => !VOICES[voice].calls);
/** Distinct instruments that drum (the whistle only calls): alfaia, caixa, agbê, ganzá, agogô. */
export const INSTRUMENT_COUNT = new Set(DRUMMING.map(voice => VOICES[voice].instrument)).size;
const ALFAIA_HANDS = ['main', 'answer'];
const ALFAIA_WITH_STICK = ['main', 'answer', 'stick'];

const isOffbeat = step => step % STEPS_PER_BEAT !== 0;
const BEAT_STEPS = SIXTEENTHS.filter(step => !isOffbeat(step)); // the heads of the four beats
const OFFBEAT_STEPS = SIXTEENTHS.filter(isOffbeat);
/** Sixteenths as musicians count them, from 1. */
const countFromOne = (steps, separator) => steps.map(step => step + 1).join(separator);

// Alfaia hand patterns (hand table published at lansdownsoftware.com). `bars: 2` spans 32 sixteenths.
export const PATTERNS = {
  marcacao: { main: [0, 9, 13], answer: [8, 12] },
  arrasto: { main: [0, 5, 9, 13], answer: [4, 8, 12] },
  imale: { main: [0, 6, 9, 13], answer: [4, 8, 12] },
  martelo: { main: [1, 3, 6, 9, 11], answer: [0, 4, 12] },
  trovao: { main: [0, 9], answer: [8, 14], stick: [12] },
  afoxe: { main: [0, 3, 9, 11], answer: [4, 12] },
  parada: { main: [0, 3, 5, 7, 9, 11, 14, 16], answer: [4, 8, 12, 15], stick: [20, 24, 28], bars: 2 },
  virada: { main: [0, 2, 6, 9, 11, 14], answer: [4, 8, 12, 15] },
};
export const BAQUE_ORDER = ['marcacao', 'arrasto', 'imale', 'martelo', 'trovao', 'afoxe', 'parada'];

export const AGOGO = { low: [0, 4, 8, 12, 15], high: [2, 6, 9, 11, 14] };
export const AGOGO_STEPS = [...AGOGO.low, ...AGOGO.high].sort((a, b) => a - b);

/** The steps of one bar (0-based bar index inside the pattern) of a step list. */
const stepsOfBar = (steps, barIndex) =>
  (steps || []).filter(step => step >= barIndex * STEPS_PER_BAR && step < (barIndex + 1) * STEPS_PER_BAR).map(step => step - barIndex * STEPS_PER_BAR);

/** Every alfaia hit of a pattern, all bars together. */
const allAlfaiaSteps = pattern => [...pattern.main, ...pattern.answer, ...(pattern.stick || [])];

const hit = (step, velocity, tone) => (tone ? { step, velocity, tone } : { step, velocity });
const silentBar = () => Object.fromEntries(VOICE_ORDER.map(voice => [voice, []]));

/** The hits of every voice for bar `barIndex` of a pattern, with the band's fixed parts. */
export function patternHits(patternKey, barIndex) {
  const pattern = PATTERNS[patternKey];
  const bar = pattern.bars === 2 ? barIndex % 2 : 0;
  const hands = (voice, velocity) => stepsOfBar(pattern[voice], bar).map(step => hit(step, velocity));
  return {
    main: hands('main', 1),
    answer: hands('answer', 0.9),
    stick: hands('stick', 1),
    caixa: SIXTEENTHS.map(step => hit(step, [1, 0.38, 0.7, 0.5][step % 4])),
    agbe: SIXTEENTHS.filter(step => step % 4 !== 1).map(step => hit(step, step % 4 === 0 ? 1 : 0.65)),
    ganza: SIXTEENTHS.map(step => hit(step, step % 4 === 0 ? 1 : 0.55)),
    agogo: [...AGOGO.low.map(step => hit(step, 1, 'low')), ...AGOGO.high.map(step => hit(step, 0.85, 'high'))].sort((a, b) => a.step - b.step),
    whistle: [],
  };
}

// Special bars of the show (the bar modes the engine knows):
//   call  – the mestre's whistle alone ("fi · fi · fiiiu")
//   roll  – the caixa alone, one real snare roll swelling into the entry
//   break – the unison virada, called by one whistle blow
//   cut   – everyone on 1, then silence; the whistle and the caixa count the band back in
export function barHits(scene, barInScene) {
  const mode = scene.mode(barInScene);
  if (mode === 'call') {
    return { ...silentBar(), whistle: [hit(0, 0.85, 'short'), hit(4, 0.85, 'short'), hit(8, 1, 'trill')] };
  }
  if (mode === 'roll') {
    // the 16 marks are drawn; only the first plays the recorded roll and the last one accents
    return {
      ...silentBar(),
      caixa: SIXTEENTHS.map(step => hit(step, 0.22 + 0.78 * (step / 15) ** 1.6, step === 0 ? 'roll' : step === 15 ? undefined : 'muted')),
    };
  }
  if (mode === 'cut') {
    const isEnd = scene.isEnd;
    return {
      ...silentBar(),
      main: [hit(0, 1)],
      answer: [hit(0, 1)],
      agbe: [hit(0, 1)],
      ganza: [hit(0, 1)],
      agogo: [hit(0, 1, 'low')],
      caixa: isEnd ? [hit(0, 1)] : [hit(0, 1), hit(13, 0.45), hit(14, 0.7), hit(15, 1)],
      whistle: isEnd ? [hit(8, 1, 'trill')] : [hit(4, 0.85, 'short'), hit(8, 0.85, 'short'), hit(12, 1, 'long')],
    };
  }
  const hits = patternHits(mode === 'break' ? 'virada' : scene.pattern, barInScene);
  if (mode === 'break') hits.whistle = [hit(0, 0.9, (scene.start + barInScene) % 2 ? 'trill' : 'long')];
  return hits;
}

// ---------- the show script ----------
const always = value => () => value;
const normal = always('normal');
const breakOnBar = n => bar => (bar === n ? 'break' : 'normal'); // last bar of a baque: the virada
const ENSEMBLE_ENTRY = ['agogo', 'caixa', 'agbe', 'ganza', 'answer', 'main'];

/** A baque scene: four bars, the last one a virada. */
const baque = (id, extra) => ({ id, pattern: id, bars: 4, mode: breakOnBar(3), lanes: ALFAIA_HANDS, named: true, ...extra });

const BAQUE_EXTRAS = {
  imale: { mode: bar => (bar === 3 ? 'cut' : 'normal') }, // ends on a cut, not a virada
  trovao: { lanes: ALFAIA_WITH_STICK },
  parada: { mode: normal, lanes: ALFAIA_WITH_STICK }, // two bars that already end in a break
};

// Each scene: id, bars, and what the engine defaults otherwise (show.js): mode per bar, voices
// playing per bar, swing per bar, gain per voice, lanes (the rows under the wheel), named (the
// centre names its pattern), isEnd.
const SCENE_LIST = [
  {
    id: 'opening',
    bars: 5,
    mode: bar => ['call', 'roll'][bar] || 'normal',
    lanes: ['whistle', 'caixa', ...ALFAIA_HANDS],
  },
  {
    id: 'ensemble',
    bars: 6,
    voices: bar => ENSEMBLE_ENTRY.slice(0, bar + 1),
    lanes: DRUMMING,
  },
  {
    id: 'agogo',
    bars: 2,
    voices: always(['agogo', 'caixa']),
    gain: { caixa: 0.32 },
    swing: always(false),
    lanes: ['agogo', 'caixa'],
  },
  {
    id: 'swing',
    bars: 4,
    voices: always(['main', 'answer', 'caixa', 'agbe', 'ganza', 'agogo']),
    swing: bar => bar >= 2,
    lanes: ['caixa', ...ALFAIA_HANDS],
  },
  {
    id: 'offbeat',
    bars: 3,
    voices: always([...ALFAIA_HANDS, 'agogo', 'caixa']),
    gain: { caixa: 0.45 },
    lanes: [...ALFAIA_HANDS, 'agogo'],
  },
  ...BAQUE_ORDER.map(id => baque(id, BAQUE_EXTRAS[id])),
  {
    id: 'summary',
    bars: 3,
    lanes: ALFAIA_HANDS,
    named: true,
  },
  {
    id: 'finale',
    bars: 3,
    mode: bar => (bar < 2 ? 'break' : 'cut'),
    lanes: [...ALFAIA_HANDS, 'whistle'],
    isEnd: true,
  },
];

// How the background behaves in each scene: feedback zoom, rotation, hue and persistence (keep),
// kaleidoscope mirrors (seg), warp, speed, palette (pal), an optional strobe, and moiré rings
// (moire) that show the swing against the straight grid.
const SCENE_LOOKS = {
  opening: { zoom: 0.9, rot: 0.15, hue: 70, keep: 0.93, seg: 16, warp: 1.0, speed: 0.7, pal: 0 },
  ensemble: { zoom: 0.5, rot: 0.06, hue: 35, keep: 0.9, seg: 7, warp: 0.8, speed: 0.5, pal: 0.15 },
  agogo: { zoom: 0.25, rot: -0.5, hue: 90, keep: 0.94, seg: 10, warp: 0.6, speed: 0.6, pal: 0.4 },
  swing: { zoom: 0.08, rot: 0, hue: 15, keep: 0.8, seg: 4, warp: 0.45, speed: 0.3, pal: 0.6, moire: true },
  offbeat: { zoom: 0.8, rot: 0.22, hue: 120, keep: 0.93, seg: 12, warp: 1.2, speed: 0.9, pal: 0.3 },
  marcacao: { zoom: 1.0, rot: -0.14, hue: 80, keep: 0.93, seg: 5, warp: 1.1, speed: 0.9, pal: 0.25 },
  arrasto: { zoom: 0.9, rot: 0.12, hue: 70, keep: 0.93, seg: 7, warp: 1.0, speed: 0.9, pal: 0.15 },
  imale: { zoom: 0.8, rot: 0.18, hue: 60, keep: 0.93, seg: 7, warp: 1.0, speed: 0.8, pal: 0.1 },
  martelo: { zoom: 1.6, rot: 0.35, hue: 150, keep: 0.95, seg: 8, warp: 1.5, speed: 1.4, pal: 0.5 },
  trovao: { zoom: 1.2, rot: -0.3, hue: 130, keep: 0.94, seg: 5, warp: 1.3, speed: 1.1, pal: 0.6 },
  afoxe: { zoom: 0.7, rot: 0.1, hue: 90, keep: 0.93, seg: 6, warp: 1.1, speed: 0.8, pal: 0.35 },
  parada: { zoom: 0.6, rot: -0.25, hue: 110, keep: 0.93, strobe: 1, seg: 15, warp: 1.2, speed: 1.0, pal: 0.75 },
  summary: { zoom: 0.8, rot: 0.12, hue: 60, keep: 0.93, seg: 16, warp: 1.0, speed: 0.8, pal: 0.9 },
  finale: { zoom: 1.4, rot: 0.3, hue: 160, keep: 0.95, seg: 16, warp: 1.4, speed: 1.2, pal: 0.05 },
};

// ---------- sound ----------
// Sounds the viewer can swap on desktop. `files(option)` lists the samples of one option, and
// `preview` the voices a pick plays while the show is paused.
// The default, the version chosen by ear for the show, is always listed first. The others follow from
// the lowest to the brightest sound (measured spectral centroid, 2026-11-16).
const SOUND_CHOICES = [
  {
    id: 'alfaia',
    label: 'alfaia',
    defaultOption: 'deep-click',
    preview: ['main', 'answer'],
    files: o => [`alfaia-${o}-main`, `alfaia-${o}-answer`],
    options: [
      ['deep-click', 'meião'],
      ['deep', 'marcante'],
      ['deep-short', 'grave abafada'],
      ['dry-body', 'encorpada'],
      ['dry-surdo', 'seca e estalada'],
    ],
  },
  {
    id: 'caixa',
    label: 'caixa',
    defaultOption: 'padrao',
    preview: ['caixa'],
    files: o => [`caixa-${o}`],
    options: [
      ['padrao', 'caixa de guerra'],
      ['brasileira', 'caixa grave'],
      ['esteira', 'caixa com esteira'],
      ['aro', 'tarol'],
    ],
  },
  {
    id: 'ganza',
    label: 'ganzá',
    defaultOption: 'rice',
    preview: ['ganza'],
    files: o => [`ganza-${o}`],
    options: [
      ['rice', 'ganzá de arroz'],
      ['caxixi', 'caxixi'],
      ['platinela', 'chocalho de platinelas'],
      ['dry', 'mineiro'],
    ],
  },
  {
    id: 'agbe',
    label: 'agbê',
    defaultOption: 'maracatu',
    preview: ['agbe'],
    files: o => [`agbe-${o}`],
    options: [
      ['maracatu', 'agbê seco'],
      ['soft-shekere', 'xequerê cheio'],
      ['played-shekere', 'xequerê médio'],
      ['cabasa', 'cabaça'],
    ],
  },
  {
    id: 'agogo',
    label: 'agogô',
    defaultOption: 'short-bell',
    preview: ['agogo'],
    files: o => [`agogo-${o}`],
    options: [
      ['short-bell', 'agogô agudo'],
      ['big-bell', 'agogô grave'],
      ['stick-bell', 'agogô ressonante'],
      ['low-agogo', 'agogô metálico'],
    ],
  },
];
const WHISTLE = 'gym'; // the whistle is fixed: the owner swapped its choice for the caixa's (2026-11-16)
const WHISTLE_KINDS = ['long', 'short', 'trill'];

// voice → [sample, gain, playback rate] for one hit, or null for a mark that stays silent
const SAMPLE_FOR = {
  main: (choice, velocity) => [`alfaia-${choice.alfaia}-main`, 1.1 * velocity, 1],
  answer: (choice, velocity) => [`alfaia-${choice.alfaia}-answer`, 0.95 * velocity, 1],
  stick: (_choice, velocity) => ['stick', 0.85 * velocity, 1],
  caixa: (choice, velocity, tone) =>
    tone === 'muted' ? null : tone === 'roll' ? ['caixa-roll', 0.75, 1] : [`caixa-${choice.caixa}`, 0.55 * velocity ** 1.4, 1],
  agbe: (choice, velocity) => [`agbe-${choice.agbe}`, 0.9 * velocity, 1],
  ganza: (choice, velocity) => [`ganza-${choice.ganza}`, 0.75 * velocity, 1],
  whistle: (_choice, velocity, tone, variation) => [`whistle-${WHISTLE}-${tone || 'short'}`, 0.5 * velocity, 0.995 + variation * 0.01], // one note, tiny drift
  agogo: (choice, velocity, tone) => [`agogo-${choice.agogo}`, 0.62 * velocity, tone === 'low' ? 1 : 1.19],
};

// ---------- copy ----------
const FEMININE_INSTRUMENTS = ['alfaia']; // "som da alfaia", "som do apito"
// Musical facts in the copy are derived from the patterns, so the text cannot drift from the sound.
const baqueNumber = id => `baque ${BAQUE_ORDER.indexOf(id) + 1}/${BAQUE_ORDER.length}`;
const READ = {
  cycle: '1 ciclo',
  cycleValue: seconds => `${STEPS_PER_BAR} semicolcheias = ${seconds} s`,
  sixteenth: '1 semicolcheia',
  milliseconds: ms => `${ms} ms`,
  enters: 'entra',
  entersMuted: 'sem som', // the instrument entering is muted by the viewer
  wave: 'onda do som da alfaia',
  alfaia: 'alfaia',
  mainHand: 'mão principal',
  answerHand: 'resposta',
  low: 'grave',
  high: 'agudo',
  intervals: 'intervalos',
  hitsPerSixteenths: 'batidas / semicolcheias',
  listeningSwing: '▶ agora: com balanço',
  listeningGrid: '▶ agora: sem balanço',
  msLegend: 'em ms: − antes do tempo, + depois',
  sixteenthHeader: 'semicolcheia',
  caixa: 'caixa',
  nth: n => `${n}ª`,
  beatHeads: `cabeças do tempo\n${countFromOne(BEAT_STEPS, ' ')}`, // a stat label: \n breaks the line
  offbeatSixteenths: 'semicolcheias de contratempo',
  answerOnBeat: 'resposta na cabeça',
  mainOffbeat: 'principal no contratempo',
  hitsMain: 'batidas\nprincipal',
  hitsAnswer: 'batidas\nresposta',
  onOffbeat: 'no contratempo',
  hits: n => `${n} batidas`,
  sameInAll: 'o que muda',
  sameInAllValue: 'só a alfaia; o resto toca igual',
  baques: 'baques',
  voices: 'vozes',
  bars: 'compassos',
  howItEnds: 'como termina',
  breaksAndCut: '2 viradas e 1 corte',
  whoCalls: 'quem chama',
  mestreWhistle: 'o apito do mestre',
};
const COPY = {
  name: 'maracatu de baque virado',
  selector: 'maracatu', // the rhythm selector's chip
  feminineInstruments: FEMININE_INSTRUMENTS,
  scenes: {
    opening: { chip: 'Abertura', eyebrow: 'maracatu de baque virado', title: 'Baque virado' },
    ensemble: { chip: 'Orquestra', eyebrow: `${INSTRUMENT_COUNT} instrumentos`, title: 'Orquestra' },
    agogo: { chip: 'Agogô', eyebrow: `${AGOGO_STEPS.length} batidas em ${STEPS_PER_BAR}`, title: 'Agogô' },
    swing: { chip: 'Balanço', eyebrow: 'desvio em milissegundos', title: 'Balanço' },
    offbeat: { chip: 'Contratempo', eyebrow: 'cabeça e contratempo', title: 'Contratempo' },
    marcacao: { chip: 'Marcação', eyebrow: `${baqueNumber('marcacao')} ou luanda`, title: 'Marcação' },
    arrasto: { chip: 'Arrasto', eyebrow: baqueNumber('arrasto'), title: 'Arrasto' },
    imale: { chip: 'Imalê', eyebrow: baqueNumber('imale'), title: 'Imalê' },
    martelo: { chip: 'Martelo', eyebrow: baqueNumber('martelo'), title: 'Martelo' },
    trovao: { chip: 'Trovão', eyebrow: baqueNumber('trovao'), title: 'Trovão' },
    afoxe: { chip: 'Afoxé', eyebrow: baqueNumber('afoxe'), title: 'Afoxé' },
    parada: { chip: 'Parada', eyebrow: `${baqueNumber('parada')} de ${PATTERNS.parada.bars} compassos`, title: 'Parada' },
    summary: { chip: 'Resumo', eyebrow: 'resumo', title: `${BAQUE_ORDER.length} baques` },
    finale: { chip: 'Final', eyebrow: '', title: 'Fim' },
  },
  patterns: {
    marcacao: 'Marcação',
    arrasto: 'Arrasto',
    imale: 'Imalê',
    martelo: 'Martelo',
    trovao: 'Trovão',
    afoxe: 'Afoxé',
    parada: 'Parada',
    virada: 'Virada',
  },
  voices: { main: 'principal', answer: 'resposta', stick: 'baqueta', caixa: 'caixa', agbe: 'agbê', ganza: 'ganzá', agogo: 'agogô', whistle: 'apito' },
  instruments: { alfaia: READ.alfaia }, // an instrument with hands is named over each hand
  hands: { main: READ.mainHand, answer: READ.answerHand }, // a hand as the entry readout names it
  centre: { whistle: 'APITO', roll: 'RUFO', break: 'VIRADA', cut: 'CORTE', end: 'FIM', offbeat: 'CONTRATEMPO' },
  read: READ,
};

// ---------- readout layouts ----------
const T = READ;
// The marcação, the first baque, shows where each hand falls against the beat.
const ANSWER_ON_BEAT_STEPS = countFromOne(
  PATTERNS.marcacao.answer.filter(step => !isOffbeat(step)),
  ' ',
);
const MAIN_OFFBEAT_STEPS = countFromOne(PATTERNS.marcacao.main.filter(isOffbeat), ' ');
const METER_PERCENT_PER_MS = 2.4; // swing meter: bar width (% of its half) per millisecond
const SCORE_HEIGHT = 60; // score height passed to renderScore (score units)
const TWO_BAR_REPEATS = 2,
  ONE_BAR_REPEATS = 3; // cycles written out in the score
const beatSeparator = step => (step % 4 === 3 && step < 15 ? '|' : '');
const sequence = (steps, mark) => SIXTEENTHS.map(step => (steps.includes(step) ? mark : '·') + beatSeparator(step)).join('');
const intervals = steps => steps.map((step, i) => (steps[(i + 1) % steps.length] - step + STEPS_PER_BAR) % STEPS_PER_BAR || STEPS_PER_BAR);
const signed = ms => (ms > 0 ? '+' : ms < 0 ? '−' : '±') + Math.abs(ms);
const inst = id => (id ? ` data-inst="${id}"` : '');

function swingMeter(ms, color, id) {
  // the layout is in styles.css (.meter); only the side, the length and the colours are per hit
  const bar = `${ms >= 0 ? 'left:50%' : 'right:50%'};width:${Math.abs(ms) * METER_PERCENT_PER_MS}%;background:${color}`;
  return (
    `<span class="meter"${inst(id)}><i class="meter-bar" style="${bar}"></i><i class="zero" style="background:${fgAlpha(0.7)}"></i></span>` +
    `<span class="n"${inst(id)} style="color:${color}">${signed(ms)}</span>`
  );
}

// scene id → readout markup; `show` gives the show's totals
const LAYOUTS = {
  opening: () =>
    row(label(T.cycle), T.cycleValue(BAR_SECONDS.toFixed(2).replace('.', ','))) +
    row(label(T.sixteenth), T.milliseconds(Math.round((BAR_SECONDS / STEPS_PER_BAR) * MS_PER_SECOND))) +
    row(label(T.voices), DRUMMING.length) +
    row(label(T.baques), BAQUE_ORDER.length),
  ensemble: () => `<div data-entry></div>`,
  agogo: () =>
    `<div class="notation">${label(T.low)}<span class="seq" style="color:${COLORS.acid}">${sequence(AGOGO.low, '●')}</span><span class="n">${AGOGO.low.length}</span>
      ${label(T.high)}<span class="seq" style="color:${COLORS.acid};opacity:.6">${sequence(AGOGO.high, '○')}</span><span class="n">${AGOGO.high.length}</span></div>` +
    row(label(T.intervals), intervals(AGOGO_STEPS).join(' ')) +
    row(label(T.hitsPerSixteenths), `${AGOGO_STEPS.length} / ${STEPS_PER_BAR}`),
  swing: () => {
    const high = swingMilliseconds('high'),
      low = swingMilliseconds('low');
    return (
      `<div class="row swing-head"><span class="k" data-listening></span>${label(T.msLegend)}</div>
      <div class="notation swing">${label(T.sixteenthHeader)}${label(T.caixa, COLORS.ice, 'caixa')}<span></span>${label(T.alfaia, ROLES.mainHand, 'alfaia')}<span></span>` +
      [0, 1, 2, 3].map(i => label(T.nth(i + 1)) + swingMeter(high[i], COLORS.ice, 'caixa') + swingMeter(low[i], ROLES.mainHand, 'alfaia')).join('') +
      `</div>`
    );
  },
  offbeat: () =>
    stats('two', stat(BEAT_STEPS.length, T.beatHeads, COLORS.fg), stat(OFFBEAT_STEPS.length, T.offbeatSixteenths, ROLES.answerHand)) +
    row(label(T.answerOnBeat, ROLES.answerHand), ANSWER_ON_BEAT_STEPS, 'alfaia') +
    row(label(T.mainOffbeat, ROLES.mainHand), MAIN_OFFBEAT_STEPS, 'alfaia'),
  // the row draws the first bar; the count is the whole pattern, as the baque's own scene shows it
  summary: () =>
    `<div class="notation tight">` +
    BAQUE_ORDER.map(id => {
      const main = stepsOfBar(PATTERNS[id].main, 0),
        answer = stepsOfBar(PATTERNS[id].answer, 0);
      const marks = SIXTEENTHS.map(
        step =>
          (main.includes(step) ? `<b style="color:${ROLES.mainHand}">●</b>` : answer.includes(step) ? `<b style="color:${ROLES.answerHand}">●</b>` : '·') +
          beatSeparator(step),
      ).join('');
      return `${label(COPY.patterns[id])}<span class="seq" data-inst="alfaia">${marks}</span><span class="n" data-inst="alfaia">${T.hits(PATTERNS[id].main.length + PATTERNS[id].answer.length)}</span>`;
    }).join('') +
    `</div>` +
    row(label(T.sameInAll), T.sameInAllValue),
  finale: show =>
    stats('', stat(BAQUE_ORDER.length, T.baques, ROLES.accent), stat(DRUMMING.length, T.voices, COLORS.ember), stat(show.totalBars, T.bars, COLORS.fg)) +
    row(label(T.howItEnds), T.breaksAndCut) +
    row(label(T.whoCalls), T.mestreWhistle),
};

function baqueLayout(scene) {
  const pattern = PATTERNS[scene.pattern],
    all = allAlfaiaSteps(pattern),
    offbeats = all.filter(isOffbeat).length,
    bars = pattern.bars || 1;
  const markup = stats(
    'small',
    stat(pattern.main.length, T.hitsMain, ROLES.mainHand),
    stat(pattern.answer.length, T.hitsAnswer, ROLES.answerHand),
    stat(`${offbeats}<small>/${all.length}</small>`, T.onOffbeat, COLORS.fg),
  );
  const score = renderScore({
    bars: [...Array(bars).keys()].map(n => ({ main: stepsOfBar(pattern.main, n), answer: stepsOfBar(pattern.answer, n), stick: stepsOfBar(pattern.stick, n) })),
    colors: { ink: COLORS.fg, main: ROLES.mainHand, answer: ROLES.answerHand, stick: COLORS.bone, dim: fgAlpha(0.45) },
    timeSig: true,
    repeat: bars === 2 ? TWO_BAR_REPEATS : ONE_BAR_REPEATS,
    accentOffbeats: true,
    height: SCORE_HEIGHT,
  });
  return { markup: `${markup}<div class="score">${score.markup}<i class="scur"></i></div><div class="wave" hidden></div>`, score };
}

/**
 * The readout for a scene: its markup, the score (or null) whose cursor follows the bar, and the
 * instrument the whole readout is about (`focus`, '' for none), so a muted one shows disabled.
 */
function readout(scene, show) {
  if (scene.named && scene.id !== 'summary') return { ...baqueLayout(scene), focus: 'alfaia' };
  return { markup: (LAYOUTS[scene.id] || (() => ''))(show), score: null, focus: scene.id === 'agogo' ? 'agogo' : '' };
}

export const MARACATU = {
  id: 'maracatu',
  bpm: BPM,
  beatsPerBar: BEATS_PER_BAR,
  stepsPerBeat: STEPS_PER_BEAT,
  swing: SWING,
  voices: VOICES,
  shapeVoices: ['agogo', 'answer', 'main'], // the voices whose hits draw a shape on the wheel, in drawing order
  barHits,
  sceneDefaults: { pattern: 'marcacao' },
  scenes: SCENE_LIST,
  looks: SCENE_LOOKS,
  readout,
  // the sample outline the readout shows in a baque's last two bars, for the alfaia option in use
  waves: { sound: 'alfaia', voices: ALFAIA_HANDS, fromBar: 2, name: (option, voice) => `alfaia-${option}-${voice}` },
  sounds: {
    choices: SOUND_CHOICES,
    fixedFiles: ['stick', 'caixa-roll', ...WHISTLE_KINDS.map(kind => `whistle-${WHISTLE}-${kind}`)],
    sampleFor: SAMPLE_FOR,
    previewScene: 'marcacao', // a pick paused plays this scene's first bar: every instrument plays its basic part
  },
  copy: COPY,
};

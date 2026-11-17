// Coco da Xambá (Nação Xambá, Portão do Gelo, Olinda): everything the engine plays and shows that
// belongs to this rhythm. Positions are sixteenths of a 2/4 bar (0–7): one bar per turn of the wheel.
// Sources: Castro, «Nação Xambá: identidade negra, tradição religiosa e estratégias de difusão da sua
// cultura», ANPPOM 2018 (the alfaia sits on a chair and is played on both heads; the coco is made of
// rhythmic phrases that join and end in a «rufo»); Revista Continente, «O coco ancestral do Bongar».
// Neither source writes the parts out: the patterns below are this project's reading, kept simple.
import { label, row, stat, stats } from '../readout-markup.js';
import { COLORS, ROLES } from '../theme.js';

const BPM = 132;
const BEATS_PER_BAR = 2;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const BAR_SECONDS = (60 / BPM) * BEATS_PER_BAR;
const STEPS = [...Array(STEPS_PER_BAR).keys()];
const MS_PER_SECOND = 1000;

// One tempo and the straight grid for the whole show: no swing was measured for this rhythm.
const SWING = {};

// The alfaia has two voices, one per head: the low head on the beats, the second head on the
// off-beats. The roles are the ones src/rhythms/maracatu.js documents.
const VOICES = {
  low: { instrument: 'alfaia', ring: 98, size: 5.6, swing: null, color: ROLES.mainHand, hand: true, boom: 1 },
  high: { instrument: 'alfaia', ring: 88, size: 4.8, swing: null, color: ROLES.answerHand, hand: true, boom: 0.6 },
  caixa: { instrument: 'caixa', ring: 78, size: 3, swing: null, color: COLORS.ice, crack: true },
  abe: { instrument: 'abe', ring: 69, size: 3, swing: null, color: COLORS.magenta },
  ganza: { instrument: 'ganza', ring: 61, size: 2.6, swing: null, color: COLORS.violet },
  pandeiro: { instrument: 'pandeiro', ring: 53, size: 3.4, swing: null, color: COLORS.bone, toneScale: { jingle: 0.6 } },
  palmas: { instrument: 'palmas', ring: 45, size: 3.4, swing: null, color: COLORS.white },
  agogo: { instrument: 'agogo', ring: 38, size: 4, swing: null, color: COLORS.acid, spark: true, toneScale: { high: 0.7 } },
};
// The order also seeds the per-hit variation of the sound: keep it stable.
const VOICE_ORDER = Object.keys(VOICES);
const ALFAIA = ['low', 'high'];

const isOffbeat = step => step % STEPS_PER_BEAT !== 0;
const BEAT_STEPS = STEPS.filter(step => !isOffbeat(step));
const countFromOne = steps => steps.map(step => step + 1).join(' ');

// Alfaia phrases, one bar each: `low` the low head, `high` the second head.
const PHRASES = {
  base: { low: [0, 4], high: [2, 6] },
  dobrada: { low: [0, 3, 4], high: [2, 6] },
  resposta: { low: [0, 4], high: [2, 5, 6] },
  corrida: { low: [0, 3, 4, 7], high: [2, 6] },
  toque: { low: [0, 3, 4, 7], high: [1, 2, 5, 6] },
};
const PHRASE_ORDER = ['base', 'dobrada', 'resposta', 'corrida']; // the Frases scene, four bars each
const PHRASE_BARS = 4;

const AGOGO = { low: [0, 3, 6], high: [2, 7] };

const hit = (step, velocity, tone) => (tone ? { step, velocity, tone } : { step, velocity });
const silentBar = () => Object.fromEntries(VOICE_ORDER.map(voice => [voice, []]));
const cycle = velocities => STEPS.map(step => hit(step, velocities[step % velocities.length]));

/** The band's fixed parts under one alfaia phrase. */
function phraseHits(phraseKey) {
  const phrase = PHRASES[phraseKey];
  return {
    low: phrase.low.map(step => hit(step, 1)),
    high: phrase.high.map(step => hit(step, 0.85)),
    caixa: cycle([0.55, 0.32, 1, 0.4]),
    abe: STEPS.filter(step => step % 4 !== 1).map(step => hit(step, step % 4 === 2 ? 1 : 0.6)),
    ganza: cycle([0.8, 0.45, 1, 0.45]),
    pandeiro: STEPS.map(step => (isOffbeat(step) ? hit(step, step % 4 === 2 ? 0.95 : 0.55, 'jingle') : hit(step, 1, 'low'))),
    palmas: STEPS.filter(step => step % 4 === 2).map(step => hit(step, 1)),
    agogo: [...AGOGO.low.map(step => hit(step, 1, 'low')), ...AGOGO.high.map(step => hit(step, 0.85, 'high'))].sort((a, b) => a.step - b.step),
  };
}

// Special bars (the bar modes the engine knows):
//   roll – the alfaia alone, the two heads in turn on every sixteenth, swelling
//   cut  – everyone on 1, then silence
function barHits(scene, barInScene) {
  const mode = scene.mode(barInScene);
  if (mode === 'roll') {
    const swell = step => 0.3 + 0.7 * ((barInScene * STEPS_PER_BAR + step) / (scene.bars * STEPS_PER_BAR - 1)) ** 1.4;
    return {
      ...silentBar(),
      low: STEPS.filter(step => step % 2 === 0).map(step => hit(step, swell(step))),
      high: STEPS.filter(step => step % 2 === 1).map(step => hit(step, swell(step))),
    };
  }
  if (mode === 'cut') {
    const all = phraseHits('base');
    return Object.fromEntries(VOICE_ORDER.map(voice => [voice, all[voice].filter(h => h.step === 0)]));
  }
  return phraseHits(scene.phrase(barInScene));
}

// ---------- the show script ----------
const always = value => () => value;
/** An instrument scene: the band so far plus the instruments it adds; the lanes show the new ones beside the low head. */
const entering = [];
const adds = (id, voices, lanes = ['low', ...voices]) => {
  entering.push(...voices);
  return { id, bars: 8, voices: always([...entering]), lanes };
};

const SCENE_LIST = [
  { id: 'intro', bars: 4, mode: always('roll'), lanes: ALFAIA },
  adds('alfaia', ['low'], ['low']),
  adds('heads', ['high'], ALFAIA),
  adds('ganza', ['ganza']),
  adds('pandeiro', ['pandeiro']),
  adds('palmas', ['palmas']),
  adds('agogoAbe', ['agogo', 'abe'], ['agogo', 'abe']),
  adds('caixa', ['caixa'], ['caixa', ...ALFAIA]),
  { id: 'phrases', bars: PHRASE_BARS * PHRASE_ORDER.length, phrase: bar => PHRASE_ORDER[Math.floor(bar / PHRASE_BARS)], lanes: ALFAIA },
  { id: 'toque', bars: 16, phrase: always('toque'), pattern: 'toque', lanes: ALFAIA, named: true },
  { id: 'rufo', bars: 4, mode: always('roll'), lanes: ALFAIA },
  { id: 'finale', bars: 8, mode: bar => (bar === 7 ? 'cut' : 'normal'), lanes: ALFAIA, isEnd: true },
];

// How the background behaves in each scene (the keys src/rhythms/maracatu.js documents): slower,
// rounder turns than the maracatu, for the trance of the terreiro.
const SCENE_LOOKS = {
  intro: { zoom: 0.9, rot: 0.12, hue: 30, keep: 0.94, seg: 8, warp: 1.0, speed: 0.6, pal: 0.1 },
  alfaia: { zoom: 0.6, rot: 0.08, hue: 25, keep: 0.92, seg: 6, warp: 0.8, speed: 0.5, pal: 0.15 },
  heads: { zoom: 0.7, rot: -0.1, hue: 45, keep: 0.93, seg: 6, warp: 0.9, speed: 0.6, pal: 0.2 },
  ganza: { zoom: 0.5, rot: 0.14, hue: 60, keep: 0.92, seg: 8, warp: 0.8, speed: 0.6, pal: 0.3 },
  pandeiro: { zoom: 0.6, rot: -0.16, hue: 80, keep: 0.93, seg: 9, warp: 0.9, speed: 0.7, pal: 0.35 },
  palmas: { zoom: 0.5, rot: 0.12, hue: 100, keep: 0.92, seg: 10, warp: 0.9, speed: 0.7, pal: 0.4 },
  agogoAbe: { zoom: 0.4, rot: -0.3, hue: 90, keep: 0.94, seg: 10, warp: 0.7, speed: 0.6, pal: 0.45 },
  caixa: { zoom: 0.8, rot: 0.2, hue: 120, keep: 0.93, seg: 12, warp: 1.1, speed: 0.8, pal: 0.5 },
  phrases: { zoom: 1.0, rot: -0.18, hue: 70, keep: 0.94, seg: 7, warp: 1.2, speed: 0.9, pal: 0.6 },
  toque: { zoom: 1.4, rot: 0.3, hue: 140, keep: 0.95, seg: 9, warp: 1.4, speed: 1.2, pal: 0.7 },
  rufo: { zoom: 1.6, rot: -0.35, hue: 160, keep: 0.95, seg: 16, warp: 1.5, speed: 1.4, pal: 0.8 },
  finale: { zoom: 1.2, rot: 0.25, hue: 50, keep: 0.95, seg: 16, warp: 1.2, speed: 1.0, pal: 0.05 },
};

// ---------- sound ----------
// The maracatu's CC0 samples, plus the synthesized pandeiro and palmas (tools/make-coco-sounds.mjs).
const SOUND_CHOICES = [
  {
    id: 'alfaia',
    label: 'alfaia',
    defaultOption: 'deep-click',
    preview: ALFAIA,
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
    defaultOption: 'aro',
    preview: ['caixa'],
    files: o => [`caixa-${o}`],
    options: [
      ['aro', 'tarol'],
      ['padrao', 'caixa de guerra'],
      ['brasileira', 'caixa grave'],
      ['esteira', 'caixa com esteira'],
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
    id: 'abe',
    label: 'abê',
    defaultOption: 'maracatu',
    preview: ['abe'],
    files: o => [`agbe-${o}`],
    options: [
      ['maracatu', 'abê seco'],
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
  {
    id: 'pandeiro',
    label: 'pandeiro',
    defaultOption: 'sintetizado',
    preview: ['pandeiro'],
    files: () => ['pandeiro-grave', 'pandeiro-platinela'],
    options: [['sintetizado', 'pandeiro sintetizado']],
  },
  {
    id: 'palmas',
    label: 'palmas',
    defaultOption: 'sintetizado',
    preview: ['palmas'],
    files: () => ['palmas'],
    options: [['sintetizado', 'palmas sintetizadas']],
  },
];
// The second head is the alfaia's answer sample tuned up: a tighter, higher skin.
const SECOND_HEAD_RATE = 1.26;

// voice → [sample, gain, playback rate] for one hit
const SAMPLE_FOR = {
  low: (choice, velocity) => [`alfaia-${choice.alfaia}-main`, 1.1 * velocity, 1],
  high: (choice, velocity) => [`alfaia-${choice.alfaia}-answer`, 0.9 * velocity, SECOND_HEAD_RATE],
  caixa: (choice, velocity) => [`caixa-${choice.caixa}`, 0.45 * velocity ** 1.4, 1],
  abe: (choice, velocity) => [`agbe-${choice.abe}`, 0.8 * velocity, 1],
  ganza: (choice, velocity) => [`ganza-${choice.ganza}`, 0.7 * velocity, 1],
  pandeiro: (_choice, velocity, tone) => [tone === 'jingle' ? 'pandeiro-platinela' : 'pandeiro-grave', 0.6 * velocity, 1],
  palmas: (_choice, velocity) => ['palmas', 0.55 * velocity, 1],
  agogo: (choice, velocity, tone) => [`agogo-${choice.agogo}`, 0.55 * velocity, tone === 'low' ? 1 : 1.19],
};

// ---------- copy ----------
const DRUMMING_INSTRUMENTS = new Set(VOICE_ORDER.map(voice => VOICES[voice].instrument)).size;
const phraseHitCount = key => PHRASES[key].low.length + PHRASES[key].high.length;
const READ = {
  cycle: '1 ciclo',
  cycleValue: seconds => `${STEPS_PER_BAR} semicolcheias = ${seconds} s`,
  sixteenth: '1 semicolcheia',
  milliseconds: ms => `${ms} ms`,
  meter: 'compasso',
  meterValue: `${BEATS_PER_BAR}/4`,
  instruments: 'instrumentos',
  enters: 'entra',
  entersMuted: 'sem som',
  lowHead: 'pele grave',
  highHead: 'segunda pele',
  beatHeads: `cabeças do tempo\n${countFromOne(BEAT_STEPS)}`,
  offbeats: 'semicolcheias de contratempo',
  hitsLow: 'batidas\npele grave',
  hitsHigh: 'batidas\nsegunda pele',
  onOffbeat: 'no contratempo',
  hits: n => `${n} batidas`,
  phrases: 'frases',
  sameTempo: 'andamento',
  sameTempoValue: `${BPM} bpm, o mesmo`,
  hitsPerBar: 'batidas / semicolcheias',
  bars: 'compassos',
  howItEnds: 'como termina',
  rufoAndCut: 'rufo e corte',
};
const COPY = {
  name: 'Coco da Xambá',
  selector: 'coco', // the rhythm selector's chip
  feminineInstruments: ['alfaia', 'caixa', 'palmas'],
  scenes: {
    intro: { chip: 'Introdução', eyebrow: 'Nação Xambá, Olinda', title: 'Coco da Xambá' },
    alfaia: { chip: 'Alfaia', eyebrow: 'pele grave nas cabeças do tempo', title: 'Alfaia' },
    heads: { chip: 'Duas peles', eyebrow: 'segunda pele no contratempo', title: 'Duas peles' },
    ganza: { chip: 'Ganzá', eyebrow: 'entra', title: 'Ganzá' },
    pandeiro: { chip: 'Pandeiro', eyebrow: 'entra', title: 'Pandeiro' },
    palmas: { chip: 'Palmas', eyebrow: 'no contratempo', title: 'Palmas' },
    agogoAbe: { chip: 'Agogô e abê', eyebrow: 'entram', title: 'Agogô e abê' },
    caixa: { chip: 'Caixa', eyebrow: 'entra', title: 'Caixa' },
    phrases: { chip: 'Frases', eyebrow: `${PHRASE_ORDER.length} frases da alfaia`, title: 'Frases' },
    toque: { chip: 'Toque', eyebrow: 'mais batidas, o mesmo andamento', title: 'Toque' },
    rufo: { chip: 'Rufo', eyebrow: 'rufo final', title: 'Rufo' },
    finale: { chip: 'Final', eyebrow: '', title: 'Fim' },
  },
  patterns: { base: 'Base', dobrada: 'Dobrada', resposta: 'Resposta', corrida: 'Corrida', toque: 'Toque' },
  voices: { low: 'pele grave', high: 'segunda pele', caixa: 'caixa', abe: 'abê', ganza: 'ganzá', pandeiro: 'pandeiro', palmas: 'palmas', agogo: 'agogô' },
  instruments: { alfaia: 'alfaia' },
  hands: { low: READ.lowHead, high: READ.highHead },
  centre: { roll: 'RUFO', cut: 'CORTE', end: 'FIM', offbeat: 'CONTRATEMPO' },
  read: READ,
};

// ---------- readout layouts ----------
const T = READ;
const beatSeparator = step => (step % STEPS_PER_BEAT === STEPS_PER_BEAT - 1 && step < STEPS_PER_BAR - 1 ? '|' : '');
const marks = (low, high) =>
  STEPS.map(
    step =>
      (low.includes(step) ? `<b style="color:${ROLES.mainHand}">●</b>` : high.includes(step) ? `<b style="color:${ROLES.answerHand}">●</b>` : '·') +
      beatSeparator(step),
  ).join('');
const phraseRow = key =>
  `${label(COPY.patterns[key])}<span class="seq" data-inst="alfaia">${marks(PHRASES[key].low, PHRASES[key].high)}</span><span class="n" data-inst="alfaia">${T.hits(phraseHitCount(key))}</span>`;
const entry = () => `<div data-entry></div>`;
const allHits = phrase => [...phrase.low, ...phrase.high];

const LAYOUTS = {
  intro: () =>
    row(label(T.cycle), T.cycleValue(BAR_SECONDS.toFixed(2).replace('.', ','))) +
    row(label(T.sixteenth), T.milliseconds(Math.round((BAR_SECONDS / STEPS_PER_BAR) * MS_PER_SECOND))) +
    row(label(T.meter), T.meterValue) +
    row(label(T.instruments), DRUMMING_INSTRUMENTS),
  alfaia: entry,
  heads: () =>
    stats('two', stat(BEAT_STEPS.length, T.beatHeads, ROLES.mainHand), stat(STEPS_PER_BAR - BEAT_STEPS.length, T.offbeats, ROLES.answerHand)) +
    `<div class="notation tight">${phraseRow('base')}</div>`,
  ganza: entry,
  pandeiro: entry,
  palmas: entry,
  agogoAbe: entry,
  caixa: entry,
  phrases: () => `<div class="notation tight">${PHRASE_ORDER.map(phraseRow).join('')}</div>${row(label(T.sameTempo), T.sameTempoValue)}`,
  toque: () => {
    const phrase = PHRASES.toque,
      all = allHits(phrase);
    return `${stats(
      'small',
      stat(phrase.low.length, T.hitsLow, ROLES.mainHand),
      stat(phrase.high.length, T.hitsHigh, ROLES.answerHand),
      stat(`${all.filter(isOffbeat).length}<small>/${all.length}</small>`, T.onOffbeat, COLORS.fg),
    )}<div class="notation tight">${phraseRow('base')}${phraseRow('toque')}</div>`;
  },
  rufo: () => row(label(T.hitsPerBar), `${STEPS_PER_BAR} / ${STEPS_PER_BAR}`, 'alfaia') + row(label(T.sameTempo), T.sameTempoValue),
  finale: show =>
    stats(
      '',
      stat(PHRASE_ORDER.length, T.phrases, ROLES.accent),
      stat(DRUMMING_INSTRUMENTS, T.instruments, COLORS.ember),
      stat(show.totalBars, T.bars, COLORS.fg),
    ) + row(label(T.howItEnds), T.rufoAndCut),
};
const ALFAIA_FOCUS = new Set(['alfaia', 'heads', 'phrases', 'toque', 'rufo']);

/** The readout for a scene: its markup, no score (the score renderer is written for 4/4), and its focus. */
const readout = (scene, show) => ({ markup: LAYOUTS[scene.id](show), score: null, focus: ALFAIA_FOCUS.has(scene.id) ? 'alfaia' : '' });

export const COCO_XAMBA = {
  id: 'coco',
  bpm: BPM,
  beatsPerBar: BEATS_PER_BAR,
  stepsPerBeat: STEPS_PER_BEAT,
  swing: SWING,
  voices: VOICES,
  shapeVoices: ['agogo', 'high', 'low'],
  barHits,
  sceneDefaults: { phrase: always('base') },
  scenes: SCENE_LIST,
  looks: SCENE_LOOKS,
  readout,
  waves: null,
  sounds: {
    choices: SOUND_CHOICES,
    fixedFiles: [],
    sampleFor: SAMPLE_FOR,
    previewScene: 'caixa', // every instrument plays its basic part there
  },
  copy: COPY,
};

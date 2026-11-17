// Manguebeat: everything the engine plays and shows that belongs to this rhythm. Instrumental: two
// alfaia voices (the main hand and the answer), the caixa, the ganzá in a coco levada, the electric
// bass doubling the main hand, a distorted guitar riff and a sampler (a worn record's noise). 4/4 at
// one tempo, a 16-step wheel, one bar per turn. The dub echo is written into the parts: each repeat
// is a hit a dotted eighth (three sixteenths) after the one before, softer, so the wheel shows it.
// The riff is original to this project. Choices and sources: docs/rhythms/manguebeat.md.
import { label, row, stat, stats } from '../readout-markup.js';
import { renderRoll } from '../roll.js';
import { fgAlpha } from '../theme.js';
import { createManguebeatPainter, MANGUE_PALETTE } from './manguebeat-background.js';
import { straightMeter } from './meter.js';
import { midiOf, recordedChoices, studioSounds, takes } from './studio-kit.js';

const BPM = 100; // docs/research/pernambuco-rhythms-feeling.md, § 4: «Tempo is about 90 to 105 BPM»
const BEATS_PER_BAR = 4;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const BEAT_SECONDS = 60 / BPM;
const BAR_SECONDS = BEAT_SECONDS * BEATS_PER_BAR;
const MS_PER_SECOND = 1000;
const ECHO_STEPS = 3; // the dub delay: a dotted eighth
const ECHO_BARS_BACK = 2; // a long tail reaches this many bars past its stroke

// Velocities.
const ACCENT = 1;
const STRONG = 0.92;
const PLAIN = 0.8;
const SOFT = 0.55;
const GHOST = 0.4;
const ECHO_ACCENT = 0.95; // a stroke at or above this velocity throws an echo

// Material colours inside the manguebeat palette, each at 3:1 or more on the wheel's face: the
// alfaia's hands in crab orange and raw leather, the caixa and the ganzá in iron and tin, the bass
// in mud lifted to read, the guitar in rust lifted, the sampler in the antenna's pale signal.
const COLOR = {
  main: MANGUE_PALETTE.crab,
  answer: '#c9a27a', // raw leather
  caixa: '#b9c0c4', // iron
  ganza: '#9fbf78', // the mangrove, lifted
  baixo: '#b08a5e', // mud, lifted
  guitarra: '#e0523a', // rust, lifted
  sampler: MANGUE_PALETTE.signal,
};

// ring/size: where and how big the voice sits on the wheel. The roles the views read: hand (a hand of
// the alfaia: contratempo marks), boom, spark. toneScale: an echo draws smaller.
const ECHO_DOT = 0.6;
const VOICES = {
  main: { instrument: 'alfaia', ring: 98, size: 5.6, swing: null, color: COLOR.main, hand: true, boom: 1, toneScale: { eco: ECHO_DOT } },
  answer: { instrument: 'alfaia', ring: 88, size: 4.8, swing: null, color: COLOR.answer, hand: true, boom: 0.7, toneScale: { eco: ECHO_DOT } },
  caixa: { instrument: 'caixa', ring: 78, size: 3.2, swing: null, color: COLOR.caixa, crack: true, toneScale: { eco: ECHO_DOT } },
  ganza: { instrument: 'ganza', ring: 69, size: 2.6, swing: null, color: COLOR.ganza },
  baixo: { instrument: 'baixo', ring: 60, size: 4.4, swing: null, color: COLOR.baixo, pitched: true, boom: 0.5 },
  guitarra: { instrument: 'guitarra', ring: 51, size: 4, swing: null, color: COLOR.guitarra, pitched: true, spark: true },
  sampler: { instrument: 'sampler', ring: 42, size: 3, swing: null, color: COLOR.sampler },
};
// The order also seeds the per-hit variation of the sound: keep it stable.
const VOICE_ORDER = Object.keys(VOICES);
const HANDS = ['main', 'answer'];
const INSTRUMENT_COUNT = new Set(VOICE_ORDER.map(voice => VOICES[voice].instrument)).size;

// ---------- the parts ----------
/** One bar as written: sixteen tokens; '.' rests, anything else is a mark. */
const tokens = text => text.trim().split(/\s+/);
const stepsOf = (text, marks) => tokens(text).flatMap((token, step) => (marks.includes(token) ? [step] : []));

// The main hand, heavy, in 3 + 3 + 4 + 3 + 3 (an inference: the research gives no transcription).
export const MAIN = 'X . . X . . X . . . X . . X . .';
const MAIN_VELOCITY = { 0: ACCENT, 3: PLAIN, 6: STRONG, 10: PLAIN, 13: STRONG };
// The answer hand on beats 2 and 4, the backbeat of the band; every second bar it picks up into the next.
export const ANSWER = ['. . . . X . . . . . . . X . . .', '. . . . X . . . . . . . X . . x'];
const ANSWER_FILL = '. . . . X . . . . . . . X x x x';
// The caixa: the backbeat with a ghost, and, in its own scene, only the accents and their echo.
export const CAIXA_ECHO = '. . . . X . . . . . x . X . . .';
export const CAIXA = '. . x . X . . x . . x . X . x .';
// The ganzá in the coco levada: every sixteenth, the accent on the third of each beat.
export const GANZA = 'x x X x x x X x x x X x x x X x';
// The dub: beats 1 and 3 only; the echoes fill beats 2 and 4.
const DUB_MAIN = 'X . . X . . . . X . . . . . . .';
const DUB_BASS = ['E1 . . . . . . . G1 . . D2 . . . .', 'E1 . . . . . . . E1 . . G1 . . . .'];

// The riff: power chords on the main hand's strokes (! accents them), a chug between. E minor,
// with the flat sixth (C) and the major fifth (B) of the harmonic minor for the weight.
export const RIFF = [
  'E! . . E! . . G! E . . A! . . G! . .',
  'E! . . E! . . D! D . . C! . . B! . .',
  'E! . . E! . . G! E . . A! . . G! . .',
  'E! . . E! . . D! D . . C! . . D! E E',
];
// Each chord's root: the guitar's (its recorded power chords) and the bass's, an octave down.
const CHORD = {
  E: { guitar: 'E2', bass: 'E1', symbol: 'E5' },
  G: { guitar: 'G2', bass: 'G1', symbol: 'G5' },
  A: { guitar: 'A2', bass: 'A1', symbol: 'A5' },
  B: { guitar: 'B2', bass: 'B1', symbol: 'B5' },
  C: { guitar: 'C3', bass: 'C2', symbol: 'C5' },
  D: { guitar: 'D3', bass: 'D2', symbol: 'D5' },
};

const hit = (step, velocity, tone) => (tone ? { step, velocity, tone } : { step, velocity });
const silentBar = () => Object.fromEntries(VOICE_ORDER.map(voice => [voice, []]));
/** The marks of a bar: X an accent, x a ghost. */
const strokes = (text, velocity = PLAIN) =>
  tokens(text).flatMap((token, step) => (token === 'X' ? [hit(step, velocity)] : token === 'x' ? [hit(step, GHOST)] : []));
const mainBar = () => stepsOf(MAIN, ['X']).map(step => hit(step, MAIN_VELOCITY[step]));
/** The riff's chords of one bar: { step, chord, accent }. */
const riffChords = bar =>
  tokens(RIFF[bar % RIFF.length]).flatMap((token, step) => (token === '.' ? [] : [{ step, chord: token[0], accent: token.includes('!') }]));
const guitarBar = (bar, onlyAccents = false) =>
  riffChords(bar)
    .filter(c => !onlyAccents || c.accent)
    .map(c => hit(c.step, c.accent ? ACCENT : PLAIN, CHORD[c.chord].guitar));
/** The bass doubles the main hand: the riff's chord at each of its strokes. */
const bassBar = bar => {
  const chords = riffChords(bar);
  return mainBar().map(h => hit(h.step, h.velocity, CHORD[chords.find(c => c.step === h.step)?.chord ?? 'E'].bass));
};
const ganzaBar = () => tokens(GANZA).map((token, step) => hit(step, token === 'X' ? STRONG : SOFT, token === 'X' ? 'forte' : 'fraco'));
const samplerAt = (...steps) => steps.map(step => hit(step, PLAIN, 'chiado'));
const long = note => `${note}~`;

/** The whole band, one bar into the riff. */
const bandBar = bar => ({
  main: mainBar(),
  answer: strokes(ANSWER[bar % ANSWER.length], PLAIN),
  caixa: strokes(CAIXA, STRONG),
  ganza: ganzaBar(),
  baixo: bassBar(bar),
  guitarra: guitarBar(bar),
});
/** Everyone on the first beat, the guitar and the bass held. */
const tutti = () => ({
  main: [hit(0, ACCENT)],
  answer: [hit(0, ACCENT)],
  caixa: [hit(0, ACCENT)],
  baixo: [hit(0, ACCENT, long(CHORD.E.bass))],
  guitarra: [hit(0, ACCENT, long(CHORD.E.guitar))],
});

// ---------- the show script ----------
// Each scene: id, bars, voices, lanes (rows under the wheel), named (the centre names it), mode per
// bar, `parts(bar)`: the hits of each voice in its bar, and `echo`: which voices throw echoes, their
// feedback (the level each repeat keeps) and repeats, and on which bars (all when absent).
const always = value => () => value;
const ALL = VOICE_ORDER;
const DUB_FEEDBACK = 0.5;
const SHORT_ECHO = { feedback: 0.45, repeats: 3 };
const LONG_ECHO = { feedback: 0.6, repeats: 10 };
const PHRASE_BARS = 4; // the riff's length: the caixa throws its echo on the last bar of each
const SCENE_LIST = [
  {
    id: 'introducao',
    bars: 2,
    voices: always(['main', 'guitarra', 'sampler']),
    lanes: ['sampler', 'main', 'guitarra'],
    echo: { voices: ['main', 'guitarra'], feedback: DUB_FEEDBACK, repeats: 4 },
    parts: bar =>
      bar === 0
        ? { sampler: samplerAt(0, STEPS_PER_BAR / 2), main: [hit(0, ACCENT)] }
        : {
            sampler: samplerAt(0, STEPS_PER_BAR / 2),
            guitarra: [hit(0, ACCENT, long(CHORD.E.guitar))],
            main: [hit(12, SOFT), hit(13, PLAIN), hit(14, STRONG), hit(15, STRONG)],
          },
  },
  {
    id: 'alfaias',
    bars: 4,
    voices: always(HANDS),
    lanes: HANDS,
    parts: () => ({ main: mainBar(), answer: mainBar().map(h => hit(h.step, h.velocity * STRONG)) }),
  },
  { id: 'maos', bars: 4, voices: always(HANDS), lanes: HANDS, parts: bar => ({ main: mainBar(), answer: strokes(ANSWER[bar % ANSWER.length]) }) },
  {
    id: 'caixa',
    bars: 4,
    voices: always([...HANDS, 'caixa']),
    lanes: ['caixa', ...HANDS],
    focus: 'caixa',
    echo: { voices: ['caixa'], ...SHORT_ECHO },
    parts: bar => ({ main: mainBar(), answer: strokes(ANSWER[bar % ANSWER.length]), caixa: strokes(CAIXA_ECHO, ACCENT) }),
  },
  {
    id: 'baixo',
    bars: 4,
    voices: always([...HANDS, 'caixa', 'baixo']),
    lanes: ['main', 'baixo'],
    focus: 'baixo',
    parts: bar => ({ main: mainBar(), answer: strokes(ANSWER[bar % ANSWER.length]), caixa: strokes(CAIXA, STRONG), baixo: bassBar(bar) }),
  },
  {
    id: 'guitarra',
    bars: 4,
    voices: always([...HANDS, 'caixa', 'baixo', 'guitarra']),
    lanes: ['guitarra', 'baixo', 'main'],
    focus: 'guitarra',
    parts: bar => {
      const { ganza: _ganza, ...band } = bandBar(bar);
      return band;
    },
  },
  {
    id: 'coco',
    bars: 4,
    voices: always(ALL.filter(voice => voice !== 'sampler')),
    lanes: ['ganza', 'main', 'answer'],
    named: true,
    focus: 'ganza',
    parts: bandBar,
  },
  {
    id: 'dub',
    bars: 4,
    voices: always(['main', 'caixa', 'baixo', 'sampler']),
    lanes: ['main', 'baixo', 'caixa'],
    named: true,
    echo: { voices: ['main', 'caixa', 'baixo'], feedback: DUB_FEEDBACK, repeats: 4 },
    parts: bar => ({
      main: strokes(DUB_MAIN, ACCENT),
      baixo:
        bar === 3 ? [] : tokens(DUB_BASS[bar % DUB_BASS.length]).flatMap((token, step) => (token === '.' ? [] : [hit(step, step ? STRONG : ACCENT, token)])),
      caixa: bar % 2 ? [hit(12, ACCENT)] : [],
      sampler: samplerAt(0),
    }),
  },
  {
    id: 'retorno',
    bars: 4,
    // the layers come back one per bar; the entering one is named in the readout
    voices: bar => [['main', 'answer', 'baixo', 'sampler'], ['caixa'], ['ganza'], ['guitarra']].slice(0, bar + 1).flat(),
    lanes: ['main', 'baixo', 'caixa', 'guitarra'],
    parts: bar => ({ ...bandBar(bar), sampler: bar ? [] : samplerAt(0) }),
  },
  {
    id: 'corte',
    bars: 2,
    voices: always(ALL.filter(voice => voice !== 'sampler')),
    lanes: ['guitarra', 'main', 'caixa'],
    // one bar on the first beat and silence, then the band together on the main hand's strokes alone
    mode: bar => (bar === 0 ? 'cut' : 'normal'),
    parts: bar =>
      bar === 0
        ? tutti()
        : {
            main: mainBar(),
            answer: mainBar(),
            caixa: mainBar(),
            baixo: bassBar(0),
            guitarra: guitarBar(0, true),
          },
  },
  {
    id: 'banda',
    bars: 8,
    lanes: ['guitarra', 'baixo', 'main', 'caixa'],
    echo: { voices: ['caixa'], ...SHORT_ECHO, bars: bar => bar % PHRASE_BARS === PHRASE_BARS - 1 },
    parts: bar => ({
      ...bandBar(bar),
      answer: strokes(bar === 7 ? ANSWER_FILL : ANSWER[bar % ANSWER.length]),
      sampler: bar % PHRASE_BARS ? [] : samplerAt(0),
    }),
  },
  {
    id: 'final',
    bars: 4,
    lanes: ['guitarra', 'main', 'caixa'],
    isEnd: true,
    // the band once more, one stroke for all, then only its echo until the silence
    mode: bar => (bar === 0 ? 'normal' : 'cut'),
    echo: { voices: ['main', 'answer', 'caixa', 'guitarra'], ...LONG_ECHO, bars: bar => bar === 1 },
    parts: bar => (bar === 0 ? bandBar(0) : bar === 1 ? { ...tutti(), sampler: samplerAt(0) } : bar === 2 ? { sampler: [hit(0, SOFT, 'chiado')] } : {}),
  },
];
for (const scene of SCENE_LIST) if (scene.named) scene.pattern = scene.id;
const SCENE_STARTS = [];
let TOTAL_BARS = 0;
for (const scene of SCENE_LIST) {
  SCENE_STARTS.push(TOTAL_BARS);
  TOTAL_BARS += scene.bars;
}
const sceneOfBar = bar => SCENE_LIST.findLastIndex((_, i) => SCENE_STARTS[i] <= bar);

/** The written hits of an absolute bar, before the echoes. */
const sourceCache = new Map();
function sourceHits(bar) {
  if (!sourceCache.has(bar)) {
    const index = sceneOfBar(bar);
    sourceCache.set(bar, { ...silentBar(), ...SCENE_LIST[index].parts(bar - SCENE_STARTS[index]) });
  }
  return sourceCache.get(bar);
}
const echoTone = (voice, tone) => (VOICES[voice].pitched ? `${tone.replace('~', '')}:eco` : 'eco');
export const isEcho = tone => typeof tone === 'string' && tone.endsWith('eco');

/**
 * The echoes that land in an absolute bar: each accent of a voice the scene echoes repeats every
 * ECHO_STEPS sixteenths, `feedback` softer each time, inside its own scene, never on a step where the
 * voice already plays.
 */
function echoesInto(bar) {
  const index = sceneOfBar(bar),
    out = silentBar();
  for (let back = 0; back <= ECHO_BARS_BACK; back++) {
    const from = bar - back;
    if (from < SCENE_STARTS[index]) break;
    const { echo } = SCENE_LIST[index];
    if (!echo || (echo.bars && !echo.bars(from - SCENE_STARTS[index]))) continue;
    for (const voice of echo.voices)
      for (const source of sourceHits(from)[voice]) {
        if (source.velocity < ECHO_ACCENT) continue;
        for (let n = 1; n <= echo.repeats; n++) {
          const absolute = from * STEPS_PER_BAR + source.step + n * ECHO_STEPS;
          if (Math.floor(absolute / STEPS_PER_BAR) !== bar) continue;
          const step = absolute % STEPS_PER_BAR;
          if (sourceHits(bar)[voice].some(h => h.step === step) || out[voice].some(h => h.step === step)) continue;
          out[voice].push(hit(step, source.velocity * echo.feedback ** n, echoTone(voice, source.tone || '')));
        }
      }
  }
  return out;
}

function barHits(scene, barInScene) {
  const bar = scene.start + barInScene,
    written = sourceHits(bar),
    echoes = echoesInto(bar);
  return Object.fromEntries(VOICE_ORDER.map(voice => [voice, [...written[voice], ...echoes[voice]].sort((a, b) => a.step - b.step)]));
}

// How the background behaves in each scene (manguebeat-background.js): the mud field, the grain, the
// cables hanging from the wheel, the fury (the rings' jag) and the pale bloom (flash: 0 or 1). The
// engine reads `speed` for the visual clock and blends zoom, rot, hue and keep, which this painter
// does not use.
const LOOK = { zoom: 0, rot: 0, hue: 0, keep: 0, speed: 1 };
const SCENE_LOOKS = {
  introducao: { ...LOOK, mud: 0.3, grain: 0.5, cables: 0, fury: 0, flash: 0 },
  alfaias: { ...LOOK, mud: 0.5, grain: 0.3, cables: 0, fury: 0, flash: 0 },
  maos: { ...LOOK, mud: 0.6, grain: 0.35, cables: 1, fury: 0, flash: 0 },
  caixa: { ...LOOK, mud: 0.6, grain: 0.4, cables: 2, fury: 0.2, flash: 0 },
  baixo: { ...LOOK, mud: 0.8, grain: 0.45, cables: 3, fury: 0.3, flash: 0 },
  guitarra: { ...LOOK, mud: 0.9, grain: 0.6, cables: 5, fury: 0.8, flash: 1 },
  coco: { ...LOOK, mud: 1, grain: 0.6, cables: 5, fury: 0.6, flash: 0 },
  dub: { ...LOOK, mud: 0.5, grain: 0.25, cables: 3, fury: 0, flash: 0 },
  retorno: { ...LOOK, mud: 0.8, grain: 0.5, cables: 4, fury: 0.4, flash: 0 },
  corte: { ...LOOK, mud: 0.7, grain: 0.3, cables: 6, fury: 1, flash: 1 },
  banda: { ...LOOK, mud: 1, grain: 0.8, cables: 6, fury: 1, flash: 1 },
  final: { ...LOOK, mud: 0.6, grain: 0.4, cables: 6, fury: 0.3, flash: 1 },
};

// ---------- sound: the studio (src/studio.js) ----------
// The alfaia's hands take the repository's maracatu recordings and the two alfaia hits of the forró's
// zabumba, as velocity layers; the caixa and the bass take the recorded groups the other rhythms use;
// the guitar's power chords, the ganzá, the echo returns and the sampler are this show's own files
// (sounds/manguebeat-*, CREDITS.md). The main hand leads; the band follows it with a correlated
// drift. The alfaias, the bass and the guitar share one style template (the off-beat sixteenths a
// little early, as the maracatu's alfaias, milder); the ganzá pulls the third and fourth sixteenths
// early, as the samba family does; the caixa sits nearer the grid.
const lean = offsets => [...Array(STEPS_PER_BAR).keys()].map(step => offsets[step % STEPS_PER_BEAT]);
const ALFAIA_TEMPLATE = lean([2, -5, -9, -8]);
const GANZA_TEMPLATE = lean([0, 2, -6, -5]);
const CAIXA_TEMPLATE = lean([0, 2, -2, 0]);
const CAIXA_SOFTEST = 0.4; // the caixa's ghost layer: the softer one is never asked for
const ECHO_TAKES = { alfaia: ['manguebeat-alfaia-eco-1', 'manguebeat-alfaia-eco-2'], caixa: ['manguebeat-caixa-eco-1', 'manguebeat-caixa-eco-2'] };
const asTakes = files => files.map(file => ({ file }));
const ALFAIA_LAYER = { deep: 1, other: 0.9, click: 0.8, body: 0.65, short: 0.45 }; // velocity layers, loud to soft
const alfaiaHand = (hand, other) => [
  { file: `alfaia-deep-${hand}`, layer: ALFAIA_LAYER.deep },
  { file: other, layer: ALFAIA_LAYER.other },
  { file: `alfaia-deep-click-${hand}`, layer: ALFAIA_LAYER.click },
  { file: `alfaia-dry-body-${hand}`, layer: ALFAIA_LAYER.body },
  { file: `alfaia-deep-short-${hand}`, layer: ALFAIA_LAYER.short },
];
const BASS_NOTES = ['E1', 'G1', 'A1', 'B1', 'C2', 'D2'].map(midiOf);
const NEAR_BASS = 0.5; // semitones: the recorded notes the bass line needs, and the fingered low E
const BASS_TAKES = takes('baixo').filter(take => BASS_NOTES.some(note => Math.abs(take.root - note) < NEAR_BASS));
const GUITAR_SHORT = [
  { file: 'manguebeat-guitarra-e5', root: midiOf('E2') },
  { file: 'manguebeat-guitarra-e5-b', root: midiOf('E2') },
  { file: 'manguebeat-guitarra-e5-cima', root: midiOf('E2') },
  { file: 'manguebeat-guitarra-g5', root: midiOf('G2') },
  { file: 'manguebeat-guitarra-d5', root: midiOf('D3') },
  { file: 'manguebeat-guitarra-c5', root: midiOf('C3') },
];
const GUITAR_LONG = [
  { file: 'manguebeat-guitarra-longo-e5', root: midiOf('E2') },
  { file: 'manguebeat-guitarra-longo-g5', root: midiOf('G2') },
];
export const MAX_RETUNE = 2; // semitones: a chord borrows a recorded one at most this far
const SHORT_NOTE = 0.38; // seconds a palm-muted chord or a bass note lasts: the next stroke is 0.45 s on
const LONG_NOTE = 2.2;
const ECHO_GAIN = 0.8; // an echo return, against the stroke, before its feedback
/** A pitched tone: 'E2', 'E2~' (held) or 'E2:eco'. */
const pitchedShape = tone => {
  const echo = isEcho(tone),
    held = tone.endsWith('~'),
    note = midiOf(tone.replace('~', '').replace(':eco', ''));
  return { stroke: held ? 'longa' : 'curta', notes: [note], length: held ? LONG_NOTE : SHORT_NOTE, gain: echo ? ECHO_GAIN : 1 };
};
const STUDIO = {
  room: 'sala-pequena',
  roomLevel: 1,
  lead: 'main',
  voices: {
    main: {
      seed: 61,
      role: 'lead',
      gain: 1.2,
      send: 0.1,
      bright: [700, 9000],
      template: ALFAIA_TEMPLATE,
      strokes: () => ({ hit: alfaiaHand('main', 'zabumba-aberto-7'), eco: asTakes(ECHO_TAKES.alfaia) }),
      shape: tone => (isEcho(tone) ? { stroke: 'eco', gain: ECHO_GAIN } : { stroke: 'hit' }),
    },
    answer: {
      seed: 62,
      role: 'follower',
      gain: 1.05,
      pan: -0.15,
      send: 0.12,
      bright: [700, 9000],
      template: ALFAIA_TEMPLATE,
      strokes: () => ({ hit: alfaiaHand('answer', 'zabumba-aberto-8'), eco: asTakes(ECHO_TAKES.alfaia) }),
      shape: tone => (isEcho(tone) ? { stroke: 'eco', gain: ECHO_GAIN } : { stroke: 'hit' }),
    },
    caixa: {
      seed: 63,
      role: 'follower',
      gain: 0.75,
      pan: 0.2,
      send: 0.2,
      template: CAIXA_TEMPLATE,
      strokes: () => ({ hit: takes('caixa').filter(take => take.layer >= CAIXA_SOFTEST), eco: asTakes(ECHO_TAKES.caixa) }),
      shape: tone => (isEcho(tone) ? { stroke: 'eco', gain: ECHO_GAIN } : { stroke: 'hit' }),
    },
    ganza: {
      seed: 64,
      role: 'follower',
      gain: 0.55,
      pan: -0.35,
      send: 0.15,
      template: GANZA_TEMPLATE,
      strokes: () => ({
        forte: [{ file: 'manguebeat-ganza-forte-1' }, { file: 'manguebeat-ganza-forte-2' }, { file: 'ganza-rice' }],
        fraco: [{ file: 'manguebeat-ganza-fraco-1' }, { file: 'manguebeat-ganza-fraco-2' }],
      }),
      shape: tone => ({ stroke: tone }),
    },
    baixo: {
      seed: 65,
      role: 'follower',
      gain: 1,
      send: 0.04,
      bright: [500, 5000],
      template: ALFAIA_TEMPLATE,
      zone: 1,
      maxZone: MAX_RETUNE,
      strokes: () => ({ curta: BASS_TAKES, longa: BASS_TAKES }),
      shape: pitchedShape,
    },
    guitarra: {
      seed: 66,
      role: 'follower',
      gain: 0.55,
      pan: 0.3,
      send: 0.12,
      bright: [1800, 9000],
      template: ALFAIA_TEMPLATE,
      zone: MAX_RETUNE,
      maxZone: MAX_RETUNE,
      strokes: () => ({ curta: GUITAR_SHORT, longa: GUITAR_LONG }),
      shape: pitchedShape,
    },
    sampler: {
      seed: 67,
      role: 'grid',
      gain: 0.3,
      send: 0.3,
      strokes: () => ({ chiado: asTakes(['manguebeat-chiado-1', 'manguebeat-chiado-2']) }),
      shape: () => ({ stroke: 'chiado' }),
    },
  },
};
// One recorded option per instrument, so the desktop gives each its volume.
const SOUND_CHOICES = recordedChoices(STUDIO, [
  ['alfaia', 'alfaia', HANDS, 'alfaia'],
  ['caixa', 'caixa', ['caixa'], 'caixa'],
  ['ganza', 'ganzá', ['ganza'], 'ganzá'],
  ['baixo', 'baixo', ['baixo'], 'baixo elétrico'],
  ['guitarra', 'guitarra', ['guitarra'], 'guitarra distorcida'],
  ['sampler', 'sampler', ['sampler'], 'chiado de disco'],
]);

// ---------- copy ----------
const countFromOne = steps => steps.map(step => step + 1).join(' ');
const NOTE_WORDS = { E: 'mi', G: 'sol', A: 'lá', B: 'si', C: 'dó', D: 'ré' };
const riffSymbols = [...new Set(RIFF.flatMap((_, bar) => riffChords(bar).map(c => c.chord)))];
const READ = {
  tempo: 'andamento',
  tempoValue: `${BPM} bpm, do início ao fim`,
  meter: 'compasso',
  meterValue: `${BEATS_PER_BAR}/4, ${STEPS_PER_BAR} semicolcheias`,
  bar: '1 compasso',
  barValue: `${BAR_SECONDS.toFixed(2).replace('.', ',')} s`,
  instruments: 'instrumentos',
  echo: 'eco',
  echoValue: `colcheia pontuada, ${Math.round((ECHO_STEPS / STEPS_PER_BEAT) * BEAT_SECONDS * MS_PER_SECOND)} ms`,
  unison: 'uníssono',
  unisonValue: 'mão principal e resposta juntas',
  strokes: 'batidas',
  mainHand: 'mão principal',
  answerHand: 'resposta',
  backbeat: 'resposta nos tempos 2 e 4',
  accent: 'acento',
  ghost: 'nota fraca',
  repeat: 'repetição do eco',
  repeats: 'repetições',
  repeatsValue: `${SHORT_ECHO.repeats}, cada uma mais fraca`,
  sameStrokes: 'mesmas batidas da mão principal',
  notes: 'notas',
  notesValue: riffSymbols.map(chord => NOTE_WORDS[chord]).join(' '),
  key: 'tom',
  keyValue: 'mi menor',
  chords: 'acordes',
  chordsValue: riffSymbols.map(chord => CHORD[chord].symbol).join(' '),
  riff: 'riff',
  riffValue: `${RIFF.length} compassos, dobrado pelo baixo`,
  coco: 'levada de coco',
  cocoValue: `acento na 3ª semicolcheia de cada tempo`,
  space: 'espaço',
  spaceValue: 'tempos 2 e 4 só com eco',
  cutBars: 'compasso de parada',
  together: 'batidas juntas',
  scenes: 'cenas',
  bars: 'compassos',
  howItEnds: 'como termina',
  endValue: 'eco até o silêncio',
  enters: 'entra',
  entersMuted: 'sem som',
};
const COPY = {
  name: 'manguebeat',
  feminineInstruments: ['alfaia', 'caixa', 'guitarra'],
  scenes: {
    introducao: { chip: 'Introdução', eyebrow: 'sampler e eco', title: 'Manguebeat' },
    alfaias: { chip: 'Alfaias', eyebrow: 'alfaias em uníssono', title: 'Alfaias' },
    maos: { chip: 'Mãos', eyebrow: 'mão principal e resposta', title: 'Mãos' },
    caixa: { chip: 'Caixa', eyebrow: 'caixa com eco', title: 'Caixa' },
    baixo: { chip: 'Baixo', eyebrow: 'baixo dobrando a mão principal', title: 'Baixo' },
    guitarra: { chip: 'Guitarra', eyebrow: 'riff de guitarra distorcida', title: 'Guitarra' },
    coco: { chip: 'Coco', eyebrow: 'ganzá em levada de coco', title: 'Coco' },
    dub: { chip: 'Dub', eyebrow: 'baixo e alfaia com eco', title: 'Dub' },
    retorno: { chip: 'Retorno', eyebrow: 'entrada das camadas', title: 'Retorno' },
    corte: { chip: 'Corte', eyebrow: 'parada da banda', title: 'Corte' },
    banda: { chip: 'Banda completa', eyebrow: 'todos os instrumentos', title: 'Banda' },
    final: { chip: 'Final', eyebrow: 'eco até o silêncio', title: 'Fim' },
  },
  patterns: { coco: 'Coco', dub: 'Dub' },
  voices: { main: 'mão principal', answer: 'resposta', caixa: 'caixa', ganza: 'ganzá', baixo: 'baixo', guitarra: 'guitarra', sampler: 'sampler' },
  instruments: { alfaia: 'alfaia' },
  hands: { main: READ.mainHand, answer: READ.answerHand },
  centre: { cut: 'CORTE', end: 'FIM', offbeat: 'CONTRATEMPO' },
  read: READ,
};

// ---------- readout layouts ----------
const T = READ;
const beatSeparator = step => (step % STEPS_PER_BEAT === STEPS_PER_BEAT - 1 && step < STEPS_PER_BAR - 1 ? '|' : '');
/** One bar as marks: ● for a mark in `strong`, ○ for one in `weak`, ◌ for an echo. */
const marks = (text, strong, weak = [], echo = []) =>
  tokens(text)
    .map((token, step) => (strong.includes(token) ? '●' : weak.includes(token) ? '○' : echo.includes(step) ? '◌' : '·') + beatSeparator(step))
    .join('');
const seqRow = (name, text, color, id) =>
  `${label(name)}<span class="seq"${id ? ` data-inst="${id}"` : ''} style="color:${color}">${text}</span><span class="n"></span>`;
const ROW_JOIN = '';
const notation = rows => `<div class="notation">${rows.join(ROW_JOIN)}</div>`;
const BASS_LINE = tokens(MAIN)
  .map(token => (token === 'X' ? 'X' : '.'))
  .join(' ');
/** The steps the caixa's echoes fill in its scene's bar (from the accents of the same bar and the one before). */
const caixaEchoSteps = () => {
  const bar = SCENE_STARTS[SCENE_LIST.findIndex(scene => scene.id === 'caixa')] + 1;
  return echoesInto(bar).caixa.map(h => h.step);
};
const ROLL_SLOTS = 2; // a chord drawn two sixteenths long
const ROLL_LONG = STEPS_PER_BAR;

/** The riff as a roll: the guitar's chord roots over the bass, bar by bar. */
function riffRoll(scene) {
  const line = (voice, color) => ({
    id: voice,
    color,
    notes: [...Array(scene.bars).keys()].flatMap(bar =>
      sourceHits(scene.start + bar)
        [voice].filter(h => h.tone)
        .map(h => ({ slot: bar * STEPS_PER_BAR + h.step, midi: midiOf(h.tone.replace('~', '')), length: h.tone.endsWith('~') ? ROLL_LONG : ROLL_SLOTS })),
    ),
  });
  const score = renderRoll({
    bars: scene.bars,
    stepsPerBar: STEPS_PER_BAR,
    stepsPerBeat: STEPS_PER_BEAT,
    lines: [line('guitarra', COLOR.guitarra), line('baixo', COLOR.baixo)],
  });
  return { markup: `<div class="score roll">${score.markup}<i class="scur"></i></div>`, score };
}

const LAYOUTS = {
  introducao: () =>
    row(label(T.tempo), T.tempoValue) +
    row(label(T.meter), T.meterValue) +
    row(label(T.bar), T.barValue) +
    row(label(T.echo), T.echoValue) +
    row(label(T.instruments), INSTRUMENT_COUNT),
  alfaias: () =>
    notation([seqRow(T.unison, marks(MAIN, ['X']), COLOR.main, 'alfaia')]) +
    row(label(T.strokes), countFromOne(stepsOf(MAIN, ['X'])), 'alfaia') +
    row(label(T.unison), T.unisonValue, 'alfaia'),
  maos: () =>
    notation([seqRow(T.mainHand, marks(MAIN, ['X']), COLOR.main, 'alfaia'), seqRow(T.answerHand, marks(ANSWER[1], ['X'], ['x']), COLOR.answer, 'alfaia')]) +
    row(label(T.answerHand, COLOR.answer), T.backbeat, 'alfaia'),
  caixa: () =>
    notation([seqRow('', marks(CAIXA_ECHO, ['X'], ['x'], caixaEchoSteps()), COLOR.caixa, 'caixa')]) +
    row(label(`● ${T.accent} · ○ ${T.ghost} · ◌ ${T.repeat}`), '', 'caixa') +
    row(label(T.echo), T.echoValue, 'caixa') +
    row(label(T.repeats), T.repeatsValue, 'caixa'),
  baixo: () =>
    notation([seqRow(T.mainHand, marks(MAIN, ['X']), COLOR.main, 'alfaia'), seqRow('baixo', marks(BASS_LINE, ['X']), COLOR.baixo, 'baixo')]) +
    row(label(T.sameStrokes), countFromOne(stepsOf(MAIN, ['X'])), 'baixo') +
    row(label(T.notes), T.notesValue, 'baixo'),
  coco: () =>
    notation([seqRow('', marks(GANZA, ['X'], ['x']), COLOR.ganza, 'ganza')]) +
    row(label(T.coco), T.cocoValue, 'ganza') +
    row(label(`● ${T.accent}`, COLOR.ganza), countFromOne(stepsOf(GANZA, ['X'])), 'ganza'),
  dub: () => notation([seqRow(T.mainHand, marks(DUB_MAIN, ['X']), COLOR.main, 'alfaia')]) + row(label(T.echo), T.echoValue) + row(label(T.space), T.spaceValue),
  retorno: () => `<div data-entry></div>`,
  corte: () => stats('two', stat(1, T.cutBars, COLOR.guitarra), stat(stepsOf(MAIN, ['X']).length, T.together, COLOR.main)),
  final: () =>
    stats('', stat(SCENE_LIST.length, T.scenes, COLOR.main), stat(INSTRUMENT_COUNT, T.instruments, COLOR.guitarra), stat(TOTAL_BARS, T.bars, fgAlpha(1))) +
    row(label(T.howItEnds), T.endValue),
};
const ROLLS = {
  guitarra: scene => ({ ...riffRoll(scene), rows: row(label(T.key), T.keyValue, 'guitarra') + row(label(T.chords), T.chordsValue, 'guitarra') }),
  banda: scene => ({ ...riffRoll(scene), rows: row(label(T.riff, COLOR.guitarra), T.riffValue) }),
};

/**
 * The readout for a scene: its markup, the score (or roll) whose cursor follows the bar, and the
 * instrument the whole readout is about (`focus`, '' for none), so a muted one shows disabled.
 */
function readout(scene) {
  const focus = scene.focus || (['alfaias', 'maos'].includes(scene.id) ? 'alfaia' : '');
  if (ROLLS[scene.id]) {
    const { markup, score, rows } = ROLLS[scene.id](scene);
    return { markup: rows + markup, score, focus };
  }
  return { markup: LAYOUTS[scene.id](scene), score: null, focus };
}

export const MANGUEBEAT = {
  id: 'manguebeat',
  ...straightMeter(BPM, BEATS_PER_BAR, STEPS_PER_BEAT),
  scenes: SCENE_LIST,
  sceneDefaults: {},
  barHits,
  voices: VOICES,
  shapeVoices: ['guitarra', 'main'], // the voices whose hits draw a shape on the wheel, in drawing order
  looks: SCENE_LOOKS,
  background: { create: options => createManguebeatPainter({ ...options, beatsPerBar: BEATS_PER_BAR, beatSeconds: BEAT_SECONDS }) },
  readout,
  waves: null,
  sounds: studioSounds(STUDIO, SOUND_CHOICES, 'banda'), // every instrument plays its part in the full band
  copy: COPY,
};

// Manguebeat: everything the engine plays and shows that belongs to this rhythm. Instrumental: a dub
// of a coco. Two alfaia voices (the main hand on the coco cell, 3 + 3 + 2 twice a bar, and the answer
// hand's pick-ups), the caixa on the same cell with ghost notes, the ganzá, an electric bass riff, a
// distorted guitar riff in power chords, a clean guitar drenched in echo and a sampler (a worn
// record's noise). 4/4 at one tempo, a 16-step wheel, one bar per turn. The dub echo is a real delay
// of a dotted eighth (three sixteenths) in the studio; the parts also write each repeat as a silent
// mark, softer each time, so the wheel shows it. The riffs are original to this project. Choices and
// sources: docs/rhythms/manguebeat.md.
import { label, row, stat, stats } from '../readout-markup.js';
import { rollReadout } from '../roll.js';
import { fgAlpha } from '../theme.js';
import { createManguebeatPainter, MANGUE_PALETTE } from './manguebeat-background.js';
import { sceneStarts, straightMeter } from './meter.js';
import { midiOf, recordedChoices, studioSounds, takes } from './studio-kit.js';

// The top of the researched range (docs/research/pernambuco-rhythms-feeling.md, § 4: «about 90 to 105
// BPM»), the nearest to the reference recording, which a beat tracker reads at 107.
const BPM = 105;
const BEATS_PER_BAR = 4;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const HALF_BAR = STEPS_PER_BAR / 2;
const BEAT_SECONDS = 60 / BPM;
const STEP_SECONDS = BEAT_SECONDS / STEPS_PER_BEAT;
const BAR_SECONDS = BEAT_SECONDS * BEATS_PER_BAR;
const MS_PER_SECOND = 1000;
const ECHO_STEPS = 3; // the dub delay: a dotted eighth
const ECHO_BARS_BACK = 2; // a long tail reaches this many bars past its stroke
const ECHO_FEEDBACK = 0.55; // the level each repeat keeps: the studio's delay and the marks on the wheel

// Velocities.
const ACCENT = 1;
const STRONG = 0.9;
const PLAIN = 0.8;
const SOFT = 0.6;
const GHOST = 0.4;
const FAINT = 0.3; // the caixa's ghost notes
const ECHO_ACCENT = 0.95; // a stroke at or above this velocity is thrown into the echo, where the scene echoes its voice

// Material colours inside the manguebeat palette, each at 3:1 or more on the wheel's face: the
// alfaia's hands in crab orange and raw leather, the caixa and the ganzá in iron and tin, the bass
// in mud lifted to read, the guitar in rust lifted, its echo in tide water, the sampler in the
// antenna's pale signal.
const COLOR = {
  main: MANGUE_PALETTE.crab,
  answer: '#c9a27a', // raw leather
  caixa: '#b9c0c4', // iron
  ganza: '#9fbf78', // the mangrove, lifted
  baixo: '#b08a5e', // mud, lifted
  guitarra: '#e0523a', // rust, lifted
  eco: '#7fb7c4', // tide water
  sampler: MANGUE_PALETTE.signal,
};

// ring/size: where and how big the voice sits on the wheel. The roles the views read: hand (a hand of
// the alfaia: contratempo marks), boom, spark. toneScale: an echo draws smaller.
const ECHO_DOT = 0.6;
const VOICES = {
  main: { instrument: 'alfaia', ring: 98, size: 5.6, swing: null, color: COLOR.main, hand: true, boom: 1, toneScale: { eco: ECHO_DOT } },
  answer: { instrument: 'alfaia', ring: 90, size: 4.6, swing: null, color: COLOR.answer, hand: true, boom: 0.7 },
  caixa: { instrument: 'caixa', ring: 82, size: 3.2, swing: null, color: COLOR.caixa, crack: true, toneScale: { eco: ECHO_DOT } },
  ganza: { instrument: 'ganza', ring: 74, size: 2.4, swing: null, color: COLOR.ganza },
  baixo: { instrument: 'baixo', ring: 66, size: 4.2, swing: null, color: COLOR.baixo, pitched: true, boom: 0.5 },
  guitarra: { instrument: 'guitarra', ring: 58, size: 4, swing: null, color: COLOR.guitarra, pitched: true, spark: true },
  eco: { instrument: 'guitarra', ring: 50, size: 3.2, swing: null, color: COLOR.eco, pitched: true },
  sampler: { instrument: 'sampler', ring: 42, size: 3, swing: null, color: COLOR.sampler },
};
// The order also seeds the per-hit variation of the sound: keep it stable.
const VOICE_ORDER = Object.keys(VOICES);
const HANDS = ['main', 'answer'];
const DRUMS = [...HANDS, 'caixa', 'ganza'];
const INSTRUMENT_COUNT = new Set(VOICE_ORDER.map(voice => VOICES[voice].instrument)).size;

// ---------- the parts ----------
/** One bar as written: sixteen tokens; '.' rests, anything else is a mark. */
const tokens = text => text.trim().split(/\s+/);
const stepsOf = (text, marks) => tokens(text).flatMap((token, step) => (marks.includes(token) ? [step] : []));

// The main hand plays the coco's cell twice a bar: 3 + 3 + 2 sixteenths, heavy and open. Measured on
// the reference recording's drums: the low band is strong on sixteenths 1, 4 and 7 of each half bar.
export const MAIN = 'X . . X . . X . X . . X . . X .';
const MAIN_VELOCITY = { 0: ACCENT, 3: 0.88, 6: 0.93, 8: 0.94, 11: 0.86, 14: 0.93 };
// The answer hand: the pick-up before beats 3 and 1 (the «2» of the cell) and soft strokes between the
// main hand's; every second bar it rolls into the next, and a fill closes each phrase.
export const ANSWER = ['. x . . . x . X . . . . . x . X', '. x . . . x . X . x . . x x . X'];
const ANSWER_FILL = '. x . . . x . X . x . X x X X X';
const PICK_UP = '. . . . . . . . . . . . x X X X';
// The caixa plays the same cell, its syncopated strokes the loudest, with ghost notes around them.
export const CAIXA = ['X x . X . x X x X . . X . x X x', 'X x . X . x X . X x . X x x X x'];
const CAIXA_FILL = 'X x . X . x X x X x X X x X X X';
const CAIXA_VELOCITY = { 0: PLAIN, 3: STRONG, 6: ACCENT, 8: PLAIN, 11: STRONG, 14: ACCENT };
// The ganzá: every sixteenth, the accents on the cell.
export const GANZA = 'X x x X x x X x X x x X x x X x';

// Pitched lines, one bar each: a note name starts a note, '-' holds it one sixteenth more, '.' rests;
// '!' accents it, '*' mutes it (a palm-muted chug). E minor: the tonic riff (A) closes through the
// fourth, the third and the flat seventh; the second part (B) starts on the fourth and climbs back.
export const BASS_A = [
  'E1 - - . . E2 . D2 . . . B1 . . D2 .',
  'E1 - - . . . G1 - . . . A1 - . G1 .',
  'E1 - - . . E2 . D2 . . G1 . A1 . D2 .',
  'A1 - - A1 . . G1 - . . . G1 - . D2 D2',
];
export const BASS_B = [
  'A1 - - . . A1 . C2 . . . E2 . . C2 .',
  'G1 - - . . G1 . B1 . . . D2 . . G1 .',
  'E1 - - . . E2 . D2 . . . B1 . . D2 .',
  'G1 - - G1 . . A1 - . . E1 . A1 A1 A1 B1',
];
// The guitar's power chords, by their root: stabs on the cell with the alfaias, chugs between, rests.
export const RIFF_A = [
  'E2! . E2* E2! . E2* G2! - . . . . . E2* D3! .',
  'E2! . E2* E2! . E2* G2! - . . . A2! . . G2! .',
  'E2! . E2* E2! . E2* G2! - . . . . . E2* D3! .',
  'A2! - - A2! . . G2! - . . . G2! - . D3! -',
];
export const RIFF_B = [
  'A2! . A2* A2! . A2* C3! - . . . . . A2* C3! .',
  'G2! . G2* G2! . G2* G2! - . . . D3! . . G2! .',
  'E2! . E2* E2! . E2* G2! - . . . . . E2* D3! .',
  'G2! - - G2! . . A2! - . . . . A2 A2 A2! A2',
];
// The second guitar, clean and in the echo: it answers the riff in the space the riff leaves.
export const LICK = [
  '. . . . . . . . . B4! . A4 G4 . . .',
  '. . . . . . . . . . . . . . . .',
  '. . . . . . . . . G4 . A4! B4 . A4 G4',
  '. . . . E4! - - . G4 - - . A4! - B4 -',
];
// In the dub it leads, and each phrase rings on in the echo.
const LICK_DUB = [
  'B4! - . A4 . G4 - . . . . . . . . .',
  '. . . . . . . . . . . . . . . .',
  '. . E4 . G4 . A4! - - . . . . . . .',
  'B4! . A4 G4 . E4 - - . . . . D4 E4! - .',
];
// The dub: the band stops. The bass and one stroke of the alfaia a bar stay; the echo plays the cell.
const DUB_MAIN = 'X . . . . . . . . . . . . . . .';
const DUB_BASS = ['E1 - - - . . . . . . G1 . A1 - . .', 'E1 - - - . . . . . . . . D2 . B1 .'];

const hit = (step, velocity, tone) => (tone ? { step, velocity, tone } : { step, velocity });
const silentBar = () => Object.fromEntries(VOICE_ORDER.map(voice => [voice, []]));
/** The marks of a bar: X a stroke (at its step's velocity in `byStep`, else `velocity`), x a ghost. */
const strokes = (text, velocity = PLAIN, byStep = {}, ghost = GHOST) =>
  tokens(text).flatMap((token, step) => (token === 'X' ? [hit(step, byStep[step] ?? velocity)] : token === 'x' ? [hit(step, ghost)] : []));
const mainBar = () => strokes(MAIN, PLAIN, MAIN_VELOCITY);
const caixaBar = text => strokes(text, STRONG, CAIXA_VELOCITY, FAINT);
const ganzaBar = () => tokens(GANZA).map((token, step) => hit(step, token === 'X' ? STRONG : SOFT, token === 'X' ? 'forte' : 'fraco'));
const samplerAt = (...steps) => steps.map(step => hit(step, PLAIN, 'chiado'));

/** The notes of a pitched line: { step, note, steps, accent, muted }. */
function lineOf(text) {
  const notes = [];
  tokens(text).forEach((token, step) => {
    if (token === '.') return;
    if (token === '-') notes.at(-1).steps++;
    else notes.push({ step, note: token.replace(/[!*]/g, ''), steps: 1, accent: token.includes('!'), muted: token.includes('*') });
  });
  return notes;
}
// A pitched hit's tone: the note, '*' when muted, '~n' when held n sixteenths, '<' when it swells
// in, ':eco' for a repeat of the echo.
const TONE = /^([A-G]#?\d)(\*?)(?:~(\d+))?(<?)(:eco)?$/;
export function parseTone(tone) {
  const match = TONE.exec(tone);
  if (!match) throw new Error(`manguebeat: not a pitched tone: ${tone}`);
  return { note: match[1], muted: match[2] !== '', steps: Number(match[3] || 1), swell: match[4] !== '', echo: match[5] !== undefined };
}
const toneOf = ({ note, steps = 1, muted = false, swell = false }) => `${note}${muted ? '*' : ''}${steps > 1 ? `~${steps}` : ''}${swell ? '<' : ''}`;
/** The hits of a pitched line: accents loud, chugs soft, the rest at `velocity`. */
const pitched = (text, velocity = PLAIN) => lineOf(text).map(n => hit(n.step, n.accent ? ACCENT : n.muted ? GHOST : velocity, toneOf(n)));
const held = (note, steps = STEPS_PER_BAR, swell = false) => toneOf({ note, steps, swell });

const PHRASE_BARS = 4; // every riff's length; a fill closes each
const lastOfPhrase = bar => bar % PHRASE_BARS === PHRASE_BARS - 1;
/** The whole band, one bar into its riffs; `fill` closes a phrase, `lick` adds the second guitar. */
const bandBar = (bar, { bass = BASS_A, riff = RIFF_A, lick = null, fill = lastOfPhrase(bar) } = {}) => ({
  main: mainBar(),
  answer: strokes(fill ? ANSWER_FILL : ANSWER[bar % ANSWER.length]),
  caixa: caixaBar(fill ? CAIXA_FILL : CAIXA[bar % CAIXA.length]),
  ganza: ganzaBar(),
  baixo: pitched(bass[bar % PHRASE_BARS], STRONG),
  guitarra: pitched(riff[bar % PHRASE_BARS]),
  eco: lick ? pitched(lick[bar % PHRASE_BARS], SOFT) : [],
  sampler: samplerAt(0, HALF_BAR),
});
/** Everyone on the first beat, the guitar and the bass held. */
const tutti = () => ({
  main: [hit(0, ACCENT)],
  answer: [hit(0, ACCENT)],
  caixa: [hit(0, ACCENT)],
  baixo: [hit(0, ACCENT, held('E1'))],
  guitarra: [hit(0, ACCENT, held('E2'))],
});
/** The band on the cell's strokes alone, together: the stop-time bar. */
const stopTime = () => {
  const chords = ['E2', 'E2', 'G2', 'E2', 'E2', 'D3'];
  const steps = stepsOf(MAIN, ['X']);
  return {
    main: mainBar(),
    answer: mainBar(),
    caixa: strokes(MAIN, STRONG, CAIXA_VELOCITY),
    baixo: steps.map((step, i) =>
      hit(
        step,
        STRONG,
        chords[i].replace(/\d/, d => String(d - 1)),
      ),
    ),
    guitarra: steps.map((step, i) => hit(step, i ? STRONG : ACCENT, chords[i])),
  };
};

// ---------- the show script ----------
// Each scene: id, bars, voices, lanes (rows under the wheel), named (the centre names it), mode per
// bar, `parts(bar)`: the hits of each voice in its bar, and `echo`: which voices throw their accents
// into the echo, how many repeats the wheel marks, and on which bars (all when absent).
const always = value => () => value;
const ALL = VOICE_ORDER;
const SHORT_ECHO = 4; // repeats the wheel marks
const LONG_ECHO = 7;
const BAND_BARS = 12; // the full band: the riff, the second part, the riff with the second guitar
const SCENE_LIST = [
  {
    id: 'introducao',
    bars: 2,
    voices: always(['main', 'guitarra', 'sampler']),
    lanes: ['sampler', 'main', 'guitarra'],
    echo: { voices: ['main'], repeats: SHORT_ECHO },
    // the record's noise, one stroke into the echo, the guitar's feedback swelling under it
    parts: bar =>
      bar === 0
        ? { sampler: samplerAt(0, HALF_BAR), main: [hit(0, ACCENT)], guitarra: [hit(HALF_BAR, SOFT, held('E2', STEPS_PER_BAR, true))] }
        : { sampler: samplerAt(0, HALF_BAR), main: strokes(PICK_UP, STRONG, {}, SOFT) },
  },
  {
    id: 'alfaias',
    bars: 4,
    voices: always(HANDS),
    lanes: HANDS,
    parts: bar => ({ main: mainBar(), answer: bar === PHRASE_BARS - 1 ? [...mainBar().slice(0, -1), ...strokes(PICK_UP).slice(1)] : mainBar() }),
  },
  { id: 'maos', bars: 4, voices: always(HANDS), lanes: HANDS, parts: bar => ({ main: mainBar(), answer: bandBar(bar).answer }) },
  {
    id: 'caixa',
    bars: 4,
    voices: always([...HANDS, 'caixa']),
    lanes: ['caixa', ...HANDS],
    focus: 'caixa',
    echo: { voices: ['caixa'], repeats: SHORT_ECHO, bars: lastOfPhrase },
    parts: bar => ({ main: mainBar(), answer: bandBar(bar).answer, caixa: bandBar(bar).caixa }),
  },
  {
    id: 'coco',
    bars: 4,
    voices: always(DRUMS),
    lanes: ['ganza', 'caixa', 'main'],
    named: true,
    focus: 'ganza',
    parts: bandBar,
  },
  {
    id: 'baixo',
    bars: 4,
    voices: always([...DRUMS, 'baixo', 'sampler']),
    lanes: ['baixo', 'main', 'caixa'],
    focus: 'baixo',
    parts: bandBar,
  },
  {
    id: 'guitarra',
    bars: 4,
    voices: always([...DRUMS, 'baixo', 'guitarra', 'sampler']),
    lanes: ['guitarra', 'baixo', 'main'],
    focus: 'guitarra',
    parts: bandBar,
  },
  {
    id: 'dub',
    bars: 4,
    voices: always(['main', 'answer', 'caixa', 'baixo', 'eco', 'sampler']),
    lanes: ['eco', 'baixo', 'main', 'caixa'],
    named: true,
    echo: { voices: ['main', 'caixa', 'eco'], repeats: SHORT_ECHO },
    parts: bar => ({
      main: strokes(DUB_MAIN, ACCENT),
      answer: lastOfPhrase(bar) ? strokes(PICK_UP, STRONG, {}, SOFT) : [],
      caixa: bar % 2 ? [] : [hit(bar ? STEPS_PER_BAR - STEPS_PER_BEAT : HALF_BAR - 2, ACCENT)],
      baixo: lastOfPhrase(bar) ? [] : pitched(DUB_BASS[bar % DUB_BASS.length], STRONG),
      eco: pitched(LICK_DUB[bar], SOFT),
      sampler: samplerAt(0, HALF_BAR),
    }),
  },
  {
    id: 'retorno',
    bars: 4,
    // the layers come back one per bar; the entering one is named in the readout
    voices: bar => [['main', 'answer', 'baixo', 'sampler'], ['caixa'], ['ganza'], ['guitarra']].slice(0, bar + 1).flat(),
    lanes: ['main', 'baixo', 'caixa', 'guitarra'],
    parts: bandBar,
  },
  {
    id: 'corte',
    bars: 2,
    voices: always(ALL.filter(voice => voice !== 'sampler' && voice !== 'eco')),
    lanes: ['guitarra', 'main', 'caixa'],
    // one bar on the first beat, thrown into the echo, and silence; then the band on the cell alone
    mode: bar => (bar === 0 ? 'cut' : 'normal'),
    echo: { voices: ['caixa', 'guitarra'], repeats: SHORT_ECHO, bars: bar => bar === 0 },
    parts: bar => (bar === 0 ? tutti() : stopTime()),
  },
  {
    id: 'banda',
    bars: BAND_BARS,
    lanes: ['guitarra', 'baixo', 'main', 'caixa'],
    echo: { voices: ['caixa'], repeats: SHORT_ECHO, bars: lastOfPhrase },
    parts: bar =>
      bar < PHRASE_BARS
        ? bandBar(bar, { lick: bar % 2 ? null : LICK })
        : bar < 2 * PHRASE_BARS
          ? bandBar(bar, { bass: BASS_B, riff: RIFF_B })
          : bandBar(bar, { lick: LICK }),
  },
  {
    id: 'final',
    bars: 4,
    lanes: ['guitarra', 'main', 'caixa'],
    isEnd: true,
    // the band once more, one stroke for all, then only its echo until the silence
    mode: bar => (bar === 0 ? 'normal' : 'cut'),
    echo: { voices: ['main', 'caixa', 'guitarra'], repeats: LONG_ECHO, bars: bar => bar === 1 },
    parts: bar =>
      bar === 0 ? bandBar(0, { lick: LICK }) : bar === 1 ? { ...tutti(), sampler: samplerAt(0) } : bar === 2 ? { sampler: [hit(0, SOFT, 'chiado')] } : {},
  },
];
for (const scene of SCENE_LIST) if (scene.named) scene.pattern = scene.id;
const { starts: SCENE_STARTS, total: TOTAL_BARS } = sceneStarts(SCENE_LIST);
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
const echoTone = (voice, tone) => (VOICES[voice].pitched ? `${parseTone(tone).note}:eco` : 'eco');
export const isEcho = tone => typeof tone === 'string' && tone.endsWith('eco');
/** The scene's echo when it takes the voice's accents of the absolute bar `bar`, else null. */
function echoOf(voice, bar) {
  const index = sceneOfBar(bar),
    { echo } = SCENE_LIST[index];
  return echo?.voices.includes(voice) && (!echo.bars || echo.bars(bar - SCENE_STARTS[index])) ? echo : null;
}
/** Whether the written hit of `voice` at `step` of the absolute bar is thrown into the echo. */
export const isThrown = (voice, bar, step) =>
  echoOf(voice, bar) !== null && sourceHits(bar)[voice].some(h => h.step === step && h.velocity >= ECHO_ACCENT && !isEcho(h.tone));

/**
 * The echo's repeats that land in an absolute bar, as marks: each thrown accent repeats every
 * ECHO_STEPS sixteenths, ECHO_FEEDBACK softer each time, inside its own scene, never drawn on a step
 * where the voice already plays. The studio's delay makes their sound; the marks stay silent.
 */
function echoesInto(bar) {
  const index = sceneOfBar(bar),
    out = silentBar();
  for (let back = 0; back <= ECHO_BARS_BACK; back++) {
    const from = bar - back;
    if (from < SCENE_STARTS[index]) break;
    for (const voice of VOICE_ORDER) {
      const echo = echoOf(voice, from);
      if (!echo) continue;
      for (const source of sourceHits(from)[voice]) {
        if (source.velocity < ECHO_ACCENT) continue;
        for (let n = 1; n <= echo.repeats; n++) {
          const absolute = from * STEPS_PER_BAR + source.step + n * ECHO_STEPS;
          if (Math.floor(absolute / STEPS_PER_BAR) !== bar) continue;
          const step = absolute % STEPS_PER_BAR;
          if (sourceHits(bar)[voice].some(h => h.step === step) || out[voice].some(h => h.step === step)) continue;
          out[voice].push(hit(step, source.velocity * ECHO_FEEDBACK ** n, echoTone(voice, source.tone || '')));
        }
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
  coco: { ...LOOK, mud: 0.7, grain: 0.45, cables: 2, fury: 0.3, flash: 0 },
  baixo: { ...LOOK, mud: 0.8, grain: 0.45, cables: 3, fury: 0.3, flash: 0 },
  guitarra: { ...LOOK, mud: 1, grain: 0.6, cables: 5, fury: 0.8, flash: 1 },
  dub: { ...LOOK, mud: 0.5, grain: 0.25, cables: 3, fury: 0, flash: 0 },
  retorno: { ...LOOK, mud: 0.8, grain: 0.5, cables: 4, fury: 0.4, flash: 0 },
  corte: { ...LOOK, mud: 0.7, grain: 0.3, cables: 6, fury: 1, flash: 1 },
  banda: { ...LOOK, mud: 1, grain: 0.8, cables: 6, fury: 1, flash: 1 },
  final: { ...LOOK, mud: 0.6, grain: 0.4, cables: 6, fury: 0.3, flash: 1 },
};

// ---------- sound: the studio (src/studio.js) ----------
// The mix follows the reference recording's balance (docs/rhythms/manguebeat.md, Sound): the drums
// lead and crack, the bass sits about five decibels under them, round, and the guitars are wide.
// The alfaia's hands take the repository's maracatu recordings and two alfaia hits of the forró's
// zabumba, as velocity layers, and the main hand is doubled, left and right: a section, not one drum.
// The caixa and the bass take the recorded groups the other rhythms use; the guitar's power chords,
// the ganzá and the sampler are this show's own files (sounds/manguebeat-*, CREDITS.md); the second
// guitar takes the brega's clean notes through a drive and the echo. The main hand leads; the band
// follows it with a correlated drift. The alfaias, the bass and the guitars share one style template
// (the off-beat sixteenths a little early, as the maracatu's alfaias, milder); the ganzá pulls the
// third and fourth sixteenths early, as the samba family does; the caixa sits nearer the grid.
const lean = offsets => [...Array(STEPS_PER_BAR).keys()].map(step => offsets[step % STEPS_PER_BEAT]);
const ALFAIA_TEMPLATE = lean([2, -5, -9, -8]);
const GANZA_TEMPLATE = lean([0, 2, -6, -5]);
const CAIXA_TEMPLATE = lean([0, 2, -2, 0]);
const ALFAIA_LAYER = { deep: 1, other: 0.9, click: 0.8, body: 0.65, short: 0.45 }; // velocity layers, loud to soft
// `rate` tunes the drum down: the band's alfaias are large and low, lower than a nação's.
const alfaiaHand = (hand, other, rate) => [
  { file: `alfaia-deep-${hand}`, layer: ALFAIA_LAYER.deep, rate },
  { file: other, layer: ALFAIA_LAYER.other, rate },
  { file: `alfaia-deep-click-${hand}`, layer: ALFAIA_LAYER.click, rate },
  { file: `alfaia-dry-body-${hand}`, layer: ALFAIA_LAYER.body, rate },
  { file: `alfaia-deep-short-${hand}`, layer: ALFAIA_LAYER.short, rate },
];
const MAIN_TUNING = 0.84; // three semitones down
const ANSWER_TUNING = 0.9; // and the answer hand's drum a little above it
const CAIXA_TAKE_GAIN = 2; // the recorded caixa is quiet beside the alfaias
const asTakes = files => files.map(file => ({ file }));
const BASS_NOTES = ['E1', 'G1', 'A1', 'B1', 'C2', 'D2', 'E2'].map(midiOf);
const NEAR_BASS = 0.5; // semitones: the recorded notes the bass lines need, and the fingered low E
const BASS_TAKES = takes('baixo').filter(take => BASS_NOTES.some(note => Math.abs(take.root - note) < NEAR_BASS));
const GUITAR_SHORT = [
  { file: 'manguebeat-guitarra-e5', root: midiOf('E2') },
  { file: 'manguebeat-guitarra-e5-b', root: midiOf('E2') },
  { file: 'manguebeat-guitarra-e5-cima', root: midiOf('E2') },
  { file: 'manguebeat-guitarra-g5', root: midiOf('G2'), gain: 1.5 }, // a quieter recording
  { file: 'manguebeat-guitarra-d5', root: midiOf('D3') },
  { file: 'manguebeat-guitarra-c5', root: midiOf('C3') },
];
const GUITAR_LONG = [
  { file: 'manguebeat-guitarra-longo-e5', root: midiOf('E2') },
  { file: 'manguebeat-guitarra-longo-g5', root: midiOf('G2') },
];
// A stab may also be the start of a held chord, cut short: two more recordings of E5 and G5.
const GUITAR_STABS = [...GUITAR_SHORT, ...GUITAR_LONG];
export const MAX_RETUNE = 2; // semitones: a note borrows a recorded one at most this far
export const MAX_DOUBLE_RETUNE = 3; // a chord's double, or a chord played twice running, one more: a different take
const LEGATO = 0.92; // a held note stops this share of its length in
const BASS_SHORT = 1.3; // sixteenths a plain bass note sounds: short, as the reference's bass
const CHORD_SHORT = 1.6; // sixteenths a stab rings
const CHUG = 0.6; // sixteenths a palm-muted chug lasts
const CHUG_GAIN = 0.7;
const LICK_SHORT = 1.5;
const LONG_STEPS = HALF_BAR; // a chord held this long or longer plays a held recording
const SWELL_ATTACK = 1.8; // seconds the feedback takes to swell in
const THROW = 0.9; // the level of a stroke thrown into the echo
const seconds = steps => steps * STEP_SECONDS;
/** The shape of a pitched hit: its note, its length by how it is written, a throw into the echo. */
const pitchedShape = (voice, short) => (tone, _choice, at) => {
  const { note, steps, muted, swell, echo } = parseTone(tone);
  if (echo) return null; // the studio's delay sounds the repeat; the mark is for the eye
  return {
    stroke: steps >= LONG_STEPS ? 'longa' : 'curta',
    notes: [midiOf(note)],
    length: seconds(muted ? CHUG : steps > 1 ? steps * LEGATO : short),
    gain: muted ? CHUG_GAIN : 1,
    ...(swell ? { attack: SWELL_ATTACK } : {}),
    ...(isThrown(voice, at.bar, at.step) ? { throw: THROW } : {}),
  };
};
/** A drum stroke: a thrown one also goes to the echo; an echo mark is silent. */
const drumShape = voice => (tone, _choice, at) => (isEcho(tone) ? null : { stroke: 'hit', ...(isThrown(voice, at.bar, at.step) ? { throw: THROW } : {}) });
const STUDIO = {
  room: 'sala-pequena',
  roomLevel: 1.3,
  lead: 'main',
  phraseBars: PHRASE_BARS,
  output: 0.34,
  // the dub echo: a dotted eighth, each repeat darker and thinner, a little to the left
  echo: { time: seconds(ECHO_STEPS), feedback: ECHO_FEEDBACK, lowpass: 2600, highpass: 350, level: 0.7, pan: -0.25, room: 0.4 },
  // the whole mix's tilt toward the reference: more air, a little more of the lowest octave
  tone: [
    { type: 'lowshelf', frequency: 60, gain: 5 },
    { type: 'peaking', frequency: 600, gain: -3, Q: 0.7 },
    { type: 'peaking', frequency: 3000, gain: 2, Q: 0.7 },
  ],
  voices: {
    main: {
      seed: 61,
      role: 'lead',
      gain: 1.25,
      pan: -0.1,
      send: 0.14,
      bright: [1200, 14000],
      template: ALFAIA_TEMPLATE,
      double: { spread: 0.15, delay: 0.009, gain: 0.85 },
      eq: [{ type: 'peaking', frequency: 3500, gain: 5, Q: 0.8 }], // the stick on the skin
      strokes: () => ({ hit: alfaiaHand('main', 'zabumba-aberto-7', MAIN_TUNING) }),
      shape: drumShape('main'),
    },
    answer: {
      seed: 62,
      role: 'follower',
      gain: 1.1,
      pan: 0.3,
      send: 0.16,
      bright: [1200, 14000],
      template: ALFAIA_TEMPLATE,
      eq: [{ type: 'peaking', frequency: 3500, gain: 5, Q: 0.8 }],
      strokes: () => ({ hit: alfaiaHand('answer', 'zabumba-aberto-8', ANSWER_TUNING) }),
      shape: drumShape('answer'),
    },
    caixa: {
      seed: 63,
      role: 'follower',
      gain: 1.3,
      pan: 0.1,
      send: 0.28,
      bright: [5000, 19000],
      template: CAIXA_TEMPLATE,
      drive: 1.6,
      double: { spread: 0.18, delay: 0.007, gain: 0.7 },
      eq: [
        { type: 'peaking', frequency: 480, gain: -6, Q: 0.8 }, // less box
        { type: 'highshelf', frequency: 5000, gain: 5 }, // the snares
      ],
      ghosts: [
        { step: 4, velocity: FAINT, probability: 0.35 },
        { step: 9, velocity: FAINT, probability: 0.4 },
        { step: 12, velocity: FAINT, probability: 0.3 },
      ],
      strokes: () => ({ hit: takes(['caixa', { gain: CAIXA_TAKE_GAIN }]) }),
      shape: drumShape('caixa'),
    },
    ganza: {
      seed: 64,
      role: 'follower',
      gain: 0.55,
      pan: -0.45,
      send: 0.15,
      bright: [6000, 15000],
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
      gain: 0.62,
      send: 0.04,
      bright: [500, 3200],
      template: ALFAIA_TEMPLATE,
      zone: 1,
      maxZone: MAX_RETUNE,
      release: 0.06,
      drive: 1.5,
      eq: [
        { type: 'lowshelf', frequency: 70, gain: 5 }, // the dub's weight
        { type: 'peaking', frequency: 800, gain: 3, Q: 1 }, // the fingers, so the line reads on a small speaker
      ],
      strokes: () => ({ curta: BASS_TAKES, longa: BASS_TAKES }),
      shape: pitchedShape('baixo', BASS_SHORT),
    },
    guitarra: {
      seed: 66,
      role: 'follower',
      gain: 0.3,
      send: 0.14,
      bright: [1500, 14000],
      template: ALFAIA_TEMPLATE,
      zone: MAX_RETUNE,
      maxZone: MAX_DOUBLE_RETUNE,
      release: 0.05,
      drive: 3,
      // two takes, hard left and right: how a rock guitar gets wide
      double: { spread: 0.55, delay: 0.011, gain: 1, cents: 7 },
      eq: [
        { type: 'highpass', frequency: 90 },
        { type: 'peaking', frequency: 550, gain: -6, Q: 0.7 },
        { type: 'peaking', frequency: 2800, gain: 4, Q: 0.9 },
        { type: 'highshelf', frequency: 6500, gain: 3 },
      ],
      strokes: () => ({ curta: GUITAR_STABS, longa: GUITAR_LONG }),
      shape: pitchedShape('guitarra', CHORD_SHORT),
    },
    eco: {
      seed: 68,
      role: 'follower',
      gain: 0.5,
      pan: 0.35,
      send: 0.3,
      bright: [900, 9000], // the velocity opens the tone, as a wah pedal does
      template: ALFAIA_TEMPLATE,
      release: 0.12,
      drive: 2.2,
      echo: 0.55,
      chorus: { rate: 0.6, depth: 0.003, mix: 0.4 },
      eq: [
        { type: 'highpass', frequency: 180 },
        { type: 'peaking', frequency: 1500, gain: 4, Q: 1.2 },
      ],
      strokes: () => ({ curta: takes('brega-guitarra'), longa: takes('brega-guitarra') }),
      shape: pitchedShape('eco', LICK_SHORT),
    },
    sampler: {
      seed: 67,
      role: 'grid',
      gain: 0.22,
      pan: 0.2,
      send: 0.3,
      bright: [8000, 19000],
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
  ['guitarra', 'guitarra', ['guitarra', 'eco'], 'guitarra distorcida e guitarra com eco'],
  ['sampler', 'sampler', ['sampler'], 'chiado de disco'],
]);

// ---------- copy ----------
const countFromOne = steps => steps.map(step => step + 1).join(' ');
const NOTE_WORDS = { E: 'mi', G: 'sol', A: 'lá', B: 'si', C: 'dó', D: 'ré' };
const pitchClass = note => note.replace(/\d/, '');
const rootsOf = lines => [...new Set(lines.flatMap(text => lineOf(text).map(n => pitchClass(n.note))))];
const RIFF_ROOTS = rootsOf([...RIFF_A, ...RIFF_B]);
const READ = {
  tempo: 'andamento',
  tempoValue: `${BPM} bpm, do início ao fim`,
  meter: 'compasso',
  meterValue: `${BEATS_PER_BAR}/4, ${STEPS_PER_BAR} semicolcheias`,
  bar: '1 compasso',
  barValue: `${BAR_SECONDS.toFixed(2).replace('.', ',')} s`,
  instruments: 'instrumentos',
  echo: 'eco',
  echoValue: `colcheia pontuada, ${Math.round(seconds(ECHO_STEPS) * MS_PER_SECOND)} ms`,
  unison: 'uníssono',
  unisonValue: 'mão principal e resposta juntas',
  cell: 'célula',
  cellValue: '3 + 3 + 2 semicolcheias, duas vezes por compasso',
  strokes: 'batidas',
  mainHand: 'mão principal',
  answerHand: 'resposta',
  pickUp: 'resposta antes dos tempos 1 e 3',
  accent: 'acento',
  ghost: 'nota fraca',
  repeat: 'repetição do eco',
  withAlfaia: 'acentos',
  withAlfaiaValue: 'os da alfaia; os mais fortes fora do tempo',
  notes: 'notas',
  bassNotesValue: rootsOf(BASS_A)
    .map(note => NOTE_WORDS[note])
    .join(' '),
  key: 'tom',
  keyValue: 'mi menor',
  chords: 'acordes',
  chordsValue: RIFF_ROOTS.map(root => `${root}5`).join(' '),
  riff: 'riff',
  riffValue: `${PHRASE_BARS} compassos, com pausas`,
  parts: 'partes',
  partsValue: `A, B e A, ${PHRASE_BARS} compassos cada`,
  coco: 'célula do coco',
  ganza: 'ganzá',
  ganzaValue: 'todas as semicolcheias',
  space: 'espaço',
  spaceValue: 'ficam o baixo e o eco',
  echoPlays: 'o eco toca',
  echoPlaysValue: 'a célula 3 + 3 + 2',
  cutBars: 'compasso de parada',
  together: 'batidas juntas',
  scenes: 'cenas',
  bars: 'compassos',
  howItEnds: 'como termina',
  endValue: 'eco até o silêncio',
};
const COPY = {
  name: 'manguebeat',
  description: 'Manguebeat do Recife: alfaias na célula do coco, caixa, ganzá, baixo, guitarra distorcida e eco de dub, um de cada vez e depois juntos.', // the page's search and preview description
  feminineInstruments: ['alfaia', 'caixa', 'guitarra'],
  scenes: {
    introducao: { chip: 'Introdução', eyebrow: 'sampler e eco', title: 'Manguebeat' },
    alfaias: { chip: 'Alfaias', eyebrow: 'alfaias em uníssono', title: 'Alfaias' },
    maos: { chip: 'Mãos', eyebrow: 'mão principal e resposta', title: 'Mãos' },
    caixa: { chip: 'Caixa', eyebrow: 'caixa na célula da alfaia', title: 'Caixa' },
    coco: { chip: 'Coco', eyebrow: 'ganzá e a célula do coco', title: 'Coco' },
    baixo: { chip: 'Baixo', eyebrow: 'riff de baixo', title: 'Baixo' },
    guitarra: { chip: 'Guitarra', eyebrow: 'riff de guitarra distorcida', title: 'Guitarra' },
    dub: { chip: 'Dub', eyebrow: 'baixo, eco e guitarra limpa', title: 'Dub' },
    retorno: { chip: 'Retorno', eyebrow: 'entrada das camadas', title: 'Retorno' },
    corte: { chip: 'Corte', eyebrow: 'parada da banda', title: 'Corte' },
    banda: { chip: 'Banda completa', eyebrow: 'todos os instrumentos', title: 'Banda' },
    final: { chip: 'Final', eyebrow: 'eco até o silêncio', title: 'Fim' },
  },
  patterns: { coco: 'Coco', dub: 'Dub' },
  voices: {
    main: 'mão principal',
    answer: 'resposta',
    caixa: 'caixa',
    ganza: 'ganzá',
    baixo: 'baixo',
    guitarra: 'guitarra',
    eco: 'guitarra com eco',
    sampler: 'sampler',
  },
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
/** The steps the echo of the dub's first stroke fills in its bar. */
const dubEchoSteps = () => echoesInto(SCENE_STARTS[SCENE_LIST.findIndex(scene => scene.id === 'dub')]).main.map(h => h.step);

/** The written notes of `voices` over a scene as a roll, bar by bar. */
function riffRoll(scene, voices) {
  const line = voice => ({
    id: voice,
    color: COLOR[voice],
    notes: [...Array(scene.bars).keys()].flatMap(bar =>
      sourceHits(scene.start + bar)
        [voice].filter(h => h.tone)
        .map(h => ({ slot: bar * STEPS_PER_BAR + h.step, midi: midiOf(parseTone(h.tone).note), length: parseTone(h.tone).steps })),
    ),
  });
  return rollReadout({ bars: scene.bars, stepsPerBar: STEPS_PER_BAR, stepsPerBeat: STEPS_PER_BEAT, lines: voices.map(line) });
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
    row(label(T.cell), T.cellValue, 'alfaia') +
    row(label(T.strokes), countFromOne(stepsOf(MAIN, ['X'])), 'alfaia'),
  maos: () =>
    notation([seqRow(T.mainHand, marks(MAIN, ['X']), COLOR.main, 'alfaia'), seqRow(T.answerHand, marks(ANSWER[0], ['X'], ['x']), COLOR.answer, 'alfaia')]) +
    row(label(T.answerHand, COLOR.answer), T.pickUp, 'alfaia'),
  caixa: () =>
    notation([seqRow(T.mainHand, marks(MAIN, ['X']), COLOR.main, 'alfaia'), seqRow('caixa', marks(CAIXA[0], ['X'], ['x']), COLOR.caixa, 'caixa')]) +
    row(label(`● ${T.accent} · ○ ${T.ghost}`), '', 'caixa') +
    row(label(T.withAlfaia), T.withAlfaiaValue, 'caixa'),
  coco: () =>
    notation([seqRow('', marks(GANZA, ['X'], ['x']), COLOR.ganza, 'ganza')]) +
    row(label(T.coco), T.cellValue, 'ganza') +
    row(label(T.ganza, COLOR.ganza), T.ganzaValue, 'ganza'),
  dub: () =>
    notation([seqRow(T.mainHand, marks(DUB_MAIN, ['X'], [], dubEchoSteps()), COLOR.main, 'alfaia')]) +
    row(label(`◌ ${T.repeat}`), T.echoValue) +
    row(label(T.echoPlays), T.echoPlaysValue) +
    row(label(T.space), T.spaceValue),
  retorno: () => `<div data-entry></div>`,
  corte: () => stats('two', stat(1, T.cutBars, COLOR.guitarra), stat(stepsOf(MAIN, ['X']).length, T.together, COLOR.main)),
  final: () =>
    stats('', stat(SCENE_LIST.length, T.scenes, COLOR.main), stat(INSTRUMENT_COUNT, T.instruments, COLOR.guitarra), stat(TOTAL_BARS, T.bars, fgAlpha(1))) +
    row(label(T.howItEnds), T.endValue),
};
const ROLLS = {
  baixo: scene => ({
    ...riffRoll(scene, ['baixo']),
    rows: row(label(T.riff, COLOR.baixo), T.riffValue, 'baixo') + row(label(T.notes), T.bassNotesValue, 'baixo'),
  }),
  guitarra: scene => ({
    ...riffRoll(scene, ['guitarra', 'baixo']),
    rows: row(label(T.key), T.keyValue, 'guitarra') + row(label(T.chords), T.chordsValue, 'guitarra'),
  }),
  banda: scene => ({ ...riffRoll(scene, ['guitarra', 'baixo']), rows: row(label(T.parts, COLOR.guitarra), T.partsValue) }),
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

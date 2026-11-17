// Frevo de rua: everything the engine plays and shows that belongs to this rhythm. Instrumental:
// surdo, caixa and pandeiro, the tuba on the bass, the metais (trompetes and trombones) and the
// palhetas (saxofones). 2/4 at one tempo, an 8-step wheel, one bar per turn. Positions are
// sixteenths of the bar (0–7). The melodies are original to this project; choices and sources are
// in docs/frevo.md.
import { label, row, stat, stats } from '../readout-markup.js';
import { renderRoll } from '../roll.js';
import { fgAlpha } from '../theme.js';
import { createFrevoPainter, FREVO_PALETTE } from './frevo-background.js';
import { straightMeter } from './meter.js';
import { recordedChoices, studioSounds } from './studio-kit.js';

const BPM = 140;
const BEATS_PER_BAR = 2;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const BAR_SECONDS = (60 / BPM) * BEATS_PER_BAR;
const STEPS = [...Array(STEPS_PER_BAR).keys()];
const LAST_EIGHTH = STEPS_PER_BAR - 2; // the step bambeando anticipates on

// Velocities.
const ACCENT = 1;
const PLAIN = 0.82;
const SOFT = 0.55;
const GHOST = 0.45;

// Material colours inside the frevo palette: brass in golds from bright to deep, the rest in the
// flag colours, the caixa's chrome near white. Each one keeps at least 3:1 on the wheel's face.
const COLOR = {
  surdo: FREVO_PALETTE.red,
  tarol: '#e6ecff', // chrome
  pandeiro: '#5b93ff', // the palette's blue, lifted to read on the dark wheel
  tuba: '#d98a2b', // deep brass
  trombone: '#ffad33', // brass
  trompete: FREVO_PALETTE.yellow, // bright brass
  sax: FREVO_PALETTE.green,
};

// ring/size: where and how big the voice sits on the wheel. The roles the views read: boom (shakes
// the background), spark (a spark at the hit's angle). No voice swings: frevo pushes through
// anticipations, not swing, and no measured swing exists (docs/frevo.md).
const VOICES = {
  surdo: { instrument: 'surdo', ring: 98, size: 5.6, swing: null, color: COLOR.surdo, boom: 1 },
  tarol: { instrument: 'tarol', ring: 88, size: 3, swing: null, color: COLOR.tarol },
  pandeiro: { instrument: 'pandeiro', ring: 79, size: 3, swing: null, color: COLOR.pandeiro },
  tuba: { instrument: 'tuba', ring: 70, size: 4.6, swing: null, color: COLOR.tuba, boom: 0.5 },
  trombone: { instrument: 'trombone', ring: 61, size: 3.8, swing: null, color: COLOR.trombone },
  trompete: { instrument: 'trompete', ring: 52, size: 3.6, swing: null, color: COLOR.trompete, spark: true },
  sax: { instrument: 'sax', ring: 43, size: 2.8, swing: null, color: COLOR.sax },
};
// The order also seeds the per-hit variation of the sound: keep it stable.
const VOICE_ORDER = Object.keys(VOICES);
const RHYTHM_SECTION = ['surdo', 'tarol', 'pandeiro'];

// ---------- notes ----------
const PITCH_CLASS = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const ACCIDENTAL = { b: -1, s: 1, '': 0 };
const OCTAVE_SEMITONES = 12;
const MIDI_OCTAVE_OFFSET = 1;
/** MIDI number of a note name such as 'bb5', 'fs4' or 'c6'. */
export function midiOf(name) {
  const [, letter, accidental, octave] = name.match(/^([a-g])(b|s)?(\d)$/);
  return PITCH_CLASS[letter] + ACCIDENTAL[accidental || ''] + OCTAVE_SEMITONES * (Number(octave) + MIDI_OCTAVE_OFFSET);
}

/**
 * One bar of a line, as written: eight tokens, one per sixteenth. '.' rests; a note name plays;
 * '!' after it accents it, '~' holds it (a long note).
 */
const parseBar = text =>
  text
    .trim()
    .split(/\s+/)
    .flatMap((token, step) => {
      if (token === '.') return [];
      const note = token.replace(/[!~]/g, '');
      return [{ step, note, accent: token.includes('!'), long: token.includes('~') }];
    });

// The hook: an anacrusis that bursts in (the pickup), then two bars with a wave contour and the
// 3+3+2 accents of the caixa. Stated in Metais, repeated, varied once in Lá e cá, back unchanged
// at the end.
const PICKUP = '. . . . . f5 g5 a5';
const HOOK = ['bb5! . f5 bb5! . f5 a5! .', '. g5 f5 d5 . bb4 c5! .'];
const HOOK_VARIED = [HOOK[0], '. g5 bb5 g5 . d5 g5! .']; // ends on G, a register higher
const ANSWER = ['. . c5 a4 f4 g4 a4 c5', 'eb5 d5 c5 . a4 . f4 .']; // the palhetas answer the hook

// Harmony, one chord per bar ('Cm|F7': a chord per beat). Root and fifth go to the tuba; the guide
// tone (third or seventh) goes to the trombones' stabs.
const CHORDS = {
  Bb: { root: 'bb1', fifth: 'f2', guide: 'd4', symbol: 'B♭' },
  Eb: { root: 'eb2', fifth: 'bb2', guide: 'g3', symbol: 'E♭' },
  F7: { root: 'f2', fifth: 'c3', guide: 'eb4', symbol: 'F7' },
  Cm: { root: 'c2', fifth: 'g2', guide: 'eb4', symbol: 'Cm' },
  G7: { root: 'g2', fifth: 'd3', guide: 'f4', symbol: 'G7' },
  Gm: { root: 'g2', fifth: 'd3', guide: 'bb3', symbol: 'Gm' },
  Edim: { root: 'e2', fifth: 'bb2', guide: 'cs4', symbol: 'E°' },
};
const ALTO_DA_SE = { from: 8, to: 12 }; // bars 9 to 12 of the A part, on the IV chord (E♭)

// ---------- the show script ----------
// Each scene: id, bars, mode per bar, voices, lanes (rows under the wheel), named (the centre names
// its tópica), the chords per bar and each melodic voice's line (bars of eight tokens). A line's
// `pickup` sounds in the last bar of the scene before.
const always = value => () => value;
const SCENE_LIST = [
  {
    id: 'introducao',
    bars: 4,
    mode: bar => ['roll', 'roll', 'normal', 'cut'][bar],
    lanes: ['tarol', 'trompete', 'surdo'],
    chords: ['Bb', 'Bb', 'Bb', 'Bb'],
    lines: { trompete: ['. . . . . . . .', PICKUP, 'bb5! . . bb5! . . bb5! .', 'bb5! . . . . . . .'] },
  },
  { id: 'surdo', bars: 8, voices: always(['surdo']), lanes: ['surdo'] },
  { id: 'caixa', bars: 8, voices: always(['surdo', 'tarol']), lanes: ['surdo', 'tarol'], focus: 'tarol' },
  { id: 'pandeiro', bars: 8, voices: always(RHYTHM_SECTION), lanes: RHYTHM_SECTION },
  {
    id: 'tuba',
    bars: 8,
    voices: always([...RHYTHM_SECTION, 'tuba', 'trompete']),
    lanes: ['surdo', 'tuba'],
    chords: ['Bb', 'Bb', 'F7', 'F7', 'Bb', 'G7', 'Cm', 'F7'],
  },
  {
    id: 'metais',
    bars: 16,
    voices: always([...RHYTHM_SECTION, 'tuba', 'trombone', 'trompete']),
    lanes: ['trompete', 'trombone', 'tuba'],
    chords: ['Bb', 'Bb', 'F7', 'F7', 'Bb', 'Bb', 'Cm', 'F7', 'Eb', 'Eb', 'Eb', 'Edim', 'Bb', 'G7', 'Cm|F7', 'Bb'],
    lines: {
      trompete: {
        pickup: PICKUP,
        bars: [
          ...HOOK,
          '. eb5 d5 c5 . a4 c5 .',
          'f5! . eb5 c5 . f5 g5 a5',
          ...HOOK,
          '. eb5 d5 c5 . g4 c5 eb5',
          'f5! . a5 c6! . a5 g5 a5',
          'bb5! . g5 bb5 . g5 c6! .',
          '. c6 bb5 g5 . eb5 g5 .',
          'bb5! . g5 bb5 . g5 c6! .',
          '. bb5 g5 e5 . g5 bb5 .',
          'bb5! . f5 d5 . f5 bb5 .',
          '. b5 a5 g5 . f5 d5 .',
          'eb5! . g5 c6 . a5 f5 a5',
          'd5 . f5 bb5! . f5 g5 a5',
        ],
      },
    },
  },
  {
    id: 'la-e-ca',
    bars: 16,
    lanes: ['trompete', 'sax'],
    named: true,
    chords: ['Bb', 'Bb', 'F7', 'F7', 'Bb', 'Gm', 'Cm', 'F7', 'Eb', 'Eb', 'F7', 'F7', 'Bb', 'Gm', 'Cm|F7', 'F7'],
    lines: {
      trompete: [
        ...HOOK,
        '. . . . . . . .',
        PICKUP,
        ...HOOK_VARIED,
        '. . . . . . . .',
        '. . . . . . . .',
        'bb5! . g5 bb5 . . g5! .',
        '. . . . . . . .',
        'c6! . a5 c6 . . a5! .',
        '. . . . . . . .',
        'bb5! . f5 bb5 . . f5! .',
        '. . . . . . . .',
        'eb5! . g5 c6 . a5 f5 a5',
        '. . . . . . . .',
      ],
      sax: [
        '. . . . . . . .',
        '. . . . . . . .',
        ...ANSWER,
        '. . . . . . . .',
        '. . . . . . . .',
        '. . eb5 c5 g4 a4 bb4 c5',
        'd5 c5 a4 . f4 . . .',
        '. . . . . . . .',
        '. g4 bb4 c5 eb5 c5 bb4 g4',
        '. . . . . . . .',
        '. a4 c5 eb5 f5 eb5 c5 a4',
        '. . . . . . . .',
        '. g4 bb4 d5 f5 d5 bb4 g4',
        'g4! . c5 eb5 . c5 a4 c5',
        'f4 g4 a4 bb4 c5 d5 eb5 e5',
      ],
    },
  },
  {
    id: 'ventania',
    bars: 8,
    voices: always([...RHYTHM_SECTION, 'tuba', 'sax']),
    lanes: ['sax', 'tuba'],
    named: true,
    focus: 'sax',
    chords: ['Bb', 'Bb', 'F7', 'F7', 'Bb', 'G7', 'Cm', 'F7'],
    lines: {
      sax: [
        'bb4! c5 d5 f5 d5 c5 bb4 f4',
        'g4 bb4 d5 f5 g5 f5 d5 bb4',
        'a4! c5 eb5 f5 eb5 c5 a4 f4',
        'g4 a4 c5 eb5 f5 eb5 c5 a4',
        'bb4! d5 f5 d5 bb4 d5 f5 d5',
        'b4 d5 f5 d5 b4 d5 g5 f5',
        'eb5! d5 c5 g4 eb5 d5 c5 g4',
        'a4 c5 eb5 c5 a4 f4 a4 c5',
      ],
    },
  },
  {
    id: 'bambeando',
    bars: 8,
    voices: always([...RHYTHM_SECTION, 'tuba', 'trombone', 'trompete']),
    lanes: ['trompete', 'tuba'],
    named: true,
    anticipates: true,
    chords: ['Bb', 'Eb', 'F7', 'Bb', 'Bb', 'Eb', 'F7', 'Bb'],
    lines: {
      trompete: [
        '. . d5 f5 . . g5! .',
        '. . g5 bb5 . . a5! .',
        '. . a5 c6 . . bb5! .',
        '. . bb5 f5 . . d5! .',
        '. . d5 f5 . . g5! .',
        '. . g5 bb5 . . a5! .',
        '. . a5 c6 . . bb5! .',
        '. . bb5 f5 . . bb4! .',
      ],
    },
  },
  {
    id: 'fotografia',
    bars: 4,
    mode: bar => ['cut', 'cut', 'normal', 'roll'][bar],
    lanes: ['trompete', 'tarol', 'surdo'],
    named: true,
    chords: ['Bb', 'Eb', 'F7', 'F7'],
    lines: { trompete: ['bb5! . . . . . . .', 'g5! . . . . . . .', 'f5! . . a5! . . c6! .', '. . . . . . . .'] },
  },
  {
    id: 'abafo',
    bars: 8,
    voices: always([...RHYTHM_SECTION, 'trombone', 'trompete']),
    lanes: ['trompete', 'trombone'],
    named: true,
    chords: ['Bb', 'Bb', 'Eb', 'Eb', 'F7', 'F7', 'Bb', 'Bb'],
    // two lines fight for the street: the trompetes hold, the trombones hold a beat later
    lines: {
      trompete: [
        'f5~! . . . . . . .',
        '. . . . . bb5 bb5! .',
        'g5~! . . . . . . .',
        '. . . . . bb5 bb5! .',
        'a5~! . . . . . . .',
        '. . . . . c6 c6! .',
        'bb5~! . . . . . . .',
        '. . . . . f5 g5 a5',
      ],
      trombone: [
        '. . . . d4~! . . .',
        '. . . . . . . .',
        '. . . . eb4~! . . .',
        '. . . . . . . .',
        '. . . . eb4~! . . .',
        '. . . . . . . .',
        '. . . . f4~! . . .',
        '. . . . . . . .',
      ],
    },
  },
  {
    id: 'final',
    bars: 8,
    mode: bar => (bar === 6 ? 'roll' : bar === 7 ? 'cut' : 'normal'),
    lanes: ['trompete', 'sax', 'tarol', 'surdo'],
    isEnd: true,
    chords: ['Bb', 'Bb', 'F7', 'F7', 'Bb', 'Cm|F7', 'Bb', 'Bb'],
    lines: {
      trompete: [...HOOK, '. . . . . . . .', PICKUP, HOOK[0], 'eb5! . g5 c6 . a5 f5 a5', '. . . . . . . .', 'bb5~! . . . . . . .'],
      sax: ['. . . . . . . .', '. . . . . . . .', ...ANSWER, '. . . . . . . .', '. . . . . . . .', '. . . . . . . .', 'd5! . . . . . . .'],
    },
  },
];
// a named scene's centre shows its tópica: the scene's own name
for (const scene of SCENE_LIST) if (scene.named) scene.pattern = scene.id;
const SCENE_STARTS = [];
let TOTAL_BARS = 0;
for (const scene of SCENE_LIST) {
  SCENE_STARTS.push(TOTAL_BARS);
  TOTAL_BARS += scene.bars;
}
const sceneOfBar = bar => SCENE_LIST.findLastIndex((_, i) => SCENE_STARTS[i] <= bar);

/** The chord at a step of an absolute bar. */
function chordAt(bar, step) {
  const scene = SCENE_LIST[sceneOfBar(bar)],
    symbols = scene.chords?.[bar - SCENE_STARTS[sceneOfBar(bar)]];
  if (!symbols) return null;
  const halves = symbols.split('|');
  return CHORDS[halves[Math.min(halves.length - 1, Math.floor(step / STEPS_PER_BEAT))]];
}

// Every written note of every melodic voice, by absolute bar.
const LINES = Object.fromEntries(['trompete', 'trombone', 'sax'].map(voice => [voice, new Map()]));
SCENE_LIST.forEach((scene, i) => {
  for (const [voice, line] of Object.entries(scene.lines || {})) {
    const bars = Array.isArray(line) ? line : line.bars;
    if (line.pickup) LINES[voice].set(SCENE_STARTS[i] - 1, parseBar(line.pickup));
    bars.forEach((text, bar) => {
      if (parseBar(text).length) LINES[voice].set(SCENE_STARTS[i] + bar, parseBar(text));
    });
  }
});
export const FREVO_LINES = LINES;

// ---------- the parts each bar plays ----------
const hit = (step, velocity, tone) => (tone ? { step, velocity, tone } : { step, velocity });
const silentBar = () => Object.fromEntries(VOICE_ORDER.map(voice => [voice, []]));
const toneOf = note => (note.long ? `${note.note}~` : note.note);
const melodic = (bar, voice) => (LINES[voice].get(bar) || []).map(note => hit(note.step, note.accent ? ACCENT : PLAIN, toneOf(note)));

// The percussion cell of two bars: caixa and surdo play twelve sixteenths, then the caixa's rufo
// (docs/research/pernambuco-rhythms-feeling.md, § Frevo). Accent places follow the 3+3+2 grouping.
export const CAIXA_CELL = ['X x x X x x X x', 'x X x X r . . .'];
export const SURDO_CELL = ['o . . . X . . o', 'o . . . X . . .']; // o: abafado (hand on the skin), X: aberto
export const PANDEIRO_BAR = 'X x . x X x . x'; // X: grave (thumb), x: platinela
const cellSteps = (text, mark) => text.split(' ').flatMap((token, step) => (token === mark ? [step] : []));
function caixaBar(cellBar) {
  const text = CAIXA_CELL[cellBar];
  return [
    ...cellSteps(text, 'X').map(step => hit(step, ACCENT, 'forte')),
    ...cellSteps(text, 'x').map(step => hit(step, SOFT, 'fraco')),
    ...cellSteps(text, 'r').map(step => hit(step, ACCENT, 'rufo')),
    ...(text.includes('r') ? STEPS.filter(step => step > text.split(' ').indexOf('r')).map(step => hit(step, SOFT, 'muted')) : []),
  ].sort((a, b) => a.step - b.step);
}
const surdoBar = cellBar => [
  ...cellSteps(SURDO_CELL[cellBar], 'o').map(step => hit(step, GHOST, 'abafado')),
  ...cellSteps(SURDO_CELL[cellBar], 'X').map(step => hit(step, ACCENT, 'aberto')),
];
const pandeiroBar = () => [
  ...cellSteps(PANDEIRO_BAR, 'X').map(step => hit(step, ACCENT, 'grave')),
  ...cellSteps(PANDEIRO_BAR, 'x').map(step => hit(step, SOFT, 'platinela')),
];

/** The tuba walks root and fifth on the eighths, with a chromatic approach into a new chord. */
function tubaBar(bar, anticipates) {
  const out = [];
  const next = chordAt(bar + 1, 0);
  for (const step of STEPS.filter(step => step % 2 === 0)) {
    const chord = chordAt(bar, step);
    if (!chord) continue;
    if (step === LAST_EIGHTH && next && anticipates) out.push(hit(step, ACCENT, next.root));
    else if (step === LAST_EIGHTH && next && next !== chord) out.push(hit(step, PLAIN, noteName(midiOf(next.root) - 1)));
    else if (step === 0 && anticipates && bar > SCENE_STARTS[sceneOfBar(bar)])
      continue; // tied over from the anticipation
    else out.push(hit(step, step ? PLAIN : ACCENT, step % STEPS_PER_BEAT ? chord.fifth : chord.root));
  }
  return out;
}
const NAMES = ['c', 'cs', 'd', 'eb', 'e', 'f', 'fs', 'g', 'gs', 'a', 'bb', 'b'];
const noteName = midi => `${NAMES[midi % OCTAVE_SEMITONES]}${Math.floor(midi / OCTAVE_SEMITONES) - MIDI_OCTAVE_OFFSET}`;

/** The trombones punch the trompetes' accents with the chord's guide tone; an accent on the last eighth already belongs to the next chord. */
function tromboneStabs(bar) {
  return (LINES.trompete.get(bar) || [])
    .filter(note => note.accent && !note.long)
    .flatMap(note => {
      const chord = note.step >= LAST_EIGHTH ? chordAt(bar + 1, 0) || chordAt(bar, note.step) : chordAt(bar, note.step);
      return chord ? [hit(note.step, PLAIN, chord.guide)] : [];
    });
}

/** The tarol swells in sixteenths and ends in its rufo; one bar, or the first of two. */
function rollBar(barInRoll, rollBars) {
  const total = rollBars * STEPS_PER_BAR;
  return STEPS.map(step => {
    const at = barInRoll * STEPS_PER_BAR + step,
      velocity = SOFT / 2 + (1 - SOFT / 2) * (at / (total - 1)) ** 2;
    if (barInRoll === rollBars - 1 && step >= STEPS_PER_BEAT) return hit(step, velocity, step === STEPS_PER_BEAT ? 'rufo' : 'muted');
    return hit(step, velocity, velocity > PLAIN ? 'forte' : 'fraco');
  });
}

// Bar modes: roll (the tarol alone, swelling into its rufo), cut (everyone on 1, then silence: the
// fotografia's pose, the introduction's stop, the final hit) and normal.
function barHits(scene, barInScene) {
  const bar = scene.start + barInScene,
    mode = scene.mode(barInScene);
  const hits = silentBar();
  hits.trompete = melodic(bar, 'trompete');
  hits.sax = melodic(bar, 'sax');
  if (mode === 'roll') {
    const rollBars = scene.mode(barInScene - 1) === 'roll' || scene.mode(barInScene + 1) === 'roll' ? 2 : 1;
    hits.tarol = rollBar(scene.mode(barInScene - 1) === 'roll' ? 1 : 0, rollBars);
    return hits;
  }
  if (mode === 'cut') {
    const chord = chordAt(bar, 0);
    hits.surdo = [hit(0, ACCENT, 'aberto')];
    hits.tarol = [hit(0, ACCENT, 'forte')];
    hits.pandeiro = [hit(0, ACCENT, 'grave')];
    hits.tuba = [hit(0, ACCENT, chord.root)];
    hits.trombone = [hit(0, ACCENT, scene.isEnd ? `${chord.guide}~` : chord.guide)];
    return hits;
  }
  const cellBar = barInScene % CAIXA_CELL.length;
  hits.surdo = surdoBar(cellBar);
  hits.tarol = caixaBar(cellBar);
  hits.pandeiro = pandeiroBar();
  if (scene.chords) hits.tuba = tubaBar(bar, Boolean(scene.anticipates));
  hits.trombone = [...tromboneStabs(bar), ...melodic(bar, 'trombone')].sort((a, b) => a.step - b.step);
  return hits;
}

// How the background behaves in each scene (frevo-background.js): sombrinhas on the inner and the
// outer ring (fractions fade one in), the halo's glow and the fury (jitter). The engine reads
// `speed` for the visual clock and blends zoom, rot, hue and keep, which this painter does not use.
const LOOK = { zoom: 0, rot: 0, hue: 0, keep: 0, speed: 1 };
const SCENE_LOOKS = {
  introducao: { ...LOOK, inner: 2, outer: 0, glow: 0.4, fury: 0 },
  surdo: { ...LOOK, inner: 2, outer: 0, glow: 0.5, fury: 0 },
  caixa: { ...LOOK, inner: 3, outer: 0, glow: 0.6, fury: 0 },
  pandeiro: { ...LOOK, inner: 4, outer: 0, glow: 0.6, fury: 0 },
  tuba: { ...LOOK, inner: 4, outer: 2, glow: 0.7, fury: 0 },
  metais: { ...LOOK, inner: 6, outer: 4, glow: 0.8, fury: 0.1 },
  'la-e-ca': { ...LOOK, inner: 6, outer: 6, glow: 0.8, fury: 0.1 },
  ventania: { ...LOOK, inner: 5, outer: 8, glow: 0.9, fury: 0.2 },
  bambeando: { ...LOOK, inner: 6, outer: 8, glow: 0.9, fury: 0.2 },
  fotografia: { ...LOOK, inner: 6, outer: 8, glow: 0.5, fury: 0 },
  abafo: { ...LOOK, inner: 8, outer: 10, glow: 1, fury: 1 },
  final: { ...LOOK, inner: 8, outer: 10, glow: 1, fury: 0.3 },
};

// ---------- sound ----------
// Samples, each at the pitch its name says (sounds/frevo-*.wav, CREDITS.md). A note plays the
// nearest sample, retuned by its playback rate (never more than two semitones).
const SAMPLE_NOTES = {
  trompete: ['f4', 'g4', 'bb4', 'd5', 'f5', 'a5', 'c6'],
  'trompete-longo': ['bb4', 'd5', 'f5', 'a5', 'c6'],
  trombone: ['f3', 'bb3', 'd4', 'f4'],
  'trombone-longo': ['f3', 'c4', 'eb4', 'f4'],
  tuba: ['bb1', 'eb2', 'f2', 'bb2', 'd3', 'f3'],
  sax: ['c4', 'd4', 'e4', 'fs4', 'gs4', 'bb4', 'c5', 'd5', 'e5', 'f5'],
};
export const MAX_RETUNE = 2; // semitones
/** The sample of `set` nearest to a note, and the playback rate that tunes it. */
export function nearestSample(set, note) {
  const midi = midiOf(note);
  const best = SAMPLE_NOTES[set].reduce((a, b) => (Math.abs(midiOf(b) - midi) < Math.abs(midiOf(a) - midi) ? b : a));
  return [`frevo-${set}-${best}`, 2 ** ((midi - midiOf(best)) / OCTAVE_SEMITONES), midi - midiOf(best)];
}
// ---------- sound: the studio (src/studio.js) ----------
// The frevo's recordings, each note a take at its pitch; a note borrows the neighbouring recorded
// note within MAX_RETUNE, so repeated notes alternate takes. The pandeiro adds the coco's recorded
// strokes. The surdo leads; the band follows it with a correlated drift; no swing.
const brassTakes = set => SAMPLE_NOTES[set].map(note => ({ file: `frevo-${set}-${note}`, root: midiOf(note) }));
const brass = set => ({
  zone: MAX_RETUNE,
  maxZone: MAX_RETUNE,
  strokes: () => ({ curta: brassTakes(set), longa: brassTakes(SAMPLE_NOTES[`${set}-longo`] ? `${set}-longo` : set) }),
  shape: tone => ({ stroke: tone.endsWith('~') ? 'longa' : 'curta', notes: [midiOf(tone.replace('~', ''))] }),
});
const MUFFLED = 0.7; // the abafado stroke, against the open one
const STUDIO = {
  room: 'sala-pequena',
  roomLevel: 0.9,
  lead: 'surdo',
  voices: {
    surdo: {
      seed: 41,
      role: 'lead',
      gain: 1.4,
      send: 0.12,
      bright: [900, 9000],
      strokes: () => ({
        aberto: [{ file: 'frevo-surdo-aberto' }, { file: 'alfaia-dry-surdo-main' }],
        abafado: [{ file: 'frevo-surdo-abafado' }, { file: 'zabumba-abafada-4' }],
      }),
      shape: tone => (tone === 'abafado' ? { stroke: 'abafado', gain: MUFFLED } : { stroke: 'aberto' }),
    },
    tarol: {
      seed: 42,
      role: 'follower',
      gain: 0.55,
      pan: 0.2,
      send: 0.16,
      strokes: () => ({
        hit: [
          { file: 'frevo-tarol-forte', layer: 0.9 },
          { file: 'frevo-tarol-fraco', layer: 0.4 },
        ],
        rufo: [{ file: 'frevo-tarol-rufo' }],
      }),
      shape: tone => (tone === 'muted' ? null : { stroke: tone === 'rufo' ? 'rufo' : 'hit' }),
    },
    pandeiro: {
      seed: 43,
      role: 'follower',
      gain: 0.9,
      pan: -0.3,
      send: 0.18,
      strokes: () => ({
        grave: [{ file: 'frevo-pandeiro-grave' }, { file: 'pandeiro-grave-3' }], // the lightest: the phone set stays under 400 KB
        platinela: [{ file: 'frevo-pandeiro-platinela' }, { file: 'pandeiro-platinela-1' }],
      }),
      shape: tone => ({ stroke: tone === 'grave' ? 'grave' : 'platinela' }),
    },
    tuba: { seed: 44, role: 'follower', gain: 0.9, send: 0.1, bright: [800, 6000], ...brass('tuba') },
    trombone: { seed: 45, role: 'follower', gain: 0.6, pan: -0.25, send: 0.2, ...brass('trombone') },
    trompete: { seed: 46, role: 'follower', gain: 0.85, pan: 0.25, send: 0.22, ...brass('trompete') },
    sax: { seed: 47, role: 'follower', gain: 0.75, pan: 0.45, send: 0.22, ...brass('sax') },
  },
};
// One recorded option per instrument, so the desktop gives each its volume.
const SOUND_CHOICES = recordedChoices(STUDIO, [
  ['surdo', 'surdo', ['surdo'], 'surdo de frevo'],
  ['tarol', 'caixa', ['tarol'], 'tarol'],
  ['pandeiro', 'pandeiro', ['pandeiro'], 'pandeiro'],
  ['tuba', 'tuba', ['tuba'], 'tuba'],
  ['trombone', 'trombone', ['trombone'], 'trombone'],
  ['trompete', 'trompete', ['trompete'], 'trompete'],
  ['sax', 'saxofone', ['sax'], 'sax tenor'],
]);

// ---------- copy ----------
const INSTRUMENT_COUNT = VOICE_ORDER.length;
const countFromOne = steps => steps.map(step => step + 1).join(' ');
const READ = {
  tempo: 'andamento',
  tempoValue: `${BPM} bpm, do início ao fim`,
  meter: 'compasso',
  meterValue: `${BEATS_PER_BAR}/4, ${STEPS_PER_BAR} semicolcheias`,
  bar: '1 compasso',
  barValue: `${BAR_SECONDS.toFixed(2).replace('.', ',')} s`,
  voices: 'vozes',
  open: 'aberto',
  muted: 'abafado',
  cell: 'célula de 2 compassos',
  accent: 'acento',
  soft: 'nota fraca',
  rufo: 'rufo',
  caixaCount: `${
    CAIXA_CELL.join(' ')
      .split(' ')
      .filter(t => t === 'X' || t === 'x').length
  } semicolcheias + rufo`,
  grave: 'grave',
  platinela: 'platinela',
  progression: 'harmonia',
  eighths: 'colcheias por compasso',
  bassLine: 'baixo',
  bassLineValue: 'fundamental e quinta do acorde',
  altoDaSe: 'Alto da Sé',
  altoDaSeValue: `compassos ${ALTO_DA_SE.from + 1} a ${ALTO_DA_SE.to}, no IV grau (E♭)`,
  hook: 'tema',
  hookValue: `${HOOK.length} compassos com anacruse`,
  question: 'pergunta',
  metais: 'metais',
  answer: 'resposta',
  palhetas: 'palhetas',
  sixteenths: 'semicolcheias por compasso',
  anticipation: 'antecipação',
  anticipationValue: `${LAST_EIGHTH + 1}ª semicolcheia, a última colcheia`,
  cutBars: 'compassos de parada',
  attacks: 'ataques depois',
  attacksValue: '3 + 3 + 2',
  longNotes: 'notas longas',
  longNotesValue: 'trompetes e trombones, um tempo de distância',
  scenes: 'cenas',
  bars: 'compassos',
  howItEnds: 'como termina',
  endValue: 'rufo e ataque final',
};
const COPY = {
  name: 'frevo',
  feminineInstruments: ['caixa', 'tuba'],
  scenes: {
    introducao: { chip: 'Introdução', eyebrow: 'frevo de rua', title: 'Frevo' },
    surdo: { chip: 'Surdo', eyebrow: 'acento no tempo 2', title: 'Surdo' },
    caixa: { chip: 'Caixa', eyebrow: READ.caixaCount, title: 'Caixa' },
    pandeiro: { chip: 'Pandeiro', eyebrow: 'semicolcheias', title: 'Pandeiro' },
    tuba: { chip: 'Tuba', eyebrow: 'baixo em colcheias', title: 'Tuba' },
    metais: { chip: 'Metais', eyebrow: 'trompetes e trombones', title: 'Metais' },
    'la-e-ca': { chip: 'Lá e cá', eyebrow: 'pergunta e resposta', title: 'Lá e cá' },
    ventania: { chip: 'Ventania', eyebrow: 'palhetas em semicolcheias', title: 'Ventania' },
    bambeando: { chip: 'Bambeando', eyebrow: 'antecipação na última colcheia', title: 'Bambeando' },
    fotografia: { chip: 'Fotografia', eyebrow: 'parada da orquestra', title: 'Fotografia' },
    abafo: { chip: 'Abafo', eyebrow: 'notas longas em fortíssimo', title: 'Abafo' },
    final: { chip: 'Final', eyebrow: 'rufo e ataque final', title: 'Fim' },
  },
  patterns: { 'la-e-ca': 'Lá e cá', ventania: 'Ventania', bambeando: 'Bambeando', fotografia: 'Fotografia', abafo: 'Abafo' },
  voices: { surdo: 'surdo', tarol: 'caixa', pandeiro: 'pandeiro', tuba: 'tuba', trombone: 'trombone', trompete: 'trompete', sax: 'saxofone' },
  instruments: {},
  hands: {},
  centre: { roll: 'RUFO', cut: 'PARADA', end: 'FIM' },
  read: READ,
};

// ---------- readout layouts ----------
const T = READ;
const ROLL_LINE = { trompete: COLOR.trompete, trombone: COLOR.trombone, sax: COLOR.sax };
const SHORT_SLOTS = 1;
const LONG_SLOTS = STEPS_PER_BAR + STEPS_PER_BEAT; // a held note, drawn as long as it rings
const beatSeparator = step => (step % STEPS_PER_BEAT === STEPS_PER_BEAT - 1 && step < STEPS_PER_BAR - 1 ? '|' : '');
/** One bar of a cell as marks: ● for a mark in `strong`, ○ for one in `weak`, ≈ for the rufo. */
const marks = (text, strong, weak) =>
  text
    .split(' ')
    .map((token, step) => (strong.includes(token) ? '●' : weak.includes(token) ? '○' : token === 'r' ? '≈' : '·') + beatSeparator(step))
    .join('');
const seqRow = (name, text, color, id) =>
  `${label(name)}<span class="seq"${id ? ` data-inst="${id}"` : ''} style="color:${color}">${text}</span><span class="n"></span>`;

/** The melody roll of a scene: its melodic voices, bar by bar, with the scene's band. */
function sceneRoll(scene, voices, band) {
  const lines = voices.map(voice => ({
    id: voice,
    color: ROLL_LINE[voice],
    notes: [...Array(scene.bars).keys()].flatMap(bar =>
      (LINES[voice].get(scene.start + bar) || []).map(note => ({
        slot: bar * STEPS_PER_BAR + note.step,
        midi: midiOf(note.note),
        length: note.long ? LONG_SLOTS : SHORT_SLOTS,
      })),
    ),
  }));
  const score = renderRoll({ bars: scene.bars, stepsPerBar: STEPS_PER_BAR, stepsPerBeat: STEPS_PER_BEAT, lines, band });
  return { markup: `<div class="score roll">${score.markup}<i class="scur"></i></div>`, score };
}
const progression = scene =>
  scene.chords
    .map(symbols =>
      symbols
        .split('|')
        .map(s => CHORDS[s].symbol)
        .join('·'),
    )
    .join(' ');

const LAYOUTS = {
  introducao: () =>
    row(label(T.tempo), T.tempoValue) + row(label(T.meter), T.meterValue) + row(label(T.bar), T.barValue) + row(label(T.voices), INSTRUMENT_COUNT),
  surdo: () =>
    `<div class="notation">${SURDO_CELL.map((text, i) => seqRow(i ? '' : T.cell, marks(text, ['X'], ['o']), COLOR.surdo, 'surdo')).join('')}</div>` +
    row(label(`● ${T.open}`, COLOR.surdo), countFromOne(cellSteps(SURDO_CELL[0], 'X')), 'surdo') +
    row(label(`○ ${T.muted}`), countFromOne(cellSteps(SURDO_CELL[0], 'o')), 'surdo'),
  caixa: () =>
    `<div class="notation">${CAIXA_CELL.map((text, i) => seqRow(i ? '' : T.cell, marks(text, ['X'], ['x']), COLOR.tarol, 'tarol')).join('')}</div>` +
    row(label(`● ${T.accent} · ○ ${T.soft} · ≈ ${T.rufo}`), T.caixaCount, 'tarol'),
  pandeiro: () =>
    `<div class="notation">${seqRow('', marks(PANDEIRO_BAR, ['X'], ['x']), COLOR.pandeiro, 'pandeiro')}</div>` +
    row(label(`● ${T.grave}`, COLOR.pandeiro), countFromOne(cellSteps(PANDEIRO_BAR, 'X')), 'pandeiro') +
    row(label(`○ ${T.platinela}`), countFromOne(cellSteps(PANDEIRO_BAR, 'x')), 'pandeiro'),
  tuba: scene =>
    row(label(T.progression), progression(scene), 'tuba') + row(label(T.eighths), STEPS_PER_BAR / 2, 'tuba') + row(label(T.bassLine), T.bassLineValue, 'tuba'),
};
const ROLLS = {
  metais: scene => ({
    ...sceneRoll(scene, ['trompete'], ALTO_DA_SE),
    rows: row(label(T.hook, COLOR.trompete), T.hookValue) + row(label(T.altoDaSe), T.altoDaSeValue),
  }),
  'la-e-ca': scene => ({
    ...sceneRoll(scene, ['trompete', 'sax']),
    rows: row(label(T.question, COLOR.trompete), T.metais) + row(label(T.answer, COLOR.sax), T.palhetas),
  }),
  ventania: scene => ({ ...sceneRoll(scene, ['sax']), rows: row(label(T.sixteenths), `${STEPS_PER_BAR}/${STEPS_PER_BAR}`, 'sax') }),
  bambeando: scene => ({ ...sceneRoll(scene, ['trompete']), rows: row(label(T.anticipation, COLOR.trompete), T.anticipationValue) }),
  abafo: scene => ({ ...sceneRoll(scene, ['trompete', 'trombone']), rows: row(label(T.longNotes), T.longNotesValue) }),
};
const FINAL = () =>
  stats('', stat(SCENE_LIST.length, T.scenes, COLOR.trompete), stat(INSTRUMENT_COUNT, T.voices, COLOR.surdo), stat(TOTAL_BARS, T.bars, fgAlpha(1))) +
  row(label(T.howItEnds), T.endValue);
const FOTOGRAFIA = scene => {
  const bars = [...Array(scene.bars).keys()],
    cuts = bars.filter(bar => scene.mode(bar) === 'cut').length,
    attacks = bars.filter(bar => scene.mode(bar) === 'normal').flatMap(bar => (LINES.trompete.get(scene.start + bar) || []).filter(note => note.accent)).length;
  return stats('two', stat(cuts, T.cutBars, COLOR.surdo), stat(attacks, T.attacks, COLOR.trompete)) + row(label(T.attacks), T.attacksValue);
};

/**
 * The readout for a scene: its markup, the score (or roll) whose cursor follows the bar, and the
 * instrument the whole readout is about (`focus`, '' for none), so a muted one shows disabled.
 */
function readout(scene) {
  const focus = scene.focus || (['surdo', 'pandeiro', 'tuba'].includes(scene.id) ? scene.id : '');
  if (ROLLS[scene.id]) {
    const { markup, score, rows } = ROLLS[scene.id](scene);
    return { markup: rows + markup, score, focus };
  }
  const layout = scene.id === 'final' ? FINAL : scene.id === 'fotografia' ? FOTOGRAFIA : LAYOUTS[scene.id] || (() => '');
  return { markup: layout(scene), score: null, focus };
}

export const FREVO = {
  id: 'frevo',
  ...straightMeter(BPM, BEATS_PER_BAR, STEPS_PER_BEAT),
  voices: VOICES,
  shapeVoices: ['tuba', 'trompete'], // the voices whose hits draw a shape on the wheel, in drawing order
  barHits,
  sceneDefaults: {},
  scenes: SCENE_LIST,
  looks: SCENE_LOOKS,
  background: { create: options => createFrevoPainter({ ...options, beatsPerBar: BEATS_PER_BAR }) },
  readout,
  waves: null,
  sounds: studioSounds(STUDIO, SOUND_CHOICES, 'final'), // every instrument plays its part in the final's first bars
  copy: COPY,
};

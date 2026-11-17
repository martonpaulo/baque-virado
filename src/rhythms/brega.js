// Brega: Recife's romantic brega, everything the engine plays and shows that belongs to this rhythm.
// Instrumental: bumbo, caixa and chimbal on the off-beat (the xacumbum base), the bass with the bumbo,
// a string pad and keyboard chords on the off-beat, the keyboard's theme, a guitar melody in thirds,
// a tom fill (virada) before each chorus, a one-bar break (breque) and the horns' answer (vinheta).
// 4/4 at one tempo, a 16-step wheel, one bar per turn. A minor (heartbreak), the last chorus a whole
// tone higher. The melodies are original to this project; choices and sources: docs/rhythms/brega.md.
import { label, row, stat, stats } from '../readout-markup.js';
import { renderRoll } from '../roll.js';
import { fgAlpha } from '../theme.js';
import { BREGA_PALETTE, createBregaPainter } from './brega-background.js';
import { straightMeter } from './meter.js';
import { midiOf, recordedChoices, studioSounds, takes } from './studio-kit.js';

// docs/research/brega-forro.md, § 1c: «Expect about 130 to 150 BPM on a quarter-note pulse», and the
// show outline there and the script sketch both run at 140. The bumbo on 1 and 3 gives the slow
// two-step the dancers feel (70 half notes a minute, the «70 to 100» of pernambuco-rhythms-feeling.md).
const BPM = 140;
const BEATS_PER_BAR = 4;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const STEP_SECONDS = 60 / BPM / STEPS_PER_BEAT;
const BAR_SECONDS = STEP_SECONDS * STEPS_PER_BAR;
const SIXTEENTHS = [...Array(STEPS_PER_BAR).keys()];
const KEY_CHANGE = 2; // semitones: the last chorus and the end, a whole tone up (B minor)

// Velocities.
const ACCENT = 1;
const PLAIN = 0.85;
const SOFT = 0.6;
const GHOST = 0.45;

// Material colours inside the brega palette: the rhythm section in cold blues and steel, the
// harmony and the melodies in roses, the horns in a low amber. Each keeps 3:1 on the wheel's face.
const COLOR = {
  bumbo: '#8592d6',
  caixa: BREGA_PALETTE.light,
  chimbal: '#9fb3c8',
  tom: '#b0a4de',
  baixo: '#7d93d0',
  cordas: BREGA_PALETTE.rose,
  teclado: '#e3b6c6',
  guitarra: '#d98fa8',
  tema: '#f2d3de',
  metais: '#d6ad7c',
};

// ring/size: where and how big the voice sits on the wheel. boom: the bumbo pushes the background.
// pitched: a melodic voice keeps its tuning on every hit. The tom shares the caixa's ring (guide:
// false): it plays only in the fills, where the caixa rests. No voice swings: brega is programmed
// straight (docs/research/brega-forro.md: «none or slight»), so the grid stays straight.
const VOICES = {
  bumbo: { instrument: 'bumbo', ring: 98, size: 5.6, swing: null, color: COLOR.bumbo, boom: 1 },
  caixa: { instrument: 'caixa', ring: 90, size: 4.2, swing: null, color: COLOR.caixa, crack: true },
  chimbal: { instrument: 'chimbal', ring: 82, size: 2.6, swing: null, color: COLOR.chimbal, toneScale: { aberto: 1.4 } },
  tom: { instrument: 'tom', ring: 90, size: 4.4, swing: null, color: COLOR.tom, guide: false },
  baixo: { instrument: 'baixo', ring: 74, size: 4.6, swing: null, color: COLOR.baixo, pitched: true },
  cordas: { instrument: 'cordas', ring: 66, size: 3.6, swing: null, color: COLOR.cordas, pitched: true },
  teclado: { instrument: 'teclado', ring: 58, size: 3, swing: null, color: COLOR.teclado, pitched: true },
  guitarra: { instrument: 'guitarra', ring: 50, size: 3.4, swing: null, color: COLOR.guitarra, pitched: true },
  tema: { instrument: 'teclado', ring: 42, size: 3.6, swing: null, color: COLOR.tema, pitched: true, spark: true },
  metais: { instrument: 'metais', ring: 35, size: 3.6, swing: null, color: COLOR.metais, pitched: true },
};
// The order also seeds the per-hit variation of the sound: keep it stable.
const VOICE_ORDER = Object.keys(VOICES);

// ---------- harmony ----------
// One chord per bar. The pad and the keyboard voice each chord close, the keyboard an octave above.
const CHORDS = {
  Am: { bass: 'A1', pad: ['A3', 'C4', 'E4'], symbol: 'Am', name: 'lá menor' },
  F: { bass: 'F1', pad: ['A3', 'C4', 'F4'], symbol: 'F', name: 'fá maior' },
  Dm: { bass: 'D2', pad: ['A3', 'D4', 'F4'], symbol: 'Dm', name: 'ré menor' },
  E7: { bass: 'E1', pad: ['G#3', 'D4', 'E4'], symbol: 'E7', name: 'mi com sétima' },
  G: { bass: 'G1', pad: ['G3', 'B3', 'D4'], symbol: 'G', name: 'sol maior' },
  C: { bass: 'C2', pad: ['G3', 'C4', 'E4'], symbol: 'C', name: 'dó maior' },
};
const OCTAVE = 12;
const FIFTH = 7;
const BASS_TOP = midiOf('E2'); // the fifth goes below the root when it would pass the recorded bass
const fifthOf = root => (root + FIFTH <= BASS_TOP ? root + FIFTH : root + FIFTH - OCTAVE);
// The horns' stabs, voiced for trompetes over a trombone.
const HORN_CHORDS = { Am: ['E4', 'A4', 'C5'], Dm: ['D4', 'F4', 'A4'], E7: ['D4', 'G#4', 'E5'] };
// A minor, natural; over E7 the seventh degree is raised (G♯), the harmonic minor of the cadence.
const SCALE = [9, 11, 0, 2, 4, 5, 7];
const RAISED = { E7: [9, 11, 0, 2, 4, 5, 8] };
/** The diatonic third below a note, in the scale of its chord: the guitar's second line. */
export function thirdBelow(midi, symbol) {
  const scale = RAISED[symbol] || SCALE;
  let below = midi,
    found = 0;
  while (found < 2) {
    below--;
    if (scale.includes(((below % OCTAVE) + OCTAVE) % OCTAVE)) found++;
  }
  return below;
}

// ---------- lines ----------
/**
 * One bar of a line, as written: sixteen tokens, one per sixteenth. '.' rests or holds; 'A4-6' plays
 * A4 for six sixteenths.
 */
export function parseBar(text) {
  const tokens = text.trim().split(/\s+/);
  if (tokens.length !== STEPS_PER_BAR) throw new Error(`a bar has ${STEPS_PER_BAR} tokens: ${text}`);
  return tokens.flatMap((token, step) => {
    if (token === '.') return [];
    const [note, length] = token.split('-');
    return [{ step, midi: midiOf(note), length: Number(length) }];
  });
}

// The theme: a wide, singable line with long notes, four bars that rise to F and sigh down to A. The
// chorus is the theme and its answer (bars 5 to 8), which climbs back and lands on the tonic.
export const THEME = [
  'A4-2 . C5-2 . F5-8 . . . . . . . E5-2 . D5-2 .',
  'D5-6 . . . . . B4-2 . G4-4 . . . B4-2 . D5-2 .',
  'E5-12 . . . . . . . . . . . D5-2 . C5-2 .',
  'C5-4 . . . B4-4 . . . A4-8 . . . . . . .',
];
const THEME_ANSWER = [
  'A4-2 . D5-2 . F5-8 . . . . . . . E5-2 . D5-2 .',
  'D5-4 . . . C5-2 . B4-2 . G#4-8 . . . . . . .',
  'A4-2 . B4-2 . C5-4 . . . E5-4 . . . D5-2 . C5-2 .',
  'A4-16 . . . . . . . . . . . . . . .',
];
const CHORUS = [...THEME, ...THEME_ANSWER];
const CHORUS_CHORDS = ['F', 'G', 'Am', 'Am', 'Dm', 'E7', 'Am', 'Am'];
// The guitar's verse: a two-bar motif in sequence (A minor, D minor, G, then C to the dominant), the
// upper line written, the lower a third below.
const VERSE = [
  'E4-2 . A4-2 . C5-6 . . . . . B4-2 . A4-4 . . .',
  'B4-4 . . . A4-2 . E4-2 . C5-8 . . . . . . .',
  'D4-2 . F4-2 . A4-6 . . . . . G4-2 . F4-4 . . .',
  'E4-4 . . . D4-2 . F4-2 . A4-8 . . . . . . .',
  'D4-2 . G4-2 . B4-6 . . . . . A4-2 . G4-4 . . .',
  'A4-4 . . . G4-2 . D4-2 . B4-8 . . . . . . .',
  'E4-2 . G4-2 . C5-6 . . . . . B4-2 . A4-4 . . .',
  'G#4-4 . . . B4-4 . . . D5-4 . . . B4-4 . . .',
];
const VERSE_CHORDS = ['Am', 'Am', 'Dm', 'Dm', 'G', 'G', 'C', 'E7'];
// The vinheta's call: one bar of guitar, then one bar of the horns' answer.
const CALL = {
  Am: 'E4-2 . A4-2 . C5-2 . B4-2 . A4-8 . . . . . . .',
  Dm: 'F4-2 . A4-2 . D5-2 . C5-2 . A4-8 . . . . . . .',
};
const EMPTY = '. . . . . . . . . . . . . . . .';
const VINHETA_CHORDS = ['Am', 'Am', 'Dm', 'E7', 'Am', 'Am', 'Dm', 'E7'];
const BASE_CHORDS = ['Am', 'F', 'Dm', 'E7'];
const HORN_STABS = [4, 6]; // the answer: two stabs, then the section falls off the note
const HORN_FALL = 8;
const FINAL_NOTE = 'A4-16 . . . . . . . . . . . . . . .';

// ---------- the show script (docs/sketches/scripts.html, the `brega` entry) ----------
// Each scene: id, bars, the voices per bar, the lanes (rows under the wheel), the chords per bar and
// each melodic line (bars of sixteen tokens). `transpose`: semitones up. `fill`: the bar (from the
// scene's end) that ends in a tom fill. `cut`: the bar where everyone hits 1, then silence.
const DRUMS = ['bumbo', 'caixa', 'chimbal'];
const BAND = [...DRUMS, 'baixo', 'cordas', 'teclado'];
const always = value => () => value;
const repeat = (list, bars) => [...Array(bars).keys()].map(bar => list[bar % list.length]);
const SCENE_LIST = [
  { id: 'introducao', bars: 4, voices: always(['tema']), lanes: ['tema'], chords: ['F', 'G', 'Am', 'Am'], lines: { tema: THEME } },
  { id: 'base', bars: 4, voices: always(DRUMS), lanes: DRUMS },
  { id: 'baixo', bars: 4, voices: always([...DRUMS, 'baixo']), lanes: ['bumbo', 'baixo'], chords: BASE_CHORDS },
  { id: 'teclado', bars: 8, voices: always(BAND), lanes: ['cordas', 'teclado', 'baixo'], chords: repeat(BASE_CHORDS, 8) },
  {
    id: 'guitarra',
    bars: 8,
    voices: always([...BAND, 'guitarra']),
    lanes: ['guitarra', 'teclado', 'bumbo'],
    chords: VERSE_CHORDS,
    lines: { guitarra: VERSE },
  },
  { id: 'virada', bars: 1, voices: always(['bumbo', 'tom']), lanes: ['tom', 'bumbo'], fill: 'whole' },
  {
    id: 'refrao',
    bars: 8,
    voices: always([...BAND, 'tema']),
    lanes: ['tema', 'cordas', 'baixo'],
    chords: CHORUS_CHORDS,
    lines: { tema: CHORUS },
    accents: [0, 4],
  },
  {
    id: 'breque',
    bars: 2,
    voices: bar => (bar === 0 ? BAND : ['bumbo']),
    mode: bar => (bar === 0 ? 'cut' : 'normal'),
    lanes: ['bumbo', 'caixa', 'baixo'],
    chords: ['Am', null],
    heartbeat: true,
    accents: [0],
  },
  {
    id: 'vinheta',
    bars: 8,
    voices: always([...DRUMS, 'tom', 'baixo', 'teclado', 'guitarra', 'metais']),
    lanes: ['guitarra', 'metais', 'tom'],
    chords: VINHETA_CHORDS,
    lines: { guitarra: VINHETA_CHORDS.map((chord, bar) => (bar % 2 ? EMPTY : CALL[chord])) },
    horns: true,
    fill: 'end',
  },
  {
    id: 'refrao-final',
    bars: 8,
    voices: always([...BAND, 'tema', 'guitarra']),
    lanes: ['tema', 'guitarra', 'cordas'],
    chords: CHORUS_CHORDS,
    lines: { tema: CHORUS },
    guitarUnderTheme: true,
    transpose: KEY_CHANGE,
    accents: [0, 4],
  },
  {
    id: 'final',
    bars: 4,
    voices: always([...BAND, 'tema', 'tom']),
    mode: bar => (bar === 3 ? 'cut' : 'normal'),
    lanes: ['tema', 'tom', 'bumbo'],
    chords: ['F', 'G', 'E7', 'Am'],
    lines: { tema: [THEME[0], THEME[1], THEME_ANSWER[1], FINAL_NOTE] },
    transpose: KEY_CHANGE,
    fill: 'end-1',
    isEnd: true,
    accents: [3],
  },
];
const SCENE_STARTS = [];
let TOTAL_BARS = 0;
for (const scene of SCENE_LIST) {
  SCENE_STARTS.push(TOTAL_BARS);
  TOTAL_BARS += scene.bars;
}
const sceneIndexOf = bar => SCENE_LIST.findLastIndex((_, i) => SCENE_STARTS[i] <= bar);

/** The chord of an absolute bar, with the transposition of its scene, or null. */
function chordAt(bar) {
  if (bar < 0 || bar >= TOTAL_BARS) return null;
  const i = sceneIndexOf(bar),
    symbol = SCENE_LIST[i].chords?.[bar - SCENE_STARTS[i]];
  return symbol ? { ...CHORDS[symbol], transpose: SCENE_LIST[i].transpose || 0 } : null;
}

// Every written note of every melodic voice, by absolute bar, transposed: { step, midi, length, lower? }.
const LINES = { tema: new Map(), guitarra: new Map() };
SCENE_LIST.forEach((scene, i) => {
  const up = scene.transpose || 0;
  for (const [voice, bars] of Object.entries(scene.lines || {}))
    bars.forEach((text, barInScene) => {
      const bar = SCENE_STARTS[i] + barInScene,
        symbol = scene.chords?.[barInScene];
      const notes = parseBar(text).map(note => ({ ...note, midi: note.midi + up, lower: thirdBelow(note.midi, symbol) + up }));
      if (notes.length) LINES[voice].set(bar, notes);
    });
  // the last chorus: the guitar doubles the theme in thirds, an octave down
  if (scene.guitarUnderTheme)
    for (let barInScene = 0; barInScene < scene.bars; barInScene++) {
      const bar = SCENE_STARTS[i] + barInScene;
      LINES.guitarra.set(
        bar,
        LINES.tema.get(bar).map(note => ({ ...note, midi: note.midi - OCTAVE, lower: note.lower - OCTAVE })),
      );
    }
});
export const BREGA_LINES = LINES;

// ---------- the parts each bar plays ----------
const hit = (step, velocity, tone) => (tone === undefined ? { step, velocity } : { step, velocity, tone });
const silentBar = () => Object.fromEntries(VOICE_ORDER.map(voice => [voice, []]));
const chordTone = (chord, length) => `${chord.symbol}:${chord.transpose}:${length}`;

// The xacumbum base: the bumbo on 1 and 3 with a pick-up on the last sixteenth; the caixa on 2 and 4;
// the chimbal on the eighths, the off-beat ones loud (docs/research/brega-forro.md, § 1).
export const BEAT = {
  bumbo: [hit(0, ACCENT), hit(8, PLAIN), hit(15, GHOST)],
  caixa: [hit(4, PLAIN), hit(12, ACCENT)],
  chimbal: SIXTEENTHS.filter(step => step % 2 === 0).map(step => hit(step, step % STEPS_PER_BEAT ? PLAIN : GHOST, 'fechado')),
};
const OFFBEATS = SIXTEENTHS.filter(step => step % STEPS_PER_BEAT === 2); // 3, 7, 11 and 15, counted from 1
const LAST_STEP = STEPS_PER_BAR - 1; // the bass pushes the next root here
const THIRD_BEAT = STEPS_PER_BAR / 2;
const KEY_LENGTH = 1.5; // sixteenths: the keyboard's stabs are short
// The heartbeat of the breque's second bar: the bumbo alone, lub-dub, twice.
export const HEARTBEAT = [hit(0, ACCENT), hit(3, SOFT), hit(8, PLAIN), hit(11, SOFT)];
// The virada: eighths on the high tom, then sixteenths down the middle and the low one, louder each beat.
const FILL_WHOLE = [
  ...[0, 2, 4, 6].map(step => [step, 'agudo']),
  ...[8, 9, 10, 11].map(step => [step, 'medio']),
  ...[12, 13, 14, 15].map(step => [step, 'grave']),
];
const FILL_HALF = [
  [8, 'agudo'],
  [9, 'agudo'],
  [10, 'medio'],
  [11, 'medio'],
  [12, 'grave'],
  [13, 'grave'],
  [14, 'grave'],
  [15, 'grave'],
];
const fillHits = fill => fill.map(([step, tone], i) => hit(step, SOFT + (ACCENT - SOFT) * (i / (fill.length - 1)), tone));

/** The bass with the bumbo: the root on 1, the fifth on 3, and on the last sixteenth the next root. */
function bassBar(bar, chord) {
  const root = midiOf(chord.bass) + chord.transpose,
    next = chordAt(bar + 1);
  const out = [hit(0, ACCENT, `${root}:6`), hit(8, PLAIN, `${fifthOf(root)}:6`)];
  if (next) out.push(hit(LAST_STEP, SOFT, `${midiOf(next.bass) + next.transpose}:1`));
  return out;
}
const melodic = (bar, voice, velocity) =>
  (LINES[voice].get(bar) || []).map(note =>
    hit(
      note.step,
      note.length >= STEPS_PER_BEAT ? ACCENT : velocity,
      voice === 'guitarra' ? `${note.midi},${note.lower}:${note.length}` : `${note.midi}:${note.length}`,
    ),
  );
/** The horns answer the guitar: two stabs on the chord, then the section falls off the note. */
const hornsBar = chord => [
  ...HORN_STABS.map(step => hit(step, PLAIN, `stab:${chord.symbol}`)),
  hit(HORN_FALL, ACCENT, chord.symbol === 'E7' ? 'queda-e' : 'queda-a'),
];

// Bar modes: normal, and cut (everyone on 1, then silence: the breque's first bar and the end).
export function barHits(scene, barInScene) {
  const hits = allHits(scene, barInScene),
    playing = new Set(scene.voices(barInScene));
  // a voice that has not entered yet is not on the wheel: each entry stands out on its own
  return Object.fromEntries(VOICE_ORDER.map(voice => [voice, playing.has(voice) ? hits[voice] : []]));
}
function allHits(scene, barInScene) {
  const bar = scene.start + barInScene,
    chord = chordAt(bar),
    hits = silentBar();
  if (scene.mode(barInScene) === 'cut') {
    const length = scene.isEnd ? STEPS_PER_BAR : STEPS_PER_BEAT;
    hits.bumbo = [hit(0, ACCENT)];
    hits.caixa = [hit(0, ACCENT)];
    hits.chimbal = [hit(0, PLAIN, 'aberto')];
    hits.baixo = [hit(0, ACCENT, `${midiOf(chord.bass) + chord.transpose}:${length}`)];
    hits.cordas = [hit(0, PLAIN, chordTone(chord, length))];
    hits.teclado = [hit(0, PLAIN, chordTone(chord, length))];
    hits.tema = melodic(bar, 'tema', PLAIN);
    return hits;
  }
  if (scene.heartbeat) {
    hits.bumbo = HEARTBEAT;
    return hits;
  }
  const fillBar = { whole: true, end: barInScene === scene.bars - 1, 'end-1': barInScene === scene.bars - 2 }[scene.fill],
    fill = fillBar ? (scene.fill === 'whole' ? FILL_WHOLE : FILL_HALF) : null;
  const fillFrom = fill ? fill[0][0] : STEPS_PER_BAR;
  hits.bumbo =
    fill === FILL_WHOLE
      ? [hit(0, ACCENT), hit(fill.find(([, tone]) => tone === 'grave')[0], PLAIN)]
      : BEAT.bumbo.filter(h => h.step < fillFrom || h.step === THIRD_BEAT);
  hits.caixa = BEAT.caixa.filter(h => h.step < fillFrom);
  hits.chimbal = BEAT.chimbal.filter(h => h.step < fillFrom);
  hits.tom = fill ? fillHits(fill) : [];
  if (chord) {
    hits.baixo = bassBar(bar, chord);
    hits.cordas = [hit(0, SOFT, chordTone(chord, STEPS_PER_BAR))];
    hits.teclado = OFFBEATS.map(step => hit(step, step === OFFBEATS[0] ? PLAIN : SOFT, chordTone(chord, KEY_LENGTH)));
    if (scene.horns && barInScene % 2 === 1) hits.metais = hornsBar(chord);
  }
  hits.tema = melodic(bar, 'tema', PLAIN);
  hits.guitarra = melodic(bar, 'guitarra', PLAIN);
  return hits;
}

// How the background behaves in each scene (brega-background.js): the halo's glow and the rings'
// strength. The engine reads `speed` for the visual clock and blends zoom, rot, hue and keep, which
// this painter does not use.
const LOOK = { zoom: 0, rot: 0, hue: 0, keep: 0, seg: 0, warp: 0, pal: 0, speed: 1 };
const SCENE_LOOKS = {
  introducao: { ...LOOK, glow: 0.45, rings: 0 },
  base: { ...LOOK, glow: 0.5, rings: 0.6 },
  baixo: { ...LOOK, glow: 0.55, rings: 0.8 },
  teclado: { ...LOOK, glow: 0.7, rings: 0.8 },
  guitarra: { ...LOOK, glow: 0.75, rings: 0.9 },
  virada: { ...LOOK, glow: 0.6, rings: 1 },
  refrao: { ...LOOK, glow: 1, rings: 1 },
  breque: { ...LOOK, glow: 0.35, rings: 0.4 },
  vinheta: { ...LOOK, glow: 0.8, rings: 0.9 },
  'refrao-final': { ...LOOK, glow: 1, rings: 1 },
  final: { ...LOOK, glow: 0.8, rings: 0.6 },
};
// Petals leave the wheel on each new chord of the pad: few in the verse, more in the choruses.
const PETALS_BY_SCENE = { teclado: 2, guitarra: 3, refrao: 5, vinheta: 2, 'refrao-final': 6, final: 4, breque: 3 };
const petalBars = bar => {
  const i = sceneIndexOf(bar),
    scene = SCENE_LIST[i];
  return scene.chords?.[bar - SCENE_STARTS[i]] && scene.voices(bar - SCENE_STARTS[i]).includes('cordas') ? PETALS_BY_SCENE[scene.id] || 0 : 0;
};
// The phrase accents that bloom: the first bar of each chorus phrase, the breque's hit and the end.
export const ACCENT_BARS = SCENE_LIST.flatMap((scene, i) => (scene.accents || []).map(bar => SCENE_STARTS[i] + bar));

// ---------- sound: the studio (src/studio.js) ----------
// Recorded takes (tools/prepare-takes.mjs, CREDITS.md). The drums are programmed, as brega's
// electronic kits are: they stay on the grid (human-feel.md, rule 12) and vary by take, layer and
// level. The players (bass, strings, keyboard, guitar, horns) drift with a correlated feel around
// the keyboard, the genre's lead instrument.
const TONE = /^(.+):(-?\d+(?:\.\d+)?)$/; // a pitched hit's tone: what it plays, then its length in sixteenths
const lengthOf = tone => Number(TONE.exec(tone)[2]) * STEP_SECONDS;
/** The notes of a chord's tone (`Am:2:16`), close voiced; the keyboard plays them an octave up. */
const chordNotes = (tone, octaves = 0) => {
  const [symbol, transpose] = tone.split(':');
  return CHORDS[symbol].pad.map(note => midiOf(note) + Number(transpose) + octaves * OCTAVE);
};
const ECHO = { delay: 3 * STEP_SECONDS, gain: 0.3 }; // a dotted-eighth echo, as on a brega guitar
const MEDIO = 1.12; // the middle tom: the high one tuned down and the low one tuned up, to meet
// the stabs' range (D4 to E5): the loud trompete takes below A5, the trombone's two top notes
const HIGHEST_TRUMPET = midiOf('A5');
const LOWEST_TROMBONE = midiOf('B3');
const STAB_LAYER = 0.8;
const STUDIO = {
  room: 'sala-pequena',
  roomLevel: 1,
  lead: 'teclado',
  voices: {
    bumbo: { seed: 51, role: 'grid', gain: 0.95, send: 0.04, bright: [5000, 16000], strokes: () => ({ hit: takes('bumbo') }) },
    caixa: {
      seed: 52,
      role: 'grid',
      gain: 0.75,
      pan: 0.08,
      send: 0.22,
      strokes: () => ({ hit: takes('caixa').filter(take => take.layer >= 0.4) }),
    },
    chimbal: {
      seed: 53,
      role: 'grid',
      gain: 0.75,
      pan: 0.3,
      send: 0.1,
      bright: [5000, 18000],
      strokes: () => ({ fechado: takes('chimbal-fechado'), aberto: takes('chimbal-aberto') }),
    },
    tom: {
      seed: 54,
      role: 'grid',
      gain: 0.85,
      pan: -0.15,
      send: 0.2,
      strokes: () => ({
        agudo: takes('brega-tom-agudo'),
        medio: takes(['brega-tom-agudo', { rate: 1 / MEDIO }], ['brega-tom-grave', { rate: MEDIO }]),
        grave: takes('brega-tom-grave'),
      }),
    },
    baixo: {
      seed: 55,
      role: 'follower',
      gain: 0.85,
      send: 0.05,
      bright: [700, 4000],
      strokes: () => ({ nota: takes('baixo').filter(take => !take.file.endsWith('-11') && !take.file.endsWith('-12')) }),
      shape: tone => ({ stroke: 'nota', notes: [Number(TONE.exec(tone)[1])], length: lengthOf(tone) }),
    },
    cordas: {
      seed: 56,
      role: 'follower',
      gain: 0.32,
      pan: -0.35,
      send: 0.4,
      attack: 0.18, // the bows swell in
      release: 0.5,
      zone: 4,
      maxZone: 5,
      bright: [2500, 9000],
      strokes: () => ({ acorde: takes('brega-cordas') }),
      shape: tone => ({ stroke: 'acorde', notes: chordNotes(tone), length: lengthOf(tone) }),
    },
    teclado: {
      seed: 57,
      role: 'lead',
      gain: 0.3,
      pan: 0.28,
      send: 0.25,
      strokes: () => ({ acorde: takes('brega-teclado') }),
      shape: tone => ({ stroke: 'acorde', notes: chordNotes(tone, 1), length: lengthOf(tone), strum: 0.006 }),
    },
    tema: {
      seed: 58,
      role: 'follower',
      gain: 0.55,
      send: 0.3,
      release: 0.25,
      strokes: () => ({ nota: takes('brega-teclado') }),
      shape: tone => ({ stroke: 'nota', notes: [Number(TONE.exec(tone)[1])], length: lengthOf(tone) }),
    },
    guitarra: {
      seed: 59,
      role: 'follower',
      gain: 0.6,
      pan: -0.2,
      send: 0.3,
      release: 0.15,
      zone: 5,
      maxZone: 5,
      strokes: () => ({ nota: takes('brega-guitarra') }),
      shape: tone => {
        const [notes] = tone.split(':');
        return { stroke: 'nota', notes: notes.split(',').map(Number), length: lengthOf(tone), strum: 0.012, echo: ECHO };
      },
    },
    metais: {
      seed: 60,
      role: 'follower',
      gain: 0.5,
      pan: 0.2,
      send: 0.28,
      strokes: () => ({
        stab: [
          ...takes('trompete-stac').filter(take => take.layer > STAB_LAYER && take.root < HIGHEST_TRUMPET),
          ...takes('trombone-stac').filter(take => take.root > LOWEST_TROMBONE),
        ],
        'queda-a': takes('brega-queda').slice(0, 1),
        'queda-e': takes('brega-queda').slice(1),
      }),
      shape: tone =>
        tone.startsWith('stab:')
          ? { stroke: 'stab', notes: HORN_CHORDS[tone.slice('stab:'.length)].map(midiOf), length: STEP_SECONDS * 1.5 }
          : { stroke: tone },
    },
  },
};
// One recorded option per instrument, so the desktop gives each its volume.
const SOUND_CHOICES = recordedChoices(STUDIO, [
  ['bumbo', 'bumbo', ['bumbo'], 'bumbo eletrônico'],
  ['caixa', 'caixa', ['caixa'], 'caixa gravada'],
  ['chimbal', 'chimbal', ['chimbal'], 'chimbal gravado'],
  ['tom', 'tom', ['tom'], 'tons gravados'],
  ['baixo', 'baixo', ['baixo'], 'baixo elétrico'],
  ['cordas', 'naipe de cordas', ['cordas'], 'violas'],
  ['teclado', 'teclado', ['teclado', 'tema'], 'piano FM'],
  ['guitarra', 'guitarra', ['guitarra'], 'guitarra limpa'],
  ['metais', 'naipe de metais', ['metais'], 'trompetes e trombones'],
]);

// ---------- copy ----------
const countFromOne = steps => steps.map(step => step + 1).join(' · ');
const DRUMMING = new Set(SCENE_LIST.flatMap(scene => [...Array(scene.bars).keys()].flatMap(bar => scene.voices(bar))));
const READ = {
  tempo: 'andamento',
  tempoValue: `${BPM} BPM, do início ao fim`,
  meter: 'compasso',
  meterValue: `${BEATS_PER_BAR}/4, ${STEPS_PER_BAR} semicolcheias`,
  bar: '1 compasso',
  barValue: `${BAR_SECONDS.toFixed(2).replace('.', ',')} s`,
  key: 'tom',
  keyValue: 'lá menor',
  theme: 'tema',
  themeValue: `${THEME.length} compassos`,
  strong: 'forte',
  soft: 'fraco',
  withBumbo: 'com o bumbo',
  bassValue: 'fundamental no 1, quinta no 3, antecipação no 16',
  progression: 'harmonia',
  offbeat: 'acordes no contratempo',
  pad: 'cordas',
  padValue: 'um acorde por compasso',
  thirds: 'terças',
  thirdsValue: 'a segunda voz uma terça abaixo',
  high: 'agudo',
  middle: 'médio',
  low: 'grave',
  chorus: 'refrão',
  chorusValue: `${CHORUS.length} compassos: tema e resposta`,
  pause: 'compasso de pausa',
  heartbeat: 'bumbo sozinho',
  question: 'pergunta',
  answer: 'resposta',
  keyChange: 'modulação',
  keyChangeValue: 'um tom acima: si menor',
  scenes: 'cenas',
  voices: 'vozes',
  bars: 'compassos',
  howItEnds: 'como termina',
  endValue: 'virada e acorde final',
};
const COPY = {
  name: 'brega',
  feminineInstruments: ['caixa', 'guitarra'], // "som da caixa", "som do bumbo"
  scenes: {
    introducao: { chip: 'Introdução', eyebrow: 'teclado com o tema', title: 'Brega' },
    base: { chip: 'Base', eyebrow: 'chimbal no contratempo', title: 'Base' },
    baixo: { chip: 'Baixo', eyebrow: 'baixo com o bumbo', title: 'Baixo' },
    teclado: { chip: 'Teclado', eyebrow: 'cordas e acordes no contratempo', title: 'Teclado' },
    guitarra: { chip: 'Guitarra', eyebrow: 'melodia em terças', title: 'Guitarra' },
    virada: { chip: 'Virada', eyebrow: 'virada de tons', title: 'Virada' },
    refrao: { chip: 'Refrão', eyebrow: 'teclado com o tema', title: 'Refrão' },
    breque: { chip: 'Breque', eyebrow: 'pausa de um compasso', title: 'Breque' },
    vinheta: { chip: 'Vinheta', eyebrow: 'metais respondem à guitarra', title: 'Vinheta' },
    'refrao-final': { chip: 'Refrão final', eyebrow: 'um tom acima', title: 'Refrão final' },
    final: { chip: 'Final', eyebrow: 'tema e acorde final', title: 'Fim' },
  },
  patterns: {},
  voices: {
    bumbo: 'bumbo',
    caixa: 'caixa',
    chimbal: 'chimbal',
    tom: 'tom',
    baixo: 'baixo',
    cordas: 'cordas',
    teclado: 'teclado',
    guitarra: 'guitarra',
    tema: 'tema',
    metais: 'metais',
  },
  instruments: {},
  hands: {},
  centre: { cut: 'BREQUE', end: 'FIM' },
  read: READ,
};

// ---------- readout layouts ----------
const T = READ;
const beatSeparator = step => (step % STEPS_PER_BEAT === STEPS_PER_BEAT - 1 && step < STEPS_PER_BAR - 1 ? '|' : '');
/** One bar of hits as marks: ● for a loud hit, ○ for a soft one, · for a rest. */
const marks = hits =>
  SIXTEENTHS.map(step => {
    const h = hits.find(candidate => candidate.step === step);
    return (h ? (h.velocity > SOFT ? '●' : '○') : '·') + beatSeparator(step);
  }).join('');
const seqRow = (voice, text, hits) =>
  `${label(text, VOICES[voice].color, voice)}<span class="seq" data-inst="${voice}" style="color:${VOICES[voice].color}">${marks(hits)}</span><span class="n">${hits.length}</span>`;
const notation = (...rows) => ['<div class="notation">', ...rows, '</div>'].join('');
const SHORT = 1;

/** The melody roll of a scene: its melodic voices, bar by bar (the guitar's two lines alike). */
function sceneRoll(scene, voices, band) {
  const lines = voices.flatMap(voice => {
    const notesOf = pick =>
      [...Array(scene.bars).keys()].flatMap(bar =>
        (LINES[voice].get(scene.start + bar) || []).map(note => ({ slot: bar * STEPS_PER_BAR + note.step, midi: pick(note), length: note.length || SHORT })),
      );
    const upper = { id: voice, color: VOICES[voice].color, notes: notesOf(note => note.midi) };
    return voice === 'guitarra' ? [upper, { id: voice, color: VOICES[voice].color, notes: notesOf(note => note.lower) }] : [upper];
  });
  const horns =
    voices.includes('metais') && scene.horns
      ? [...Array(scene.bars).keys()]
          .filter(bar => bar % 2 === 1)
          .map(bar => ({
            slot: bar * STEPS_PER_BAR + HORN_STABS[0],
            midi: midiOf(HORN_CHORDS[scene.chords[bar]].at(-1)),
            length: HORN_FALL - HORN_STABS[0] + STEPS_PER_BEAT,
          }))
      : [];
  if (horns.length) lines.push({ id: 'metais', color: VOICES.metais.color, notes: horns });
  const score = renderRoll({ bars: scene.bars, stepsPerBar: STEPS_PER_BAR, stepsPerBeat: STEPS_PER_BEAT, lines, band });
  return { markup: `<div class="score roll">${score.markup}<i class="scur"></i></div>`, score };
}
const progression = chords => chords.map(symbol => CHORDS[symbol].symbol).join(' · ');
const sceneOf = id => ({ ...SCENE_LIST.find(scene => scene.id === id), start: SCENE_STARTS[SCENE_LIST.findIndex(scene => scene.id === id)] });

const LAYOUTS = {
  introducao: () =>
    row(label(T.tempo), T.tempoValue) +
    row(label(T.meter), T.meterValue) +
    row(label(T.bar), T.barValue) +
    row(label(T.key), T.keyValue) +
    row(label(T.theme, COLOR.tema), T.themeValue, 'teclado'),
  base: () =>
    notation(
      seqRow('bumbo', COPY.voices.bumbo, BEAT.bumbo),
      seqRow('caixa', COPY.voices.caixa, BEAT.caixa),
      seqRow('chimbal', COPY.voices.chimbal, BEAT.chimbal),
    ) + row(label(`● ${T.strong} · ○ ${T.soft}`), countFromOne(BEAT.chimbal.filter(h => h.velocity > SOFT).map(h => h.step)), 'chimbal'),
  baixo: () => {
    const bass = bassBar(sceneOf('baixo').start, chordAt(sceneOf('baixo').start));
    return notation(seqRow('bumbo', COPY.voices.bumbo, BEAT.bumbo), seqRow('baixo', COPY.voices.baixo, bass)) + row(label(T.withBumbo), T.bassValue, 'baixo');
  },
  teclado: () =>
    row(label(T.progression), progression(BASE_CHORDS)) +
    notation(
      seqRow(
        'teclado',
        COPY.voices.teclado,
        OFFBEATS.map(step => hit(step, PLAIN)),
      ),
    ) +
    row(label(T.offbeat, COLOR.teclado), countFromOne(OFFBEATS), 'teclado') +
    row(label(T.pad, COLOR.cordas), T.padValue, 'cordas'),
  virada: () =>
    notation(
      ...['agudo', 'medio', 'grave'].map((tone, i) =>
        seqRow(
          'tom',
          [T.high, T.middle, T.low][i],
          FILL_WHOLE.filter(([, t]) => t === tone).map(([step]) => hit(step, PLAIN)),
        ),
      ),
    ),
  breque: () =>
    stats('two', stat(1, T.pause, COLOR.caixa), stat(HEARTBEAT.length, T.heartbeat, COLOR.bumbo)) + notation(seqRow('bumbo', COPY.voices.bumbo, HEARTBEAT)),
};
const ROLLS = {
  guitarra: scene => ({ ...sceneRoll(scene, ['guitarra']), rows: row(label(T.thirds, COLOR.guitarra), T.thirdsValue, 'guitarra') }),
  refrao: scene => ({ ...sceneRoll(scene, ['tema']), rows: row(label(T.chorus, COLOR.tema), T.chorusValue, 'teclado') }),
  vinheta: scene => ({
    ...sceneRoll(scene, ['guitarra', 'metais']),
    rows: row(label(T.question, COLOR.guitarra), COPY.voices.guitarra, 'guitarra') + row(label(T.answer, COLOR.metais), COPY.voices.metais, 'metais'),
  }),
  'refrao-final': scene => ({
    ...sceneRoll(scene, ['tema', 'guitarra']),
    rows: row(label(T.keyChange), T.keyChangeValue),
  }),
};
const FINAL = show =>
  stats('', stat(SCENE_LIST.length, T.scenes, COLOR.tema), stat(DRUMMING.size, T.voices, COLOR.bumbo), stat(show.totalBars, T.bars, fgAlpha(1))) +
  row(label(T.howItEnds), T.endValue);
const FOCUS = { base: '', baixo: 'baixo', teclado: 'teclado', guitarra: 'guitarra', virada: 'tom', breque: 'bumbo' };

/**
 * The readout for a scene: its markup, the roll whose cursor follows the bar, and the instrument the
 * whole readout is about (`focus`, '' for none), so a muted one shows disabled.
 */
function readout(scene, show) {
  const focus = FOCUS[scene.id] || '';
  if (ROLLS[scene.id]) {
    const { markup, score, rows } = ROLLS[scene.id](scene);
    return { markup: rows + markup, score, focus };
  }
  const layout = scene.id === 'final' ? FINAL : LAYOUTS[scene.id] || (() => '');
  return { markup: layout(show), score: null, focus };
}

export const BREGA = {
  id: 'brega',
  ...straightMeter(BPM, BEATS_PER_BAR, STEPS_PER_BEAT),
  scenes: SCENE_LIST,
  sceneDefaults: {},
  barHits,
  voices: VOICES,
  shapeVoices: ['baixo', 'tema'], // the voices whose hits draw a shape on the wheel, in drawing order
  looks: SCENE_LOOKS,
  background: {
    create: options => createBregaPainter({ ...options, beatsPerBar: BEATS_PER_BAR, barSeconds: BAR_SECONDS, petalBars, accentBars: ACCENT_BARS }),
  },
  readout,
  waves: null,
  sounds: studioSounds(STUDIO, SOUND_CHOICES, 'refrao-final'), // every instrument but the horns and the tom plays its part there
  copy: COPY,
};

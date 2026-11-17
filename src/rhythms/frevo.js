// Frevo: everything the engine plays and shows that belongs to this rhythm. An instrumental frevo in
// the lyrical, minor-key vein of a frevo de bloco, played by a frevo orchestra: surdo, caixa and
// pandeiro, the tuba on the bass, the palhetas (saxofones and clarinete) singing the tune and the
// metais (trompetes and trombones) answering. 2/4 at one tempo, an 8-step wheel, one bar per turn.
// Positions are sixteenths of the bar (0–7). The melodies are original to this project; choices and
// sources are in docs/frevo.md.
import { label, row, stat, stats } from '../readout-markup.js';
import { rollReadout } from '../roll.js';
import { fgAlpha } from '../theme.js';
import { createFrevoPainter, FREVO_PALETTE } from './frevo-background.js';
import { sceneStarts, straightMeter } from './meter.js';
import { recordedChoices, studioSounds, takes } from './studio-kit.js';

const BPM = 125; // the reference's tempo, inside the frevo-canção range (docs/frevo.md, Music)
const BEATS_PER_BAR = 2;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const BAR_SECONDS = (60 / BPM) * BEATS_PER_BAR;
const STEP_SECONDS = BAR_SECONDS / STEPS_PER_BAR;
const STEPS = [...Array(STEPS_PER_BAR).keys()];
const LAST_EIGHTH = STEPS_PER_BAR - 2; // the step an anticipation and the tuba's approach note land on
const EIGHTH = STEPS_PER_BEAT / 2;

// Velocities.
const ACCENT = 1;
const PLAIN = 0.82;
const SOFT = 0.55;
const GHOST = 0.45;

// Material colours inside the frevo palette: brass in golds from bright to deep, the reeds in
// greens, the rest in the flag colours, the caixa's chrome near white. Each one keeps at least 3:1
// on the wheel's face.
const COLOR = {
  surdo: FREVO_PALETTE.red,
  tarol: '#e6ecff', // chrome
  pandeiro: '#5b93ff', // the palette's blue, lifted to read on the dark wheel
  tuba: '#d98a2b', // deep brass
  trombone: '#ffad33', // brass
  trompete: FREVO_PALETTE.yellow, // bright brass
  sax: FREVO_PALETTE.green,
  clarinete: '#9fe8c0', // the reeds' green, lighter: the clarinete sings above the saxofones
};

// ring/size: where and how big the voice sits on the wheel. The roles the views read: boom (shakes
// the background), spark (a spark at the hit's angle). No voice swings: frevo pushes through
// anticipations, not swing, and no measured swing exists (docs/frevo.md).
const VOICES = {
  surdo: { instrument: 'surdo', ring: 99, size: 5.6, swing: null, color: COLOR.surdo, boom: 1 },
  tarol: { instrument: 'tarol', ring: 91, size: 3, swing: null, color: COLOR.tarol },
  pandeiro: { instrument: 'pandeiro', ring: 83, size: 3, swing: null, color: COLOR.pandeiro },
  tuba: { instrument: 'tuba', ring: 75, size: 4.6, swing: null, color: COLOR.tuba, boom: 0.5 },
  trombone: { instrument: 'trombone', ring: 67, size: 3.6, swing: null, color: COLOR.trombone },
  trompete: { instrument: 'trompete', ring: 59, size: 3.4, swing: null, color: COLOR.trompete, spark: true },
  sax: { instrument: 'sax', ring: 51, size: 3, swing: null, color: COLOR.sax },
  clarinete: { instrument: 'clarinete', ring: 43, size: 2.6, swing: null, color: COLOR.clarinete },
};
// The order also seeds the per-hit variation of the sound: keep it stable.
const VOICE_ORDER = Object.keys(VOICES);
const RHYTHM_SECTION = ['surdo', 'tarol', 'pandeiro'];
const BASE = [...RHYTHM_SECTION, 'tuba'];
const PALHETAS = ['sax', 'clarinete'];
const METAIS = ['trombone', 'trompete'];
const MELODIC = [...METAIS, ...PALHETAS];

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
const NAMES = ['c', 'cs', 'd', 'eb', 'e', 'f', 'fs', 'g', 'gs', 'a', 'bb', 'b'];
const noteName = midi => `${NAMES[midi % OCTAVE_SEMITONES]}${Math.floor(midi / OCTAVE_SEMITONES) - MIDI_OCTAVE_OFFSET}`;
const pitchClass = midi => midi % OCTAVE_SEMITONES;
const classesOf = text => text.split(' ').map(name => PITCH_CLASS[name[0]] + ACCIDENTAL[name.slice(1)]);

/**
 * A line as written, bar by bar: eight tokens a bar, one per sixteenth. '.' rests; a note name
 * starts a note; '-' holds the note before it (also over the bar line); '!' after a name accents
 * the note and '^' makes it staccato. Returns the notes, each with its bar, step and length in steps.
 */
function parseLine(firstBar, bars) {
  const notes = [];
  let held = null;
  bars.forEach((text, i) => {
    const tokens = text.trim().split(/\s+/);
    if (tokens.length !== STEPS_PER_BAR) throw new Error(`frevo: a bar of ${tokens.length} tokens: ${text}`);
    tokens.forEach((token, step) => {
      if (token === '-') {
        if (!held || held.staccato) throw new Error(`frevo: nothing to hold in ${text}`);
        held.steps += 1;
        return;
      }
      held = null;
      if (token === '.') return;
      const note = token.replace(/[!^]/g, '');
      held = { bar: firstBar + i, step, note, midi: midiOf(note), steps: 1, accent: token.includes('!'), staccato: token.includes('^') };
      notes.push(held);
    });
  });
  return notes;
}

// ---------- harmony ----------
// G minor, and its relative major (B♭) in the second part. Each chord: what the tuba plays (root,
// third, fifth), its tones and the scale a passing note is harmonised in, and the two notes the
// trombones mark under the tune (pad).
const chord = (symbol, [root, third, fifth], tones, scale, pad) => ({
  symbol,
  root,
  third,
  fifth,
  tones: classesOf(tones),
  scale: classesOf(scale),
  pad: pad.map(midiOf),
});
const CHORDS = {
  Gm: chord('Gm', ['g2', 'bb2', 'd2'], 'g bb d', 'g a bb c d eb f', ['bb3', 'd4']),
  D7: chord('D7', ['d2', 'fs2', 'a2'], 'd fs a c', 'd eb fs g a bb c', ['c4', 'fs4']),
  G7: chord('G7', ['g2', 'b2', 'd3'], 'g b d f', 'g ab b c d eb f', ['b3', 'f4']),
  Cm: chord('Cm', ['c2', 'eb2', 'g2'], 'c eb g', 'c d eb f g a bb', ['c4', 'eb4']),
  A7: chord('A7', ['a2', 'cs3', 'e3'], 'a cs e g', 'a bb cs d e f g', ['cs4', 'g4']),
  Bb: chord('B♭', ['bb1', 'd2', 'f2'], 'bb d f', 'bb c d eb f g a', ['bb3', 'd4']),
  Bb7: chord('B♭7', ['bb1', 'd2', 'ab2'], 'bb d f ab', 'bb c d eb f g ab', ['bb3', 'd4']),
  F7: chord('F7', ['f2', 'a2', 'c3'], 'f a c eb', 'f g a bb c d eb', ['c4', 'eb4']),
  Eb: chord('E♭', ['eb2', 'g2', 'bb2'], 'eb g bb', 'eb f g a bb c d', ['g3', 'bb3']),
};
const MINOR_THIRD = 3;
const SIXTH = 9; // the widest gap between a tune note and the part under it
const SCALE_THIRD = 2; // scale steps
/**
 * The note a second player sings under `midi`: under a chord tone, the next chord tone at least a
 * minor third below; under a passing note, the scale's third below.
 */
function partBelow(midi, harmony) {
  if (harmony.tones.includes(pitchClass(midi))) {
    for (let below = midi - MINOR_THIRD; below >= midi - SIXTH; below--) if (harmony.tones.includes(pitchClass(below))) return below;
  }
  const degree = harmony.scale.indexOf(pitchClass(midi));
  if (degree < 0) return midi - MINOR_THIRD;
  const under = harmony.scale[(degree - SCALE_THIRD + harmony.scale.length) % harmony.scale.length];
  return midi - ((pitchClass(midi) - under + OCTAVE_SEMITONES) % OCTAVE_SEMITONES);
}

// ---------- the tune ----------
// Part A, 16 bars in G minor: two-bar gestures, a sung note and then a long one (the metais answer
// under it); bars 3 and 4 repeat 1 and 2 a step lower; the note of bar 8 arrives on the last
// eighth of bar 7 (the bambeando); bars 9 to 12 climb to the top over G7 and Cm (the Alto da Sé,
// on the IV degree); a cadence through A7 and D7 closes it.
const REST = '. . . . . . . .';
const PICKUP_A = '. . . . d4 - g4 a4';
const PART_A = [
  'bb4 - - - a4 - g4 -',
  'd5 - - - - - c5 bb4',
  'a4 - - - g4 - fs4 -',
  'a4 - - - - . fs4 a4',
  'c5 - - - bb4 - a4 -',
  'eb5 - - - - - d5 c5',
  'bb4 - - a4 - - g4 -',
  '- - - - . g4 b4 d5',
  'f5 - - - eb5 - d5 -',
  'd5 - b4 - - - c5 d5',
  'eb5 - - - d5 - c5 -',
  'g4 - - - - . c5 eb5',
  'd5 - - c5 - - bb4 -',
  'a4 - cs5 e5 d5 - c5 a4',
  'g4 - - - - - - -',
];
const A_BARS = PART_A.length + 1;
const A_CHORDS = ['Gm', 'Gm', 'D7', 'D7', 'D7', 'D7', 'Gm', 'Gm', 'G7', 'G7', 'Cm', 'Cm', 'Gm', 'A7|D7', 'Gm'];
const ALTO_DA_SE = { from: 8, to: 12 }; // bars 9 to 12 of each part
const A_END = '- - - - . . . .';
const PICKUP_B = '. . . . f4 - bb4 c5'; // into the second part
const PICKUP_PEAK = '. . . . bb4 - d5 f5'; // into its Alto da Sé, as bar 8 of the part has it
// Part B, 16 bars in B♭ major: the same breath, in the 3 + 3 + 2 of the caixa; the top note (G) on
// the IV chord (E♭) in bars 9 and 10.
const PART_B = [
  'd5 - - f5 - - d5 -',
  'bb4 - - - - . bb4 c5',
  'd5 - - eb5 - - c5 -',
  'a4 - - - - . a4 bb4',
  'c5 - - eb5 - - c5 -',
  'a4 - - c5 - - f5 -',
  'd5 - - - - - - -',
  '- - - . bb4 - d5 f5',
  'g5 - - - - - f5 eb5',
  'f5 - - eb5 - - bb4 -',
  'd5 - - - - . bb4 d5',
  'f5 - - d5 - - b4 -',
  'c5 - - eb5 - - g5 -',
  'f5 - - eb5 - c5 a4 -',
  'bb4 - - - - - - -',
  A_END,
];
const B_CHORDS = ['Bb', 'Bb', 'F7', 'F7', 'F7', 'F7', 'Bb', 'Bb7', 'Eb', 'Eb', 'Bb', 'G7', 'Cm', 'F7', 'Bb', 'Bb'];
// The metais answer under the tune's long notes, staccato and syncopated, each answer ending on an
// accented held note. Their scene plays the answers of the first eight bars alone, before the
// tune joins them in Lá e cá.
const ANSWERS_A = [
  REST,
  '. . bb4^ d5^ . g5! - .',
  REST,
  '. . a4^ c5^ . fs5! - .',
  REST,
  '. . c5^ . fs5^ a5! - .',
  REST,
  '. d5^ g5^ . bb5! - . .',
  REST,
  '. . . d5^ f5^ g5! - .',
  REST,
  '. . eb5^ g5^ . c6! - .',
  REST,
  'e5^! . . . fs5^! . . .',
  '. . d5^ g5^ . bb5! - .',
  REST,
];
const ANSWERS_B = [
  REST,
  '. . d5^ f5^ . bb5! - .',
  REST,
  '. . c5^ eb5^ . a5! - .',
  REST,
  REST,
  '. . bb4^ d5^ f5^ bb5! - .',
  '. . . . bb4 - d5 f5',
  'g5! - - - - - f5 eb5', // the Alto da Sé: the trompetes join the tune
  'f5 - - eb5 - - bb4 -',
  '. . f5^ . bb5! - . .',
  REST,
  REST,
  'a5^! . . a5^! . . . .',
  '. . d5^ f5^ . bb5! - .',
  REST,
];

// ---------- the show script ----------
// Each scene: id, bars, mode per bar, voices per bar, lanes (rows under the wheel), named (the
// centre names its tópica), pad (the trombones mark the harmony where the trompetes rest), walk
// (the tuba walks every bar), gain (a level per voice, for this scene), the chords per bar ('A7|D7': a chord per beat) and each melodic voice's line. A line's `pickup`
// sounds in the last bar of the scene before, so that scene lets the voice play there.
const lastBarAlso = (bars, voices, more) => bar => (bar === bars - 1 ? [...voices, ...more] : voices);
const HALF = A_BARS / 2; // a feature lasts half a part
const tune = (bars, pickup = PICKUP_A) => ({ pickup, bars });
const THEME = tune([...PART_A, A_END]);
const SECOND_HALF = tune([...PART_A.slice(HALF), A_END], '. . . . . g4 b4 d5'); // from the Alto da Sé
const FEATURED = 1.4; // the level of the part a scene is about, against its usual level
const BACK = 0.65; // the level of the parts that step back for it
const LOUDER = 1.15; // everyone, for a repeat that lifts
// The orchestra plays from the first bars. Each scene is about one trait of the frevo, and shows
// it the way an orchestra does: a section rests or plays softer, the featured part plays louder,
// then everyone returns. Part A is heard three times and part B once and a half:
// A (Tema) · A in two halves, thinned (Surdo, Caixa) · A (Lá e cá) · a bridge (Tuba) · B (Segunda
// parte) · the end of B again (Síncope) · the stop (Fotografia) · A (Final).
const SCENE_LIST = [
  {
    id: 'introducao',
    bars: HALF / 2,
    mode: bar => ['roll', 'roll', 'normal', 'cut'][bar],
    lanes: ['tarol', 'trompete', 'surdo'],
    chords: ['Gm', 'Gm', 'Gm', 'Gm'],
    lines: { trompete: [REST, REST, ANSWERS_A[1], 'bb5! - - . . . . .'] },
  },
  {
    id: 'tema',
    bars: A_BARS,
    lanes: ['sax', 'trompete', 'tuba'],
    focus: 'sax',
    pad: true,
    chords: [...A_CHORDS, 'Gm'],
    lines: { sax: THEME, clarinete: THEME, trompete: ANSWERS_A },
  },
  {
    // the palhetas rest: the march is heard, the surdo in front, the metais still answering
    id: 'surdo',
    bars: HALF,
    voices: lastBarAlso(HALF, [...BASE, ...METAIS], PALHETAS),
    lanes: ['surdo', 'tuba', 'trompete'],
    focus: 'surdo',
    pad: true,
    gain: { surdo: FEATURED, tarol: BACK, pandeiro: BACK },
    chords: A_CHORDS.slice(0, HALF),
    lines: { trompete: ANSWERS_A.slice(0, HALF) },
  },
  {
    // the palhetas come back softly with the second half of the tune, under the caixa
    id: 'caixa',
    bars: HALF,
    lanes: ['tarol', 'surdo', 'sax'],
    focus: 'tarol',
    pad: true,
    gain: { tarol: FEATURED, sax: BACK, clarinete: BACK, trompete: BACK },
    chords: [...A_CHORDS.slice(HALF), 'Gm'],
    lines: { sax: SECOND_HALF, clarinete: SECOND_HALF, trompete: ANSWERS_A.slice(HALF) },
  },
  {
    id: 'la-e-ca',
    bars: A_BARS,
    lanes: ['sax', 'trompete', 'trombone'],
    named: true,
    pad: true,
    chords: [...A_CHORDS, 'Gm'],
    lines: { sax: THEME, clarinete: THEME, trompete: ANSWERS_A },
  },
  {
    // a bridge to the second part: the palhetas rest and the tuba walks every bar, in front
    id: 'tuba',
    bars: HALF,
    voices: lastBarAlso(HALF, [...BASE, ...METAIS], PALHETAS),
    lanes: ['tuba', 'surdo', 'trombone'],
    focus: 'tuba',
    pad: true,
    walk: true,
    gain: { tuba: FEATURED, tarol: BACK, pandeiro: BACK },
    chords: ['Gm', 'Gm', 'Cm', 'Cm', 'D7', 'D7', 'Gm', 'F7'],
    lines: { trompete: [REST, ANSWERS_A[1], REST, ANSWERS_A[11], REST, ANSWERS_A[3], REST, REST] },
  },
  {
    id: 'segunda',
    bars: PART_B.length,
    lanes: ['sax', 'trompete', 'tuba'],
    pad: true,
    chords: B_CHORDS,
    lines: { sax: tune(PART_B, PICKUP_B), clarinete: tune(PART_B, PICKUP_B), trompete: ANSWERS_B },
  },
  {
    // the second half of part B again, everyone louder: its 3 + 3 + 2 against the surdo's march
    id: 'sincope',
    bars: HALF,
    lanes: ['sax', 'trompete', 'surdo'],
    pad: true,
    gain: { sax: LOUDER, clarinete: LOUDER, trompete: LOUDER, trombone: LOUDER, surdo: LOUDER },
    chords: B_CHORDS.slice(HALF),
    lines: {
      sax: tune(PART_B.slice(HALF), PICKUP_PEAK),
      clarinete: tune(PART_B.slice(HALF), PICKUP_PEAK),
      trompete: tune(ANSWERS_B.slice(HALF), ANSWERS_B[HALF - 1]),
    },
  },
  {
    id: 'fotografia',
    bars: HALF / 2,
    mode: bar => ['cut', 'cut', 'normal', 'roll'][bar],
    lanes: ['trompete', 'tarol', 'surdo'],
    named: true,
    chords: ['Eb', 'D7', 'D7', 'D7'],
    lines: { trompete: ['bb5! . . . . . . .', 'a5! . . . . . . .', 'fs5^! . . a5^! . . c6! -', REST] },
  },
  {
    id: 'final',
    bars: A_BARS,
    mode: bar => (bar === A_BARS - 1 ? 'cut' : 'normal'),
    lanes: ['sax', 'trompete', 'tarol', 'surdo'],
    isEnd: true,
    pad: true,
    chords: [...A_CHORDS, 'Gm'],
    lines: {
      sax: tune([...PART_A.slice(0, -1), 'g4 - - - - - - .', 'g4! - - - - - - -']),
      clarinete: tune([...PART_A.slice(0, -1), 'g4 - - - - - - .', 'd5! - - - - - - -']),
      // the answers again; the trompetes sing the Alto da Sé with the palhetas and close on the tonic
      trompete: [
        ...ANSWERS_A.slice(0, ALTO_DA_SE.from),
        'f5! - - - eb5 - d5 -',
        ...ANSWERS_A.slice(ALTO_DA_SE.from + 1, -2),
        '. . d5^ g5^ . bb5! - .',
        'g5! - - - - - - -',
      ],
    },
  },
];
// a named scene's centre shows its tópica: the scene's own name
for (const scene of SCENE_LIST) if (scene.named) scene.pattern = scene.id;
const { starts: SCENE_STARTS, total: TOTAL_BARS } = sceneStarts(SCENE_LIST);
const sceneOfBar = bar => SCENE_LIST.findLastIndex((_, i) => SCENE_STARTS[i] <= bar);

/** The chord at a step of an absolute bar. */
function chordAt(bar, step) {
  const scene = SCENE_LIST[sceneOfBar(bar)],
    symbols = scene?.chords?.[bar - SCENE_STARTS[sceneOfBar(bar)]];
  if (!symbols) return null;
  const halves = symbols.split('|');
  return CHORDS[halves[Math.min(halves.length - 1, Math.floor(step / STEPS_PER_BEAT))]];
}

// ---------- sound: the recordings ----------
// Samples, each at the pitch its name says (sounds/frevo-*.wav, CREDITS.md). A note plays a sample
// recorded near it, retuned by its playback rate (never more than two semitones). `curta`: a
// staccato note as it was played; `longa`: a held note, cut where the written note ends.
const SAMPLE_NOTES = {
  trompete: ['f4', 'g4', 'bb4', 'd5', 'f5', 'a5', 'c6'],
  'trompete-longo': ['bb4', 'd5', 'f5', 'a5', 'c6'],
  trombone: ['f3', 'bb3', 'd4', 'f4'],
  'trombone-longo': ['f3', 'c4', 'eb4', 'f4'],
  tuba: ['bb1', 'eb2', 'f2', 'bb2', 'd3', 'f3'],
  sax: ['c4', 'd4', 'e4', 'fs4', 'gs4', 'bb4', 'c5', 'd5', 'e5', 'f5'],
  'sax-longo': ['gs3', 'bb3', 'c4', 'd4', 'e4', 'fs4', 'gs4', 'bb4', 'c5', 'd5', 'e5', 'fs5', 'gs5'],
  clarinete: ['d4', 'f4', 'bb4', 'd5', 'f5'],
};
export const MAX_RETUNE = 2; // semitones
export const MAX_BORROW = 4; // semitones: how far a section's second player reaches for a take the first did not just play (the studio's own default zone)
/** The sample of `set` nearest to a note, and the playback rate that tunes it. */
export function nearestSample(set, note) {
  const midi = midiOf(note);
  const best = SAMPLE_NOTES[set].reduce((a, b) => (Math.abs(midiOf(b) - midi) < Math.abs(midiOf(a) - midi) ? b : a));
  return [`frevo-${set}-${best}`, 2 ** ((midi - midiOf(best)) / OCTAVE_SEMITONES), midi - midiOf(best)];
}
const reaches = (set, midi) => SAMPLE_NOTES[set].some(note => Math.abs(midiOf(note) - midi) <= MAX_RETUNE);
// The sets each horn plays its two kinds of note from, and how many parts it plays. The trompetes
// play their staccato notes in two parts and hold in unison (few held takes), over the trombones.
// The saxofones sing in unison, two players on two takes, and the clarinete sings the second part
// under them (`second`): two
// saxofones in close thirds, held, sound like a sanfona (docs/frevo.md, Sound).
const HORNS = {
  trompete: { curta: 'trompete', longa: 'trompete-longo', parts: 2, held: 1 },
  trombone: { curta: 'trombone', longa: 'trombone-longo', parts: 1 },
  sax: { curta: 'sax', longa: 'sax-longo', parts: 2, unison: true },
  clarinete: { curta: 'clarinete', longa: 'clarinete', parts: 1, second: true },
};
const LONG_STEPS = EIGHTH; // a note this long, or longer, is a held take cut to its length

// ---------- the lines ----------
// Every written note of every melodic voice, by absolute bar. The trombones' line is derived:
// they play under the trompetes and mark the chord under the tune where a scene says so.
const LINES = Object.fromEntries(MELODIC.map(voice => [voice, new Map()]));
const addNote = (voice, note) => LINES[voice].set(note.bar, [...(LINES[voice].get(note.bar) || []), note]);
SCENE_LIST.forEach((scene, i) => {
  for (const [voice, line] of Object.entries(scene.lines || {})) {
    const notes = Array.isArray(line) ? parseLine(SCENE_STARTS[i], line) : parseLine(SCENE_STARTS[i] - 1, [line.pickup, ...line.bars]);
    for (const note of notes) addNote(voice, note);
  }
});
const TROMBONE_RANGE = [midiOf('eb3'), midiOf('g4')];
const COMPING = [3, LAST_EIGHTH]; // under the tune the trombones mark the caixa's second and third accents (3 + 3 + 2), softly
/**
 * The trombones' note under a trompete note: the third part of the chord under it (the trompetes
 * play the first two), an octave lower, kept inside the recorded range.
 */
function tromboneUnder(note, harmony) {
  const [low, high] = TROMBONE_RANGE;
  const fits = midi => midi >= low && midi <= high && reaches(note.steps >= LONG_STEPS && !note.staccato ? 'trombone-longo' : 'trombone', midi);
  let midi = partBelow(partBelow(note.midi, harmony), harmony) - OCTAVE_SEMITONES;
  for (let tries = 0; tries < OCTAVE_SEMITONES && !fits(midi); tries++) midi = midi < low ? midi + OCTAVE_SEMITONES : partBelow(midi, harmony);
  return midi;
}
SCENE_LIST.forEach((scene, i) => {
  for (let bar = SCENE_STARTS[i]; bar < SCENE_STARTS[i] + scene.bars; bar++) {
    const lead = LINES.trompete.get(bar) || [];
    for (const note of lead) {
      const harmony = chordAt(bar, note.step);
      if (!harmony) continue;
      const midi = tromboneUnder(note, harmony);
      addNote('trombone', { ...note, midi, note: noteName(midi) });
    }
    const sounding = [...(LINES.trompete.get(bar - 1) || [])].some(note => note.step + note.steps > STEPS_PER_BAR);
    if (!scene.pad || lead.length || sounding || scene.mode?.(bar - SCENE_STARTS[i]) === 'cut') continue;
    COMPING.forEach((step, i) => {
      const midi = chordAt(bar, step).pad[i]; // the lower note, then the upper one
      addNote('trombone', { bar, step, note: noteName(midi), midi, steps: 1, pad: true, accent: false, staccato: true });
    });
  }
});
export const FREVO_LINES = LINES;

// How each note sounds: its players' notes, which kind of take, how loud. A phrase is louder at its
// top, an accent louder still, a staccato note and a pad softer; a note followed by another is legato.
const VELOCITY = { held: 0.78, staccato: 0.7, pad: 0.5, accent: 0.18, perSemitone: 0.012, contour: 0.1, long: 0.04, floor: 0.35 };
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
for (const voice of MELODIC) {
  const notes = [...LINES[voice].values()].flat(),
    centre = median(notes.map(note => note.midi)),
    starts = new Set(notes.map(note => note.bar * STEPS_PER_BAR + note.step)),
    ends = new Set(notes.map(note => note.bar * STEPS_PER_BAR + note.step + note.steps)),
    horn = HORNS[voice];
  for (const note of notes) {
    const harmony = chordAt(note.bar, note.step);
    const long = !note.staccato && note.steps >= LONG_STEPS && reaches(horn.longa, note.midi);
    note.stroke = long || !reaches(horn.curta, note.midi) ? 'longa' : 'curta';
    const set = horn[note.stroke];
    if (!reaches(set, note.midi)) throw new Error(`frevo: no ${voice} take near ${note.note} in bar ${note.bar + 1}`);
    const players = note.stroke === 'longa' ? (horn.held ?? horn.parts) : horn.parts;
    const below = harmony ? [partBelow(note.midi, harmony)].filter(midi => reaches(set, midi)) : [];
    note.sounds = horn.second && below.length ? below : horn.unison ? [note.midi, note.midi] : players > 1 ? [note.midi, ...below] : [note.midi];
    note.legato = starts.has(note.bar * STEPS_PER_BAR + note.step + note.steps);
    note.fermata = note.bar === TOTAL_BARS - 1; // the last chord rings
    note.opens = !ends.has(note.bar * STEPS_PER_BAR + note.step) && note.steps >= STEPS_PER_BEAT && !note.pad; // a long note after a breath
    const contour = Math.max(-VELOCITY.contour, Math.min(VELOCITY.contour, (note.midi - centre) * VELOCITY.perSemitone));
    note.velocity = note.pad
      ? VELOCITY.pad
      : Math.max(
          VELOCITY.floor,
          Math.min(
            ACCENT,
            (note.staccato ? VELOCITY.staccato : VELOCITY.held) +
              contour +
              (note.accent ? VELOCITY.accent : 0) +
              (note.steps >= STEPS_PER_BEAT ? VELOCITY.long : 0),
          ),
        );
  }
}

// ---------- the parts each bar plays ----------
const hit = (step, velocity, tone) => (tone ? { step, velocity, tone } : { step, velocity });
const silentBar = () => Object.fromEntries(VOICE_ORDER.map(voice => [voice, []]));
const melodic = (bar, voice) => (LINES[voice].get(bar) || []).map(note => hit(note.step, note.velocity, note.note));

// The percussion cell of two bars: caixa and surdo play twelve sixteenths, then the caixa's rufo
// (docs/research/pernambuco-rhythms-feeling.md, § Frevo). Accent places follow the 3+3+2 grouping.
export const CAIXA_CELL = ['X x x X x x X x', 'x X x X r . . .'];
export const SURDO_CELL = ['o . . . X . . o', 'o . . . X . . .']; // o: abafado (hand on the skin), X: aberto
export const PANDEIRO_BAR = 'X x x x X x x x'; // the sixteenth ostinato: X grave (thumb) on the beat, x platinela
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

const WALK_EVERY = 4; // bars: the tuba walks up the chord in the last bar of each four
/**
 * The tuba marks the beats: the root on 1 and the fifth on 2. It leads into a new chord from a
 * semitone below, on the last eighth, and walks root, third, fifth at the end of a phrase, or in
 * every bar of a scene that features it.
 */
function tubaBar(bar, barInScene, everyBar) {
  const first = chordAt(bar, 0),
    second = chordAt(bar, STEPS_PER_BEAT),
    next = chordAt(bar + 1, 0);
  if (!first) return [];
  const out = [hit(0, ACCENT, first.root)];
  const walks = (everyBar || barInScene % WALK_EVERY === WALK_EVERY - 1) && second === first;
  if (walks) out.push(hit(EIGHTH, SOFT, first.third));
  out.push(hit(STEPS_PER_BEAT, PLAIN, second === first ? first.fifth : second.root));
  if (next && next !== second) out.push(hit(LAST_EIGHTH, PLAIN, noteName(midiOf(next.root) - 1)));
  else if (walks) out.push(hit(LAST_EIGHTH, SOFT, first.third));
  return out;
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

// Bar modes: roll (the tarol alone, swelling into its rufo, under any pickup), cut (everyone on 1,
// then silence: the fotografia's pose, the introduction's stop, the final chord) and normal.
function barHits(scene, barInScene) {
  const bar = scene.start + barInScene,
    mode = scene.mode(barInScene);
  const hits = silentBar();
  for (const voice of MELODIC) hits[voice] = melodic(bar, voice);
  if (mode === 'roll') {
    const rollBars = scene.mode(barInScene - 1) === 'roll' || scene.mode(barInScene + 1) === 'roll' ? 2 : 1;
    hits.tarol = rollBar(scene.mode(barInScene - 1) === 'roll' ? 1 : 0, rollBars);
    return hits;
  }
  if (mode === 'cut') {
    hits.surdo = [hit(0, ACCENT, 'aberto')];
    hits.tarol = [hit(0, ACCENT, 'forte')];
    hits.pandeiro = [hit(0, ACCENT, 'grave')];
    hits.tuba = [hit(0, ACCENT, chordAt(bar, 0).root)];
    return hits;
  }
  const cellBar = barInScene % CAIXA_CELL.length;
  hits.surdo = surdoBar(cellBar);
  hits.tarol = caixaBar(cellBar);
  hits.pandeiro = pandeiroBar();
  if (scene.chords) hits.tuba = tubaBar(bar, barInScene, Boolean(scene.walk));
  return hits;
}

// How the background behaves in each scene (frevo-background.js): sombrinhas on the inner and the
// outer ring (fractions fade one in), the halo's glow and the fury (jitter). The engine reads
// `speed` for the visual clock and blends zoom, rot, hue and keep, which this painter does not use.
const LOOK = { zoom: 0, rot: 0, hue: 0, keep: 0, speed: 1 };
const SCENE_LOOKS = {
  introducao: { ...LOOK, inner: 3, outer: 0, glow: 0.5, fury: 0 },
  tema: { ...LOOK, inner: 6, outer: 4, glow: 0.8, fury: 0.1 },
  surdo: { ...LOOK, inner: 4, outer: 2, glow: 0.6, fury: 0 },
  caixa: { ...LOOK, inner: 5, outer: 4, glow: 0.7, fury: 0 },
  'la-e-ca': { ...LOOK, inner: 6, outer: 6, glow: 0.8, fury: 0.1 },
  tuba: { ...LOOK, inner: 4, outer: 4, glow: 0.7, fury: 0 },
  segunda: { ...LOOK, inner: 7, outer: 8, glow: 0.9, fury: 0.2 },
  sincope: { ...LOOK, inner: 8, outer: 8, glow: 1, fury: 0.3 },
  fotografia: { ...LOOK, inner: 6, outer: 8, glow: 0.5, fury: 0 },
  final: { ...LOOK, inner: 8, outer: 10, glow: 1, fury: 0.3 },
};

// ---------- sound: the studio (src/studio.js) ----------
// Every horn is a section, not one player: a second part a third or a sixth below (partBelow),
// each player on a take of its own, the players of one note starting a few milliseconds apart. A
// held note is a sustained take cut to the written length, with a slow attack, a release and a
// vibrato that comes in late; a long note after a breath scoops up to its pitch; a staccato note
// is a staccato take, as it was played. The surdo leads; the band follows it with a correlated
// drift; no swing. What the lab measured for each choice is in docs/frevo.md, Sound.
const LOUD_LAYER = 0.9;
// The trompetes' staccato notes also draw on the loud staccato takes recorded for the brega (the
// same trumpet, other strokes), so two players never share a take.
const SHARED_TAKES = { trompete: 'trompete-stac' };
const takesOf = set => [
  ...SAMPLE_NOTES[set].map(note => ({ file: `frevo-${set}-${note}`, root: midiOf(note) })),
  ...(SHARED_TAKES[set] ? takes(SHARED_TAKES[set]).flatMap(({ file, root, layer }) => (layer >= LOUD_LAYER ? [{ file, root }] : [])) : []),
];
const SPREAD = 0.007; // seconds between the players of one note
const OVERLAP = 0.03; // seconds a legato note rings into the next
const BREATH = 0.9; // the share of its length a note keeps before a rest
const FERMATA = 1.5; // the last chord, against its written length
const TONGUE = 0.004; // seconds: the attack of a staccato note
const SCOOP = { semitones: 0.4, over: 0.07 }; // a long note after a breath starts a little flat and rises to its pitch
/** A horn as a studio voice: its takes, and the shape of the note written at a bar and step. */
const horn = (voice, { attack, scoops = false, borrow = MAX_RETUNE }) => ({
  zone: MAX_RETUNE,
  maxZone: borrow,
  strokes: () => ({ curta: takesOf(HORNS[voice].curta), longa: takesOf(HORNS[voice].longa) }),
  shape(_tone, _choice, at) {
    const note = LINES[voice].get(at.bar).find(written => written.step === at.step),
      written = note.steps * STEP_SECONDS;
    const length = note.staccato
      ? undefined // the staccato take rings as it was played
      : note.fermata
        ? written * FERMATA
        : note.legato
          ? written + OVERLAP
          : written * BREATH;
    const scoop = scoops && note.opens;
    return {
      stroke: note.stroke,
      notes: scoop ? note.sounds.map(midi => midi - SCOOP.semitones) : note.sounds,
      glide: scoop ? { semitones: SCOOP.semitones, at: 0, over: SCOOP.over } : undefined,
      length,
      strum: SPREAD,
      gain: 1 / Math.sqrt(note.sounds.length),
      attack: note.staccato ? TONGUE : attack,
    };
  },
});
const MUFFLED = 0.7; // the abafado stroke, against the open one
const STUDIO = {
  room: 'sala-pequena',
  roomLevel: 0.9,
  output: 0.5, // under the default: the horns' long notes add up, and the glue should not flatten them
  tone: [{ type: 'peaking', frequency: 1800, gain: -3, Q: 0.7 }], // the horns' presence band, down to the reference recordings' level
  lead: 'surdo',
  voices: {
    surdo: {
      seed: 41,
      role: 'lead',
      gain: 1.2,
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
      gain: 0.8,
      pan: 0.12,
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
      gain: 0.82,
      pan: -0.15,
      send: 0.18,
      strokes: () => ({
        grave: [{ file: 'frevo-pandeiro-grave' }, { file: 'pandeiro-grave-3' }],
        platinela: [{ file: 'frevo-pandeiro-platinela' }, { file: 'pandeiro-platinela-1' }],
      }),
      shape: tone => ({ stroke: tone === 'grave' ? 'grave' : 'platinela' }),
    },
    tuba: {
      seed: 44,
      role: 'follower',
      gain: 1,
      send: 0.1,
      bright: [800, 6000],
      zone: MAX_RETUNE,
      maxZone: MAX_RETUNE,
      strokes: () => ({ curta: takesOf('tuba') }),
      shape: tone => ({ stroke: 'curta', notes: [midiOf(tone)] }),
    },
    trombone: {
      seed: 45,
      role: 'follower',
      gain: 1,
      pan: -0.16,
      send: 0.22,
      release: 0.1,
      bright: [1400, 12000],
      vibrato: { hz: 5, cents: 6, delay: 0.3 },
      ...horn('trombone', { attack: 0.012 }),
    },
    trompete: {
      seed: 46,
      role: 'follower',
      gain: 1.05,
      pan: 0.16,
      send: 0.24,
      release: 0.07,
      bright: [2200, 15000],
      vibrato: { hz: 5.8, cents: 10, delay: 0.24 },
      ...horn('trompete', { attack: 0.01, borrow: MAX_BORROW }),
    },
    sax: {
      seed: 47,
      role: 'follower',
      gain: 0.95,
      pan: -0.06,
      send: 0.24,
      release: 0.09,
      bright: [1800, 14000],
      vibrato: { hz: 5.4, cents: 18, delay: 0.2 },
      ...horn('sax', { attack: 0.028, scoops: true, borrow: MAX_BORROW }),
    },
    clarinete: {
      seed: 48,
      role: 'follower',
      gain: 0.32,
      pan: 0.08,
      send: 0.26,
      release: 0.09,
      bright: [2000, 14000],
      vibrato: { hz: 5.2, cents: 6, delay: 0.3 },
      ...horn('clarinete', { attack: 0.035 }),
    },
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
  ['clarinete', 'clarinete', ['clarinete'], 'clarinete'],
]);

// ---------- copy ----------
const INSTRUMENT_COUNT = VOICE_ORDER.length;
const countFromOne = steps => steps.map(step => step + 1).join(' ');
const READ = {
  tempo: 'andamento',
  tempoValue: `${BPM} bpm, do início ao fim`,
  meter: 'compasso',
  meterValue: `${BEATS_PER_BAR}/4, ${STEPS_PER_BAR} semicolcheias`,
  key: 'tom',
  keyValue: 'Sol menor',
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
  progression: 'harmonia',
  approach: 'passagem',
  approachValue: 'um semitom abaixo do acorde que chega',
  altoDaSe: 'Alto da Sé',
  altoDaSeValue: `compassos ${ALTO_DA_SE.from + 1} a ${ALTO_DA_SE.to}, no IV grau (Cm)`,
  theme: 'tema',
  themeValue: `${A_BARS} compassos com anacruse`,
  walk: 'baixo',
  walkValue: 'fundamental, terça e quinta, em colcheias',
  groups: 'melodia',
  groupsValue: 'notas de 3 + 3 + 2 semicolcheias',
  march: 'surdo',
  marchValue: 'tempos 1 e 2, a marcha',
  question: 'pergunta',
  metais: 'metais',
  answer: 'resposta',
  palhetas: 'palhetas',
  major: 'tom',
  majorValue: 'Si♭ maior, o relativo de Sol menor',
  peak: 'Alto da Sé',
  peakValue: `compassos ${ALTO_DA_SE.from + 1} a ${ALTO_DA_SE.to}, no IV grau (E♭)`,
  cutBars: 'compassos de parada',
  attacks: 'ataques depois',
  attacksValue: '3 + 3 + 2',
  scenes: 'cenas',
  bars: 'compassos',
  howItEnds: 'como termina',
  endValue: 'o tema com todos e o acorde final',
};
const COPY = {
  name: 'frevo',
  description:
    'Frevo lírico em tom menor, tocado por orquestra: a anacruse, a pergunta e resposta de palhetas e metais, a célula da caixa, o surdo, a tuba e a síncope, com som de instrumentos reais.', // the page's search and preview description
  feminineInstruments: ['caixa', 'tuba'],
  scenes: {
    introducao: { chip: 'Introdução', eyebrow: 'frevo lírico, de orquestra', title: 'Frevo' },
    tema: { chip: 'Tema', eyebrow: 'a melodia entra na anacruse', title: 'Tema' },
    surdo: { chip: 'Surdo', eyebrow: 'o segundo tempo, aberto', title: 'Surdo' },
    caixa: { chip: 'Caixa', eyebrow: READ.caixaCount, title: 'Caixa' },
    'la-e-ca': { chip: 'Lá e cá', eyebrow: 'pergunta e resposta', title: 'Lá e cá' },
    tuba: { chip: 'Tuba', eyebrow: 'o baixo caminha', title: 'Tuba' },
    segunda: { chip: 'Segunda parte', eyebrow: 'o tom maior', title: 'Segunda parte' },
    sincope: { chip: 'Síncope', eyebrow: '3 + 3 + 2 contra a marcha', title: 'Síncope' },
    fotografia: { chip: 'Fotografia', eyebrow: 'parada da orquestra', title: 'Fotografia' },
    final: { chip: 'Final', eyebrow: 'o tema volta com todos', title: 'Fim' },
  },
  patterns: { 'la-e-ca': 'Lá e cá', fotografia: 'Fotografia' },
  voices: {
    surdo: 'surdo',
    tarol: 'caixa',
    pandeiro: 'pandeiro',
    tuba: 'tuba',
    trombone: 'trombone',
    trompete: 'trompete',
    sax: 'saxofone',
    clarinete: 'clarinete',
  },
  instruments: {},
  hands: {},
  centre: { roll: 'RUFO', cut: 'PARADA', end: 'FIM' },
  read: READ,
};

// ---------- readout layouts ----------
const T = READ;
const ROLL_LINE = { trompete: COLOR.trompete, trombone: COLOR.trombone, sax: COLOR.sax, clarinete: COLOR.clarinete };
const beatSeparator = step => (step % STEPS_PER_BEAT === STEPS_PER_BEAT - 1 && step < STEPS_PER_BAR - 1 ? '|' : '');
/** One bar of a cell as marks: ● for a mark in `strong`, ○ for one in `weak`, ≈ for the rufo. */
const marks = (text, strong, weak) =>
  text
    .split(' ')
    .map((token, step) => (strong.includes(token) ? '●' : weak.includes(token) ? '○' : token === 'r' ? '≈' : '·') + beatSeparator(step))
    .join('');
const seqRow = (name, text, color, id) =>
  `${label(name)}<span class="seq"${id ? ` data-inst="${id}"` : ''} style="color:${color}">${text}</span><span class="n"></span>`;

/** The melody roll of a scene: its melodic voices, bar by bar, each note as long as it is held, with the scene's band. */
function sceneRoll(scene, voices, band) {
  const slots = scene.bars * STEPS_PER_BAR;
  const lines = voices.map(voice => ({
    id: voice,
    color: ROLL_LINE[voice],
    notes: [...Array(scene.bars).keys()].flatMap(bar =>
      (LINES[voice].get(scene.start + bar) || []).map(note => ({
        slot: bar * STEPS_PER_BAR + note.step,
        midi: note.midi,
        length: Math.min(note.steps, slots - bar * STEPS_PER_BAR - note.step),
      })),
    ),
  }));
  return rollReadout({ bars: scene.bars, stepsPerBar: STEPS_PER_BAR, stepsPerBeat: STEPS_PER_BEAT, lines, band });
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
    row(label(T.tempo), T.tempoValue) + row(label(T.meter), T.meterValue) + row(label(T.key), T.keyValue) + row(label(T.voices), INSTRUMENT_COUNT),
  surdo: () =>
    `<div class="notation">${SURDO_CELL.map((text, i) => seqRow(i ? '' : T.cell, marks(text, ['X'], ['o']), COLOR.surdo, 'surdo')).join('')}</div>` +
    row(label(`● ${T.open}`, COLOR.surdo), countFromOne(cellSteps(SURDO_CELL[0], 'X')), 'surdo') +
    row(label(`○ ${T.muted}`), countFromOne(cellSteps(SURDO_CELL[0], 'o')), 'surdo'),
  caixa: () =>
    `<div class="notation">${CAIXA_CELL.map((text, i) => seqRow(i ? '' : T.cell, marks(text, ['X'], ['x']), COLOR.tarol, 'tarol')).join('')}</div>` +
    row(label(`● ${T.accent} · ○ ${T.soft} · ≈ ${T.rufo}`), T.caixaCount, 'tarol'),
  tuba: scene =>
    row(label(T.progression), progression(scene), 'tuba') + row(label(T.walk), T.walkValue, 'tuba') + row(label(T.approach), T.approachValue, 'tuba'),
};
const ROLLS = {
  tema: scene => ({
    ...sceneRoll(scene, ['sax', 'trompete'], ALTO_DA_SE),
    rows: row(label(T.theme, COLOR.sax), T.themeValue) + row(label(T.altoDaSe), T.altoDaSeValue),
  }),
  'la-e-ca': scene => ({
    ...sceneRoll(scene, ['sax', 'trompete']),
    rows: row(label(T.question, COLOR.sax), T.palhetas) + row(label(T.answer, COLOR.trompete), T.metais),
  }),
  segunda: scene => ({
    ...sceneRoll(scene, ['sax', 'trompete'], ALTO_DA_SE),
    rows: row(label(T.major), T.majorValue) + row(label(T.peak), T.peakValue),
  }),
  sincope: scene => ({
    ...sceneRoll(scene, ['sax', 'trompete']),
    rows: row(label(T.groups, COLOR.sax), T.groupsValue) + row(label(T.march, COLOR.surdo), T.marchValue),
  }),
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
  const focus = scene.focus || '';
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
  shapeVoices: ['tuba', 'sax'], // the voices whose hits draw a shape on the wheel, in drawing order
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

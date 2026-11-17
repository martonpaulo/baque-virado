// Forró pé-de-serra: everything the engine plays and shows that belongs to this rhythm.
// A 2/4 bar of 8 sixteenths, one bar per turn of the wheel, 100 BPM for the whole show.
// Feeling: saudade of the sertão inside the party. The tune is original, in A dorian (a minor mode
// with a major sixth, F sharp); its second part moves to D mixolydian, the same scale heard from D,
// whose flat seventh is C natural. Each part is eight bars and ends on a cadence.
// Choices and their reasons: docs/rhythms/forro.md.
import { label, row, stat, stats } from '../readout-markup.js';
import { FORRO } from '../theme.js';
import { drawForroBackdrop } from './forro-backdrop.js';
import { straightMeter } from './meter.js';
import { lilt, midiOf, recordedChoices, studioSounds, takes } from './studio-kit.js';

const BPM = 100;
const BEATS_PER_BAR = 2;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const STEPS = [...Array(STEPS_PER_BAR).keys()];
const PHRASE_BARS = 8;

// ---------- notes ----------
// A dorian: A B C D E F# G. D mixolydian has the same notes.
const MODE = ['A', 'B', 'C', 'D', 'E', 'F#', 'G'];
const SOLFEGE = { A: 'lá', B: 'si', C: 'dó', D: 'ré', E: 'mi', 'F#': 'fá♯', G: 'sol' };
const SIXTH = 'F#'; // the major sixth that makes the minor mode dorian
const FLAT_SEVENTH = 'C'; // of D, in the second part
const LEADING_NOTE = 'G#'; // outside the mode: the third of V7, only in a cadence
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const MODE_NOTE = Object.fromEntries(LETTERS.map(letter => [letter, MODE.find(note => note[0] === letter)]));
const THIRD = 2; // scale steps
/** The note of the mode a third below (two letters down), as the bandolim doubles the melody. */
function thirdBelow(name) {
  const index = LETTERS.indexOf(name[0]) - THIRD;
  return MODE_NOTE[LETTERS.at(index)] + (Number(name.at(-1)) - (index < 0 ? 1 : 0));
}

// ---------- the harmony ----------
// name: as the readout says it; degree: in A; left: the sanfona's bass buttons [root, fifth];
// hand: its chord button; strum: the cavaquinho's four strings.
const CHORDS = {
  Am: { name: 'Lám', degree: 'i', left: ['A2', 'E3'], hand: ['A3', 'C4', 'E4'], strum: ['E4', 'A4', 'C5', 'E5'] },
  D: { name: 'Ré', degree: 'IV', left: ['D3', 'A2'], hand: ['A3', 'D4', 'F#4'], strum: ['D4', 'A4', 'D5', 'F#5'] },
  G: { name: 'Sol', degree: '♭VII', left: ['G3', 'D3'], hand: ['G3', 'B3', 'D4'], strum: ['D4', 'G4', 'B4', 'D5'] },
  C: { name: 'Dó', degree: '♭III', left: ['C3', 'G3'], hand: ['G3', 'C4', 'E4'], strum: ['E4', 'G4', 'C5', 'E5'] },
  E7: { name: 'Mi7', degree: 'V7', left: ['E3', 'B2'], hand: ['G#3', 'B3', 'D4'], strum: ['E4', 'G#4', 'B4', 'D5'] },
};

// ---------- the tune ----------
// A line is one string per bar, one token per sixteenth: a note name starts a note, `-` holds it one
// sixteenth more (also over the bar line), `.` is silence. `+` joins notes played together (thirds,
// a chord); `>` before a note accents it; `~` slides into it from the key a semitone below.
const TOKEN = { rest: '.', hold: '-', accent: '>', grace: '~', join: '+', length: ':' };
// Part A, A dorian: a run up to a held top note that arrives a sixteenth early, the same shape a
// fourth higher over IV, the bellows rebounding on thirds, and the cadence V7 to i.
const PART_A = {
  chords: ['Am', 'Am', 'D', 'D', 'Am', 'G', 'E7', 'Am'],
  sanfona: [
    'C5 B4 C5 E5 ~A5 - G5 >A5',
    '- - G5 E5 F#5 E5 C5 A4',
    'D5 C5 D5 F#5 ~A5 - F#5 >A5',
    '- - F#5 D5 E5 D5 C5 B4',
    '>C5+A4 . C5+A4 C5+A4 >E5+C5 . E5+C5 E5+C5',
    '>D5+B4 . D5+B4 D5+B4 B4 D5 G5 D5',
    'E5 D5 B4 G#4 E4 G#4 >B4 G#4',
    '>A4+E4 - - - . E4 A4 B4',
  ],
  // the rabeca holds under the tune and answers in its gaps
  rabeca: [
    'E4 - - - - - - -',
    '- - - - . . E4 G4',
    'A4 - - - - - - -',
    '- - - - . . A4 B4',
    'A4 - - - - - . .',
    'G4 - - - - - . .',
    'G#4 - - - B4 - - -',
    'C5 - - - - - . .',
  ],
  // the bass walks with the zabumba's low head and leans into the next chord a sixteenth early
  baixo: [
    'A1 - . E2 A2 - . E2',
    'A1 - . C2 E2 - . C#2',
    'D2 - . A1 D2 - . F#2',
    'D2 - . A2 F#2 - . G#2',
    'A2 - . E2 A1 - . F#2',
    'G2 - . D2 G1 - . F2',
    'E2 - . B1 E2 . F#2 G#2',
    'A2 - . E2 A1 - . E2',
  ],
};
// Part B, D mixolydian: the flat seventh (C) held on the first beat of its bars, then chords in
// 3 + 3 + 2, and two bars of V7 that lead back to part A.
const PART_B = {
  chords: ['D', 'C', 'D', 'C', 'G', 'D', 'E7', 'E7'],
  sanfona: [
    '>F#5 - D5 F#5 A5 - F#5 D5',
    '>~C5 - - E5 G5 E5 C5 .',
    '>F#5 - D5 F#5 A5 - F#5 >A5',
    'G5 - - E5 C5 D5 E5 G5',
    '>B4+G4 . B4+G4 >D5+B4 . D5+B4 >B4+G4 .',
    '>A4+F#4 . A4+F#4 >D5+A4 . D5+A4 >F#5+D5 .',
    'E5 . E5 D5 E5 G#5 E5 D5',
    'B4 G#4 B4 D5 >E5 - - .',
  ],
  // the rabeca doubles the first half in unison, then holds under the chords
  rabeca: [
    'F#5 - D5 F#5 A5 - F#5 D5',
    'C5 - - E5 G5 E5 C5 .',
    'F#5 - D5 F#5 A5 - F#5 A5',
    'G5 - - E5 C5 D5 E5 G5',
    'D5 - - - - - - -',
    'D5 - - - F#5 - - -',
    'E5 - - - - - - -',
    'D5 - - - E5 - - .',
  ],
  baixo: [
    'D2 - . A1 D2 - . B1',
    'C2 - . G2 C2 - . C#2',
    'D2 - . A2 F#2 - . D2',
    'C2 - . G1 C2 . E2 F#2',
    'G2 - . D2 B1 - . C#2',
    'D2 - . A1 D2 - . D#2',
    'E2 - . B1 E2 - . B1',
    'E1 - . E2 B1 . E2 G#2',
  ],
};
// The jogo de fole: no tune, the bellows shake on the chords and the bass plays 3 + 3 + 2 with them.
const SILENT = '. . . . . . . .';
const PART_JOGO = {
  chords: ['Am', 'Am', 'G', 'G', 'Am', 'Am', 'E7', 'Am'],
  sanfona: Array(PHRASE_BARS).fill(SILENT),
  rabeca: Array(PHRASE_BARS).fill(SILENT),
  baixo: [
    'A1 - . A1 - . E2 -',
    'A1 - . A1 - . G2 -',
    'G1 - . G1 - . D2 -',
    'G1 - . G1 - . G#1 -',
    'A1 - . A1 - . E2 -',
    'A1 - . A1 - . D#2 -',
    'E2 - . E2 - . G#2 -',
    'A1 - . A1 - . E2 -',
  ],
};
// The bar before the breque: one more bar of V7, the tune running down it.
const PART_BREQUE = { chords: ['E7'], sanfona: ['E5 G#5 E5 D5 B4 D5 G#4 B4'], rabeca: ['E5 - - - - - - -'], baixo: ['E2 - . B1 E2 . F#2 G#2'] };

/** The notes a line starts in each bar: `{ step, notes, steps, accent, grace }`, holds counted in. */
function compile(line) {
  let last = null;
  return line.map(text =>
    text.split(' ').flatMap((token, step) => {
      if (token === TOKEN.hold) {
        if (last) last.steps++;
        return [];
      }
      if (token === TOKEN.rest) {
        last = null;
        return [];
      }
      const accent = token.startsWith(TOKEN.accent),
        plain = accent ? token.slice(1) : token,
        grace = plain.startsWith(TOKEN.grace);
      last = { step, notes: (grace ? plain.slice(1) : plain).split(TOKEN.join), steps: 1, accent, grace };
      return [last];
    }),
  );
}
const EIGHTH = 2; // sixteenths
/** The bandolim's line: the tune's eighth notes, each a third below its top note. */
const thirdsOf = bars =>
  bars.map(bar =>
    bar
      .filter(note => note.step % EIGHTH === 0)
      .map(note => ({ step: note.step, notes: [thirdBelow(note.notes[0])], steps: EIGHTH, accent: note.accent, grace: false })),
  );
/** A part, bar by bar: its chord and each melodic voice's notes. */
function barsOf(part) {
  const sanfona = compile(part.sanfona),
    rabeca = compile(part.rabeca),
    baixo = compile(part.baixo),
    bandolim = thirdsOf(sanfona);
  return part.chords.map((chord, bar) => ({ chord, sanfona: sanfona[bar], rabeca: rabeca[bar], baixo: baixo[bar], bandolim: bandolim[bar] }));
}
const WRITTEN = { A: PART_A, B: PART_B, jogo: PART_JOGO, breque: PART_BREQUE };
const PARTS = Object.fromEntries(Object.entries(WRITTEN).map(([id, part]) => [id, barsOf(part)]));

// ---------- the percussion ----------
// Steps of the 2/4 bar, from 0. The zabumba's maceta plays the low head, the bacalhau (a thin rod)
// the lower one; the triângulo plays every sixteenth, closed by the hand and open on the off-beats.
const VELOCITY = { strong: 1, medium: 0.85, soft: 0.7, light: 0.6, faint: 0.45 };
const SAMPLE = { aberto: 'aberto', fechado: 'fechado', abafada: 'abafada' };
// The low head: [step, velocity, stroke]. The base cell is the baião figure (dotted eighth, sixteenth,
// eighth, the last one pressed by the hand) and the pick-up a sixteenth before the bar line, as the
// reference recording plays it (docs/rhythms/forro.md).
const PATTERNS = {
  base: {
    grave: [
      [0, VELOCITY.strong, SAMPLE.aberto],
      [3, VELOCITY.strong, SAMPLE.aberto],
      [4, VELOCITY.soft, SAMPLE.abafada],
      [7, VELOCITY.soft, SAMPLE.aberto],
    ],
    bacalhau: [2, 6],
  },
  // 3 + 3 + 2
  baiao: {
    grave: [
      [0, VELOCITY.strong, SAMPLE.aberto],
      [3, VELOCITY.medium, SAMPLE.aberto],
      [6, VELOCITY.medium, SAMPLE.aberto],
    ],
    bacalhau: [2, 4],
  },
  // the zabumba's fill at a phrase end
  virada: {
    grave: [
      [0, VELOCITY.strong, SAMPLE.aberto],
      [2, VELOCITY.light, SAMPLE.abafada],
      [3, VELOCITY.medium, SAMPLE.aberto],
      [4, VELOCITY.soft, SAMPLE.abafada],
      [6, VELOCITY.medium, SAMPLE.aberto],
      [7, VELOCITY.strong, SAMPLE.aberto],
    ],
    bacalhau: [],
  },
};
const stepsOf = strokes => strokes.map(([step]) => step);
const TRIANGLE_OPEN = [2, 6];
// closed strokes soft, the open off-beat the accent (brega-forro.md: closed about 60 %, open 100 %)
const TRIANGLE_VELOCITY = [0.65, 0.45, 1, 0.5, 0.6, 0.45, 1, 0.5];
// The sanfona's left hand, two bars that alternate: bass button on the beat, chord button after it,
// with a second, lighter chord as the bellows come back. In the jogo de fole the bellows shake on
// every sixteenth and the accents fall in 3 + 3 + 2.
const FOLE = {
  base: [
    { bass: [0, 4], chord: [2, 3, 6] },
    { bass: [0, 4], chord: [2, 6, 7] },
  ],
  jogo: [{ bass: [0], chord: STEPS }],
};
const JOGO_ACCENTS = [0, 3, 6];
// The cavaquinho's two bars: down on the off-beat, up on the sixteenth after it.
const CAVAQUINHO = [
  [2, 3, 6],
  [2, 3, 6, 7],
];
const STRUM = { down: 'd', up: 'u' };
const LEFT = { bass: 'b', chord: 'a' };

// ring/size: where and how big the voice sits on the wheel. hand: a part of a two-part instrument
// (the zabumba's maceta and bacalhau): named under the instrument, contratempo marks on off-beats.
// boom: how hard a hit pushes the background. pitched: a melodic voice, never detuned per hit.
const VOICES = {
  grave: { instrument: 'zabumba', ring: 98, size: 5.6, swing: null, color: FORRO.leather, hand: true, boom: 1 },
  bacalhau: { instrument: 'zabumba', ring: 89, size: 3.6, swing: null, color: FORRO.bamboo, hand: true },
  triangulo: { instrument: 'triangulo', ring: 80, size: 3, swing: null, color: FORRO.steel, toneScale: { fechado: 0.75 } },
  fole: { instrument: 'sanfona', ring: 71, size: 3.6, swing: null, color: FORRO.pearl, pitched: true },
  baixo: { instrument: 'baixo', ring: 63, size: 4.2, swing: null, color: FORRO.dusk, pitched: true },
  cavaquinho: { instrument: 'cavaquinho', ring: 56, size: 3, swing: null, color: FORRO.teal, pitched: true },
  sanfona: { instrument: 'sanfona', ring: 48, size: 4.4, swing: null, color: FORRO.red, pitched: true },
  rabeca: { instrument: 'rabeca', ring: 41, size: 3.4, swing: null, color: FORRO.varnish, pitched: true },
  bandolim: { instrument: 'bandolim', ring: 35, size: 3, swing: null, color: FORRO.spruce, pitched: true },
};
const VOICE_ORDER = Object.keys(VOICES);
const INSTRUMENTS = [...new Set(VOICE_ORDER.map(voice => VOICES[voice].instrument))];

const hit = (step, velocity, tone) => (tone ? { step, velocity, tone } : { step, velocity });
const silentBar = () => Object.fromEntries(VOICE_ORDER.map(voice => [voice, []]));
const offGrid = step => step % EIGHTH === 1; // the second and fourth sixteenth of a beat
/** A written note's velocity: its accent, else its place in the beat (head, eighth, sixteenth). */
const noteVelocity = note =>
  note.accent ? VELOCITY.strong : note.step % STEPS_PER_BEAT === 0 ? VELOCITY.medium : offGrid(note.step) ? VELOCITY.light : VELOCITY.soft;
/** A written note as a hit; its tone carries the notes and the length in sixteenths (`C5+A4:2`). */
const noteHit = note => hit(note.step, noteVelocity(note), `${note.grace ? TOKEN.grace : ''}${note.notes.join(TOKEN.join)}${TOKEN.length}${note.steps}`);

const FORMS = new Map();
/** The bar `barInScene` of a scene: its tune's parts one after the other, repeated. */
function barOf(scene, barInScene) {
  const key = scene.tune.join();
  if (!FORMS.has(key))
    FORMS.set(
      key,
      scene.tune.flatMap(part => PARTS[part]),
    );
  const form = FORMS.get(key);
  return form[barInScene % form.length];
}

/**
 * Every voice's hits for one bar of a scene. A voice the scene does not play has none: the wheel
 * draws no ghost of it, so the parts enter one by one on the wheel too, and the key under it names
 * only what sounds (nine names do not fit its one line on a phone).
 */
function barHits(scene, barInScene) {
  const hits = partHits(scene, barInScene),
    playing = new Set(scene.voices(barInScene));
  return Object.fromEntries(VOICE_ORDER.map(voice => [voice, playing.has(voice) ? hits[voice] : []]));
}

/** Every voice's part in one bar of a scene, played or not. */
function partHits(scene, barInScene) {
  if (scene.mode(barInScene) === 'cut') return cutBar(scene);
  const bar = barOf(scene, barInScene),
    [root, fifth] = CHORDS[bar.chord].left;
  const isPhraseEnd = barInScene % PHRASE_BARS === PHRASE_BARS - 1 && scene.bars > PHRASE_BARS - 1;
  const drum = PATTERNS[isPhraseEnd ? 'virada' : scene.zabumba];
  const fole = FOLE[scene.fole][barInScene % FOLE[scene.fole].length],
    shaking = scene.fole === 'jogo';
  const chordVelocity = step => (shaking ? (JOGO_ACCENTS.includes(step) ? VELOCITY.strong : VELOCITY.faint) : offGrid(step) ? VELOCITY.light : VELOCITY.medium);
  return {
    grave: drum.grave.map(([step, velocity, stroke]) => hit(step, velocity, stroke)),
    bacalhau: drum.bacalhau.map(step => hit(step, VELOCITY.soft)),
    triangulo: STEPS.map(step => hit(step, TRIANGLE_VELOCITY[step], TRIANGLE_OPEN.includes(step) ? SAMPLE.aberto : SAMPLE.fechado)),
    fole: [
      ...fole.bass.map(step => hit(step, VELOCITY.strong, `${LEFT.bass}${TOKEN.length}${step < STEPS_PER_BEAT ? root : fifth}`)),
      ...fole.chord.map(step => hit(step, chordVelocity(step), `${LEFT.chord}${TOKEN.length}${bar.chord}`)),
    ].sort((a, b) => a.step - b.step),
    baixo: bar.baixo.map(noteHit),
    cavaquinho: CAVAQUINHO[barInScene % CAVAQUINHO.length].map(step =>
      hit(step, offGrid(step) ? VELOCITY.light : VELOCITY.medium, `${bar.chord}${TOKEN.length}${offGrid(step) ? STRUM.up : STRUM.down}`),
    ),
    sanfona: bar.sanfona.map(noteHit),
    rabeca: bar.rabeca.map(noteHit),
    bandolim: bar.bandolim.map(noteHit),
  };
}

// The breque: everyone on 1, then silence, and the sanfona leads the band back with a pick-up into
// the tune. The final cut: everyone on 1, on the tonic chord, held, and the end.
const TONIC = 'Am';
const [CUT, FINAL, FINAL_RABECA, FINAL_BANDOLIM, CUT_BASS] = [
  '>A4+E4 - . . . E4 A4 B4',
  '>A5+E5+C5 - - - - - . .',
  '>E5 - - - - - . .',
  '>A4 - - - . . . .',
  '>A1 - - . . . . .',
].map(text => compile([text])[0]);
function cutBar(scene) {
  const [root] = CHORDS[TONIC].left,
    bar = {
      ...silentBar(),
      grave: [hit(0, VELOCITY.strong, SAMPLE.aberto)],
      triangulo: [hit(0, VELOCITY.strong, SAMPLE.aberto)],
      fole: [hit(0, VELOCITY.strong, `${LEFT.bass}${TOKEN.length}${root}`), hit(0, VELOCITY.strong, `${LEFT.chord}${TOKEN.length}${TONIC}`)],
      baixo: CUT_BASS.map(noteHit),
      cavaquinho: [hit(0, VELOCITY.strong, `${TONIC}${TOKEN.length}${STRUM.down}`)],
    };
  if (!scene.isEnd) return { ...bar, sanfona: CUT.map(noteHit) };
  return { ...bar, sanfona: FINAL.map(noteHit), rabeca: FINAL_RABECA.map(noteHit), bandolim: FINAL_BANDOLIM.map(noteHit) };
}

// ---------- the show script ----------
// Eleven scenes after docs/sketches/scripts.html: the parts enter one by one, the band plays the
// tune's two parts, the bellows shake, the zabumba changes its cell, a breque, and the end.
// 86 bars at 100 BPM: 1:43.
const always = value => () => value;
const TRIO = ['triangulo', 'grave', 'bacalhau'];
const LEFT_HAND = [...TRIO, 'fole'];
const BAND = [...LEFT_HAND, 'baixo', 'cavaquinho', 'sanfona'];
const EVERYONE = [...BAND, 'rabeca', 'bandolim'];
const INTRO_BARS = 4;
const TWO_PARTS = PHRASE_BARS * 2;
const BREQUE_BARS = 2;
const SCENE_LIST = [
  { id: 'triangulo', bars: INTRO_BARS, voices: always(['triangulo']), lanes: ['triangulo'] },
  { id: 'zabumba', bars: INTRO_BARS, voices: always(['triangulo', 'grave']), lanes: ['triangulo', 'grave'] },
  { id: 'bacalhau', bars: INTRO_BARS, voices: always(TRIO), lanes: ['triangulo', 'grave', 'bacalhau'] },
  { id: 'trio', bars: PHRASE_BARS, voices: always(LEFT_HAND), lanes: ['fole', 'grave', 'triangulo'] },
  { id: 'sanfona', bars: PHRASE_BARS, voices: always([...LEFT_HAND, 'sanfona']), lanes: ['sanfona', 'fole', 'grave'] },
  { id: 'baixo', bars: PHRASE_BARS, tune: ['B'], voices: always(BAND), lanes: ['cavaquinho', 'baixo', 'grave'] },
  { id: 'rabeca', bars: TWO_PARTS, tune: ['A', 'B'], voices: always(EVERYONE), lanes: ['sanfona', 'rabeca', 'bandolim'] },
  { id: 'fole', bars: PHRASE_BARS, tune: ['jogo'], fole: 'jogo', voices: always([...LEFT_HAND, 'baixo']), lanes: ['fole', 'grave'] },
  {
    id: 'baiao',
    bars: TWO_PARTS,
    tune: ['A', 'B'],
    zabumba: 'baiao',
    named: true,
    pattern: 'baiao',
    voices: bar => (bar < PHRASE_BARS ? BAND : EVERYONE), // the rabeca and the bandolim come back for the second part
    lanes: ['grave', 'bacalhau', 'baixo'],
  },
  {
    id: 'breque',
    bars: BREQUE_BARS,
    tune: ['breque'],
    mode: bar => (bar === BREQUE_BARS - 1 ? 'cut' : 'normal'),
    voices: always(BAND),
    lanes: ['grave', 'baixo', 'sanfona'],
  },
  { id: 'final', bars: PHRASE_BARS, mode: bar => (bar === PHRASE_BARS - 1 ? 'cut' : 'normal'), lanes: ['sanfona', 'fole', 'grave'], isEnd: true },
];

// The background is drawn by forro-backdrop.js; `speed` is the only look the engine reads (the pace
// of the visual clock), and the feedback keys stay still.
const LOOK = { zoom: 0, rot: 0, hue: 0, keep: 0, seg: 1, warp: 0, speed: 1, pal: 0 };
const SCENE_LOOKS = Object.fromEntries(SCENE_LIST.map(scene => [scene.id, LOOK]));

// ---------- sound: recorded instruments in the studio (src/studio.js) ----------
// Every instrument is a set of real recordings (CC0): several takes per stroke, velocity layers, and
// melodic takes retuned from the nearest recorded note. Sources: CREDITS.md; choices:
// docs/rhythms/studio.md and docs/rhythms/forro.md. The zabumba leads; the others follow it. The
// sanfona leads the mix, as on the reference recording; the triângulo is a quiet engine under it.
const STEP_MS = (60 / BPM / STEPS_PER_BEAT) * 1000;
const STEP_SECONDS = STEP_MS / 1000;
const TRIANGLE_LILT = 0.1; // the triângulo «dances»: off-beat sixteenths about 10 % of a sixteenth late
const HELD_STEPS = 3; // from a dotted eighth on, a note is held: the bellows open it
const BELLOWS_ATTACK = 0.05;
const FINGER_ATTACK = 0.006;
const LEGATO = 0.92; // a note sounds this share of its written length
const GRACE = { semitones: 1, at: 0.04, over: 0.012 }; // the slide from the key below, in seconds
const TOGETHER_GAIN = 0.78; // each note of a third or a chord, so the pair is not louder than a single note
const BOW = { attack: 0.035, vibrato: { hz: 5.8, cents: 14, delay: 0.12 } };
// The reeds' own recording is strong from 500 to 1000 Hz and dull above; the reference's sanfona is
// even from 250 Hz to 2 kHz and bright: cut the hump, open the top.
const REED_EQ = [
  { type: 'peaking', frequency: 680, gain: -10, Q: 0.8 },
  { type: 'highshelf', frequency: 2500, gain: 3 },
];
const REED_BRIGHT = [5000, 18000];
// The open head's takes are a concert bass drum, near 62 Hz; the reference's zabumba sounds near
// 95 Hz and dies sooner. Played faster, the takes come up to it; the one take already there stays.
const ZABUMBA_TUNING = 1.45;
const ZABUMBA_IN_TUNE = 'zabumba-aberto-8';
// The whole band against the reference's long-term spectrum: more below 120 Hz, less around 750 Hz
// and 3 kHz, more air above 9 kHz.
const BUS_TONE = [
  { type: 'lowshelf', frequency: 130, gain: 5.5 },
  { type: 'peaking', frequency: 750, gain: -3.5, Q: 0.8 },
  { type: 'peaking', frequency: 3000, gain: -2, Q: 1 },
  { type: 'highshelf', frequency: 9000, gain: 6 },
];
const RETURN_STRINGS = 3;
const RING = 1.6; // a plucked note rings past its written length
/** A hit's tone read back: its notes (MIDI), its length in seconds and whether it slides in. */
function written(tone) {
  const [head, steps] = tone.split(TOKEN.length),
    grace = head.startsWith(TOKEN.grace);
  return { notes: (grace ? head.slice(1) : head).split(TOKEN.join).map(midiOf), seconds: Number(steps) * STEP_SECONDS, grace };
}
const STUDIO = {
  room: 'sala-pequena',
  roomLevel: 0.9,
  output: 0.55, // under the master compressor, so the zabumba keeps its punch
  lead: 'grave',
  phraseBars: PHRASE_BARS,
  tone: BUS_TONE,
  voices: {
    grave: {
      seed: 11,
      role: 'lead',
      gain: 1.25,
      pan: 0,
      send: 0.12,
      bright: [1500, 12000],
      strokes: () => ({
        aberto: takes(['zabumba-aberto', { rate: ZABUMBA_TUNING }]).map(take => (take.file === ZABUMBA_IN_TUNE ? { ...take, rate: 1 } : take)),
        abafada: takes('zabumba-abafada'),
      }),
      ghosts: [{ step: 6, velocity: 0.3, probability: 0.5, tone: SAMPLE.abafada }], // a pressed ghost before the pick-up, half the bars
    },
    bacalhau: {
      seed: 12,
      role: 'follower',
      gain: 1,
      pan: 0.12,
      send: 0.12,
      template: lilt(STEPS_PER_BAR, STEP_MS, 0.04),
      strokes: () => ({ hit: takes('bacalhau') }),
    },
    triangulo: {
      seed: 13,
      role: 'follower',
      gain: 0.23,
      pan: 0.35,
      send: 0.22,
      template: lilt(STEPS_PER_BAR, STEP_MS, TRIANGLE_LILT),
      bright: [4000, 18000],
      eq: [{ type: 'highshelf', frequency: 8000, gain: 6 }], // the reference's triângulo shines above 8 kHz
      strokes: () => ({ aberto: takes('triangulo-aberto'), fechado: takes('triangulo-fechado') }),
      shape: tone => ({ length: tone === SAMPLE.fechado ? 0.12 : null }),
    },
    fole: {
      seed: 14,
      role: 'follower',
      gain: 0.5,
      pan: -0.3,
      send: 0.2,
      zone: 2,
      eq: REED_EQ,
      bright: REED_BRIGHT,
      attack: FINGER_ATTACK,
      strokes: () => ({ baixo: takes('sanfona-baixo'), acorde: takes('sanfona-hohner') }),
      // a chord on an off sixteenth is the bellows coming back: shorter
      shape: (tone, _choice, at) => {
        const [kind, value] = tone.split(TOKEN.length);
        return kind === LEFT.bass
          ? { stroke: 'baixo', notes: [midiOf(value)], length: 0.2 }
          : { stroke: 'acorde', notes: CHORDS[value].hand.map(midiOf), length: offGrid(at.step) ? 0.09 : 0.13, gain: 0.6 };
      },
    },
    baixo: {
      seed: 15,
      role: 'follower',
      gain: 0.5,
      pan: 0,
      send: 0.06,
      bright: [700, 5000],
      strokes: () => ({ nota: takes('baixo') }),
      shape: tone => {
        const { notes, seconds } = written(tone);
        return { stroke: 'nota', notes, length: seconds * LEGATO };
      },
    },
    cavaquinho: {
      seed: 16,
      role: 'follower',
      gain: 0.7,
      pan: 0.45,
      send: 0.18,
      template: lilt(STEPS_PER_BAR, STEP_MS, 0, 3),
      strokes: () => ({ corda: takes('bandolim') }),
      // four strings strummed down; the hand comes back lighter over three, damped sooner. Every
      // strum starts on the low string, where the recorded takes are most (a fresh take each time).
      shape: tone => {
        const [chord, way] = tone.split(TOKEN.length),
          strings = CHORDS[chord].strum.map(midiOf);
        return way === STRUM.up
          ? { stroke: 'corda', notes: strings.slice(0, RETURN_STRINGS), strum: 0.007, length: 0.09, gain: 0.7 }
          : { stroke: 'corda', notes: strings, strum: 0.011, length: 0.17 };
      },
    },
    sanfona: {
      seed: 17,
      role: 'follower',
      gain: 0.85,
      pan: -0.12,
      send: 0.25,
      zone: 2,
      eq: REED_EQ,
      bright: REED_BRIGHT,
      release: 0.05,
      strokes: () => ({ nota: takes('sanfona-hohner') }),
      shape: tone => {
        const { notes, seconds, grace } = written(tone);
        return {
          stroke: 'nota',
          notes: grace ? notes.map(note => note - GRACE.semitones) : notes,
          length: seconds * LEGATO,
          attack: seconds >= HELD_STEPS * STEP_SECONDS ? BELLOWS_ATTACK : FINGER_ATTACK,
          glide: grace ? GRACE : null,
          gain: notes.length > 1 ? TOGETHER_GAIN : 1,
        };
      },
    },
    rabeca: {
      seed: 18,
      role: 'follower',
      gain: 0.62,
      pan: -0.4,
      send: 0.3,
      vibrato: BOW.vibrato,
      strokes: () => ({ curta: takes('rabeca-spic'), longa: takes('rabeca-arco') }),
      // a sixteenth bounces off the string; a longer note is bowed
      shape: tone => {
        const { notes, seconds } = written(tone);
        return seconds > STEP_SECONDS ? { stroke: 'longa', notes, length: seconds * LEGATO, attack: BOW.attack } : { stroke: 'curta', notes };
      },
    },
    bandolim: {
      seed: 19,
      role: 'follower',
      gain: 0.35,
      pan: 0.55,
      send: 0.22,
      strokes: () => ({ nota: takes('bandolim') }),
      shape: tone => {
        const { notes, seconds } = written(tone);
        return { stroke: 'nota', notes, length: seconds * RING };
      },
    },
  },
};
const SOUND_CHOICES = recordedChoices(STUDIO, [
  ['zabumba', 'zabumba', ['grave', 'bacalhau'], 'zabumba gravada'],
  ['triangulo', 'triângulo', ['triangulo'], 'triângulo de aço'],
  ['sanfona', 'sanfona', ['fole', 'sanfona'], 'sanfona de botão gravada'],
  ['rabeca', 'rabeca', ['rabeca'], 'rabeca (violino gravado)'],
  ['bandolim', 'bandolim', ['bandolim'], 'bandolim gravado'],
  ['cavaquinho', 'cavaquinho', ['cavaquinho'], 'cordas de aço gravadas'],
  ['baixo', 'baixo', ['baixo'], 'baixo gravado'],
]);

// ---------- copy ----------
const READ = {
  meter: 'compasso',
  meterValue: `${BEATS_PER_BAR}/4 · ${STEPS_PER_BAR} semicolcheias`,
  tempo: 'andamento',
  tempoValue: `${BPM} BPM`,
  closed: 'fechado',
  open: 'aberto',
  onOffbeat: 'no contratempo',
  grave: 'maceta',
  bacalhau: 'bacalhau',
  cell: 'célula',
  cellValue: 'colcheia pontuada, semicolcheia, colcheia',
  pressed: 'abafada no tempo 2',
  pickUp: 'anacruse',
  pickUpValue: 'a última semicolcheia puxa o 1',
  chords: 'acordes',
  degrees: 'graus',
  mode: 'modo',
  scale: 'escala',
  modeValue: 'dórico: menor com sexta maior',
  sixth: 'sexta maior',
  phrase: 'frase',
  phraseValue: `${PHRASE_BARS} compassos, pergunta e resposta`,
  secondPart: 'segunda parte',
  secondPartValue: `ré mixolídio: a mesma escala, com sétima menor (${SOLFEGE[FLAT_SEVENTH]})`,
  baixo: 'baixo',
  baixoValue: 'caminha com a maceta e puxa o acorde seguinte',
  cavaquinho: 'cavaquinho',
  sanfona: 'sanfona',
  melody: 'melodia',
  rabeca: 'rabeca',
  rabecaValue: 'sustenta, responde e dobra',
  bandolim: 'bandolim',
  thirdBelow: 'uma terça abaixo',
  accents: 'acentos',
  groups: '3 + 3 + 2',
  shake: 'resfolego',
  shakeValue: 'o fole vai e volta a cada semicolcheia',
  bass: 'baixos',
  chordButtons: 'acordes',
  baseCell: 'base',
  baiaoCell: 'baião',
  breque: 'breque',
  brequeValue: 'todos no 1, depois silêncio',
  back: 'volta',
  backValue: 'a sanfona puxa a volta',
  instruments: 'instrumentos',
  bars: 'compassos',
};
const COPY = {
  name: 'forró pé-de-serra',
  selector: 'forró', // the rhythm selector's chip
  description: 'Forró pé-de-serra: triângulo, zabumba e sanfona, um de cada vez e depois juntos, com o baião em 3 + 3 + 2.', // the page's search and preview description
  feminineInstruments: ['zabumba', 'sanfona', 'rabeca'], // "som da zabumba", "som do triângulo"
  scenes: {
    triangulo: { chip: 'Triângulo', eyebrow: 'forró pé-de-serra', title: 'Triângulo' },
    zabumba: { chip: 'Zabumba', eyebrow: 'pele grave', title: 'Zabumba' },
    bacalhau: { chip: 'Bacalhau', eyebrow: 'bacalhau no contratempo', title: 'Bacalhau' },
    trio: { chip: 'Trio', eyebrow: 'sanfona, zabumba e triângulo', title: 'Trio' },
    sanfona: { chip: 'Sanfona', eyebrow: 'melodia na sanfona', title: 'Sanfona' },
    baixo: { chip: 'Baixo e cavaquinho', eyebrow: 'a segunda parte, com a banda', title: 'Baixo e cavaquinho' },
    rabeca: { chip: 'Rabeca e bandolim', eyebrow: 'as duas partes, melodia dobrada', title: 'Rabeca e bandolim' },
    fole: { chip: 'Fole', eyebrow: 'acentos de fole em 3 + 3 + 2', title: 'Jogo de fole' },
    baiao: { chip: 'Baião', eyebrow: 'levada de baião na zabumba', title: 'Baião' },
    breque: { chip: 'Breque', eyebrow: 'parada', title: 'Breque' },
    final: { chip: 'Final', eyebrow: '', title: 'Fim' },
  },
  patterns: { baiao: 'Baião' },
  voices: {
    grave: READ.grave,
    bacalhau: READ.bacalhau,
    triangulo: 'triângulo',
    fole: 'fole',
    baixo: READ.baixo,
    cavaquinho: READ.cavaquinho,
    sanfona: READ.sanfona,
    rabeca: READ.rabeca,
    bandolim: READ.bandolim,
  },
  instruments: { zabumba: 'zabumba' }, // an instrument with hands is named over each hand
  hands: { grave: READ.grave, bacalhau: READ.bacalhau },
  centre: { cut: 'BREQUE', end: 'FIM', offbeat: 'CONTRATEMPO' },
  read: READ,
};

// ---------- readout layouts ----------
const T = READ;
const beatSeparator = step => (step % STEPS_PER_BEAT === STEPS_PER_BEAT - 1 && step < STEPS_PER_BAR - 1 ? '|' : '');
const sequence = (steps, mark) => STEPS.map(step => (steps.includes(step) ? mark : '·') + beatSeparator(step)).join('');
const countFromOne = steps => steps.map(step => step + 1).join(' ');
const seqRow = (name, steps, color, id, mark = '●') =>
  `${label(name, color, id)}<span class="seq" style="color:${color}"${id ? ` data-inst="${id}"` : ''}>${sequence(steps, mark)}</span><span class="n">${steps.length}</span>`;
const notation = (...rows) => `<div class="notation">${rows.join('')}</div>`;
const CLOSED = STEPS.filter(step => !TRIANGLE_OPEN.includes(step));
const BASE_GRAVE = stepsOf(PATTERNS.base.grave);
const BAIAO_GRAVE = stepsOf(PATTERNS.baiao.grave);
const [LEFT_BAR] = FOLE.base;
const [STRUM_BAR] = CAVAQUINHO;
const BASS_STEPS = PARTS.B[0].baixo.map(note => note.step);
/** A part's chords, each change once, by a key of CHORDS (`name` or `degree`). */
const changes = (part, key) =>
  part.chords
    .filter((chord, bar) => chord !== part.chords[bar - 1])
    .map(chord => CHORDS[chord][key])
    .join(' · ');

const LAYOUTS = {
  triangulo: () =>
    notation(seqRow(T.closed, CLOSED, FORRO.steel, 'triangulo'), seqRow(T.open, TRIANGLE_OPEN, FORRO.steel, 'triangulo', '○')) +
    row(label(T.meter), T.meterValue) +
    row(label(T.tempo), T.tempoValue),
  zabumba: () =>
    notation(seqRow(T.grave, BASE_GRAVE, FORRO.leather, 'zabumba')) +
    row(label(T.cell), T.cellValue) +
    row(label(T.grave), T.pressed) +
    row(label(T.pickUp), T.pickUpValue),
  bacalhau: () =>
    notation(seqRow(T.grave, BASE_GRAVE, FORRO.leather, 'zabumba'), seqRow(T.bacalhau, PATTERNS.base.bacalhau, FORRO.bamboo, 'zabumba')) +
    row(label(T.onOffbeat, FORRO.bamboo), countFromOne(PATTERNS.base.bacalhau), 'zabumba'),
  trio: () =>
    notation(seqRow(T.bass, LEFT_BAR.bass, FORRO.pearl, 'sanfona'), seqRow(T.chordButtons, LEFT_BAR.chord, FORRO.pearl, 'sanfona', '○')) +
    row(label(T.chords), changes(PART_A, 'name')) +
    row(label(T.degrees), changes(PART_A, 'degree')),
  sanfona: () =>
    row(label(T.scale), MODE.map(n => (n === SIXTH ? `<b style="color:${FORRO.red}">${SOLFEGE[n]}</b>` : SOLFEGE[n])).join(' ')) +
    row(label(T.sixth, FORRO.red), SOLFEGE[SIXTH]) +
    row(label(T.mode), T.modeValue) +
    row(label(T.phrase), T.phraseValue),
  baixo: () =>
    notation(seqRow(T.baixo, BASS_STEPS, FORRO.dusk, 'baixo'), seqRow(T.cavaquinho, STRUM_BAR, FORRO.teal, 'cavaquinho')) +
    row(label(T.baixo, FORRO.dusk), T.baixoValue, 'baixo') +
    row(label(T.secondPart), T.secondPartValue) +
    row(label(T.chords), changes(PART_B, 'name')),
  rabeca: () =>
    row(label(T.sanfona, FORRO.red), T.melody, 'sanfona') +
    row(label(T.rabeca, FORRO.varnish), T.rabecaValue, 'rabeca') +
    row(label(T.bandolim, FORRO.spruce), T.thirdBelow, 'bandolim'),
  fole: () =>
    notation(seqRow(T.accents, JOGO_ACCENTS, FORRO.pearl, 'sanfona'), seqRow(T.grave, BASE_GRAVE, FORRO.leather, 'zabumba')) +
    row(label(T.accents), T.groups) +
    row(label(T.shake), T.shakeValue, 'sanfona'),
  baiao: () =>
    notation(seqRow(T.baseCell, BASE_GRAVE, FORRO.leather, 'zabumba', '○'), seqRow(T.baiaoCell, BAIAO_GRAVE, FORRO.leather, 'zabumba')) +
    row(label(T.accents), T.groups),
  breque: () => row(label(T.breque), T.brequeValue) + row(label(T.back), T.backValue, 'sanfona'),
  final: show =>
    stats('', stat(INSTRUMENTS.length, T.instruments, FORRO.red), stat(show.totalBars, T.bars, FORRO.spruce), stat(BPM, 'BPM', FORRO.steel)) +
    row(label(T.mode), T.modeValue),
};
const FOCUS = { triangulo: 'triangulo', zabumba: 'zabumba', bacalhau: 'zabumba', trio: 'sanfona', sanfona: 'sanfona', fole: 'sanfona', baiao: 'zabumba' };

/** The readout for a scene: its markup, no score, and the instrument it is about. */
const readout = (scene, show) => ({ markup: LAYOUTS[scene.id](show), score: null, focus: FOCUS[scene.id] || '' });

export const FORRO_PIECES = { WRITTEN, PARTS, CHORDS, MODE, LEADING_NOTE, PATTERNS, TOKEN, midiOf, thirdBelow }; // for the tests

export const FORRO_PE_DE_SERRA = {
  id: 'forro',
  ...straightMeter(BPM, BEATS_PER_BAR, STEPS_PER_BEAT), // the grid stays straight; the triângulo's lilt is the studio's (docs/rhythms/forro.md)
  voices: VOICES,
  shapeVoices: ['bacalhau', 'grave'],
  barHits,
  sceneDefaults: { tune: ['A'], zabumba: 'base', fole: 'base' },
  sounds: studioSounds(STUDIO, SOUND_CHOICES, 'final'), // its first bar: every instrument plays its basic part
  scenes: SCENE_LIST,
  looks: SCENE_LOOKS,
  background: { create: () => ({ draw: drawForroBackdrop }) },
  readout,
  waves: null,
  copy: COPY,
};

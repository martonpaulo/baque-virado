// Forró pé-de-serra: everything the engine plays and shows that belongs to this rhythm.
// A 2/4 bar of 8 sixteenths, one bar per turn of the wheel, 120 BPM for the whole show.
// Feeling: saudade of the sertão inside the party. The melody is original, in G mixolydian (the
// flat seventh, F natural, on a strong beat), over I, ♭VII and IV (G, F, C).
// Choices and their reasons: docs/rhythms/forro.md.
import { label, row, stat, stats } from '../readout-markup.js';
import { FORRO } from '../theme.js';
import { drawForroBackdrop } from './forro-backdrop.js';

const BPM = 120;
const BEATS_PER_BAR = 2;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;
const STEPS = [...Array(STEPS_PER_BAR).keys()];
const BARS_PER_MOTIF = 2;
const PHRASE_BARS = 8;

// ---------- notes ----------
const NOTE_NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MIDI_OCTAVE = 12;
const MIDI_C0 = 12;
const LONG = ':L'; // a held note plays the long sample
/** MIDI number of a note name such as 'D5'. */
const midiOf = name => MIDI_C0 + MIDI_OCTAVE * Number(name.slice(1)) + NOTE_NAMES[name[0]];
const nameOf = midi => Object.keys(NOTE_NAMES).find(n => NOTE_NAMES[n] === midi % MIDI_OCTAVE) + Math.floor((midi - MIDI_C0) / MIDI_OCTAVE);
// G mixolydian: G A B C D E F
const MODE = ['G', 'A', 'B', 'C', 'D', 'E', 'F'];
const MODE_PITCHES = MODE.map(n => NOTE_NAMES[n]);
const SOLFEGE = { G: 'sol', A: 'lá', B: 'si', C: 'dó', D: 'ré', E: 'mi', F: 'fá' };
const THIRD = 2; // scale steps
/** The note of the mode a third below (two scale steps), as the bandolim doubles the melody. */
function thirdBelow(name) {
  let midi = midiOf(name),
    steps = 0;
  while (steps < THIRD) {
    midi--;
    if (MODE_PITCHES.includes(midi % MIDI_OCTAVE)) steps++;
  }
  return nameOf(midi);
}

// ---------- the tune ----------
// Each motif is two bars: a chord per bar and the melody's [step, note, held?] per bar. A is the
// hook; A2 is A varied (same shape, moved up to IV); B answers. A phrase plays A three times, varied
// once, and ends on A unchanged.
const MOTIFS = {
  A: {
    chords: ['G', 'F'],
    melody: [
      [
        [0, 'D5'],
        [2, 'B4'],
        [3, 'D5'],
        [4, 'F5', true],
      ],
      [
        [0, 'E5'],
        [1, 'F5'],
        [2, 'E5'],
        [4, 'C5'],
        [6, 'A4'],
        [7, 'B4'],
      ],
    ],
  },
  A2: {
    chords: ['C', 'G'],
    melody: [
      [
        [0, 'E5'],
        [2, 'C5'],
        [3, 'E5'],
        [4, 'G5', true],
      ],
      [
        [0, 'F5'],
        [1, 'G5'],
        [2, 'F5'],
        [4, 'D5'],
        [6, 'B4'],
        [7, 'C5'],
      ],
    ],
  },
  B: {
    chords: ['C', 'G'],
    melody: [
      [
        [0, 'G5'],
        [2, 'E5'],
        [4, 'C5', true],
        [7, 'C5'],
      ],
      [
        [0, 'B4'],
        [2, 'D5'],
        [3, 'F5'],
        [4, 'E5'],
        [6, 'D5'],
        [7, 'C5'],
      ],
    ],
  },
};
const PHRASE = ['A', 'A', 'A2', 'A'];
const ANSWER = ['B', 'B', 'A2', 'A'];
const HOOK = { repeats: PHRASE.filter(m => m === 'A').length, variations: PHRASE.filter(m => m === 'A2').length };

// The chords as the readout names them, and the bass notes each one gives: [root, fifth below].
const CHORD_NAMES = { G: 'Sol', F: 'Fá', C: 'Dó' }; // a major chord is named by its root
const DEGREES = { G: 'I', F: '♭VII', C: 'IV' };
const BASS = { G: ['G2', 'D2'], F: ['F2', 'C2'], C: ['C3', 'G2'] };

// ---------- the percussion ----------
// Steps of the 2/4 bar, from 0. The zabumba's maceta plays the low head, the bacalhau (a thin rod)
// the lower one; the triângulo plays every sixteenth, closed by the hand and open on the off-beats.
const PATTERNS = {
  base: { grave: [0, 3, 4], bacalhau: [2, 6] }, // dotted eighth, sixteenth, eighth: the baião cell
  baiao: { grave: [0, 3, 6], bacalhau: [2, 4] }, // 3 + 3 + 2
  virada: { grave: [0, 2, 3, 4, 6, 7], bacalhau: [] }, // the zabumba's fill at a phrase end
};
const MUTED_STEP = 4; // in the base cell, the eighth on beat 2 is pressed by the hand (abafada)
const TRIANGLE_OPEN = [2, 6];
const TRIANGLE_VELOCITY = [0.9, 0.45, 1, 0.5, 0.85, 0.45, 1, 0.5];
const FOLE = {
  base: { bass: [0, 4], chord: [2, 6] }, // the left hand: bass button, then chord button
  jogo: { bass: [0], chord: [0, 3, 6] }, // jogo de fole: bellows accents in 3 + 3 + 2
};
const CAVAQUINHO_STEPS = [2, 6];
const BAIXO_STEPS = [0, 3, 4]; // with the zabumba's low head: root, root, fifth
const VELOCITY = { strong: 1, medium: 0.85, soft: 0.7, light: 0.6 };
const SAMPLE = { aberto: 'aberto', fechado: 'fechado', abafada: 'abafada' };

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
const melodyHits = notes => notes.map(([step, note, held]) => hit(step, step % STEPS_PER_BEAT ? VELOCITY.medium : VELOCITY.strong, held ? note + LONG : note));
const thirdsOf = notes => notes.map(([step, note, held]) => [step, thirdBelow(note), held]);

/** The motif and the half of it that bar `barInScene` of a scene plays. */
function motifAt(scene, barInScene) {
  const motif = MOTIFS[scene.tune[Math.floor(barInScene / BARS_PER_MOTIF) % scene.tune.length]];
  return { motif, half: barInScene % BARS_PER_MOTIF };
}

/** Every voice's hits for one bar of a scene; the scene's `voices` choose which ones sound. */
function barHits(scene, barInScene) {
  const { motif, half } = motifAt(scene, barInScene),
    chord = motif.chords[half],
    [root, fifth] = BASS[chord];
  const isPhraseEnd = barInScene % PHRASE_BARS === PHRASE_BARS - 1 && scene.bars > PHRASE_BARS - 1;
  if (scene.mode(barInScene) === 'cut') return cutBar(scene);
  const drum = PATTERNS[isPhraseEnd ? 'virada' : scene.zabumba];
  const fole = FOLE[scene.fole];
  return {
    grave: drum.grave.map(step =>
      hit(step, step ? VELOCITY.medium : VELOCITY.strong, scene.zabumba === 'base' && !isPhraseEnd && step === MUTED_STEP ? SAMPLE.abafada : SAMPLE.aberto),
    ),
    bacalhau: drum.bacalhau.map(step => hit(step, VELOCITY.soft)),
    triangulo: STEPS.map(step => hit(step, TRIANGLE_VELOCITY[step], TRIANGLE_OPEN.includes(step) ? SAMPLE.aberto : SAMPLE.fechado)),
    fole: [
      ...fole.bass.map(step => hit(step, VELOCITY.strong, `b:${step < STEPS_PER_BEAT ? root : fifth}`)),
      ...fole.chord.map(step => hit(step, step ? VELOCITY.medium : VELOCITY.strong, `a:${chord}`)),
    ].sort((a, b) => a.step - b.step),
    baixo: BAIXO_STEPS.map(step => hit(step, step ? VELOCITY.soft : VELOCITY.strong, step === MUTED_STEP ? fifth : root)),
    cavaquinho: CAVAQUINHO_STEPS.map(step => hit(step, VELOCITY.soft, chord)),
    sanfona: melodyHits(motif.melody[half]),
    rabeca: melodyHits(motif.melody[half]),
    bandolim: melodyHits(thirdsOf(motif.melody[half])),
  };
}

// The breque: everyone on 1, then silence, and the sanfona leads the band back with a pick-up into
// the hook. The final cut: everyone on 1, on the tonic, and the end.
const PICK_UP = [
  [6, 'B4'],
  [7, 'C5'],
];
const FINAL_NOTE = 'G5';
const FINAL_THIRD = 'D5'; // the bandolim ends on the fifth, under the tonic
function cutBar(scene) {
  const [root] = BASS.G,
    bar = {
      ...silentBar(),
      grave: [hit(0, VELOCITY.strong, SAMPLE.aberto)],
      triangulo: [hit(0, VELOCITY.strong, SAMPLE.aberto)],
      baixo: [hit(0, VELOCITY.strong, root)],
    };
  if (!scene.isEnd) return { ...bar, sanfona: melodyHits(PICK_UP) };
  const held = [[0, FINAL_NOTE, true]];
  return {
    ...bar,
    fole: [hit(0, VELOCITY.strong, `b:${root}`), hit(0, VELOCITY.strong, 'a:G')],
    cavaquinho: [hit(0, VELOCITY.strong, 'G')],
    sanfona: melodyHits(held),
    rabeca: melodyHits(held),
    bandolim: melodyHits([[0, FINAL_THIRD, true]]),
  };
}

// ---------- the show script ----------
// Eleven scenes after docs/sketches/scripts.html: the parts enter one by one, the band plays the
// tune, the zabumba changes its cell, a breque, and the end. 98 bars at 120 BPM: 1:38.
const always = value => () => value;
const TRIO = ['triangulo', 'grave', 'bacalhau'];
const SCENE_LIST = [
  { id: 'triangulo', bars: 8, voices: always(['triangulo']), lanes: ['triangulo'] },
  { id: 'zabumba', bars: 8, voices: always(['triangulo', 'grave']), lanes: ['triangulo', 'grave'] },
  { id: 'bacalhau', bars: 8, voices: always(TRIO), lanes: ['triangulo', 'grave', 'bacalhau'] },
  { id: 'trio', bars: 4, tune: ['A', 'A2'], voices: always([...TRIO, 'fole']), lanes: ['fole', 'grave', 'triangulo'] },
  { id: 'sanfona', bars: 16, tune: [...PHRASE, ...ANSWER], voices: always([...TRIO, 'sanfona']), lanes: ['sanfona', 'grave', 'bacalhau'] },
  { id: 'baixo', bars: 8, voices: always([...TRIO, 'fole', 'baixo', 'cavaquinho']), lanes: ['cavaquinho', 'baixo', 'grave'] },
  {
    id: 'rabeca',
    bars: 16,
    tune: [...PHRASE, ...ANSWER],
    voices: always([...TRIO, 'baixo', 'cavaquinho', 'sanfona', 'rabeca', 'bandolim']),
    lanes: ['sanfona', 'rabeca', 'bandolim'],
  },
  { id: 'fole', bars: 8, fole: 'jogo', voices: always([...TRIO, 'baixo', 'fole']), lanes: ['fole', 'grave'] },
  {
    id: 'baiao',
    bars: 12,
    tune: ['A', 'B', 'A2', 'A', 'B', 'A'],
    zabumba: 'baiao',
    named: true,
    pattern: 'baiao',
    voices: always([...TRIO, 'baixo', 'cavaquinho', 'sanfona']),
    lanes: ['grave', 'bacalhau', 'baixo'],
  },
  { id: 'breque', bars: 2, mode: bar => (bar === 1 ? 'cut' : 'normal'), voices: always([...TRIO, 'baixo', 'sanfona']), lanes: ['grave', 'baixo', 'sanfona'] },
  { id: 'final', bars: 8, mode: bar => (bar === PHRASE_BARS - 1 ? 'cut' : 'normal'), lanes: ['sanfona', 'fole', 'grave'], isEnd: true },
];

// The background is drawn by forro-backdrop.js; `speed` is the only look the engine reads (the pace
// of the visual clock), and the feedback keys stay still.
const LOOK = { zoom: 0, rot: 0, hue: 0, keep: 0, seg: 1, warp: 0, speed: 1, pal: 0 };
const SCENE_LOOKS = Object.fromEntries(SCENE_LIST.map(scene => [scene.id, LOOK]));

// ---------- sound ----------
// The zabumba reuses the repository's alfaia and stick recordings; every other instrument is
// synthesized by tools/synth-forro.mjs. A melodic sample is one note at its base pitch, retuned by
// the playback rate.
const BASE_MIDI = { sanfona: 74, rabeca: 74, bandolim: 72, baixo: 43, fole: 43 };
const rateFor = (note, base) => 2 ** ((midiOf(note) - base) / MIDI_OCTAVE);
const ZABUMBA_FILES = {
  funda: { aberto: 'alfaia-deep-main', abafada: 'alfaia-deep-short-main' },
  seca: { aberto: 'alfaia-dry-surdo-main', abafada: 'alfaia-dry-body-answer' },
};
const BACALHAU = { file: 'stick', rate: 1.2 };
const melodicFiles = instrument => [`${instrument}-curta`, `${instrument}-longa`];
const CHORD_FILES = instrument => Object.keys(CHORD_NAMES).map(chord => `${instrument}-${chord.toLowerCase()}`);
const SOUND_CHOICES = [
  {
    id: 'zabumba',
    label: 'zabumba',
    defaultOption: 'funda',
    preview: ['grave', 'bacalhau'],
    files: o => Object.values(ZABUMBA_FILES[o]),
    options: [
      ['funda', 'zabumba funda'],
      ['seca', 'zabumba seca'],
    ],
  },
  {
    id: 'triangulo',
    label: 'triângulo',
    defaultOption: 'aco',
    preview: ['triangulo'],
    files: () => ['triangulo-aberto', 'triangulo-fechado'],
    options: [['aco', 'triângulo de aço']],
  },
  {
    id: 'sanfona',
    label: 'sanfona',
    defaultOption: 'oito-baixos',
    preview: ['fole', 'sanfona'],
    files: () => [...melodicFiles('sanfona'), 'sanfona-baixo', ...CHORD_FILES('sanfona-acorde')],
    options: [['oito-baixos', 'sanfona']],
  },
  { id: 'rabeca', label: 'rabeca', defaultOption: 'rabeca', preview: ['rabeca'], files: () => melodicFiles('rabeca'), options: [['rabeca', 'rabeca']] },
  {
    id: 'bandolim',
    label: 'bandolim',
    defaultOption: 'bandolim',
    preview: ['bandolim'],
    files: () => melodicFiles('bandolim'),
    options: [['bandolim', 'bandolim']],
  },
  {
    id: 'cavaquinho',
    label: 'cavaquinho',
    defaultOption: 'cavaquinho',
    preview: ['cavaquinho'],
    files: () => CHORD_FILES('cavaquinho'),
    options: [['cavaquinho', 'cavaquinho']],
  },
  { id: 'baixo', label: 'baixo', defaultOption: 'baixo', preview: ['baixo'], files: () => ['baixo'], options: [['baixo', 'baixo']] },
];

/** A melody note: the short or the long sample, retuned to the note. */
const melodic = (instrument, gain) => (_choice, velocity, tone) => {
  const held = tone.endsWith(LONG),
    note = held ? tone.slice(0, -LONG.length) : tone;
  return [`${instrument}-${held ? 'longa' : 'curta'}`, gain * velocity, rateFor(note, BASE_MIDI[instrument])];
};
const GAIN = {
  grave: 1.05,
  abafada: 0.9,
  bacalhau: 0.45,
  triangulo: 0.32,
  fole: 0.36,
  foleBass: 0.42,
  baixo: 0.75,
  cavaquinho: 0.4,
  sanfona: 0.42,
  rabeca: 0.24,
  bandolim: 0.3,
};
// voice → [sample, gain, playback rate] for one hit
const SAMPLE_FOR = {
  grave: (choice, velocity, tone) => [ZABUMBA_FILES[choice.zabumba][tone], (tone === SAMPLE.abafada ? GAIN.abafada : GAIN.grave) * velocity, 1],
  bacalhau: (_choice, velocity) => [BACALHAU.file, GAIN.bacalhau * velocity, BACALHAU.rate],
  triangulo: (_choice, velocity, tone) => [`triangulo-${tone}`, GAIN.triangulo * velocity, 1],
  fole: (_choice, velocity, tone) => {
    const [kind, value] = tone.split(':');
    return kind === 'b'
      ? ['sanfona-baixo', GAIN.foleBass * velocity, rateFor(value, BASE_MIDI.fole)]
      : [`sanfona-acorde-${value.toLowerCase()}`, GAIN.fole * velocity, 1];
  },
  baixo: (_choice, velocity, tone) => ['baixo', GAIN.baixo * velocity, rateFor(tone, BASE_MIDI.baixo)],
  cavaquinho: (_choice, velocity, tone) => [`cavaquinho-${tone.toLowerCase()}`, GAIN.cavaquinho * velocity, 1],
  sanfona: melodic('sanfona', GAIN.sanfona),
  rabeca: melodic('rabeca', GAIN.rabeca),
  bandolim: melodic('bandolim', GAIN.bandolim),
};

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
  chords: 'acordes',
  degrees: 'graus',
  mode: 'modo',
  scale: 'escala',
  modeValue: 'mixolídio: maior com sétima menor',
  seventh: 'sétima menor',
  motif: 'motivo',
  motifValue: `${BARS_PER_MOTIF} compassos, ${HOOK.repeats} vezes, ${HOOK.variations} variação`,
  baixo: 'baixo',
  baixoValue: 'fundamental e quinta, com a maceta',
  cavaquinho: 'cavaquinho',
  sanfona: 'sanfona',
  melody: 'melodia',
  rabeca: 'rabeca',
  unison: 'em uníssono',
  bandolim: 'bandolim',
  thirdBelow: 'uma terça abaixo',
  accents: 'acentos',
  groups: '3 + 3 + 2',
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
  feminineInstruments: ['zabumba', 'sanfona', 'rabeca'], // "som da zabumba", "som do triângulo"
  scenes: {
    triangulo: { chip: 'Triângulo', eyebrow: 'forró pé-de-serra', title: 'Triângulo' },
    zabumba: { chip: 'Zabumba', eyebrow: 'pele grave', title: 'Zabumba' },
    bacalhau: { chip: 'Bacalhau', eyebrow: 'bacalhau no contratempo', title: 'Bacalhau' },
    trio: { chip: 'Trio', eyebrow: 'sanfona, zabumba e triângulo', title: 'Trio' },
    sanfona: { chip: 'Sanfona', eyebrow: 'melodia na sanfona', title: 'Sanfona' },
    baixo: { chip: 'Baixo e cavaquinho', eyebrow: 'baixo e cavaquinho', title: 'Baixo e cavaquinho' },
    rabeca: { chip: 'Rabeca e bandolim', eyebrow: 'melodia dobrada', title: 'Rabeca e bandolim' },
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
const PHRASE_CHORDS = PHRASE.flatMap(m => MOTIFS[m].chords);

const LAYOUTS = {
  triangulo: () =>
    notation(seqRow(T.closed, CLOSED, FORRO.steel, 'triangulo'), seqRow(T.open, TRIANGLE_OPEN, FORRO.steel, 'triangulo', '○')) +
    row(label(T.meter), T.meterValue) +
    row(label(T.tempo), T.tempoValue),
  zabumba: () => notation(seqRow(T.grave, PATTERNS.base.grave, FORRO.leather, 'zabumba')) + row(label(T.cell), T.cellValue) + row(label(T.grave), T.pressed),
  bacalhau: () =>
    notation(seqRow(T.grave, PATTERNS.base.grave, FORRO.leather, 'zabumba'), seqRow(T.bacalhau, PATTERNS.base.bacalhau, FORRO.bamboo, 'zabumba')) +
    row(label(T.onOffbeat, FORRO.bamboo), countFromOne(PATTERNS.base.bacalhau), 'zabumba'),
  trio: () =>
    notation(seqRow(T.bass, FOLE.base.bass, FORRO.pearl, 'sanfona'), seqRow(T.chordButtons, FOLE.base.chord, FORRO.pearl, 'sanfona', '○')) +
    row(label(T.chords), ['A', 'A2'].flatMap(m => MOTIFS[m].chords.map(c => CHORD_NAMES[c])).join(' · ')) +
    row(label(T.degrees), ['A', 'A2'].flatMap(m => MOTIFS[m].chords.map(c => DEGREES[c])).join(' · ')),
  sanfona: () =>
    row(label(T.scale), MODE.map(n => (n === MODE.at(-1) ? `<b style="color:${FORRO.red}">${SOLFEGE[n]}</b>` : SOLFEGE[n])).join(' ')) +
    row(label(T.seventh, FORRO.red), SOLFEGE[MODE.at(-1)]) +
    row(label(T.mode), T.modeValue) +
    row(label(T.motif), T.motifValue),
  baixo: () =>
    notation(seqRow(T.baixo, BAIXO_STEPS, FORRO.dusk, 'baixo'), seqRow(T.cavaquinho, CAVAQUINHO_STEPS, FORRO.teal, 'cavaquinho')) +
    row(label(T.baixo, FORRO.dusk), T.baixoValue, 'baixo') +
    row(label(T.cavaquinho, FORRO.teal), `${T.onOffbeat}: ${countFromOne(CAVAQUINHO_STEPS)}`, 'cavaquinho') +
    row(label(T.chords), PHRASE_CHORDS.map(c => CHORD_NAMES[c]).join(' · ')),
  rabeca: () =>
    row(label(T.sanfona, FORRO.red), T.melody, 'sanfona') +
    row(label(T.rabeca, FORRO.varnish), T.unison, 'rabeca') +
    row(label(T.bandolim, FORRO.spruce), T.thirdBelow, 'bandolim'),
  fole: () =>
    notation(seqRow(T.chordButtons, FOLE.jogo.chord, FORRO.pearl, 'sanfona'), seqRow(T.grave, PATTERNS.base.grave, FORRO.leather, 'zabumba')) +
    row(label(T.accents), T.groups),
  baiao: () =>
    notation(seqRow(T.baseCell, PATTERNS.base.grave, FORRO.leather, 'zabumba', '○'), seqRow(T.baiaoCell, PATTERNS.baiao.grave, FORRO.leather, 'zabumba')) +
    row(label(T.accents), T.groups),
  breque: () => row(label(T.breque), T.brequeValue) + row(label(T.back), T.backValue, 'sanfona'),
  final: show =>
    stats('', stat(INSTRUMENTS.length, T.instruments, FORRO.red), stat(show.totalBars, T.bars, FORRO.spruce), stat(BPM, 'BPM', FORRO.steel)) +
    row(label(T.mode), T.modeValue),
};
const FOCUS = { triangulo: 'triangulo', zabumba: 'zabumba', bacalhau: 'zabumba', trio: 'sanfona', sanfona: 'sanfona', fole: 'sanfona', baiao: 'zabumba' };

/** The readout for a scene: its markup, no score, and the instrument it is about. */
const readout = (scene, show) => ({ markup: LAYOUTS[scene.id](show), score: null, focus: FOCUS[scene.id] || '' });

export const FORRO_PIECES = { MOTIFS, PHRASE, ANSWER, MODE, PATTERNS, midiOf, thirdBelow }; // for the tests

export const FORRO_PE_DE_SERRA = {
  id: 'forro',
  bpm: BPM,
  beatsPerBar: BEATS_PER_BAR,
  stepsPerBeat: STEPS_PER_BEAT,
  swing: {}, // no measured swing for this rhythm: the grid stays straight (docs/rhythms/forro.md)
  voices: VOICES,
  shapeVoices: ['bacalhau', 'grave'],
  barHits,
  sceneDefaults: { tune: PHRASE, zabumba: 'base', fole: 'base' },
  scenes: SCENE_LIST,
  looks: SCENE_LOOKS,
  backdrop: drawForroBackdrop,
  readout,
  waves: null,
  sounds: {
    choices: SOUND_CHOICES,
    fixedFiles: [BACALHAU.file],
    sampleFor: SAMPLE_FOR,
    previewScene: 'final', // its first bar: every instrument plays its basic part
  },
  copy: COPY,
};

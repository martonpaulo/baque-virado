// A tiny second rhythm, used only by the tests, never shipped: a 2/4 bar (8 steps, one bar per
// turn of the wheel) with two hands and a bell. It proves the engine takes any rhythm package
// (src/rhythms/maracatu.js is the real one) and that the rhythm selector works.
import { COLORS, ROLES } from '../../src/theme.js';

const hit = (step, velocity, tone) => (tone ? { step, velocity, tone } : { step, velocity });
const LOOK = { zoom: 0.5, rot: 0.1, hue: 40, keep: 0.9, seg: 6, warp: 0.8, speed: 0.6, pal: 0.2 };

export const TWO_FOUR = {
  id: 'dois-por-quatro',
  bpm: 100,
  beatsPerBar: 2,
  stepsPerBeat: 4,
  swing: { low: [0, 0.02, -0.01, 0] },
  voices: {
    main: { instrument: 'alfaia', ring: 98, size: 5.6, swing: 'low', color: ROLES.mainHand, hand: true, boom: 1 },
    answer: { instrument: 'alfaia', ring: 87, size: 4.8, swing: 'low', color: ROLES.answerHand, hand: true, boom: 0.7 },
    agogo: { instrument: 'agogo', ring: 45, size: 4.4, swing: null, color: COLORS.acid, spark: true },
  },
  shapeVoices: ['agogo', 'main'],
  barHits: scene => ({
    main: [hit(0, 1), hit(3, 0.8), hit(6, 1)],
    answer: [hit(4, 0.9)],
    agogo: scene.mode() === 'normal' ? [hit(0, 1, 'low'), hit(2, 0.8, 'high'), hit(5, 0.8, 'high')] : [],
  }),
  sceneDefaults: {},
  scenes: [
    { id: 'entrada', bars: 2, voices: () => ['main', 'answer'], lanes: ['main', 'answer'] },
    { id: 'roda', bars: 3, lanes: ['main', 'answer', 'agogo'], isEnd: true },
  ],
  looks: { entrada: LOOK, roda: { ...LOOK, hue: 90 } },
  readout: () => ({ markup: '', score: null, focus: '' }),
  waves: null,
  sounds: {
    choices: [
      {
        id: 'alfaia',
        label: 'alfaia',
        defaultOption: 'deep-click',
        preview: ['main', 'answer'],
        files: o => [`alfaia-${o}-main`, `alfaia-${o}-answer`],
        options: [['deep-click', 'teste']],
      },
    ],
    fixedFiles: ['agogo-short-bell'],
    sampleFor: {
      main: (choice, velocity) => [`alfaia-${choice.alfaia}-main`, velocity, 1],
      answer: (choice, velocity) => [`alfaia-${choice.alfaia}-answer`, velocity, 1],
      agogo: (_choice, velocity) => ['agogo-short-bell', velocity, 1],
    },
    previewScene: 'roda',
  },
  copy: {
    name: 'dois por quatro',
    selector: 'dois por quatro',
    feminineInstruments: ['alfaia'],
    scenes: { entrada: { chip: 'Entrada', eyebrow: 'teste', title: 'Entrada' }, roda: { chip: 'Roda', eyebrow: 'teste', title: 'Roda' } },
    patterns: {},
    voices: { main: 'principal', answer: 'resposta', agogo: 'agogô' },
    instruments: { alfaia: 'alfaia' },
    hands: {},
    centre: {},
    read: {},
  },
};

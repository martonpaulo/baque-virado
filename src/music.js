// What is played: tempo, voices, the measured swing and every rhythmic pattern.
// Positions are sixteenths of a 4/4 bar (0–15); a two-bar pattern uses 0–31.
import { COLORS, ROLES } from './theme.js';

export const BPM = 115;
export const BEAT_SECONDS = 60 / BPM;
export const BAR_SECONDS = BEAT_SECONDS * 4;
export const STEPS_PER_BAR = 16;
export const SIXTEENTHS = [...Array(STEPS_PER_BAR).keys()];

// Median offset of each sixteenth from the straight grid, in beats, measured on a workshop
// recording (Batuk Nagô). "high" drives caixa, agbê and ganzá; "low" drives the alfaias.
export const SWING = {
  high: [-0.003, 0.031, -0.016, -0.005],
  low: [0.005, -0.016, -0.029, -0.027],
};

/** The measured swing of one group, in whole milliseconds. */
export const swingMilliseconds = group => SWING[group].map(beats => Math.round(beats * BEAT_SECONDS * 1000));

// ring/size: where and how big the voice sits on the wheel (0 = not drawn). swing: which group it follows.
// instrument: the instrument the voice belongs to (the alfaia has three voices: two hands and the stick).
export const VOICES = {
  main: { instrument: 'alfaia', ring: 98, size: 5.6, swing: 'low', color: ROLES.mainHand },
  answer: { instrument: 'alfaia', ring: 87, size: 4.8, swing: 'low', color: ROLES.answerHand },
  stick: { instrument: 'alfaia', ring: 87, size: 4.2, swing: 'low', color: COLORS.bone },
  caixa: { instrument: 'caixa', ring: 75, size: 3.2, swing: 'high', color: COLORS.ice },
  agbe: { instrument: 'agbe', ring: 65, size: 3.2, swing: 'high', color: COLORS.magenta },
  ganza: { instrument: 'ganza', ring: 56, size: 2.6, swing: 'high', color: COLORS.violet },
  agogo: { instrument: 'agogo', ring: 45, size: 4.4, swing: null, color: COLORS.acid },
  whistle: { instrument: 'whistle', ring: 0, size: 0, swing: null, color: COLORS.white },
};

// The order also seeds the per-hit variation of the sound: keep it stable.
export const VOICE_ORDER = Object.keys(VOICES);
export const INSTRUMENTS = VOICE_ORDER.filter(voice => voice !== 'whistle'); // every voice that is drumming
/** Distinct instruments that drum (the whistle only calls): alfaia, caixa, agbê, ganzá, agogô. */
export const INSTRUMENT_COUNT = new Set(INSTRUMENTS.map(voice => VOICES[voice].instrument)).size;
export const ALFAIA_HANDS = ['main', 'answer'];
export const ALFAIA_WITH_STICK = ['main', 'answer', 'stick'];

export const isAlfaia = voice => voice === 'main' || voice === 'answer';
export const isOffbeat = step => step % 4 !== 0;
export const BEAT_STEPS = SIXTEENTHS.filter(step => !isOffbeat(step)); // the heads of the four beats
export const OFFBEAT_STEPS = SIXTEENTHS.filter(isOffbeat);
/** Sixteenths as musicians count them, from 1. */
export const countFromOne = (steps, separator) => steps.map(step => step + 1).join(separator);

/** How far a hit moves off the grid, in sixteenths, when swing is on. */
export function swingOffset(voice, step, swingOn) {
  const group = VOICES[voice].swing;
  return swingOn && group ? SWING[group][step % 4] * 4 : 0;
}

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
export const stepsOfBar = (steps, barIndex) =>
  (steps || []).filter(step => step >= barIndex * STEPS_PER_BAR && step < (barIndex + 1) * STEPS_PER_BAR).map(step => step - barIndex * STEPS_PER_BAR);

/** Every alfaia hit of a pattern, all bars together. */
export const allAlfaiaSteps = pattern => [...pattern.main, ...pattern.answer, ...(pattern.stick || [])];

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

// Special bars of the show:
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

// The order of the show: scenes, sections, the timeline and what sounds at any moment.
// Positions on the timeline are measured in bars (a float: 7.25 = a quarter into bar 8).
import { ALFAIA_HANDS, ALFAIA_WITH_STICK, BAR_SECONDS, barHits, INSTRUMENTS, swingOffset, VOICE_ORDER } from './music.js';
import { smooth } from './util.js';

const always = value => () => value;
const normal = always('normal');
const breakOnBar = n => bar => (bar === n ? 'break' : 'normal'); // last bar of a baque: the virada

const SCENE_DEFAULTS = { pattern: 'marcacao', mode: normal, voices: always(VOICE_ORDER), swing: always(true), gain: {}, named: false, isEnd: false };
const ENSEMBLE_ENTRY = ['agogo', 'caixa', 'agbe', 'ganza', 'answer', 'main'];

/** A baque scene: four bars, the last one a virada. */
const baque = (id, extra) => ({ id, pattern: id, section: 'D', bars: 4, mode: breakOnBar(3), lanes: ALFAIA_HANDS, named: true, ...extra });

// fx: how the background behaves (feedback zoom/rotation/hue/persistence, kaleidoscope mirrors, warp, speed, palette)
const SCENE_LIST = [
  {
    id: 'opening',
    section: 'A',
    bars: 5,
    mode: bar => ['call', 'roll'][bar] || 'normal',
    lanes: ['whistle', 'caixa', ...ALFAIA_HANDS],
    fx: { zoom: 0.9, rot: 0.15, hue: 70, keep: 0.93, seg: 16, warp: 1.0, speed: 0.7, pal: 0 },
  },
  {
    id: 'ensemble',
    section: 'B',
    bars: 6,
    voices: bar => ENSEMBLE_ENTRY.slice(0, bar + 1),
    lanes: INSTRUMENTS,
    fx: { zoom: 0.5, rot: 0.06, hue: 35, keep: 0.9, seg: 7, warp: 0.8, speed: 0.5, pal: 0.15 },
  },
  {
    id: 'agogo',
    section: 'B',
    bars: 2,
    voices: always(['agogo', 'caixa']),
    gain: { caixa: 0.32 },
    swing: always(false),
    lanes: ['agogo', 'caixa'],
    fx: { zoom: 0.25, rot: -0.5, hue: 90, keep: 0.94, seg: 10, warp: 0.6, speed: 0.6, pal: 0.4 },
  },
  {
    id: 'swing',
    section: 'C',
    bars: 4,
    voices: always(['main', 'answer', 'caixa', 'agbe', 'ganza', 'agogo']),
    swing: bar => bar >= 2,
    lanes: ['caixa', ...ALFAIA_HANDS],
    fx: { zoom: 0.08, rot: 0, hue: 15, keep: 0.8, seg: 4, warp: 0.45, speed: 0.3, pal: 0.6 },
  },
  {
    id: 'offbeat',
    section: 'C',
    bars: 3,
    voices: always([...ALFAIA_HANDS, 'agogo', 'caixa']),
    gain: { caixa: 0.45 },
    lanes: [...ALFAIA_HANDS, 'agogo'],
    fx: { zoom: 0.8, rot: 0.22, hue: 120, keep: 0.93, seg: 12, warp: 1.2, speed: 0.9, pal: 0.3 },
  },
  baque('marcacao', { fx: { zoom: 1.0, rot: -0.14, hue: 80, keep: 0.93, seg: 5, warp: 1.1, speed: 0.9, pal: 0.25 } }),
  baque('arrasto', { fx: { zoom: 0.9, rot: 0.12, hue: 70, keep: 0.93, seg: 7, warp: 1.0, speed: 0.9, pal: 0.15 } }),
  baque('imale', { mode: bar => (bar === 3 ? 'cut' : 'normal'), fx: { zoom: 0.8, rot: 0.18, hue: 60, keep: 0.93, seg: 7, warp: 1.0, speed: 0.8, pal: 0.1 } }),
  baque('martelo', { fx: { zoom: 1.6, rot: 0.35, hue: 150, keep: 0.95, seg: 8, warp: 1.5, speed: 1.4, pal: 0.5 } }),
  baque('trovao', { lanes: ALFAIA_WITH_STICK, fx: { zoom: 1.2, rot: -0.3, hue: 130, keep: 0.94, seg: 5, warp: 1.3, speed: 1.1, pal: 0.6 } }),
  baque('afoxe', { fx: { zoom: 0.7, rot: 0.1, hue: 90, keep: 0.93, seg: 6, warp: 1.1, speed: 0.8, pal: 0.35 } }),
  baque('parada', {
    mode: normal,
    lanes: ALFAIA_WITH_STICK,
    fx: { zoom: 0.6, rot: -0.25, hue: 110, keep: 0.93, strobe: 1, seg: 15, warp: 1.2, speed: 1.0, pal: 0.75 },
  }),
  {
    id: 'summary',
    section: 'E',
    bars: 3,
    lanes: ALFAIA_HANDS,
    named: true,
    fx: { zoom: 0.8, rot: 0.12, hue: 60, keep: 0.93, seg: 16, warp: 1.0, speed: 0.8, pal: 0.9 },
  },
  {
    id: 'finale',
    section: 'E',
    bars: 3,
    mode: bar => (bar < 2 ? 'break' : 'cut'),
    lanes: [...ALFAIA_HANDS, 'whistle'],
    isEnd: true,
    fx: { zoom: 1.4, rot: 0.3, hue: 160, keep: 0.95, seg: 16, warp: 1.4, speed: 1.2, pal: 0.05 },
  },
];

export const SCENES = [];
let cursor = 0;
for (const definition of SCENE_LIST) {
  SCENES.push({ ...SCENE_DEFAULTS, ...definition, start: cursor });
  cursor += definition.bars;
}
export const TOTAL_BARS = cursor;
export const TOTAL_SECONDS = TOTAL_BARS * BAR_SECONDS;

export function sceneIndexAt(bar) {
  for (let i = SCENES.length - 1; i >= 0; i--) if (bar >= SCENES[i].start) return i;
  return 0;
}
export const sceneAt = bar => SCENES[sceneIndexAt(bar)];
export const sceneById = id => SCENES.find(scene => scene.id === id);

/**
 * The scene at a position plus its neighbour inside a blend window `width` bars wide,
 * centred on each scene boundary. `amount` goes 0 → 1 from scene A to scene B.
 */
export function blendAt(position, width) {
  const index = sceneIndexAt(Math.floor(position)),
    scene = SCENES[index];
  if (index > 0 && position < scene.start + width / 2) {
    return { from: SCENES[index - 1], to: scene, amount: smooth((position - (scene.start - width / 2)) / width), scene };
  }
  if (index < SCENES.length - 1 && position > scene.start + scene.bars - width / 2) {
    return { from: scene, to: SCENES[index + 1], amount: smooth((position - (scene.start + scene.bars - width / 2)) / width), scene };
  }
  return { from: scene, to: scene, amount: 0, scene };
}

/**
 * Every hit of one bar of the show, with its swung time (`at`) and grid time (`grid`), in bars.
 * Pure in `bar`, so each bar is computed once and shared (frozen: callers never change it).
 */
const hitsCache = new Map();
export function hitsInBar(bar) {
  if (bar < 0 || bar >= TOTAL_BARS) return [];
  if (!hitsCache.has(bar)) {
    const scene = sceneAt(bar),
      barInScene = bar - scene.start,
      hits = barHits(scene, barInScene),
      swingOn = scene.swing(barInScene),
      out = [];
    for (const voice of scene.voices(barInScene)) {
      for (const h of hits[voice])
        out.push(Object.freeze({ voice, hit: h, at: bar + (h.step + swingOffset(voice, h.step, swingOn)) / 16, grid: bar + h.step / 16 }));
    }
    hitsCache.set(bar, Object.freeze(out));
  }
  return hitsCache.get(bar);
}

/** Hits that sounded within the last `windowSeconds` before `position`, with their age `age` in seconds. */
export function recentHits(position, windowSeconds) {
  const out = [];
  for (let bar = Math.floor(position) - 1; bar <= Math.floor(position); bar++) {
    for (const h of hitsInBar(bar)) {
      const age = (position - h.at) * BAR_SECONDS;
      if (age >= 0 && age < windowSeconds) out.push({ ...h, age });
    }
  }
  return out;
}

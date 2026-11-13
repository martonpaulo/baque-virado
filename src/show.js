// The order of the show: scenes, sections, the timeline and what sounds at any moment.
// Positions on the timeline are measured in bars (a float: 7.25 = a quarter into bar 8).
import { ALFAIA_HANDS, ALFAIA_WITH_STICK, BAQUE_ORDER, BAR_SECONDS, barHits, INSTRUMENTS, STEPS_PER_BAR, swingOffset, VOICE_ORDER } from './music.js';
import { smooth } from './util.js';

const always = value => () => value;
const normal = always('normal');
const breakOnBar = n => bar => (bar === n ? 'break' : 'normal'); // last bar of a baque: the virada

const SCENE_DEFAULTS = { pattern: 'marcacao', mode: normal, voices: always(VOICE_ORDER), swing: always(true), gain: {}, named: false, isEnd: false };
const ENSEMBLE_ENTRY = ['agogo', 'caixa', 'agbe', 'ganza', 'answer', 'main'];

/** A baque scene: four bars, the last one a virada. */
const baque = (id, extra) => ({ id, pattern: id, section: 'D', bars: 4, mode: breakOnBar(3), lanes: ALFAIA_HANDS, named: true, ...extra });

const BAQUE_EXTRAS = {
  imale: { mode: bar => (bar === 3 ? 'cut' : 'normal') }, // ends on a cut, not a virada
  trovao: { lanes: ALFAIA_WITH_STICK },
  parada: { mode: normal, lanes: ALFAIA_WITH_STICK }, // two bars that already end in a break
};

const SCENE_LIST = [
  {
    id: 'opening',
    section: 'A',
    bars: 5,
    mode: bar => ['call', 'roll'][bar] || 'normal',
    lanes: ['whistle', 'caixa', ...ALFAIA_HANDS],
  },
  {
    id: 'ensemble',
    section: 'B',
    bars: 6,
    voices: bar => ENSEMBLE_ENTRY.slice(0, bar + 1),
    lanes: INSTRUMENTS,
  },
  {
    id: 'agogo',
    section: 'B',
    bars: 2,
    voices: always(['agogo', 'caixa']),
    gain: { caixa: 0.32 },
    swing: always(false),
    lanes: ['agogo', 'caixa'],
  },
  {
    id: 'swing',
    section: 'C',
    bars: 4,
    voices: always(['main', 'answer', 'caixa', 'agbe', 'ganza', 'agogo']),
    swing: bar => bar >= 2,
    lanes: ['caixa', ...ALFAIA_HANDS],
  },
  {
    id: 'offbeat',
    section: 'C',
    bars: 3,
    voices: always([...ALFAIA_HANDS, 'agogo', 'caixa']),
    gain: { caixa: 0.45 },
    lanes: [...ALFAIA_HANDS, 'agogo'],
  },
  ...BAQUE_ORDER.map(id => baque(id, BAQUE_EXTRAS[id])),
  {
    id: 'summary',
    section: 'E',
    bars: 3,
    lanes: ALFAIA_HANDS,
    named: true,
  },
  {
    id: 'finale',
    section: 'E',
    bars: 3,
    mode: bar => (bar < 2 ? 'break' : 'cut'),
    lanes: [...ALFAIA_HANDS, 'whistle'],
    isEnd: true,
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
 * The one source of hit timing: every voice's hits in one bar, playing or not, each with its swing
 * offset in sixteenths (`swing`) and swung position (`position` = step + swing). Audio, the wheel and
 * the lanes all read it. Pure in `bar`, so it is computed once per bar and frozen.
 */
const timelineCache = new Map();
export function barTimeline(bar) {
  if (!timelineCache.has(bar)) {
    const scene = sceneAt(bar),
      barInScene = bar - scene.start,
      hits = barHits(scene, barInScene),
      swingOn = scene.swing(barInScene),
      voices = {};
    for (const voice of VOICE_ORDER) {
      voices[voice] = Object.freeze(
        hits[voice].map(h => {
          const swing = swingOffset(voice, h.step, swingOn);
          return Object.freeze({ hit: h, swing, position: h.step + swing });
        }),
      );
    }
    timelineCache.set(bar, Object.freeze({ scene, barInScene, playing: Object.freeze(scene.voices(barInScene)), voices: Object.freeze(voices) }));
  }
  return timelineCache.get(bar);
}

/** Every hit that sounds in one bar, with its swung time (`at`) and grid time (`grid`), in bars. */
const hitsCache = new Map();
export function hitsInBar(bar) {
  if (bar < 0 || bar >= TOTAL_BARS) return [];
  if (!hitsCache.has(bar)) {
    const { playing, voices } = barTimeline(bar),
      out = [];
    for (const voice of playing) {
      for (const { hit, swing, position } of voices[voice])
        out.push(Object.freeze({ voice, hit, swing, at: bar + position / STEPS_PER_BAR, grid: bar + hit.step / STEPS_PER_BAR }));
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

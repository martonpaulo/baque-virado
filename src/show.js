// The order of the show: scenes, the timeline and what sounds at any moment, for one rhythm.
// Positions on the timeline are measured in bars (a float: 7.25 = a quarter into bar 8).
import { meterOf } from './music.js';
import { RHYTHM } from './rhythms/index.js';
import { smooth } from './util.js';

const always = value => () => value;

/** How a scene may be entered: the bar before it plays a fill or a pickup, parts drop out of it, or a
 * sound rings over the bar line. The entered scene declares it (`leadIn`) and the script writes it. */
export const LEAD_INS = Object.freeze(['fill', 'pickup', 'dropOut', 'ringOver']);
/** A boundary that changes more than this share of the sounding voices is cold unless the entered
 * scene declares a lead-in (docs/product.md, Rhythm shows, Music). */
export const COLD_BOUNDARY_SHARE = 0.25;
/** Seconds of hits the background reacts to; also how far back the music's energy remembers. */
export const RECENT_WINDOW = 1.2;
/** The pace of the energy clock in silence, as a share of real time; at the show's busiest moment it runs at real time. */
export const CALM_PACE = 0.2;
/** The energy is 1 from this share of the show's steps up, ordered by how busy they are: its few busiest moments do not push every busy scene down the scale. */
export const FULL_ENERGY_SHARE = 0.9;
/** Seconds a hit takes to count in full: the energy rises to it and never jumps, so nothing a background counts by it appears at once. */
export const ENERGY_RISE = 0.15;

/** The show of one rhythm package: its scenes on the timeline, and every hit of every bar. */
export function createShow(rhythm) {
  const { barSeconds, stepsPerBar, swingOffset, voiceOrder } = meterOf(rhythm);
  const defaults = {
    mode: always('normal'),
    voices: always(voiceOrder),
    swing: always(true),
    gain: {},
    named: false,
    isEnd: false,
    leadIn: null,
    ...rhythm.sceneDefaults,
  };

  const SCENES = [];
  let cursor = 0;
  for (const definition of rhythm.scenes) {
    const scene = { ...defaults, ...definition, start: cursor };
    if (scene.leadIn !== null && !LEAD_INS.includes(scene.leadIn)) throw new Error(`scene ${scene.id}: unknown lead-in «${scene.leadIn}»`);
    if (scene.leadIn !== null && SCENES.length === 0) throw new Error(`scene ${scene.id}: the first scene has no bar before it to lead in`);
    SCENES.push(scene);
    cursor += definition.bars;
  }
  const TOTAL_BARS = cursor;
  const TOTAL_SECONDS = TOTAL_BARS * barSeconds;

  function sceneIndexAt(bar) {
    for (let i = SCENES.length - 1; i >= 0; i--) if (bar >= SCENES[i].start) return i;
    return 0;
  }
  const sceneAt = bar => SCENES[sceneIndexAt(bar)];
  const sceneById = id => SCENES.find(scene => scene.id === id);

  /**
   * The scene at a position plus its neighbour inside a blend window `width` bars wide,
   * centred on each scene boundary. `amount` goes 0 → 1 from scene A to scene B.
   */
  function blendAt(position, width) {
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
  function barTimeline(bar) {
    if (!timelineCache.has(bar)) {
      const scene = sceneAt(bar),
        barInScene = bar - scene.start,
        // the last bar of a scene leads into the next one: the script reads how that scene is entered
        leadsInto = barInScene === scene.bars - 1 ? (SCENES[SCENES.indexOf(scene) + 1]?.leadIn ?? null) : null,
        hits = rhythm.barHits(scene, barInScene, { leadsInto }),
        swingOn = scene.swing(barInScene),
        voices = {};
      for (const voice of voiceOrder) {
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
  function hitsInBar(bar) {
    if (bar < 0 || bar >= TOTAL_BARS) return [];
    if (!hitsCache.has(bar)) {
      const { playing, voices } = barTimeline(bar),
        out = [];
      for (const voice of playing) {
        for (const { hit, swing, position } of voices[voice])
          out.push(Object.freeze({ voice, hit, swing, at: bar + position / stepsPerBar, grid: bar + hit.step / stepsPerBar }));
      }
      hitsCache.set(bar, Object.freeze(out));
    }
    return hitsCache.get(bar);
  }

  /** Hits that sounded within the last `windowSeconds` before `position`, with their age `age` in seconds. */
  function recentHits(position, windowSeconds) {
    const out = [],
      last = Math.floor(position);
    // as many bars back as the window reaches: a bar shorter than the window is not the only one before
    for (let bar = last - Math.ceil(windowSeconds / barSeconds); bar <= last; bar++) {
      for (const h of hitsInBar(bar)) {
        const age = (position - h.at) * barSeconds;
        if (age >= 0 && age < windowSeconds) out.push({ ...h, age });
      }
    }
    return out;
  }

  // ---------- the music's energy ----------
  // How busy the music is, read from the timeline alone, so the backgrounds can follow it (#63):
  // each hit of the last RECENT_WINDOW seconds counts its velocity, a newer hit more.
  const loadOf = recent =>
    recent.reduce(
      (sum, h) => sum + (h.age < RECENT_WINDOW ? Math.min(1, h.hit.velocity) * Math.min(1, h.age / ENERGY_RISE) * (1 - h.age / RECENT_WINDOW) : 0),
      0,
    );
  let peakLoad = null; // the load that counts as full energy, read once from every step of the show
  function peak() {
    if (peakLoad === null) {
      const loads = [];
      for (let step = 0; step <= TOTAL_BARS * stepsPerBar; step++) loads.push(loadOf(recentHits(step / stepsPerBar, RECENT_WINDOW)));
      loads.sort((a, b) => a - b);
      peakLoad = loads[Math.floor((loads.length - 1) * FULL_ENERGY_SHARE)];
    }
    return peakLoad;
  }
  /** The energy of a list of recent hits (`recentHits(position, RECENT_WINDOW)`, or the heard ones among them): 0 in silence, 1 at the show's busiest moments. */
  const energyOf = recent => (peak() > 0 ? Math.min(1, loadOf(recent) / peak()) : 0);
  /** The energy of every voice written at a position. */
  const energyAt = position => energyOf(recentHits(position, RECENT_WINDOW));

  let flowTable = null; // the energy clock at each step of the show, in seconds
  /**
   * The energy clock at a position, in seconds: it runs at CALM_PACE of real time in silence and at
   * real time at the busiest moment, so what a background moves by it is fast where the music is busy
   * and slow where it is calm, and never stops. A function of the position alone.
   * shortcut: it reads every written voice, also a muted one; upgrade if a muted show should also slow down.
   */
  function flowAt(position) {
    if (flowTable === null) {
      const paceAt = step => CALM_PACE + (1 - CALM_PACE) * energyAt(step / stepsPerBar),
        stepSeconds = barSeconds / stepsPerBar;
      flowTable = [0];
      for (let step = 0, pace = paceAt(0); step < TOTAL_BARS * stepsPerBar; step++) {
        const next = paceAt(step + 1);
        flowTable.push(flowTable[step] + ((pace + next) / 2) * stepSeconds);
        pace = next;
      }
    }
    const at = Math.max(0, Math.min(TOTAL_BARS, position)) * stepsPerBar,
      step = Math.min(flowTable.length - 2, Math.floor(at));
    return flowTable[step] + (flowTable[step + 1] - flowTable[step]) * (at - step);
  }

  /** The voices a bar writes a hit for, among the ones playing: what the script wrote, sounding or a silent mark. */
  const writtenIn = bar => new Set(hitsInBar(bar).map(h => h.voice));
  /**
   * Every scene boundary, in order: the scenes on each side, how many of the voices written in the
   * last settled bar before it (the bar before a lead-in bar; the scene's only bar when it has one)
   * or in the first bar after it are on one side only (`changed` of `voices`, and their `share`),
   * the entered scene's declared lead-in, and `cold`: over COLD_BOUNDARY_SHARE with none declared.
   */
  function boundaries() {
    return SCENES.slice(1).map((to, index) => {
      const from = SCENES[index],
        before = writtenIn(from.start + Math.max(0, from.bars - 2)),
        after = writtenIn(to.start),
        voices = new Set([...before, ...after]),
        changed = [...voices].filter(voice => before.has(voice) !== after.has(voice)).length,
        share = voices.size ? changed / voices.size : 0;
      return { from: from.id, to: to.id, changed, voices: voices.size, share, leadIn: to.leadIn, cold: share > COLD_BOUNDARY_SHARE && to.leadIn === null };
    });
  }
  return {
    SCENES,
    TOTAL_BARS,
    TOTAL_SECONDS,
    sceneIndexAt,
    sceneAt,
    sceneById,
    blendAt,
    barTimeline,
    hitsInBar,
    recentHits,
    energyOf,
    energyAt,
    flowAt,
    boundaries,
  };
}

export const { SCENES, TOTAL_BARS, TOTAL_SECONDS, sceneIndexAt, sceneAt, sceneById, blendAt, barTimeline, hitsInBar, recentHits, energyOf, flowAt } =
  createShow(RHYTHM);

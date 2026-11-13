// The readout under the wheel: numbers, notation and the score, one layout per scene.

import { COPY } from './copy.js';
import {
  AGOGO,
  AGOGO_STEPS,
  allAlfaiaSteps,
  BAQUE_ORDER,
  BAR_SECONDS,
  BEAT_STEPS,
  barHits,
  countFromOne,
  INSTRUMENTS,
  isAlfaia,
  isOffbeat,
  OFFBEAT_STEPS,
  PATTERNS,
  SIXTEENTHS,
  STEPS_PER_BAR,
  stepsOfBar,
  swingMilliseconds,
  VOICES,
} from './music.js';
import { renderScore } from './score.js';
import { TOTAL_BARS } from './show.js';
import { COLORS, fgAlpha } from './theme.js';
import { replayFade } from './util.js';

const T = COPY.read;

const MS_PER_SECOND = 1000;
// The marcação, the first baque, shows where each hand falls against the beat.
const ANSWER_ON_BEAT_STEPS = countFromOne(
  PATTERNS.marcacao.answer.filter(step => !isOffbeat(step)),
  ' · ',
);
const MAIN_OFFBEAT_STEPS = countFromOne(PATTERNS.marcacao.main.filter(isOffbeat), ' · ');
const METER_PERCENT_PER_MS = 2.4; // swing meter: bar width (% of its half) per millisecond
const SCORE_HEIGHT = 60; // score height passed to renderScore (score units)
const TWO_BAR_REPEATS = 2,
  ONE_BAR_REPEATS = 3; // cycles written out in the score
const label = (text, color) => `<span class="k"${color ? ` style="color:${color}"` : ''}>${text}</span>`;
const row = (left, right) => `<div class="row">${left}<span>${right}</span></div>`;
const stat = (value, text, color) => `<div><b style="color:${color}">${value}</b>${label(text)}</div>`;
const stats = (modifier, ...cells) => `<div class="stats ${modifier}">${cells.join('')}</div>`;
const beatSeparator = step => (step % 4 === 3 && step < 15 ? '|' : '');
const sequence = (steps, mark) => SIXTEENTHS.map(step => (steps.includes(step) ? mark : '·') + beatSeparator(step)).join('');
const intervals = steps => steps.map((step, i) => (steps[(i + 1) % steps.length] - step + STEPS_PER_BAR) % STEPS_PER_BAR || STEPS_PER_BAR);
const signed = ms => (ms > 0 ? '+' : ms < 0 ? '−' : '±') + Math.abs(ms);

function swingMeter(ms, color) {
  const bar = `position:absolute;top:0;height:100%;${ms >= 0 ? 'left:50%' : 'right:50%'};width:${Math.abs(ms) * METER_PERCENT_PER_MS}%;background:${color}`;
  return (
    `<span style="position:relative;display:block;height:1.6cqw;margin:.3cqw 0"><i style="${bar}"></i><i style="position:absolute;left:50%;top:-.3cqw;bottom:-.3cqw;width:1px;background:${fgAlpha(0.6)}"></i></span>` +
    `<span class="n" style="color:${color}">${signed(ms)}</span>`
  );
}

// scene id → readout markup (and, for baques, the score)
const LAYOUTS = {
  opening: () =>
    row(label(T.cycle), T.cycleValue(BAR_SECONDS.toFixed(2).replace('.', ','))) +
    row(label(T.sixteenth), T.milliseconds(Math.round((BAR_SECONDS / STEPS_PER_BAR) * MS_PER_SECOND))) +
    row(label(T.voicesBaques), `${INSTRUMENTS.length} · ${BAQUE_ORDER.length}`),
  ensemble: () => `<div data-entry></div>`,
  agogo: () =>
    `<div class="notation">${label(T.low)}<span class="seq" style="color:${COLORS.acid}">${sequence(AGOGO.low, '●')}</span><span class="n">${AGOGO.low.length}</span>
      ${label(T.high)}<span class="seq" style="color:${COLORS.acid};opacity:.6">${sequence(AGOGO.high, '○')}</span><span class="n">${AGOGO.high.length}</span></div>` +
    row(label(T.intervals), intervals(AGOGO_STEPS).join(' ')) +
    row(label(T.hitsPerSixteenths), `${AGOGO_STEPS.length} / ${STEPS_PER_BAR}`),
  swing: () => {
    const high = swingMilliseconds('high'),
      low = swingMilliseconds('low');
    return (
      `<div class="row"><span class="k" data-listening></span>${label(T.msLegend)}</div>
      <div class="notation" style="grid-template-columns:19cqw 1fr 9cqw 1fr 9cqw;gap:.2cqw 1.6cqw">${label(T.sixteenthHeader)}${label(T.caixa, COLORS.ice)}<span></span>${label(T.alfaia, COLORS.amber)}<span></span>` +
      [0, 1, 2, 3].map(i => label(T.nth(i + 1)) + swingMeter(high[i], COLORS.ice) + swingMeter(low[i], COLORS.amber)).join('') +
      `</div>`
    );
  },
  offbeat: () =>
    stats('two', stat(BEAT_STEPS.length, T.beatHeads, COLORS.fg), stat(OFFBEAT_STEPS.length, T.offbeatSixteenths, COLORS.ember)) +
    row(label(T.answerOnBeat, COLORS.ember), ANSWER_ON_BEAT_STEPS) +
    row(label(T.mainOffbeat, COLORS.amber), MAIN_OFFBEAT_STEPS),
  // the row draws the first bar; the count is the whole pattern, as the baque's own scene shows it
  summary: () =>
    `<div class="notation tight">` +
    BAQUE_ORDER.map(id => {
      const main = stepsOfBar(PATTERNS[id].main, 0),
        answer = stepsOfBar(PATTERNS[id].answer, 0);
      const marks = SIXTEENTHS.map(
        step =>
          (main.includes(step) ? `<b style="color:${COLORS.amber}">●</b>` : answer.includes(step) ? `<b style="color:${COLORS.ember}">●</b>` : '·') +
          beatSeparator(step),
      ).join('');
      return `${label(COPY.patterns[id])}<span class="seq">${marks}</span><span class="n">${T.hits(PATTERNS[id].main.length + PATTERNS[id].answer.length)}</span>`;
    }).join('') +
    `</div>` +
    row(label(T.sameInAll), T.sameInAllValue),
  finale: () =>
    stats('', stat(BAQUE_ORDER.length, T.baques, COLORS.amber), stat(INSTRUMENTS.length, T.voices, COLORS.ember), stat(TOTAL_BARS, T.bars, COLORS.fg)) +
    row(label(T.breaksAndCut), T.mestreWhistle),
};

function baqueLayout(scene) {
  const pattern = PATTERNS[scene.pattern],
    all = allAlfaiaSteps(pattern),
    offbeats = all.filter(isOffbeat).length,
    bars = pattern.bars || 1;
  const markup = stats(
    'small',
    stat(pattern.main.length, T.hitsMain, COLORS.amber),
    stat(pattern.answer.length, T.hitsAnswer, COLORS.ember),
    stat(`${offbeats}<small>/${all.length}</small>`, T.onOffbeat, COLORS.fg),
  );
  const score = renderScore({
    bars: [...Array(bars).keys()].map(n => ({ main: stepsOfBar(pattern.main, n), answer: stepsOfBar(pattern.answer, n), stick: stepsOfBar(pattern.stick, n) })),
    colors: { ink: COLORS.fg, main: COLORS.amber, answer: COLORS.ember, stick: COLORS.bone, dim: fgAlpha(0.45) },
    timeSig: true,
    repeat: bars === 2 ? TWO_BAR_REPEATS : ONE_BAR_REPEATS,
    accentOffbeats: true,
    height: SCORE_HEIGHT,
  });
  return { markup: `${markup}<div class="score">${score.markup}<i class="scur"></i></div>`, score };
}

export function createReadout(element) {
  let score = null;
  return {
    build(scene) {
      const layout = scene.named && scene.id !== 'summary' ? baqueLayout(scene) : { markup: (LAYOUTS[scene.id] || (() => ''))(), score: null };
      element.innerHTML = layout.markup;
      score = layout.score;
      replayFade(element);
    },
    /** Parts that change once per bar. */
    onBar(scene, barInScene) {
      const entry = element.querySelector('[data-entry]');
      if (entry) {
        const voice = scene.voices(barInScene).at(-1),
          { color } = VOICES[voice];
        const name = isAlfaia(voice) ? T.alfaia : COPY.voices[voice],
          hand = { main: T.mainHand, answer: T.answerHand }[voice] || '';
        entry.innerHTML =
          `<div class="k">${T.enters}</div><div class="big" style="color:${color}">${name}</div>` +
          row(label(hand, color), `${barHits(scene, barInScene)[voice].length}/${STEPS_PER_BAR}`);
        replayFade(entry);
      }
      const listening = element.querySelector('[data-listening]');
      if (listening) {
        const swingOn = scene.swing(barInScene);
        listening.textContent = swingOn ? T.listeningSwing : T.listeningGrid;
        listening.style.color = swingOn ? COLORS.amber : '';
      }
    },
    /** Move the score cursor to the current sixteenth (second bar of a two-bar cycle when needed). */
    update(sixteenth, barInScene) {
      if (!score) return;
      const cursor = element.querySelector('.scur'),
        twoBars = score.slotX.length === 2 * STEPS_PER_BAR;
      const slot = Math.floor(sixteenth) + (twoBars ? (barInScene % 2) * STEPS_PER_BAR : 0);
      if (cursor) cursor.style.left = `${((score.slotX[slot] / score.width) * 100).toFixed(2)}%`;
    },
  };
}

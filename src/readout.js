// The readout under the wheel: numbers, notation and the score, one layout per scene.

import { isHeard } from './audio.js';
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
import { COLORS, fgAlpha, ROLES } from './theme.js';
import { replayFade } from './util.js';
import { WAVES } from './waves.js';

const T = COPY.read;

const MS_PER_SECOND = 1000;
// The marcação, the first baque, shows where each hand falls against the beat.
const ANSWER_ON_BEAT_STEPS = countFromOne(
  PATTERNS.marcacao.answer.filter(step => !isOffbeat(step)),
  ' ',
);
const MAIN_OFFBEAT_STEPS = countFromOne(PATTERNS.marcacao.main.filter(isOffbeat), ' ');
const METER_PERCENT_PER_MS = 2.4; // swing meter: bar width (% of its half) per millisecond
const SCORE_HEIGHT = 60; // score height passed to renderScore (score units)
// A baque scene shows its score for the first two bars and the alfaia's sound waves for the last two.
const WAVE_FROM_BAR = 2;
const WAVE_HEIGHT = 20; // wave rows, in SVG units (one unit per slice across)
const WAVE_BAR_WIDTH = 0.7; // of each slice
const WAVE_MIN_HEIGHT = 0.4; // a silent slice still shows as a hairline
const PERCENT = 100;
const WAVE_HANDS = ['main', 'answer'];
const SIXTEENTH_MS = (BAR_SECONDS / STEPS_PER_BAR) * MS_PER_SECOND;
const TWO_BAR_REPEATS = 2,
  ONE_BAR_REPEATS = 3; // cycles written out in the score
// `data-inst` names the instrument a part shows, so a muted instrument's parts show disabled
const inst = id => (id ? ` data-inst="${id}"` : '');
const label = (text, color, id) => `<span class="k"${inst(id)}${color ? ` style="color:${color}"` : ''}>${text}</span>`;
const row = (left, right, id) => `<div class="row"${inst(id)}>${left}<span>${right}</span></div>`;
const stat = (value, text, color) => `<div><b style="color:${color}">${value}</b>${label(text)}</div>`;
const stats = (modifier, ...cells) => `<div class="stats ${modifier}">${cells.join('')}</div>`;
const beatSeparator = step => (step % 4 === 3 && step < 15 ? '|' : '');
const sequence = (steps, mark) => SIXTEENTHS.map(step => (steps.includes(step) ? mark : '·') + beatSeparator(step)).join('');
const intervals = steps => steps.map((step, i) => (steps[(i + 1) % steps.length] - step + STEPS_PER_BAR) % STEPS_PER_BAR || STEPS_PER_BAR);
const signed = ms => (ms > 0 ? '+' : ms < 0 ? '−' : '±') + Math.abs(ms);

function swingMeter(ms, color, id) {
  const bar = `position:absolute;top:0;height:100%;${ms >= 0 ? 'left:50%' : 'right:50%'};width:${Math.abs(ms) * METER_PERCENT_PER_MS}%;background:${color}`;
  return (
    `<span${inst(id)} style="position:relative;display:block;height:1.6cqw;margin:.3cqw 0"><i style="${bar}"></i><i class="zero" style="background:${fgAlpha(0.7)}"></i></span>` +
    `<span class="n"${inst(id)} style="color:${color}">${signed(ms)}</span>`
  );
}

// scene id → readout markup (and, for baques, the score)
const LAYOUTS = {
  opening: () =>
    row(label(T.cycle), T.cycleValue(BAR_SECONDS.toFixed(2).replace('.', ','))) +
    row(label(T.sixteenth), T.milliseconds(Math.round((BAR_SECONDS / STEPS_PER_BAR) * MS_PER_SECOND))) +
    row(label(T.voices), INSTRUMENTS.length) +
    row(label(T.baques), BAQUE_ORDER.length),
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
      `<div class="row swing-head"><span class="k" data-listening></span>${label(T.msLegend)}</div>
      <div class="notation swing" style="grid-template-columns:minmax(19cqw,max-content) 1fr 9cqw 1fr 9cqw">${label(T.sixteenthHeader)}${label(T.caixa, COLORS.ice, 'caixa')}<span></span>${label(T.alfaia, ROLES.mainHand, 'alfaia')}<span></span>` +
      [0, 1, 2, 3].map(i => label(T.nth(i + 1)) + swingMeter(high[i], COLORS.ice, 'caixa') + swingMeter(low[i], ROLES.mainHand, 'alfaia')).join('') +
      `</div>`
    );
  },
  offbeat: () =>
    stats('two', stat(BEAT_STEPS.length, T.beatHeads, COLORS.fg), stat(OFFBEAT_STEPS.length, T.offbeatSixteenths, ROLES.answerHand)) +
    row(label(T.answerOnBeat, ROLES.answerHand), ANSWER_ON_BEAT_STEPS, 'alfaia') +
    row(label(T.mainOffbeat, ROLES.mainHand), MAIN_OFFBEAT_STEPS, 'alfaia'),
  // the row draws the first bar; the count is the whole pattern, as the baque's own scene shows it
  summary: () =>
    `<div class="notation tight">` +
    BAQUE_ORDER.map(id => {
      const main = stepsOfBar(PATTERNS[id].main, 0),
        answer = stepsOfBar(PATTERNS[id].answer, 0);
      const marks = SIXTEENTHS.map(
        step =>
          (main.includes(step) ? `<b style="color:${ROLES.mainHand}">●</b>` : answer.includes(step) ? `<b style="color:${ROLES.answerHand}">●</b>` : '·') +
          beatSeparator(step),
      ).join('');
      return `${label(COPY.patterns[id])}<span class="seq" data-inst="alfaia">${marks}</span><span class="n" data-inst="alfaia">${T.hits(PATTERNS[id].main.length + PATTERNS[id].answer.length)}</span>`;
    }).join('') +
    `</div>` +
    row(label(T.sameInAll), T.sameInAllValue),
  finale: () =>
    stats('', stat(BAQUE_ORDER.length, T.baques, ROLES.accent), stat(INSTRUMENTS.length, T.voices, COLORS.ember), stat(TOTAL_BARS, T.bars, COLORS.fg)) +
    row(label(T.howItEnds), T.breaksAndCut) +
    row(label(T.whoCalls), T.mestreWhistle),
};

function baqueLayout(scene) {
  const pattern = PATTERNS[scene.pattern],
    all = allAlfaiaSteps(pattern),
    offbeats = all.filter(isOffbeat).length,
    bars = pattern.bars || 1;
  const markup = stats(
    'small',
    stat(pattern.main.length, T.hitsMain, ROLES.mainHand),
    stat(pattern.answer.length, T.hitsAnswer, ROLES.answerHand),
    stat(`${offbeats}<small>/${all.length}</small>`, T.onOffbeat, COLORS.fg),
  );
  const score = renderScore({
    bars: [...Array(bars).keys()].map(n => ({ main: stepsOfBar(pattern.main, n), answer: stepsOfBar(pattern.answer, n), stick: stepsOfBar(pattern.stick, n) })),
    colors: { ink: COLORS.fg, main: ROLES.mainHand, answer: ROLES.answerHand, stick: COLORS.bone, dim: fgAlpha(0.45) },
    timeSig: true,
    repeat: bars === 2 ? TWO_BAR_REPEATS : ONE_BAR_REPEATS,
    accentOffbeats: true,
    height: SCORE_HEIGHT,
  });
  return { markup: `${markup}<div class="score">${score.markup}<i class="scur"></i></div><div class="wave" hidden></div>`, score };
}

/** One sample's outline as SVG bars, centred on the row's middle line. */
const waveBars = peaks =>
  peaks
    .map((peak, i) => {
      const h = Math.max(WAVE_MIN_HEIGHT, (peak / PERCENT) * WAVE_HEIGHT);
      return `<rect x="${(i + (1 - WAVE_BAR_WIDTH) / 2).toFixed(2)}" y="${((WAVE_HEIGHT - h) / 2).toFixed(2)}" width="${WAVE_BAR_WIDTH}" height="${h.toFixed(2)}"/>`;
    })
    .join('');

/** The two alfaia hands' sound waves for an alfaia option: a dim outline, and a lit copy the update clips. */
function waveMarkup(alfaia) {
  return (
    label(T.wave) +
    WAVE_HANDS.map(hand => {
      const wave = WAVES[`alfaia-${alfaia}-${hand}`],
        color = hand === 'main' ? ROLES.mainHand : ROLES.answerHand,
        bars = waveBars(wave.peaks),
        width = wave.peaks.length;
      return (
        `<div class="wrow">${label(COPY.voices[hand], color)}` +
        `<svg viewBox="0 0 ${width} ${WAVE_HEIGHT}" preserveAspectRatio="none" aria-hidden="true">` +
        `<clipPath id="wclip-${hand}"><rect data-lit="${hand}" width="0" height="${WAVE_HEIGHT}"/></clipPath>` +
        `<g fill="${fgAlpha(0.22)}">${bars}</g><g fill="${color}" clip-path="url(#wclip-${hand})">${bars}</g></svg>` +
        `<span class="n">${T.milliseconds(wave.ms)}</span></div>`
      );
    }).join('')
  );
}

/** `volume` maps an instrument to its volume level: a muted one shows as disabled. */
export function createReadout(element, volume = {}) {
  let score = null,
    scene = null,
    alfaia = null; // the alfaia option the waves show; main.js sets it
  const wave = () => element.querySelector('.wave');
  /** Mark the muted instruments, so their parts of the readout show disabled (styles.css). */
  const showVolume = () => {
    element.dataset.muted = Object.keys(volume)
      .filter(id => volume[id] === 'mute')
      .join(' ');
  };
  return {
    showVolume,
    /** The alfaia sound in use: its waves show from the next bar on. */
    setAlfaia(option) {
      alfaia = option;
    },
    build(current) {
      const layout = current.named && current.id !== 'summary' ? baqueLayout(current) : { markup: (LAYOUTS[current.id] || (() => ''))(), score: null };
      element.innerHTML = layout.markup;
      // a scene about one instrument: all of its readout is that instrument's
      element.dataset.inst = current.named && current.id !== 'summary' ? 'alfaia' : current.id === 'agogo' ? 'agogo' : '';
      showVolume();
      score = layout.score;
      scene = current;
      replayFade(element);
    },
    /** Parts that change once per bar. */
    onBar(scene, barInScene) {
      const waves = wave();
      if (waves) {
        const showWave = barInScene >= WAVE_FROM_BAR && alfaia !== null,
          scoreBox = element.querySelector('.score');
        if (showWave) waves.innerHTML = waveMarkup(alfaia);
        if (waves.hidden === showWave) {
          waves.hidden = !showWave;
          scoreBox.hidden = showWave;
          replayFade(showWave ? waves : scoreBox);
        }
      }
      const entry = element.querySelector('[data-entry]');
      if (entry) {
        const voice = scene.voices(barInScene).at(-1),
          { color } = VOICES[voice];
        const name = isAlfaia(voice) ? T.alfaia : COPY.voices[voice],
          hand = { main: T.mainHand, answer: T.answerHand }[voice] || '';
        const muted = !isHeard(volume, voice);
        entry.classList.toggle('muted', muted);
        entry.innerHTML =
          `<div class="k">${muted ? T.entersMuted : T.enters}</div><div class="big" style="color:${color}">${name}</div>` +
          row(label(hand, color), `${barHits(scene, barInScene)[voice].length}/${STEPS_PER_BAR}`);
        replayFade(entry);
      }
      const listening = element.querySelector('[data-listening]');
      if (listening) {
        const swingOn = scene.swing(barInScene);
        listening.textContent = swingOn ? T.listeningSwing : T.listeningGrid;
        listening.style.color = swingOn ? ROLES.accent : '';
      }
    },
    /** Move the score cursor to the current sixteenth (second bar of a two-bar cycle when needed). */
    update(sixteenth, barInScene) {
      if (!score) return;
      const waves = wave();
      if (waves && !waves.hidden) {
        // each hand's wave lights up from its latest hit, for as long as that hit sounds
        const hits = barHits(scene, barInScene);
        for (const hand of WAVE_HANDS) {
          const last = hits[hand].filter(hit => hit.step <= sixteenth).at(-1),
            lit = waves.querySelector(`[data-lit="${hand}"]`),
            slices = WAVES[`alfaia-${alfaia}-${hand}`];
          const played = last ? ((sixteenth - last.step) * SIXTEENTH_MS) / slices.ms : 1;
          lit.setAttribute('width', played < 1 ? (played * slices.peaks.length).toFixed(2) : '0');
        }
        return;
      }
      const cursor = element.querySelector('.scur'),
        twoBars = score.slotX.length === 2 * STEPS_PER_BAR;
      const slot = Math.floor(sixteenth) + (twoBars ? (barInScene % 2) * STEPS_PER_BAR : 0);
      if (cursor) cursor.style.left = `${((score.slotX[slot] / score.width) * 100).toFixed(2)}%`;
    },
  };
}

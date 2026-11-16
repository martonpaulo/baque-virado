// The readout under the wheel: numbers, notation and the score, one layout per scene.

import { isHeard } from './audio.js';
import { COPY } from './copy.js';
import { BAR_SECONDS, isHand, STEPS_PER_BAR, VOICES } from './music.js';
import { label, row } from './readout-markup.js';
import { RHYTHM } from './rhythms/index.js';
import { barTimeline, TOTAL_BARS } from './show.js';
import { fgAlpha, ROLES } from './theme.js';
import { replayFade, setAttr, setStyle } from './util.js';
import { WAVES } from './waves.js';

const T = COPY.read;

const MS_PER_SECOND = 1000;
// The rhythm's sample outlines: a scene with a wave block shows them from `fromBar` on.
const { fromBar: WAVE_FROM_BAR, name: waveName, voices: WAVE_HANDS } = RHYTHM.waves || { fromBar: Infinity, name: () => '', voices: [] };
const WAVE_HEIGHT = 20; // wave rows, in SVG units (one unit per slice across)
const WAVE_BAR_WIDTH = 0.7; // of each slice
const WAVE_MIN_HEIGHT = 0.4; // a silent slice still shows as a hairline
const PERCENT = 100;
const SIXTEENTH_MS = (BAR_SECONDS / STEPS_PER_BAR) * MS_PER_SECOND;
const SHOW_TOTALS = { totalBars: TOTAL_BARS }; // what a rhythm's layouts may read of the show

/** One sample's outline as SVG bars, centred on the row's middle line. */
const waveBars = peaks =>
  peaks
    .map((peak, i) => {
      const h = Math.max(WAVE_MIN_HEIGHT, (peak / PERCENT) * WAVE_HEIGHT);
      return `<rect x="${(i + (1 - WAVE_BAR_WIDTH) / 2).toFixed(2)}" y="${((WAVE_HEIGHT - h) / 2).toFixed(2)}" width="${WAVE_BAR_WIDTH}" height="${h.toFixed(2)}"/>`;
    })
    .join('');

/** The hands' sound waves for one sound option: a dim outline, and a lit copy the update clips. */
function waveMarkup(option) {
  return (
    label(T.wave) +
    WAVE_HANDS.map(hand => {
      const wave = WAVES[waveName(option, hand)],
        { color } = VOICES[hand],
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
    waveSound = null, // the option in use of the sound the waves show; main.js sets it
    waves = null, // a baque scene's wave block and score cursor, found once per scene
    cursor = null,
    shownWaves = null, // the option the wave block was last drawn for
    lit = {}; // each hand's clip rectangle in the wave block
  /**
   * Mark the parts of muted instruments, so they show disabled (styles.css `[data-muted]`): every
   * part with a muted `data-inst`, or the whole readout when it is about a muted instrument.
   */
  const showVolume = () => {
    const muted = part => part.dataset.inst !== undefined && volume[part.dataset.inst] === 'mute';
    const whole = muted(element);
    for (const part of element.children) part.toggleAttribute('data-muted', whole || muted(part));
    for (const part of element.querySelectorAll(':scope * [data-inst]')) part.toggleAttribute('data-muted', muted(part));
  };
  return {
    showVolume,
    /** The option in use of the sound the waves show: its waves show from the next bar on. */
    setWaveSound(option) {
      waveSound = option;
    },
    build(current) {
      const layout = RHYTHM.readout(current, SHOW_TOTALS);
      element.innerHTML = layout.markup;
      waves = element.querySelector('.wave');
      cursor = element.querySelector('.scur');
      shownWaves = null;
      // a scene about one instrument: all of its readout is that instrument's
      element.dataset.inst = layout.focus;
      showVolume();
      score = layout.score;
      scene = current;
      replayFade(element);
    },
    /** Parts that change once per bar. */
    onBar(scene, barInScene) {
      if (waves) {
        const showWave = barInScene >= WAVE_FROM_BAR && waveSound !== null,
          scoreBox = element.querySelector('.score');
        if (showWave && shownWaves !== waveSound) {
          waves.innerHTML = waveMarkup(waveSound);
          shownWaves = waveSound;
          lit = Object.fromEntries(WAVE_HANDS.map(hand => [hand, waves.querySelector(`[data-lit="${hand}"]`)]));
        }
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
        const name = isHand(voice) ? COPY.instruments[VOICES[voice].instrument] : COPY.voices[voice],
          hand = COPY.hands?.[voice] || '';
        const muted = !isHeard(volume, voice);
        entry.classList.toggle('muted', muted);
        entry.innerHTML =
          `<div class="k">${muted ? T.entersMuted : T.enters}</div><div class="big" style="color:${color}">${name}</div>` +
          row(label(hand, color), `${barTimeline(scene.start + barInScene).voices[voice].length}/${STEPS_PER_BAR}`);
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
      if (waves && !waves.hidden) {
        // each hand's wave lights up from its latest hit, for as long as that hit sounds; the bar's
        // hits come from the cached timeline, not recomputed each frame
        const { voices } = barTimeline(scene.start + barInScene);
        for (const hand of WAVE_HANDS) {
          const last = voices[hand].findLast(({ hit }) => hit.step <= sixteenth)?.hit,
            slices = WAVES[waveName(shownWaves, hand)];
          const played = last ? ((sixteenth - last.step) * SIXTEENTH_MS) / slices.ms : 1;
          setAttr(lit[hand], 'width', played < 1 ? (played * slices.peaks.length).toFixed(2) : '0');
        }
        return;
      }
      const twoBars = score.slotX.length === 2 * STEPS_PER_BAR;
      const slot = Math.floor(sixteenth) + (twoBars ? (barInScene % 2) * STEPS_PER_BAR : 0);
      if (cursor) setStyle(cursor, 'left', `${((score.slotX[slot] / score.width) * 100).toFixed(2)}%`);
    },
  };
}

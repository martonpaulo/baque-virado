// The multitrack view under the readout: a short window that scrolls past a fixed playhead.
// Rows change with the scene and morph into the next scene's rows.

import { visualOf } from './audio.js';
import { COPY } from './copy.js';
import { BAR_SECONDS, isHand, isOffbeat, STEPS_PER_BAR, STEPS_PER_BEAT, VOICE_ORDER, VOICES } from './music.js';
import { barTimeline, blendAt, hitsInBar, sceneAt, TOTAL_BARS } from './show.js';
import { COLORS, fgAlpha, MONO_FONT } from './theme.js';
import { lerp } from './util.js';

const MORPH_BARS = 0.5; // ≈1 s, centred on the scene boundary
const WINDOW_BARS = 0.8; // visible span
const LOOK_BACK_BARS = 0.45; // how much of the window is in the past
const MAX_ROWS = 3.4; // rows never get taller than a third-ish of the area
const ROW_DRIFT = 0.35; // fraction of a row height a leaving or entering row travels

// Plot area, as fractions of the canvas width.
const PLOT_LEFT = 0.2; // voice names sit left of this
const PLOT_RIGHT_MARGIN = 0.1; // hit counts sit right of the plot

// Grid (alphas of the foreground colour).
const BEAT_SHADE_ALPHA = 0.05; // shaded first sixteenth of each beat
const BAR_LINE_ALPHA = 0.45,
  BEAT_LINE_ALPHA = 0.16,
  SIXTEENTH_LINE_ALPHA = 0.05;
const BAR_LINE_WIDTH = 1.4; // CSS px; other lines are 1
// the grid colours, built once instead of on every line of every frame
const BEAT_SHADE = fgAlpha(BEAT_SHADE_ALPHA),
  BAR_LINE = fgAlpha(BAR_LINE_ALPHA),
  BEAT_LINE = fgAlpha(BEAT_LINE_ALPHA),
  SIXTEENTH_LINE = fgAlpha(SIXTEENTH_LINE_ALPHA);

// Hit blocks.
const BLOCK_WIDTH = 0.86; // fraction of a sixteenth
const BLOCK_HEIGHT = 0.34,
  BLOCK_VELOCITY_HEIGHT = 0.4; // fraction of the row: base + velocity part
const FLASH_LIFE = 0.14; // seconds a hit flashes after it plays
const FLASH_GROWTH = 0.25; // a flashing block grows by up to this fraction
const GHOST_MIN_SHIFT = 0.5; // CSS px of swing before the straight-grid ghost shows
const GHOST_ALPHA = 0.55,
  GHOST_STROKE_ALPHA = 0.7;
const GHOST_DASH = 3; // CSS px, dash and gap
const GHOST_STROKE = fgAlpha(GHOST_STROKE_ALPHA);
const PAST_ALPHA = 0.3,
  PAST_FLASH_ALPHA = 0.7,
  FUTURE_ALPHA = 0.85; // block fill: played (base + flash part) vs coming
const OUTLINE_PAST_ALPHA = 0.5,
  OUTLINE_FLASH_ALPHA = 0.5,
  OUTLINE_FUTURE_ALPHA = 0.9; // contratempo outline, same scheme
const OUTLINE_WIDTH = 1.6; // CSS px
const OUTLINE_GAP = 2; // CSS px between block and outline

// Labels and playhead. The names and the counts are drawn at the stage's label size, which the
// canvas takes as its own font size (styles.css .lanes canvas), whatever the height of the rows (#65).
const HIDDEN_ALPHA = 0.01; // rows fainter than this are skipped
const MUTED_LABEL_ALPHA = 0.45, // a silent voice keeps its colour, fainter, so it stays named (#12)
  COUNT_ALPHA = 0.55;
const COUNT_COLOR = fgAlpha(COUNT_ALPHA);
const NAME_LINE = 0.6; // a name of two lines (the instrument, "ALFAIA", over the hand): each this many font sizes from the row's middle
const TWO_LINES = 2 * NAME_LINE + 1; // the font sizes those two lines take of a row's height
const NO_COUNT = '—'; // count shown for a silent voice
const PLAYHEAD_WIDTH = 1.6; // CSS px
const PLAYHEAD_OVERHANG = 4; // CSS px above and below the rows

/**
 * The lines a name may take in a row of `rowHeight` at the label size `labelSize`: two where the row
 * holds both, else one, so a name never leaves its row and never shrinks under the label size (#65;
 * the maracatu's seven rows).
 */
export const rowLines = (rowHeight, labelSize) => (rowHeight >= TWO_LINES * labelSize ? 2 : 1);

/**
 * A voice's name as the lines it is written on. `name`: its own name; `instrument`: the instrument a
 * hand belongs to, else null; `lines`: what the row holds (`rowLines`); `fits(text)`: whether a text
 * stays left of the plot. A hand is the instrument over the hand (#12), or the hand alone on one
 * line. A longer name («GUITARRA COM ECO») breaks at the space nearest its middle (#65).
 */
export function nameLines({ name, instrument, lines, fits }) {
  if (instrument) return lines > 1 ? [instrument, name] : [name];
  if (lines < 2 || !name.includes(' ') || fits(name)) return [name];
  const spaces = [...name.matchAll(/ /g)].map(match => match.index),
    at = spaces.reduce((best, space) => (Math.abs(space - name.length / 2) < Math.abs(best - name.length / 2) ? space : best));
  return [name.slice(0, at), name.slice(at + 1)];
}

function rowLayout(voices, height) {
  const rowHeight = Math.min(height / voices.length, height / MAX_ROWS),
    top = (height - rowHeight * voices.length) / 2;
  const rows = Object.fromEntries(voices.map((voice, i) => [voice, { y: top + (i + 0.5) * rowHeight, height: rowHeight }]));
  return { rows, top, bottom: top + rowHeight * voices.length, rowHeight };
}

/** Each visible row: where it is, how tall, how opaque, and how much of it is revealed. */
function morphRows(from, to, amount) {
  const rows = {};
  for (const voice of new Set([...Object.keys(from.rows), ...Object.keys(to.rows)])) {
    const a = from.rows[voice],
      b = to.rows[voice];
    rows[voice] =
      a && b
        ? { y: lerp(a.y, b.y, amount), height: lerp(a.height, b.height, amount), alpha: 1, reveal: 1 }
        : a
          ? { y: a.y - amount * a.height * ROW_DRIFT, height: a.height, alpha: (1 - amount) ** 2, reveal: 1 } // leaving: drifts up, fades fast
          : { y: b.y + (1 - amount) * b.height * ROW_DRIFT, height: b.height, alpha: amount, reveal: amount }; // entering: rises, wipes in
  }
  return rows;
}

/**
 * The voices the wheel draws in `bar` that the lanes do not name as a row: the key above the lanes
 * names them in their colours, so every dot colour has a name on the stage (#12).
 */
export function keyVoices(bar, volume = {}) {
  const { voices } = barTimeline(bar),
    rows = new Set(sceneAt(bar).lanes);
  return VOICE_ORDER.filter(voice => VOICES[voice].ring && voices[voice].length > 0 && !rows.has(voice) && visualOf(volume, voice) > 0);
}

/**
 * The key: one `● name` per voice from `keyVoices`, in the voice's colour, on the lines its names
 * need. Every key of the show is laid out unseen in the same box (styles.css `.key`), so the box is
 * always as tall as the show's tallest key and the lanes under it keep their height from scene to
 * scene (#61).
 */
export function createKey(element, volume = {}) {
  /** One key's names; `levelOf` gives a voice's strength, so a muted voice's name shows disabled. */
  const line = (voices, levelOf) => {
    const names = document.createElement('span');
    for (const voice of voices) {
      const name = document.createElement('span');
      name.style.color = VOICES[voice].color;
      name.style.opacity = levelOf(voice);
      name.textContent = `● ${COPY.voices[voice]}`;
      if (names.firstChild) names.append(' '); // where a line may break
      names.append(name);
    }
    return names;
  };
  // every voice at full strength: a volume can only take a name out of a key
  const keys = new Map(Array.from({ length: TOTAL_BARS }, (_, bar) => keyVoices(bar)).map(voices => [voices.join(), voices]));
  element.textContent = '';
  for (const voices of keys.values()) element.appendChild(line(voices, () => 1)).setAttribute('aria-hidden', 'true');
  let inView = element.appendChild(line([])),
    shown = '';
  return {
    update(bar) {
      const voices = keyVoices(bar, volume),
        id = voices.map(voice => `${voice}:${visualOf(volume, voice)}`).join();
      if (id === shown) return;
      shown = id;
      const next = line(voices, voice => visualOf(volume, voice));
      inView.replaceWith(next);
      inView = next;
    },
  };
}

/** `volume` maps an instrument to its volume level; a quieter voice draws fainter (audio.js visualOf). */
export function createLanes(canvas, volume = {}) {
  const ctx = canvas.getContext('2d');
  let width = 0,
    height = 0,
    labelSize = 0, // the stage's label size, in the canvas's own pixels
    names = new Map(), // each name's lines at this size, kept until the canvas is measured again: no text is measured in a frame
    dpr = 1;

  function drawGrid(start, toX, plotLeft, plotRight, sixteenthWidth, top, bottom) {
    for (let s = Math.floor(start * STEPS_PER_BAR); s <= Math.ceil((start + WINDOW_BARS) * STEPS_PER_BAR); s++) {
      const x = toX(s / STEPS_PER_BAR);
      if (x < plotLeft || x > plotRight) continue;
      const isBar = s % STEPS_PER_BAR === 0,
        isBeat = s % STEPS_PER_BEAT === 0;
      if (isBeat) {
        ctx.fillStyle = BEAT_SHADE;
        ctx.fillRect(x, top, sixteenthWidth, bottom - top);
      }
      ctx.strokeStyle = isBar ? BAR_LINE : isBeat ? BEAT_LINE : SIXTEENTH_LINE;
      ctx.lineWidth = (isBar ? BAR_LINE_WIDTH : 1) * dpr;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
  }

  function drawHit(h, row, x, gridX, blockWidth, position) {
    const past = h.at <= position,
      age = (position - h.at) * BAR_SECONDS,
      flash = past && age < FLASH_LIFE ? 1 - age / FLASH_LIFE : 0;
    const blockHeight = row.height * (BLOCK_HEIGHT + BLOCK_VELOCITY_HEIGHT * h.hit.velocity) * (1 + flash * FLASH_GROWTH),
      y = row.y - blockHeight / 2;
    if (Math.abs(gridX - x) > GHOST_MIN_SHIFT * dpr) {
      // dashed ghost where the straight grid would put it
      ctx.globalAlpha = GHOST_ALPHA * row.alpha;
      ctx.strokeStyle = GHOST_STROKE;
      ctx.lineWidth = dpr;
      ctx.setLineDash([GHOST_DASH * dpr, GHOST_DASH * dpr]);
      ctx.strokeRect(gridX, y, blockWidth, blockHeight);
      ctx.setLineDash([]);
    }
    const level = visualOf(volume, h.voice);
    ctx.globalAlpha = (past ? PAST_ALPHA + PAST_FLASH_ALPHA * flash : FUTURE_ALPHA) * row.alpha * level;
    ctx.fillStyle = VOICES[h.voice].color;
    ctx.fillRect(x, y, blockWidth, blockHeight);
    if (isHand(h.voice) && isOffbeat(h.hit.step)) {
      // contratempo outline
      ctx.globalAlpha = (past ? OUTLINE_PAST_ALPHA + OUTLINE_FLASH_ALPHA * flash : OUTLINE_FUTURE_ALPHA) * row.alpha * level;
      ctx.strokeStyle = COLORS.fg;
      ctx.lineWidth = OUTLINE_WIDTH * dpr;
      ctx.strokeRect(x - OUTLINE_GAP * dpr, y - OUTLINE_GAP * dpr, blockWidth + 2 * OUTLINE_GAP * dpr, blockHeight + 2 * OUTLINE_GAP * dpr);
    }
  }

  function draw(position) {
    if (!width) return;
    const { from, to, amount, scene } = blendAt(position, MORPH_BARS);
    const layoutFrom = rowLayout(from.lanes, height),
      layoutTo = rowLayout(to.lanes, height);
    const rows = morphRows(layoutFrom, layoutTo, amount);
    const top = lerp(layoutFrom.top, layoutTo.top, amount),
      bottom = lerp(layoutFrom.bottom, layoutTo.bottom, amount);
    const active = new Set(scene.voices(Math.floor(position) - scene.start));
    const plotLeft = width * PLOT_LEFT,
      plotWidth = width - plotLeft - width * PLOT_RIGHT_MARGIN,
      plotRight = plotLeft + plotWidth;
    const start = position - LOOK_BACK_BARS,
      sixteenthWidth = plotWidth / WINDOW_BARS / STEPS_PER_BAR,
      toX = bars => plotLeft + ((bars - start) / WINDOW_BARS) * plotWidth;

    ctx.clearRect(0, 0, width, height);
    drawGrid(start, toX, plotLeft, plotRight, sixteenthWidth, top, bottom);

    for (let bar = Math.floor(start); bar <= Math.floor(start + WINDOW_BARS); bar++) {
      for (const h of hitsInBar(bar)) {
        const row = rows[h.voice],
          x = toX(h.at);
        if (!row || row.alpha < HIDDEN_ALPHA || visualOf(volume, h.voice) === 0 || x < plotLeft || x > plotLeft + plotWidth * row.reveal) continue;
        drawHit(h, row, x, toX(h.grid), sixteenthWidth * BLOCK_WIDTH, position);
      }
    }

    // The names and the counts are the scene's own, at its own rows, never at a row on its way: they
    // fade out before a scene change and the next scene's fade in after it, so no name crosses
    // another while the rows move (#62). A row that stays where it is keeps its name lit.
    const [layout, other] = scene === from ? [layoutFrom, layoutTo] : [layoutTo, layoutFrom],
      changing = Math.abs(1 - 2 * amount); // 1 away from a scene change, 0 on it
    ctx.font = `${labelSize}px ${MONO_FONT}`;
    ctx.textBaseline = 'middle';
    const counts = {};
    for (const h of hitsInBar(Math.floor(position))) counts[h.voice] = (counts[h.voice] || 0) + 1;
    for (const voice of scene.lanes) {
      const row = layout.rows[voice],
        stays = other.rows[voice]?.y === row.y && other.rowHeight === layout.rowHeight,
        alpha = stays ? 1 : changing;
      if (alpha < HIDDEN_ALPHA || visualOf(volume, voice) === 0) continue; // a muted voice's row shows nothing
      ctx.globalAlpha = alpha * (active.has(voice) ? 1 : MUTED_LABEL_ALPHA) * visualOf(volume, voice);
      ctx.fillStyle = VOICES[voice].color;
      ctx.textAlign = 'left';
      const lines = rowLines(layout.rowHeight, labelSize),
        kept = `${voice} ${lines}`;
      if (!names.has(kept))
        names.set(
          kept,
          nameLines({
            name: COPY.voices[voice].toUpperCase(),
            instrument: isHand(voice) ? COPY.instruments[VOICES[voice].instrument].toUpperCase() : null,
            lines,
            fits: text => ctx.measureText(text).width <= plotLeft,
          }),
        );
      const [first, second] = names.get(kept);
      if (second) {
        const shift = labelSize * NAME_LINE;
        ctx.fillText(first, 0, row.y - shift);
        ctx.fillText(second, 0, row.y + shift);
      } else ctx.fillText(first, 0, row.y);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'right';
      ctx.fillStyle = COUNT_COLOR;
      ctx.fillText(active.has(voice) ? String(counts[voice] || 0) : NO_COUNT, width, row.y);
    }
    ctx.globalAlpha = 1;
    const playhead = toX(position);
    ctx.strokeStyle = COLORS.fg;
    ctx.lineWidth = PLAYHEAD_WIDTH * dpr;
    ctx.beginPath();
    ctx.moveTo(playhead, top - PLAYHEAD_OVERHANG * dpr);
    ctx.lineTo(playhead, bottom + PLAYHEAD_OVERHANG * dpr);
    ctx.stroke();
  }

  return {
    draw,
    resize(pixelRatio) {
      dpr = pixelRatio;
      const box = canvas.getBoundingClientRect(),
        style = getComputedStyle(canvas);
      width = canvas.width = Math.round(box.width * dpr);
      height = canvas.height = Math.round(box.height * dpr);
      // the canvas's font size is the stage's label size in the page's pixels, before the stage's
      // zoom (a desktop zooms the stage to its column): here in the canvas's own pixels, by the
      // pixels it really has for each of the page's, never rounded down
      labelSize = width ? (parseFloat(style.fontSize) * width) / parseFloat(style.width) : 0;
      names.clear();
    },
  };
}

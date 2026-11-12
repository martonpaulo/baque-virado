// The multitrack view under the readout: a short window that scrolls past a fixed playhead.
// Rows change with the scene and morph into the next scene's rows.

import { COPY } from './copy.js';
import { BAR_SECONDS, isAlfaia, isOffbeat, STEPS_PER_BAR, VOICES } from './music.js';
import { blendAt, hitsInBar } from './show.js';
import { CANVAS_MONO_FONT, COLORS, fgAlpha } from './theme.js';
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
const PAST_ALPHA = 0.3,
  PAST_FLASH_ALPHA = 0.7,
  FUTURE_ALPHA = 0.85; // block fill: played (base + flash part) vs coming
const OUTLINE_PAST_ALPHA = 0.5,
  OUTLINE_FLASH_ALPHA = 0.5,
  OUTLINE_FUTURE_ALPHA = 0.9; // contratempo outline, same scheme
const OUTLINE_WIDTH = 1.6; // CSS px
const OUTLINE_GAP = 2; // CSS px between block and outline

// Labels and playhead.
const LABEL_SIZE = 0.32; // font size as a fraction of the row height...
const LABEL_MAX_SIZE = 0.07; // ...capped at this fraction of the canvas height
const HIDDEN_ALPHA = 0.01; // rows fainter than this are skipped
const MUTED_LABEL_ALPHA = 0.25,
  COUNT_ALPHA = 0.55;
const NO_COUNT = '—'; // count shown for a silent voice
const PLAYHEAD_WIDTH = 1.6; // CSS px
const PLAYHEAD_OVERHANG = 4; // CSS px above and below the rows

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

export function createLanes(canvas) {
  const ctx = canvas.getContext('2d');
  let width = 0,
    height = 0,
    dpr = 1;

  function drawGrid(start, toX, plotLeft, plotRight, sixteenthWidth, top, bottom) {
    for (let s = Math.floor(start * STEPS_PER_BAR); s <= Math.ceil((start + WINDOW_BARS) * STEPS_PER_BAR); s++) {
      const x = toX(s / STEPS_PER_BAR);
      if (x < plotLeft || x > plotRight) continue;
      const isBar = s % STEPS_PER_BAR === 0,
        isBeat = s % 4 === 0;
      if (isBeat) {
        ctx.fillStyle = fgAlpha(BEAT_SHADE_ALPHA);
        ctx.fillRect(x, top, sixteenthWidth, bottom - top);
      }
      ctx.strokeStyle = fgAlpha(isBar ? BAR_LINE_ALPHA : isBeat ? BEAT_LINE_ALPHA : SIXTEENTH_LINE_ALPHA);
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
      ctx.strokeStyle = fgAlpha(GHOST_STROKE_ALPHA);
      ctx.lineWidth = dpr;
      ctx.setLineDash([GHOST_DASH * dpr, GHOST_DASH * dpr]);
      ctx.strokeRect(gridX, y, blockWidth, blockHeight);
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = (past ? PAST_ALPHA + PAST_FLASH_ALPHA * flash : FUTURE_ALPHA) * row.alpha;
    ctx.fillStyle = VOICES[h.voice].color;
    ctx.fillRect(x, y, blockWidth, blockHeight);
    if (isAlfaia(h.voice) && isOffbeat(h.hit.step)) {
      // contratempo outline
      ctx.globalAlpha = (past ? OUTLINE_PAST_ALPHA + OUTLINE_FLASH_ALPHA * flash : OUTLINE_FUTURE_ALPHA) * row.alpha;
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
    ctx.font = `${Math.round(Math.min(lerp(layoutFrom.rowHeight, layoutTo.rowHeight, amount) * LABEL_SIZE, height * LABEL_MAX_SIZE))}px ${CANVAS_MONO_FONT}`;
    ctx.textBaseline = 'middle';
    drawGrid(start, toX, plotLeft, plotRight, sixteenthWidth, top, bottom);

    for (let bar = Math.floor(start); bar <= Math.floor(start + WINDOW_BARS); bar++) {
      for (const h of hitsInBar(bar)) {
        const row = rows[h.voice],
          x = toX(h.at);
        if (!row || row.alpha < HIDDEN_ALPHA || x < plotLeft || x > plotLeft + plotWidth * row.reveal) continue;
        drawHit(h, row, x, toX(h.grid), sixteenthWidth * BLOCK_WIDTH, position);
      }
    }

    const counts = {};
    for (const h of hitsInBar(Math.floor(position))) counts[h.voice] = (counts[h.voice] || 0) + 1;
    for (const voice in rows) {
      const row = rows[voice];
      if (row.alpha < HIDDEN_ALPHA) continue;
      ctx.globalAlpha = row.alpha;
      ctx.fillStyle = active.has(voice) ? VOICES[voice].color : fgAlpha(MUTED_LABEL_ALPHA);
      ctx.textAlign = 'left';
      ctx.fillText(COPY.voices[voice].toUpperCase(), 0, row.y);
      ctx.textAlign = 'right';
      ctx.fillStyle = fgAlpha(COUNT_ALPHA);
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
      const box = canvas.getBoundingClientRect();
      width = canvas.width = Math.round(box.width * dpr);
      height = canvas.height = Math.round(box.height * dpr);
    },
  };
}

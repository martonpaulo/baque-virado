// Measure how much a show's background moves in each scene, whether that follows the music's energy,
// and whether anything flashes, through the real page (#63).
// usage: node lab/motion.mjs <id>... [--seconds N] [--shots DIR]
//   --seconds: how long to measure in the middle of each scene (default 3)
//   --shots: a folder for one picture of the stage per scene, as the viewer sees it while it plays
// It draws each frame with `window.baque.frame`, the call the video export makes, with motion on,
// and reads the two background canvases scaled down to a grid of cells. Per scene it prints:
//   energy   the mean of the engine's own energy over the frames measured (src/show.js)
//   moving   the share of cells whose lightness (CIE L*) changes by one step or more in half a second
//   change   the mean change of lightness between two frames, in hundredths of a step
//   flashes  the most opposing changes of 10 % relative luminance one cell makes in a second, as
//            pairs, and the share of cells that make more than three (WCAG 2.3.1)
// and per show, how the change follows the energy over its scenes (Pearson's r).

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from '../tests/support/browser.js';

const FPS = 30;
const WARM_UP = 2; // seconds drawn before the first measured frame, so the trail is the show's
const GRID = { width: 36, height: 78 }; // cells: the stage's 393 by 852 shape
const VIEWPORT = { width: 393, height: 852, deviceScaleFactor: 1 }; // a phone, the layout every screen shows
const SHOT_SCALE = 2; // pictures a person reads are twice as sharp
const READY_MS = 60000;
const DEFAULT_SECONDS = 3;
const SCENE_EDGE = 0.2; // seconds kept clear of a scene's ends
const LIGHTNESS_STEP = 1; // one L* is about the least difference an eye sees
const FLASH_CHANGE = 0.1; // relative luminance (WCAG 2.3.1, general flash)
const FLASH_DARK_LIMIT = 0.8; // the darker state of a flash is below this
const FLASHES_ALLOWED = 3;
const PERCENT = 100;
const CIE = { kappa: 903.3, epsilon: 0.008856, scale: 116, offset: 16 }; // the constants of L*

/** The command line as { ids, seconds, shots }, or null when it cannot be read. */
export function parseArguments(words) {
  const ids = [],
    options = { seconds: DEFAULT_SECONDS, shots: null };
  for (let i = 0; i < words.length; i++) {
    if (!words[i].startsWith('--')) ids.push(words[i]);
    else if (words[i] === '--seconds' && Number(words[i + 1]) > 0) options.seconds = Number(words[++i]);
    else if (words[i] === '--shots' && words[i + 1] && !words[i + 1].startsWith('--')) options.shots = words[++i];
    else return null;
  }
  return ids.length ? { ids, ...options } : null;
}

const lightness = y => (y > CIE.epsilon ? CIE.scale * Math.cbrt(y) - CIE.offset : CIE.kappa * y);

/** The most flashes a cell makes in any second: pairs of opposing changes of FLASH_CHANGE or more. */
function flashesOf(series, fps) {
  const turns = []; // when the luminance has moved FLASH_CHANGE away from its last peak or trough
  let peak = series[0],
    trough = series[0],
    direction = 0; // of the last change: 1 up, -1 down, 0 none yet
  for (let k = 1; k < series.length; k++) {
    const value = series[k];
    if (direction >= 0) peak = Math.max(peak, value);
    if (direction <= 0) trough = Math.min(trough, value);
    if (direction >= 0 && peak - value >= FLASH_CHANGE && value < FLASH_DARK_LIMIT) {
      turns.push(k / fps);
      direction = -1;
      trough = value;
    } else if (direction <= 0 && value - trough >= FLASH_CHANGE && trough < FLASH_DARK_LIMIT) {
      turns.push(k / fps);
      direction = 1;
      peak = value;
    }
  }
  let most = 0;
  for (let a = 0; a < turns.length; a++) {
    let b = a;
    while (b < turns.length && turns[b] - turns[a] < 1) b++;
    most = Math.max(most, b - a);
  }
  return Math.floor(most / 2);
}

/**
 * What a run of frames shows. `frames`: each the relative luminance (0 to 1) of every cell, at `fps`.
 * Returns { moving, change, flashes, flashing }: see the top of this file.
 */
export function summarise(frames, fps = FPS) {
  const cells = frames[0].length,
    lag = Math.round(fps / 2),
    light = frames.map(frame => frame.map(lightness));
  let change = 0;
  for (let k = 1; k < light.length; k++) for (let i = 0; i < cells; i++) change += Math.abs(light[k][i] - light[k - 1][i]);
  let moving = 0,
    pairs = 0;
  for (let k = lag; k < light.length; k++, pairs++) for (let i = 0; i < cells; i++) if (Math.abs(light[k][i] - light[k - lag][i]) >= LIGHTNESS_STEP) moving++;
  let flashes = 0,
    flashing = 0;
  for (let i = 0; i < cells; i++) {
    const count = flashesOf(
      frames.map(frame => frame[i]),
      fps,
    );
    flashes = Math.max(flashes, count);
    if (count > FLASHES_ALLOWED) flashing++;
  }
  return {
    moving: pairs ? moving / (pairs * cells) : 0,
    change: frames.length > 1 ? change / ((frames.length - 1) * cells) : 0,
    flashes,
    flashing: flashing / cells,
  };
}

/** Pearson's r of two lists of the same length; 0 when either does not vary. */
export function correlation(xs, ys) {
  const mean = list => list.reduce((sum, value) => sum + value, 0) / list.length,
    mx = mean(xs),
    my = mean(ys);
  const cov = xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0),
    vx = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0),
    vy = ys.reduce((sum, y) => sum + (y - my) ** 2, 0);
  return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0;
}

/** In the page: draw the frames of `span` seconds from `from` and return each one's cells and energy. */
async function drawFrames(from, span, fps, warmUp, grid) {
  const { energyOf, recentHits, RECENT_WINDOW } = await import('/src/show.js');
  const small = document.createElement('canvas');
  small.width = grid.width;
  small.height = grid.height;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  const shader = document.getElementById('fx'),
    feedback = document.getElementById('bg'),
    ground = getComputedStyle(document.getElementById('stage')).backgroundColor;
  const linear = value => (value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4); // sRGB to linear light
  const cells = () => {
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, grid.width, grid.height);
    if (shader.width && getComputedStyle(shader).display !== 'none') ctx.drawImage(shader, 0, 0, grid.width, grid.height);
    ctx.drawImage(feedback, 0, 0, grid.width, grid.height);
    const data = ctx.getImageData(0, 0, grid.width, grid.height).data,
      out = [];
    for (let i = 0; i < data.length; i += 4)
      out.push(Number((0.2126 * linear(data[i]) + 0.7152 * linear(data[i + 1]) + 0.0722 * linear(data[i + 2])).toFixed(5)));
    return out;
  };
  for (let t = from - warmUp; t < from; t += 1 / fps) window.baque.frame(Math.max(0, t));
  const frames = [];
  let energy = 0;
  for (let k = 0; k <= span * fps; k++) {
    const seconds = from + k / fps;
    window.baque.frame(seconds);
    frames.push(cells());
    energy += energyOf(recentHits(seconds / window.baque.BAR, RECENT_WINDOW));
  }
  return { frames, energy: energy / frames.length };
}

async function measureShow(browser, url, id, { seconds, shots }) {
  const page = await browser.newPage();
  try {
    await page.setViewport(shots ? { ...VIEWPORT, deviceScaleFactor: SHOT_SCALE } : VIEWPORT);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    page.on('pageerror', error => console.error('pageerror', error.message));
    await page.goto(`${url}${id}`);
    await page.waitForFunction(() => window.baque && typeof window.baque.frame === 'function', { timeout: READY_MS });
    // the stage as it looks while the show plays: no Play button over it
    const scenes = await page.evaluate(async () => {
      document.getElementById('tap').dataset.state = 'pause';
      const { SCENES } = await import('/src/show.js');
      return SCENES.map(scene => ({ id: scene.id, start: scene.start * window.baque.BAR, length: scene.bars * window.baque.BAR }));
    });
    console.log(`\n${id}`);
    const rows = [];
    for (const scene of scenes) {
      const span = Math.min(seconds, Math.max(SCENE_EDGE, scene.length - 2 * SCENE_EDGE)),
        from = scene.start + (scene.length - span) / 2;
      const { frames, energy } = await page.evaluate(drawFrames, from, span, FPS, WARM_UP, GRID);
      const row = { ...summarise(frames), energy };
      rows.push(row);
      const percent = share => `${(share * PERCENT).toFixed(share > 0 && share < 1 / PERCENT ? 1 : 0).padStart(3)} %`;
      console.log(
        `  ${scene.id.padEnd(14)} energy ${energy.toFixed(2)} | moving ${percent(row.moving)} | change ${(row.change * PERCENT).toFixed(1).padStart(6)} | flashes ${row.flashes}, over ${FLASHES_ALLOWED} in ${percent(row.flashing)} of cells`,
      );
      if (shots) {
        mkdirSync(shots, { recursive: true });
        writeFileSync(path.join(shots, `${id}-${scene.id}.png`), await (await page.$('#stage')).screenshot());
      }
    }
    const moving = rows.map(row => row.moving);
    console.log(
      `  change follows energy: r = ${correlation(
        rows.map(row => row.energy),
        rows.map(row => row.change),
      ).toFixed(
        2,
      )}; moving from ${(Math.min(...moving) * PERCENT).toFixed(0)} % to ${(Math.max(...moving) * PERCENT).toFixed(0)} %; most flashes ${Math.max(...rows.map(row => row.flashes))}`,
    );
  } finally {
    await page.close();
  }
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (!parsed) {
    console.error('usage: node lab/motion.mjs <id>... [--seconds N] [--shots DIR]');
    process.exit(2);
  }
  const { server, browser, close } = await openBrowser({ protocolTimeout: 0 });
  try {
    for (const id of parsed.ids) await measureShow(browser, server.url, id, parsed);
  } finally {
    await close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

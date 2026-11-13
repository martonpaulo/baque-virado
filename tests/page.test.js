// Smoke tests of the real page in headless Chromium (#9): the page loads without errors, keeps the
// `window.baque` contract the exporter drives, and the playback fixes of 00919fb and the phone
// layout of #4 hold.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, before, test } from 'node:test';
import { COPY } from '../src/copy.js';
import { SCENES } from '../src/show.js';
import { openBrowser } from './support/browser.js';

const PHONES = [
  { width: 375, height: 667 },
  { width: 375, height: 812 },
];
const DESKTOP = { width: 1440, height: 900 };
const LABEL_FLOOR_PX = 11; // #4
const SOUND_DELAY_MS = 600; // holds every sample back, so Space lands while they decode
const DETERMINISM_POSITION = 20.3; // bars: a baque scene, wheel, score and background all busy
const BAQUE_SCENES = SCENES.filter(scene => scene.named && scene.id !== 'summary').map(scene => scene.id);

let session;
before(async () => {
  session = await openBrowser();
});
after(async () => {
  await session?.close();
});

/**
 * A fresh page on the site. Every request must stay on the local server. `errors` collects page
 * errors and console errors; `contexts()` counts the audio contexts the page opened.
 */
async function openPage(viewport, { delaySounds = false } = {}) {
  const page = await session.browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`page error: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console error: ${message.text()}`);
  });
  await page.evaluateOnNewDocument(() => {
    window.__audioContexts = 0;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(...args) {
        super(...args);
        window.__audioContexts++;
      }
    };
  });
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = request.url();
    // Until the fonts are served from the site (#11), the Google Fonts stylesheet gets an empty answer.
    if (url.startsWith('https://fonts.googleapis.com/')) {
      await request.respond({ status: 200, contentType: 'text/css', body: '' });
      return;
    }
    if (!url.startsWith(session.server.url)) {
      errors.push(`request off the site: ${url}`);
      await request.abort();
      return;
    }
    if (delaySounds && url.includes('/sounds/')) await new Promise(resolve => setTimeout(resolve, SOUND_DELAY_MS));
    await request.continue();
  });
  await page.setViewport(viewport);
  await page.goto(session.server.url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.baque);
  await page.evaluate(() => document.fonts.ready);
  return { page, errors, contexts: () => page.evaluate(() => window.__audioContexts) };
}

/** Render the scene with this id at `offset` bars in, through the exporter API. */
const showScene = (page, id, offset = 0.5) =>
  page.evaluate(
    async start => {
      window.baque.render(start);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    },
    SCENES.find(scene => scene.id === id).start + offset,
  );

test('the page loads with no error and exposes the exporter contract', async () => {
  const { page, errors } = await openPage(DESKTOP);
  const contract = await page.evaluate(() =>
    Object.fromEntries(['render', 'renderAudio', 'TOTAL', 'BAR', 'audioOffset'].map(key => [key, typeof window.baque[key]])),
  );
  assert.deepEqual(contract, { render: 'function', renderAudio: 'function', TOTAL: 'number', BAR: 'number', audioOffset: 'number' });
  for (const scene of SCENES) await showScene(page, scene.id);
  assert.deepEqual(errors, []);
  await page.close();
});

test('render(p) from cold gives the same frame twice', async () => {
  const frames = [];
  for (let run = 0; run < 2; run++) {
    const { page, errors } = await openPage(DESKTOP);
    await page.evaluate(async position => {
      window.baque.render(position);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      // CSS animations (the readout's fade) run on wall time; the exporter steps them with its own
      // virtual clock, so the frame it captures is the one after they end.
      for (const animation of document.getAnimations()) animation.finish();
    }, DETERMINISM_POSITION);
    const image = await (await page.$('#stage')).screenshot();
    frames.push(createHash('sha256').update(image).digest('hex'));
    assert.deepEqual(errors, []);
    await page.close();
  }
  assert.equal(frames[0], frames[1]);
});

test('two Space presses while the samples decode open one audio context', async () => {
  const { page, errors, contexts } = await openPage(DESKTOP, { delaySounds: true });
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.waitForFunction(pause => document.getElementById('play').textContent === pause, {}, COPY.controls.pause);
  assert.equal(await contexts(), 1);
  assert.deepEqual(errors, []);
  await page.close();
});

test('Space after a chip click pauses, and the paused scene shows its full title', async () => {
  const { page, errors } = await openPage(DESKTOP);
  await page.click('#play');
  await page.waitForFunction(pause => document.getElementById('play').textContent === pause, {}, COPY.controls.pause);
  const chip = COPY.scenes.trovao.chip;
  await page.evaluate(text => [...document.querySelectorAll('#chips .chip')].find(button => button.textContent === text).click(), chip);
  await page.keyboard.press('Space');
  await page.waitForFunction(play => document.getElementById('play').textContent === play, {}, COPY.controls.play);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.$eval('.title', element => element.textContent), COPY.scenes.trovao.title.toUpperCase());
  assert.deepEqual(errors, []);
  await page.close();
});

/** In each baque scene: does the wheel's 9 label overlap the readout's stats? */
async function nineOverlaps(page) {
  const overlapping = [];
  for (const id of BAQUE_SCENES) {
    await showScene(page, id);
    const overlap = await page.evaluate(() => {
      const nine = [...document.querySelectorAll('#scope text')].find(text => text.textContent.trim() === '9');
      const stats = document.querySelector('.read .stats');
      if (!nine || !stats) return 'missing';
      const a = nine.getBoundingClientRect(),
        b = stats.getBoundingClientRect();
      return a.bottom > b.top && a.top < b.bottom && a.right > b.left && a.left < b.right;
    });
    if (overlap) overlapping.push(`${id}: ${overlap}`);
  }
  return overlapping;
}

test('the wheel’s 9 label never overlaps the readout stats', async () => {
  for (const viewport of [PHONES[0], DESKTOP]) {
    const { page, errors } = await openPage(viewport);
    assert.deepEqual(await nineOverlaps(page), [], `${viewport.width}x${viewport.height}`);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('on phones the stage labels are at least 11 px and every readout fits its box', async () => {
  for (const viewport of PHONES) {
    const { page, errors } = await openPage(viewport);
    const problems = [];
    for (const scene of SCENES) {
      await showScene(page, scene.id);
      const found = await page.evaluate(floor => {
        const small = [];
        for (const selector of ['.hud', '.read .k', '.notation .n', '.eyebrow'])
          for (const element of document.querySelectorAll(selector)) {
            const size = parseFloat(getComputedStyle(element).fontSize);
            if (size < floor) small.push(`${selector} ${size}px`);
          }
        const read = document.querySelector('.read');
        const overflow = read.scrollHeight - read.clientHeight;
        return [...small, ...(overflow > 0 ? [`.read overflows by ${overflow}px`] : [])];
      }, LABEL_FLOOR_PX);
      problems.push(...found.map(problem => `${viewport.width}x${viewport.height} ${scene.id}: ${problem}`));
    }
    assert.deepEqual(problems, []);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

// Found by these tests: a stage measured at 0 px (before layout, or hidden) made the background
// draw a 0-px canvas, which throws.
test('a stage of zero size draws nothing and throws nothing', async () => {
  const { page, errors } = await openPage(DESKTOP);
  await page.evaluate(async () => {
    document.getElementById('stage').style.display = 'none';
    for (let i = 0; i < 6; i++) await new Promise(resolve => requestAnimationFrame(resolve));
    document.getElementById('stage').style.display = '';
    for (let i = 0; i < 6; i++) await new Promise(resolve => requestAnimationFrame(resolve));
  });
  assert.deepEqual(errors, []);
  await page.close();
});

// #8: the feedback tunnel renders at half the device resolution on a 3x phone, and its hue filter
// runs at most every third frame.
test('the feedback canvases are at most half the device resolution, filtered every third frame', async () => {
  const phone = { width: 390, height: 844, deviceScaleFactor: 3 };
  const page = await session.browser.newPage();
  await page.evaluateOnNewDocument(() => {
    window.__filters = 0;
    const descriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'filter');
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'filter', {
      get: descriptor.get,
      set(value) {
        if (value !== 'none') window.__filters++;
        descriptor.set.call(this, value);
      },
    });
  });
  await page.setViewport(phone);
  await page.goto(session.server.url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.baque);
  const sizes = await page.evaluate(() => {
    const stage = document.getElementById('stage').getBoundingClientRect();
    return { bg: document.getElementById('bg').width, stage: stage.width };
  });
  assert.ok(sizes.bg <= Math.ceil(sizes.stage * phone.deviceScaleFactor * 0.5), JSON.stringify(sizes));
  const counted = await page.evaluate(async () => {
    const before = window.__filters;
    for (let i = 0; i < 30; i++) await new Promise(resolve => requestAnimationFrame(resolve));
    return window.__filters - before;
  });
  assert.ok(counted <= 11, `${counted} filter assignments in 30 frames`);
  await page.close();
});

test('the swing moiré strokes no ring wholly outside the canvas', async () => {
  const { page, errors } = await openPage(PHONES[0]);
  await page.evaluate(() => {
    window.__outside = [];
    const arc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function (x, y, radius, ...rest) {
      const { width, height } = this.canvas;
      const farthest = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
      if (radius - this.lineWidth / 2 > farthest)
        window.__outside.push(`${this.canvas.id} r${Math.round(radius)} at ${Math.round(x)},${Math.round(y)} in ${width}x${height} lw${this.lineWidth}`);
      return arc.call(this, x, y, radius, ...rest);
    };
  });
  const swing = SCENES.find(scene => scene.id === 'swing');
  for (let frame = 0; frame < 10; frame++) await showScene(page, 'swing', swing.bars - 1 + frame / 30);
  assert.deepEqual(await page.evaluate(() => window.__outside), []);
  assert.deepEqual(errors, []);
  await page.close();
});

test('the exporter rebuilds the wheel only on a new bar or after a jump', async () => {
  const { page, errors } = await openPage(DESKTOP);
  // A rebuild replaces the wheel's dots and shapes, so the nodes drawn at the bar's start disconnect.
  const rebuilds = await page.evaluate(async () => {
    const step = 1 / 30 / window.baque.BAR; // one exported frame, in bars
    window.baque.render(20); // the jump into export mode
    let nodes = [...document.querySelectorAll('#scope circle, #scope path')];
    let count = 0;
    for (let frame = 1; frame < 20; frame++) {
      window.baque.render(20 + frame * step); // still bar 20
      await Promise.resolve();
      if (nodes.some(node => !node.isConnected)) {
        count++;
        nodes = [...document.querySelectorAll('#scope circle, #scope path')];
      }
    }
    return count;
  });
  assert.equal(rebuilds, 0);
  assert.deepEqual(errors, []);
  await page.close();
});

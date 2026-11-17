// Smoke tests of the real page in headless Chromium (#9): the page loads without errors, keeps the
// `window.baque` contract the exporter drives, and the playback fixes of 00919fb and the phone
// layout of #4 hold.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { COPY } from '../src/copy.js';
import { redirectFor } from '../src/rhythms/index.js';
import { SCENES } from '../src/show.js';
import { openBrowser } from './support/browser.js';

// The shipped rhythm registry with its list replaced, served in its place: maracatu and the
// tests-only 2/4 fixture, or maracatu alone.
const SHIPPED_REGISTRY = readFileSync(new URL('../src/rhythms/index.js', import.meta.url), 'utf8');
const SHIPPED_LIST = /export const RHYTHMS = \[.*\];/;
const SHIPPED_ROUTES = /export const ROUTES = \[.*\];/;
const TWO_FOUR_ROUTES = ['maracatu', 'dois-por-quatro']; // tests/support/browser.js serves both paths
const REGISTRY_ROUTES = { twoFour: TWO_FOUR_ROUTES, maracatuOnly: ['maracatu'] };
const REGISTRIES = {
  twoFour: SHIPPED_REGISTRY.replace(
    SHIPPED_LIST,
    "import { TWO_FOUR } from '../../tests/support/rhythm-two-four.js';\nexport const RHYTHMS = [MARACATU, TWO_FOUR];",
  ).replace(SHIPPED_ROUTES, `export const ROUTES = ${JSON.stringify(TWO_FOUR_ROUTES)};`),
  maracatuOnly: SHIPPED_REGISTRY.replace(SHIPPED_LIST, 'export const RHYTHMS = [MARACATU];').replace(SHIPPED_ROUTES, "export const ROUTES = ['maracatu'];"),
};

const PHONES = [
  { width: 375, height: 667 },
  { width: 375, height: 812 },
];
const DESKTOP = { width: 1440, height: 900 };
const EXPORT_FRAME = { width: 1080, height: 1920 }; // tools/export-video.mjs, the owner's 9:16 frame
const COPY_ALFAIA = COPY.read.alfaia.toUpperCase(),
  COPY_PRINCIPAL = COPY.voices.main.toUpperCase();
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
 * errors and console errors; `contexts()` counts the audio contexts the page opened. `videoExport`
 * sets the class tools/export-video.mjs sets.
 */
async function openPage(viewport, { delaySounds = false, videoExport = false, query = '', registry = null } = {}) {
  const page = await session.browser.newPage();
  // the same hook tools/export-video.mjs installs
  if (videoExport) await page.evaluateOnNewDocument(() => addEventListener('DOMContentLoaded', () => document.documentElement.classList.add('video-export')));
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
    // a data: URL never leaves the page (the video export draws each frame from one)
    if (!url.startsWith(session.server.url) && !url.startsWith('data:')) {
      errors.push(`request off the site: ${url}`);
      await request.abort();
      return;
    }
    if (delaySounds && url.includes('/sounds/')) await new Promise(resolve => setTimeout(resolve, SOUND_DELAY_MS));
    if (registry && url.endsWith('/src/rhythms/index.js')) {
      await request.respond({ contentType: 'text/javascript', body: REGISTRIES[registry] });
      return;
    }
    await request.continue();
  });
  await page.setViewport(viewport);
  await page.goto(session.server.url + query, { waitUntil: 'load' });
  // `?ritmo=<id>` of a rhythm path reloads the page there: wait for the page at the final address
  const path = redirectFor(query, REGISTRY_ROUTES[registry]) ?? '/';
  await page.waitForFunction(at => location.pathname === at && window.baque && document.readyState === 'complete', {}, path);
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
  // #11: both fonts come from the site and load (any request off the site is an error above)
  const fonts = await page.evaluate(() => [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family.replaceAll('"', '')));
  assert.deepEqual([...new Set(fonts)].sort(), ['JetBrains Mono', 'Space Grotesk']);
  assert.deepEqual(errors, []);
  await page.close();
});

// The frame is read in the same task as the render: every canvas (the WebGL one through a 2D copy,
// before the compositor presents and clears it) and the stage's markup. A compositor screenshot is
// not used here: under load, headless Chromium can capture a stale WebGL frame (#15).
test('render(p) from cold gives the same frame twice', async () => {
  const frames = [];
  for (let run = 0; run < 2; run++) {
    const { page, errors } = await openPage(DESKTOP);
    const frame = await page.evaluate(position => {
      window.baque.render(position);
      const pixels = id => {
        const source = document.getElementById(id),
          copy = document.createElement('canvas');
        copy.width = source.width;
        copy.height = source.height;
        copy.getContext('2d').drawImage(source, 0, 0);
        return copy.toDataURL();
      };
      return ['fx', 'bg', 'lanes'].map(pixels).join('|') + document.querySelector('.inner').innerHTML;
    }, DETERMINISM_POSITION);
    frames.push(createHash('sha256').update(frame).digest('hex'));
    assert.deepEqual(errors, []);
    await page.close();
  }
  assert.equal(frames[0], frames[1]);
});

test('two Space presses while the samples decode open one audio context', async () => {
  const { page, errors, contexts } = await openPage(DESKTOP, { delaySounds: true });
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.getElementById('tap').dataset.state === 'pause');
  assert.equal(await contexts(), 1);
  assert.deepEqual(errors, []);
  await page.close();
});

test('Space after a scene click pauses, and the paused scene shows its full title', async () => {
  const { page, errors } = await openPage(DESKTOP);
  await page.click('#stage'); // the stage is the Play button (mobile first)
  await page.waitForFunction(() => document.getElementById('tap').dataset.state === 'pause');
  const name = COPY.scenes.trovao.chip;
  await page.evaluate(text => [...document.querySelectorAll('#scenes .step')].find(button => button.querySelector('.name').textContent === text).click(), name);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.getElementById('tap').dataset.state !== 'pause');
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

test('on phones every stage label stays readable and every readout fits its box', async () => {
  for (const viewport of PHONES) {
    const { page, errors } = await openPage(viewport);
    const problems = [];
    for (const scene of SCENES) {
      await showScene(page, scene.id);
      const found = await page.evaluate(() => {
        const small = [];
        const floor = 9; // px: the smallest a phone label may render (iPhone SE)
        for (const selector of ['.hud', '.read .k', '.notation .n'])
          for (const element of document.querySelectorAll(selector)) {
            const size = parseFloat(getComputedStyle(element).fontSize);
            if (size < floor) small.push(`${selector} ${size}px`);
          }
        const read = document.querySelector('.read');
        const overflow = read.scrollHeight - read.clientHeight;
        return [...small, ...(overflow > 0 ? [`.read overflows by ${overflow}px`] : [])];
      });
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

// #12: the key fits its one line in every bar, the stage keeps its size, and the lanes name the
// hands as the alfaia's.
test('the colour key fits on one line and the lanes name the alfaia hands', async () => {
  for (const viewport of [{ width: 320, height: 568 }, ...PHONES, DESKTOP]) {
    const { page, errors } = await openPage(viewport);
    await page.evaluate(() => {
      window.__labels = [];
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
        if (this.canvas.id === 'lanes') window.__labels.push(text);
        return fillText.call(this, text, ...rest);
      };
    });
    const problems = await page.evaluate(async total => {
      const found = [];
      for (let bar = 0; bar < total; bar++) {
        window.baque.render(bar + 0.5);
        const key = document.getElementById('key'),
          inner = document.querySelector('.inner');
        if (key.scrollWidth > key.clientWidth) found.push(`bar ${bar}: the key overflows (${key.textContent})`);
        if (inner.scrollHeight > inner.clientHeight) found.push(`bar ${bar}: the stage content overflows`);
      }
      return found;
    }, SCENES.at(-1).start + SCENES.at(-1).bars);
    assert.deepEqual(problems, [], `${viewport.width}x${viewport.height}`);
    const labels = await page.evaluate(() => window.__labels);
    const principal = labels.indexOf(COPY_PRINCIPAL);
    assert.ok(principal > 0 && labels[principal - 1] === COPY_ALFAIA, 'ALFAIA is drawn over PRINCIPAL');
    assert.deepEqual(errors, []);
    await page.close();
  }
});

// #15: a resize blip (0x0, then the same size) during an export must not re-measure: that clears
// the canvases and drops the background trail.
test('a resize blip during an export leaves the background unchanged', async () => {
  const { page, errors } = await openPage(DESKTOP);
  const [before, after] = await page.evaluate(async () => {
    const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const step = 1 / 30 / window.baque.BAR;
    for (let i = 0; i < 30; i++) window.baque.render(20 + i * step); // a trail builds up
    const bg = document.getElementById('bg');
    const snapshot = bg.toDataURL();
    const stage = document.getElementById('stage');
    stage.style.display = 'none';
    await frame();
    stage.style.display = '';
    await frame();
    return [snapshot, bg.toDataURL()];
  });
  assert.ok(before === after, 'the background canvas changed after the blip');
  assert.deepEqual(errors, []);
  await page.close();
});

test('a real stage resize still re-measures the canvases', async () => {
  const { page, errors } = await openPage(DESKTOP);
  const width = () => page.evaluate(() => document.getElementById('bg').width);
  const before = await width();
  await page.setViewport({ width: 1440, height: 700 });
  await page.waitForFunction(previous => document.getElementById('bg').width !== previous, {}, before);
  assert.ok((await width()) < before);
  assert.deepEqual(errors, []);
  await page.close();
});

// 2026-11-16, owner: the page never scrolls sideways, and a phone shows the stage alone, which
// plays and pauses on a tap and shows the time played and the total while paused.
// A window or tablet that crosses the 900px breakpoint shows the stage as a fresh load at that width does.
test('crossing the desktop breakpoint fits the stage as a fresh load does', async () => {
  const narrow = { width: 600, height: 900 };
  const stageBox = page =>
    page.evaluate(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const box = document.getElementById('stage').getBoundingClientRect();
      return [box.width, box.height].map(value => Math.round(value));
    });
  const fresh = {};
  for (const viewport of [narrow, DESKTOP]) {
    const { page } = await openPage(viewport);
    fresh[viewport.width] = await stageBox(page);
    await page.close();
  }
  for (const [from, to] of [
    [narrow, DESKTOP],
    [DESKTOP, narrow],
  ]) {
    const { page, errors } = await openPage(from);
    await page.setViewport(to);
    assert.deepEqual(await stageBox(page), fresh[to.width], `${from.width}px to ${to.width}px`);
    if (to === narrow) assert.equal(await page.$eval('#stage', stage => stage.style.zoom), '', 'no zoom on the phone layout');
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('no window is wider than its page, and side options stay on one line', async () => {
  for (const viewport of [...PHONES, { width: 1000, height: 700 }, { width: 1146, height: 1330 }, DESKTOP]) {
    const { page, errors } = await openPage(viewport);
    const found = await page.evaluate(() => {
      const problems = [];
      if (document.documentElement.scrollWidth > innerWidth) problems.push(`page is ${document.documentElement.scrollWidth}px wide`);
      for (const option of document.querySelectorAll('.side .chip, .side .step')) {
        const box = option.getBoundingClientRect();
        if (box.height === 0) continue; // a phone hides them
        if (box.right > option.closest('.side').getBoundingClientRect().right + 0.5) problems.push(`${option.textContent} is cut`);
        if (option.matches('.chip') && option.scrollHeight > option.clientHeight + 1) problems.push(`${option.textContent} wraps`);
      }
      return problems;
    });
    assert.deepEqual(found, [], `${viewport.width}x${viewport.height}`);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('on phones only the stage shows, and a tap on it plays and pauses', async () => {
  const { page, errors } = await openPage(PHONES[0]);
  const visible = await page.evaluate(() =>
    [...document.querySelectorAll('.side *')]
      .filter(element => element.closest('.brand') === null && element.getClientRects().length > 0)
      .map(element => element.className || element.tagName),
  );
  assert.deepEqual(visible, []);
  assert.equal(await page.$eval('#tapLabel', element => element.textContent), COPY.controls.play);
  // the rhythm links sit under Play on a stopped phone stage, so a viewer taps Play itself
  await page.click('#tapLabel');
  await page.waitForFunction(() => document.getElementById('tap').dataset.state === 'pause');
  await page.click('#stage');
  // paused at the start the stage offers «Tocar», after the first frame «Continuar»: either is paused
  await page.waitForFunction(() => ['play', 'resume'].includes(document.getElementById('tap').dataset.state));
  assert.match(await page.$eval('#tapTime', element => element.textContent), /^\d:\d\d \/ \d:\d\d$/);
  assert.deepEqual(errors, []);
  await page.close();
});

test('the video export lays out the stage alone, 9:16 and the full window height', async () => {
  const { page, errors } = await openPage(EXPORT_FRAME, { videoExport: true });
  await showScene(page, 'opening');
  const layout = await page.evaluate(() => {
    const stage = document.getElementById('stage').getBoundingClientRect();
    const shown = selector => [...document.querySelectorAll(selector)].filter(element => element.getClientRects().length > 0).length;
    const points = [0.05, 0.5, 0.95].flatMap(x => [0.05, 0.5, 0.95].map(y => [stage.left + x * stage.width, stage.top + y * stage.height]));
    const covered = points.filter(([x, y]) => !document.getElementById('stage').contains(document.elementFromPoint(x, y))).length;
    return { width: Math.round(stage.width), height: Math.round(stage.height), side: shown('.side'), tap: shown('.tap'), foot: shown('.foot'), covered };
  });
  assert.deepEqual(layout, { width: EXPORT_FRAME.width, height: EXPORT_FRAME.height, side: 0, tap: 0, foot: 0, covered: 0 });
  assert.deepEqual(errors, []);
  await page.close();
});

test('the rhythm selector stays out of the page with one rhythm', async () => {
  for (const viewport of [PHONES[0], DESKTOP]) {
    const { page, errors } = await openPage(viewport, { registry: 'maracatuOnly', query: '?ritmo=desconhecido' });
    assert.equal(await page.$$eval('.rhythms', list => list.length), 0);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('?ritmo=frevo plays the frevo show on an 8-step wheel, every bar drawn without an error', async () => {
  const pages = await Promise.all([PHONES[0], DESKTOP].map(viewport => openPage(viewport, { query: '?ritmo=frevo' })));
  for (const { page, errors } of pages) {
    assert.equal(await page.evaluate(() => window.baque.TOTAL), 104);
    assert.equal(await page.$$eval('#scope text[fill-opacity]', texts => texts.filter(t => /^\d+$/.test(t.textContent)).length), 8);
    for (let at = 0; at < 104; at += 0.37) await page.evaluate(position => window.baque.render(position), at);
    assert.deepEqual(errors, [], 'no console error on either viewport');
    await page.close();
  }
});

test('an unknown ?ritmo= shows maracatu, marked in the selector of every rhythm path', async () => {
  for (const viewport of [PHONES[0], DESKTOP]) {
    const { page, errors } = await openPage(viewport, { query: '?ritmo=desconhecido' });
    assert.equal(await page.evaluate(() => window.baque.TOTAL), SCENES.at(-1).start + SCENES.at(-1).bars);
    assert.deepEqual(await page.$$eval('.rhythms-stage a', links => links.map(a => [a.getAttribute('href'), a.getAttribute('aria-current')])), [
      ['/maracatu', 'true'],
      ['/coco', null],
      ['/frevo', null],
      ['/forro', null],
      ['/manguebeat', null],
      ['/brega-romantico', null],
      ['/brega-funk', null],
    ]);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('?ritmo=forro shows the forró on an 8-step wheel, over its own background, with no error', async () => {
  for (const viewport of [PHONES[0], DESKTOP]) {
    const { page, errors } = await openPage(viewport, { query: '?ritmo=forro' });
    assert.equal(await page.evaluate(() => window.baque.TOTAL), 98);
    assert.equal(await page.$$eval('#scope text[fill-opacity]', texts => texts.filter(t => /^\d+$/.test(t.textContent)).length), 8);
    assert.deepEqual(await page.$$eval('.rhythms-stage a[aria-current]', links => links.map(a => a.textContent)), ['forró']);
    for (let at = 0; at < 98; at += 0.37) await page.evaluate(position => window.baque.render(position), at);
    // the backdrop paints the whole canvas: its dusk sky leaves no transparent pixel at a corner
    const corner = await page.$eval('#bg', canvas => [...canvas.getContext('2d').getImageData(1, 1, 1, 1).data]);
    assert.equal(corner[3], 255, `corner pixel ${corner}`);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('?ritmo=coco moves to /coco and shows the coco on an 8-step wheel, its 12 scenes and the selector', async () => {
  const { page, errors } = await openPage(DESKTOP, { query: '?ritmo=coco' });
  assert.equal(await page.evaluate(() => location.pathname + location.search), '/coco');
  const steps = await page.$$eval('#scope text[fill-opacity]', texts => texts.map(t => t.textContent).filter(t => /^\d+$/.test(t)));
  assert.equal(steps.length, 8);
  assert.equal(await page.evaluate(() => window.baque.TOTAL), 104);
  assert.equal(await page.$$eval('#scenes li', items => items.length), 12);
  assert.deepEqual(await page.$$eval('.rhythms-side a', links => links.map(a => [a.textContent, a.getAttribute('aria-current')])), [
    ['maracatu', null],
    ['coco', 'true'],
    ['frevo', null],
    ['forró', null],
    ['manguebeat', null],
    ['brega romântico', null],
    ['brega funk', null],
  ]);
  assert.deepEqual(errors, []);
  await page.close();
});

test('?ritmo=brega-funk plays its synthesized sounds without fetching a sound file', async () => {
  const { page, errors } = await openPage(DESKTOP, { query: '?ritmo=brega-funk' });
  await page.click('#tap');
  await page.waitForFunction(() => document.getElementById('tap').dataset.state === 'pause');
  assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => entry.name.includes('/sounds/')).length), 0);
  await page.click('#tap');
  const total = await page.evaluate(() => window.baque.TOTAL);
  for (let at = 0; at < total; at += 0.25) await page.evaluate(position => window.baque.render(position), at);
  assert.deepEqual(errors, []);
  await page.close();
});

test('with a second rhythm, ?ritmo= plays it on its own wheel and the selector shows', async () => {
  const visible = (page, selector) => page.$eval(selector, element => element.checkVisibility());
  const { page, errors } = await openPage(PHONES[0], { registry: 'twoFour', query: '?ritmo=dois-por-quatro' });
  // a 2/4 bar: the wheel numbers its 8 steps, and the show is the fixture's 5 bars
  assert.deepEqual(await page.$$eval('#scope text[fill-opacity]', texts => texts.map(t => t.textContent).filter(t => /^\d+$/.test(t))), [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
  ]);
  assert.equal(await page.evaluate(() => window.baque.TOTAL), 5);
  // phones: under Play on the stopped stage, the current rhythm marked; hidden while playing
  assert.ok(await visible(page, '.rhythms-stage'));
  assert.deepEqual(await page.$$eval('.rhythms-stage a', links => links.map(a => [a.getAttribute('href'), a.getAttribute('aria-current')])), [
    ['/maracatu', null],
    ['/dois-por-quatro', 'true'],
  ]);
  await page.click('#tapLabel'); // the rhythm links fill the middle of the stopped stage
  await page.waitForFunction(() => document.getElementById('tap').dataset.state === 'pause');
  assert.equal(await visible(page, '.rhythms-stage'), false);
  await page.click('#tap');
  for (let at = 0; at < 5; at += 0.1) await page.evaluate(position => window.baque.render(position), at);
  assert.deepEqual(errors, []);
  await page.close();
  // desktop: under the Roteiro, at the bottom of the left column; the stage copy stays hidden
  const desktop = await openPage(DESKTOP, { registry: 'twoFour', query: '?ritmo=dois-por-quatro' });
  assert.ok(await visible(desktop.page, '.rhythms-side'));
  assert.equal(await visible(desktop.page, '.rhythms-stage'), false);
  // the export control sits between the Roteiro and the selector (#19)
  assert.equal(
    await desktop.page.$eval(
      '.rhythms-side',
      nav =>
        nav.previousElementSibling.matches('.export-video') && nav.previousElementSibling.previousElementSibling.contains(document.getElementById('scenes')),
    ),
    true,
  );
  assert.equal(await desktop.page.$eval('.rhythms-side', nav => nav === nav.parentElement.lastElementChild), true);
  assert.equal(await desktop.page.$$eval('#scenes li', items => items.length), 2);
  assert.deepEqual(desktop.errors, []);
  await desktop.page.close();
});

// ---------- the video export in the page (#19) ----------

test('desktop shows «Exportar vídeo» in the middle of the left column, between the Roteiro and the selector', async () => {
  const { page, errors } = await openPage(DESKTOP);
  const layout = await page.evaluate(() => {
    const box = element => element.getBoundingClientRect();
    const roteiro = document.getElementById('scenes').closest('.block'),
      control = document.querySelector('.export-video'),
      selector = document.querySelector('.rhythms-side');
    const button = control.querySelector('button.export-start');
    return {
      order: [roteiro.nextElementSibling === control, control.nextElementSibling === selector, control.parentElement.matches('.side.left')],
      above: box(control).top - box(roteiro).bottom,
      below: box(selector).top - box(control).bottom,
      button: { tag: button.localName, type: button.type, text: button.textContent, disabled: button.disabled, visible: button.checkVisibility() },
      cancelHidden: [...control.querySelectorAll('button')].filter(b => b !== button).every(b => b.hidden),
    };
  });
  assert.deepEqual(layout.order, [true, true, true]);
  assert.ok(layout.above > 0 && layout.below > 0, `gaps ${layout.above} and ${layout.below}`);
  assert.ok(Math.abs(layout.above - layout.below) <= 1, `centred: ${layout.above} px above, ${layout.below} px below`);
  assert.deepEqual(layout.button, { tag: 'button', type: 'button', text: COPY.exportVideo.start, disabled: false, visible: true });
  assert.ok(layout.cancelHidden);
  // keyboard: Tab from the last Roteiro control reaches the button, then the selector
  await page.evaluate(() => [...document.querySelectorAll('#scenes button, #scenes a')].at(-1).focus());
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('export-start')), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.closest('.rhythms-side') !== null), true);
  assert.deepEqual(errors, []);
  await page.close();
});

test('phones have no video export', async () => {
  for (const phone of PHONES) {
    const { page, errors } = await openPage(phone);
    assert.equal(await page.$('.export-video'), null);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('the export makes a short 9:16 video with sound, cancels on request, and leaves the live page as it was', async () => {
  const { page, errors } = await openPage(DESKTOP);
  const before = await page.evaluate(() => ({
    html: document.documentElement.className,
    zoom: document.getElementById('stage').style.zoom,
    time: document.getElementById('hTime').textContent,
  }));
  const result = await page.evaluate(async () => {
    const { exportVideo } = await import('/src/export.js');
    const phases = [];
    const { blob, format } = await exportVideo({ to: 0.2, onProgress: ({ phase, done, total }) => phases.push(`${phase} ${done}/${total}`) });
    const head = [...new Uint8Array(await blob.slice(0, 12).arrayBuffer())];
    return {
      type: blob.type,
      size: blob.size,
      format: format.id,
      phases: [phases[0], phases.at(-1)],
      head,
      frames: document.querySelectorAll('iframe').length,
    };
  });
  assert.ok(['mp4', 'webm'].includes(result.format));
  assert.equal(result.type, `video/${result.format}`);
  assert.ok(result.size > 0);
  // MP4 opens with an ftyp box; WebM with the EBML magic number
  if (result.format === 'mp4') assert.equal(String.fromCharCode(...result.head.slice(4, 8)), 'ftyp');
  else assert.deepEqual(result.head.slice(0, 4), [0x1a, 0x45, 0xdf, 0xa3]);
  assert.deepEqual(result.phases, ['audio 0/6', 'video 6/6']); // 0.2 s at 30 frames per second
  assert.equal(result.frames, 0, 'the hidden reel is removed');
  assert.deepEqual(
    await page.evaluate(() => ({
      html: document.documentElement.className,
      zoom: document.getElementById('stage').style.zoom,
      time: document.getElementById('hTime').textContent,
    })),
    before,
  );
  // the control: disabled while it runs, Cancel stops it and says so
  const control = await page.evaluate(async () => {
    const start = document.querySelector('.export-start'),
      cancel = start.parentElement.querySelectorAll('button')[1],
      status = start.parentElement.querySelector('[role="status"]');
    start.click();
    const during = { disabled: start.disabled, cancelShown: !cancel.hidden };
    cancel.click();
    for (let i = 0; i < 600 && start.disabled; i++) await new Promise(resolve => setTimeout(resolve, 50));
    return {
      during,
      after: { disabled: start.disabled, cancelShown: !cancel.hidden, status: status.textContent },
      frames: document.querySelectorAll('iframe').length,
    };
  });
  assert.deepEqual(control, {
    during: { disabled: true, cancelShown: true },
    after: { disabled: false, cancelShown: false, status: COPY.exportVideo.cancelled },
    frames: 0,
  });
  assert.deepEqual(errors, []);
  await page.close();
});

// Smoke tests of the real page in headless Chromium (#9): the page loads without errors, keeps the
// `window.baque` contract the exporter drives, and the playback fixes of 00919fb and the phone
// layout of #4 hold.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { COPY } from '../src/copy.js';
import { SCENES } from '../src/show.js';
import { openBrowser } from './support/browser.js';

// The shipped rhythm registry with the tests-only 2/4 fixture added, served in its place.
const TWO_FOUR_REGISTRY = readFileSync(new URL('../src/rhythms/index.js', import.meta.url), 'utf8').replace(
  'export const RHYTHMS = [MARACATU, FORRO_PE_DE_SERRA];',
  "import { TWO_FOUR } from '../../tests/support/rhythm-two-four.js';\nexport const RHYTHMS = [MARACATU, FORRO_PE_DE_SERRA, TWO_FOUR];",
);

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
async function openPage(viewport, { delaySounds = false, videoExport = false, query = '', withTwoFour = false } = {}) {
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
    if (!url.startsWith(session.server.url)) {
      errors.push(`request off the site: ${url}`);
      await request.abort();
      return;
    }
    if (delaySounds && url.includes('/sounds/')) await new Promise(resolve => setTimeout(resolve, SOUND_DELAY_MS));
    if (withTwoFour && url.endsWith('/src/rhythms/index.js')) {
      await request.respond({ contentType: 'text/javascript', body: TWO_FOUR_REGISTRY });
      return;
    }
    await request.continue();
  });
  await page.setViewport(viewport);
  await page.goto(session.server.url + query, { waitUntil: 'load' });
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
  await page.click('#stage');
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

test('with a second rhythm, ?ritmo= plays it on its own wheel and the selector shows', async () => {
  const visible = (page, selector) => page.$eval(selector, element => element.checkVisibility());
  const { page, errors } = await openPage(PHONES[0], { withTwoFour: true, query: '?ritmo=dois-por-quatro' });
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
    ['?ritmo=maracatu', null],
    ['?ritmo=forro', null],
    ['?ritmo=dois-por-quatro', 'true'],
  ]);
  await page.click('#tap');
  await page.waitForFunction(() => document.getElementById('tap').dataset.state === 'pause');
  assert.equal(await visible(page, '.rhythms-stage'), false);
  await page.click('#tap');
  for (let at = 0; at < 5; at += 0.1) await page.evaluate(position => window.baque.render(position), at);
  assert.deepEqual(errors, []);
  await page.close();
  // desktop: above the Roteiro in the left column; the stage copy stays hidden
  const desktop = await openPage(DESKTOP, { withTwoFour: true, query: '?ritmo=dois-por-quatro' });
  assert.ok(await visible(desktop.page, '.rhythms-side'));
  assert.equal(await visible(desktop.page, '.rhythms-stage'), false);
  assert.equal(await desktop.page.$eval('.rhythms-side', nav => nav.nextElementSibling.contains(document.getElementById('scenes'))), true);
  assert.equal(await desktop.page.$$eval('#scenes li', items => items.length), 2);
  assert.deepEqual(desktop.errors, []);
  await desktop.page.close();
});

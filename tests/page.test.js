// Smoke tests of the real page in headless Chromium (#9): the page loads without errors, keeps the
// `window.baque` contract the exporter drives, and the playback fixes of 00919fb and the phone
// layout of #4 hold.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { COPY } from '../src/copy.js';
import { RHYTHMS, redirectFor } from '../src/rhythms/index.js';
import { createShow, SCENES } from '../src/show.js';
import { REDUCED_MOTION_QUERY } from '../src/theme.js';
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
  // Headless Chrome takes the machine's own Reduce Motion setting, which the owner's Mac has on and
  // CI has off: every page test states the setting, so both run the same page.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.goto(session.server.url + query, { waitUntil: 'load' });
  // `?ritmo=<id>` of a rhythm path reloads the page there: wait for the page at the final address
  const path = redirectFor(query, REGISTRY_ROUTES[registry]) ?? '/';
  await page.waitForFunction(at => location.pathname === at && window.baque && document.readyState === 'complete', {}, path);
  await page.evaluate(() => document.fonts.ready);
  return { page, errors, contexts: () => page.evaluate(() => window.__audioContexts) };
}

/** Render the scene `id` of a show's `scenes` at `offset` bars in, through the exporter API. */
const drawAt = (page, scenes, id, offset) =>
  page.evaluate(
    async start => {
      window.baque.render(start);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    },
    scenes.find(scene => scene.id === id).start + offset,
  );
const showScene = (page, id, offset = 0.5) => drawAt(page, SCENES, id, offset);
const scenesOf = id => createShow(RHYTHMS.find(rhythm => rhythm.id === id)).SCENES;

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

test('a page test runs with motion on, whatever the machine’s own Reduce Motion setting is', async () => {
  const { page } = await openPage(DESKTOP);
  assert.equal(await page.evaluate(query => matchMedia(query).matches, REDUCED_MOTION_QUERY), false);
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

// #13: on desktop a baque scene's stats and score overflowed the readout by 8 px at 1440x900 and
// by 19 px on a larger stage. The first and last bar of every scene (the waves show in the last) of
// every rhythm, at that viewport and a larger stage.
test('on desktop every readout fits its box in every rhythm', async () => {
  const viewports = [DESKTOP, { width: 1146, height: 1330 }];
  const problems = [];
  for (const rhythm of RHYTHMS) {
    const bars = createShow(rhythm).SCENES.flatMap(scene => [scene.start, scene.start + scene.bars - 1]);
    for (const viewport of viewports) {
      const { page, errors } = await openPage(viewport, { query: `?ritmo=${rhythm.id}` });
      const found = await page.evaluate(bars => {
        const overflows = [];
        for (const bar of bars) {
          window.baque.render(bar + 0.5);
          const read = document.querySelector('.read');
          const overflow = read.scrollHeight - read.clientHeight;
          if (overflow > 0) overflows.push(`bar ${bar}: .read overflows by ${overflow}px`);
        }
        return overflows;
      }, bars);
      problems.push(...found.map(problem => `${rhythm.id} ${viewport.width}x${viewport.height} ${problem}`));
      assert.deepEqual(errors, []);
      await page.close();
    }
  }
  assert.deepEqual(problems, []);
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
    assert.equal(await page.$eval('#scope', svg => svg.getAttribute('aria-label')), 'Roda de 8 semicolcheias com um anel por instrumento');
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
      ['/brega', null],
      ['/bregafunk', null],
    ]);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('?ritmo=forro shows the forró on an 8-step wheel, over its own background, with no error', async () => {
  for (const viewport of [PHONES[0], DESKTOP]) {
    const { page, errors } = await openPage(viewport, { query: '?ritmo=forro' });
    assert.equal(await page.evaluate(() => window.baque.TOTAL), 86);
    assert.equal(await page.$$eval('#scope text[fill-opacity]', texts => texts.filter(t => /^\d+$/.test(t.textContent)).length), 8);
    assert.deepEqual(await page.$$eval('.rhythms-stage a[aria-current]', links => links.map(a => a.textContent)), ['forró']);
    for (let at = 0; at < 86; at += 0.37) await page.evaluate(position => window.baque.render(position), at);
    // the backdrop paints the whole canvas: its dusk sky leaves no transparent pixel at a corner
    const corner = await page.$eval('#bg', canvas => [...canvas.getContext('2d').getImageData(1, 1, 1, 1).data]);
    assert.equal(corner[3], 255, `corner pixel ${corner}`);
    // the sky stays night under the wheel's step numbers, so they keep 3:1 contrast (docs/rhythms/forro.md)
    await page.evaluate(() => window.baque.render(4.3));
    const underNumbers = await page.evaluate(() => {
      const bg = document.getElementById('bg'),
        wheel = document.getElementById('scope').getBoundingClientRect(),
        box = bg.getBoundingClientRect(),
        scale = bg.width / box.width,
        numberRadius = (wheel.width / 2) * (121 / 135); // src/scope.js NUMBER_RADIUS / VIEWBOX_RADIUS
      const x = (wheel.left + wheel.width / 2 + numberRadius - box.left) * scale,
        y = (wheel.top + wheel.height / 2 - box.top) * scale;
      return [...bg.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data];
    });
    assert.ok(Math.max(...underNumbers.slice(0, 3)) < 60, `sky under the numbers ${underNumbers}`);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('?ritmo=coco moves to /coco and shows the coco on an 8-step wheel, its 13 scenes and the selector', async () => {
  const { page, errors } = await openPage(DESKTOP, { query: '?ritmo=coco' });
  assert.equal(await page.evaluate(() => location.pathname + location.search), '/coco');
  const steps = await page.$$eval('#scope text[fill-opacity]', texts => texts.map(t => t.textContent).filter(t => /^\d+$/.test(t)));
  assert.equal(steps.length, 8);
  assert.equal(await page.evaluate(() => window.baque.TOTAL), 112);
  assert.equal(await page.$$eval('#scenes li', items => items.length), 13);
  assert.deepEqual(await page.$$eval('.rhythms-side a', links => links.map(a => [a.textContent, a.getAttribute('aria-current')])), [
    ['maracatu', null],
    ['coco', 'true'],
    ['frevo', null],
    ['forró', null],
    ['manguebeat', null],
    ['brega', null],
    ['bregafunk', null],
  ]);
  assert.deepEqual(errors, []);
  await page.close();
});

test('?ritmo=brega-funk moves to /bregafunk and plays its recorded sounds through the studio, with no error', async () => {
  const { page, errors } = await openPage(DESKTOP, { query: '?ritmo=brega-funk' });
  assert.equal(await page.evaluate(() => location.pathname), '/bregafunk');
  await page.click('#tap');
  await page.waitForFunction(() => document.getElementById('tap').dataset.state === 'pause');
  assert.ok(await page.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('/sounds/sala-viva'))));
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

// ---------- a rhythm's own graphics (#49) ----------
const boxOf = (page, selector) =>
  page.$eval(selector, element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height, shown: getComputedStyle(element).display !== 'none' };
  });
const BREGA_SCENES = scenesOf('brega');
const bregaAt = (page, id, offset) => drawAt(page, BREGA_SCENES, id, offset);
/**
 * Every text of the graphic is at least the stage's own label size (the HUD's), font size against
 * font size in the same CSS px: an SVG unit is a hundredth of the square's layout width.
 */
async function assertLabelSizes(page) {
  const sizes = await page.evaluate(() => {
    const unit = document.querySelector('#graphic').clientWidth / 100;
    return {
      label: parseFloat(getComputedStyle(document.querySelector('.hud')).fontSize),
      texts: [...document.querySelectorAll('#graphic text')].map(text => [text.textContent, Number(text.getAttribute('font-size')) * unit]),
    };
  });
  for (const [text, size] of sizes.texts)
    assert.ok(size >= sizes.label * 0.99, `«${text}» at ${size.toFixed(2)}px is under the stage's label of ${sizes.label}px`);
}
/** The boxes of the graphic's `selector` elements that are drawn, each with a `name`, and the main square's. */
const drawnBoxes = (page, selector) =>
  page.evaluate(marks => {
    const box = element => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    return {
      square: box(document.querySelector('#graphic svg')),
      marks: [...document.querySelectorAll(marks)]
        .filter(element => getComputedStyle(element).display !== 'none' && element.getAttribute('stroke-opacity') !== '0')
        .map(element => ({ ...box(element), name: `${element.tagName} ${element.textContent}` })),
    };
  }, selector);
/** A desktop page of a show, for a viewer who asks for reduced motion. */
async function openStill(query) {
  const opened = await openPage(DESKTOP, { query });
  await opened.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  return opened;
}
const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
/** Nothing of the graphic is drawn outside the main circle, the square's inscribed one. */
async function assertInsideMainCircle(page) {
  const { square, marks } = await drawnBoxes(
    page,
    '#graphic svg text, #graphic svg circle, #graphic svg ellipse, #graphic svg line, #graphic svg rect, #graphic svg path',
  );
  const radius = (square.right - square.left) / 2,
    centre = [square.left + radius, square.top + radius];
  for (const mark of marks) {
    const reach = Math.hypot(Math.max(centre[0] - mark.left, mark.right - centre[0]), Math.max(centre[1] - mark.top, mark.bottom - centre[1]));
    assert.ok(reach <= radius + 1, `«${mark.name}» reaches ${reach.toFixed(1)}px from the centre of a main circle of ${radius.toFixed(1)}px`);
  }
}

for (const viewport of [PHONES[0], DESKTOP])
  test(`the brega draws its chords and its drum kit in the main square, with the wheel smaller beside the readout, at ${viewport.width} px`, async () => {
    const { page, errors } = await openPage(viewport, { query: '?ritmo=brega' });
    assert.equal(await page.$eval('#stage', stage => stage.classList.contains('has-graphic')), true);
    const [stage, graphic, wheel, read, lanes] = await Promise.all(
      ['#stage', '#graphic', '#scopeBox', '#read', '.lanes'].map(selector => boxOf(page, selector)),
    );
    assert.ok(graphic.shown && Math.abs(graphic.width - graphic.height) < 1, 'the main square is square');
    assert.ok(graphic.width > 0.6 * stage.width, 'the graphic takes the main space'); // the wheel's own box in the other shows: 250 of 375 px on a short phone
    assert.ok(wheel.width < 0.3 * stage.width && wheel.width > 0.15 * stage.width, `the wheel is the smaller mark: ${wheel.width} of ${stage.width}`);
    // the mark draws no text: its numbers would render under the stage's label size
    assert.equal(await page.$$eval('#scope text', texts => texts.filter(text => getComputedStyle(text).display !== 'none').length), 0);
    // nothing leaves the stage, and the row under the graphic holds the wheel and the readout side by side
    for (const box of [graphic, wheel, read, lanes]) assert.ok(box.x >= stage.x - 0.5 && box.x + box.width <= stage.x + stage.width + 0.5, 'inside the stage');
    assert.ok(
      wheel.y >= graphic.y + graphic.height - 0.02 * stage.width && wheel.y + wheel.height <= lanes.y + 0.5,
      'the wheel sits between the graphic and the lanes',
    );
    assert.ok(read.x >= wheel.x + wheel.width, 'the readout is beside the wheel');
    assert.match(await page.$eval('#scope', svg => svg.getAttribute('aria-label')), /^Roda de 16 semicolcheias/);
    assert.match(await page.$eval('#graphic svg', svg => `${svg.getAttribute('role')}: ${svg.getAttribute('aria-label')}`), /^img: Cifras: .*Bateria/);
    assert.deepEqual(await page.$$eval('#graphic [data-graphic]', groups => groups.map(group => group.dataset.graphic)), ['cifras', 'bateria']);
    // the last chorus, a whole tone up: the seventh bar's cell is the one lit, and it reads what sounds
    await bregaAt(page, 'refrao-final', 6.02);
    assert.deepEqual(await page.$$eval('#graphic [data-bar]', cells => cells.map(cell => cell.textContent)), ['Bm', 'Em', 'A', 'D', 'G', 'Em', 'F#7', 'Bm']);
    assert.deepEqual(await page.$$eval('#graphic [data-now="true"]', cells => cells.map(cell => cell.textContent)), ['F#7']);
    assert.deepEqual(await page.$$eval('#graphic [data-lit="true"]', pieces => pieces.map(piece => piece.dataset.piece).sort()), ['bumbo', 'chimbal']); // the bar's first stroke
    // the bar of silence: a rest in its cell, and only the bumbo's heartbeat lights the kit
    await bregaAt(page, 'breque', 1.02);
    assert.deepEqual(await page.$$eval('#graphic [data-bar]', cells => cells.map(cell => cell.textContent)), ['Am', '–']);
    assert.deepEqual(await page.$$eval('#graphic [data-lit="true"]', pieces => pieces.map(piece => piece.dataset.piece)), ['bumbo']);
    // the Virada has no chord: the chart is empty and the toms light
    await bregaAt(page, 'virada', 0.02);
    assert.equal(await page.$$eval('#graphic [data-bar]', cells => cells.length), 0);
    assert.equal(await page.$eval('#graphic svg > text', label => getComputedStyle(label).display), 'none'); // and no «cifras» over an empty chart
    assert.ok((await page.$$eval('#graphic [data-lit="true"]', pieces => pieces.map(piece => piece.dataset.piece))).includes('tom-agudo'));
    await assertLabelSizes(page);
    // each name fits inside its piece, and no row of the readout is wider than its box (the Base: a notation row with its count)
    const fits = await page.$$eval('#graphic [data-piece]', pieces =>
      pieces.map(piece => [
        piece.dataset.piece,
        piece.querySelector('text').getBBox().width,
        2 * Number(piece.querySelector('circle:last-of-type').getAttribute('r')),
      ]),
    );
    for (const [id, width, diameter] of fits) assert.ok(width < diameter, `${id}: its name of ${width.toFixed(1)} is wider than its piece of ${diameter}`);
    for (const id of ['base', 'breque', 'virada']) {
      await bregaAt(page, id, 0.5);
      const read = await page.$eval('#read', element => [element.scrollWidth, element.clientWidth]);
      assert.ok(read[0] <= read[1] + 1, `${id}: the readout's content of ${read[0]}px is wider than its box of ${read[1]}px`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  });

test('with reduced motion the brega kit lights without growing, and a muted piece shows disabled and stays dark', async () => {
  const { page, errors } = await openPage(DESKTOP, { query: '?ritmo=brega' });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await bregaAt(page, 'refrao', 0.02);
  const lit = await page.$$eval('#graphic [data-lit="true"]', pieces =>
    pieces.map(piece => [
      piece.dataset.piece,
      piece.firstElementChild.getAttribute('transform') || '',
      piece.querySelector('circle:last-of-type').getAttribute('fill-opacity'),
    ]),
  );
  assert.ok(lit.length > 0);
  for (const [id, transform, fill] of lit) {
    assert.equal(transform, '', `${id} does not grow`);
    assert.equal(Number(fill), 0.9, `${id} is fully lit, not fading`);
  }
  // the bumbo muted (the volume a desktop viewer stored): its piece is dimmed and its strokes light nothing
  await page.evaluate(() => localStorage.setItem('baque-virado:volume-bumbo', 'mute'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.baque && document.readyState === 'complete');
  await bregaAt(page, 'refrao', 0.02);
  const pieces = await page.$$eval('#graphic [data-piece]', all =>
    Object.fromEntries(all.map(piece => [piece.dataset.piece, [piece.dataset.lit, piece.getAttribute('opacity')]])),
  );
  assert.deepEqual(pieces.bumbo, ['false', '0.38']);
  assert.deepEqual(pieces.chimbal, ['true', '1']);
  await page.evaluate(() => localStorage.removeItem('baque-virado:volume-bumbo'));
  await page.close();
  // a show without graphics keeps the wheel in the main square
  const plain = await openPage(DESKTOP);
  assert.equal(await plain.page.$eval('#stage', stage => stage.classList.contains('has-graphic')), false);
  const [stage, graphic, wheel] = await Promise.all(['#stage', '#graphic', '#scopeBox'].map(selector => boxOf(plain.page, selector)));
  assert.equal(graphic.shown, false);
  assert.ok(wheel.width > 0.7 * stage.width, 'the maracatu keeps its wheel at full size');
  assert.deepEqual([...errors, ...plain.errors], []);
  await plain.page.close();
});

// ---------- the manguebeat's own graphics (#56) ----------
const MANGUE_SCENES = scenesOf('manguebeat');
const SIXTEENTH = 1 / 16;
/** Draw the manguebeat's scene `id` at `offset` bars into it. */
const mangueAt = (page, id, offset) => drawAt(page, MANGUE_SCENES, id, offset);
const tabNow = page => page.$eval('#graphic [data-graphic="tablatura"]', tab => [tab.dataset.string, tab.dataset.fret]);
const litCopies = page => page.$$eval('#graphic [data-copy][data-lit="true"]', copies => copies.map(copy => Number(copy.dataset.copy)));

for (const viewport of [PHONES[0], DESKTOP])
  test(`the manguebeat draws the bass tablature on the neck and the echo's copies in the main square, at ${viewport.width} px`, async () => {
    const { page, errors } = await openPage(viewport, { query: '?ritmo=manguebeat' });
    assert.equal(await page.$eval('#stage', stage => stage.classList.contains('has-graphic')), true);
    assert.match(
      await page.$eval('#graphic svg', svg => `${svg.getAttribute('role')}: ${svg.getAttribute('aria-label')}`),
      /^img: Tablatura do baixo: .*Eco: /,
    );
    assert.deepEqual(await page.$$eval('#graphic [data-graphic]', groups => groups.map(group => group.dataset.graphic)), ['tablatura', 'eco']);
    // the introduction: the bass rests, and the alfaia's one stroke is in the echo, a copy more every three sixteenths
    await mangueAt(page, 'introducao', 1.6 * SIXTEENTH);
    assert.equal(await page.$$eval('#graphic [data-step]', notes => notes.length), 0);
    assert.deepEqual(await tabNow(page), ['', '']);
    assert.equal(await page.$$eval('#graphic [data-copy]', copies => copies.length), 5); // the stroke and four repeats
    assert.deepEqual(await litCopies(page), [0]);
    await mangueAt(page, 'introducao', 4 * SIXTEENTH);
    assert.deepEqual(await litCopies(page), [0, 1]);
    assert.equal(await page.$eval('#graphic [data-graphic="eco"]', trail => trail.dataset.voice), 'main');
    assert.equal(
      await page.$eval('#graphic svg > text:last-of-type', name => `${name.textContent}|${getComputedStyle(name).display !== 'none'}`),
      'ALFAIA|true', // the instrument, as the sound controls name it, not one of its hands
    );
    // a scene with no echo: the copies are at rest and no name stands under them
    await mangueAt(page, 'celula', 1.5);
    assert.deepEqual(await litCopies(page), []);
    assert.equal(await page.$eval('#graphic svg > text:last-of-type', name => getComputedStyle(name).display), 'none');
    // the bass scene: the bar's notes as fret numbers, the one that sounds lit on the staff and on the neck
    await mangueAt(page, 'baixo', 0.3 * SIXTEENTH);
    assert.deepEqual(await page.$$eval('#graphic [data-step]', notes => notes.map(note => `${note.dataset.string}${note.textContent}`)), [
      'E0',
      'D2',
      'D0',
      'A2',
      'D0',
    ]);
    assert.deepEqual(await page.$$eval('#graphic [data-now="true"]', notes => notes.map(note => note.dataset.step)), ['0']);
    assert.deepEqual(await tabNow(page), ['E', '0']);
    await mangueAt(page, 'baixo', 2.5 * SIXTEENTH); // the first note is held three sixteenths
    assert.deepEqual(await tabNow(page), ['E', '0']);
    await mangueAt(page, 'baixo', 3.5 * SIXTEENTH); // a rest
    assert.deepEqual(await tabNow(page), ['', '']);
    await mangueAt(page, 'baixo', 5.5 * SIXTEENTH);
    assert.deepEqual(await tabNow(page), ['D', '2']);
    await assertLabelSizes(page);
    // no two numbers of a bar overlap (the last bar of the second part plays four sixteenths in a row), and
    // nothing of the graphic leaves the main circle
    await mangueAt(page, 'segunda', 3 + 13.5 * SIXTEENTH);
    const { marks: numbers } = await drawnBoxes(page, '#graphic [data-step] text');
    assert.ok(numbers.length >= 7, 'the bar of four sixteenths in a row');
    await assertClear(page, numbers, 'fret numbers');
    assert.deepEqual(errors, []);
    await page.close();
  });

test('with reduced motion the manguebeat lights one copy at a time and nothing fades, and a muted bass shows disabled', async () => {
  const { page, errors } = await openPage(DESKTOP, { query: '?ritmo=manguebeat' });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await mangueAt(page, 'introducao', 4 * SIXTEENTH);
  assert.deepEqual(await litCopies(page), [1]); // the copy that sounds now, alone
  assert.equal(await page.$eval('#graphic [data-copy="1"]', copy => Number(copy.getAttribute('fill-opacity'))), 0.9);
  await mangueAt(page, 'baixo', 5.9 * SIXTEENTH); // the end of a fretted note: its dot is as lit as at its start
  assert.equal(await page.$eval('#graphic [data-graphic="tablatura"] > circle', finger => Number(finger.getAttribute('fill-opacity'))), 0.9);
  // the bass muted (the volume a desktop viewer stored): its tablature is dimmed and no note lights
  await page.evaluate(() => localStorage.setItem('baque-virado:volume-baixo', 'mute'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.baque && document.readyState === 'complete');
  await mangueAt(page, 'baixo', 0.3 * SIXTEENTH);
  assert.equal(await page.$eval('#graphic [data-graphic="tablatura"]', tab => tab.getAttribute('opacity')), '0.38');
  assert.equal(await page.$$eval('#graphic [data-now="true"]', notes => notes.length), 0);
  assert.deepEqual(await tabNow(page), ['', '']);
  await page.evaluate(() => localStorage.removeItem('baque-virado:volume-baixo'));
  // the alfaia muted: its stroke is still named under the echo, disabled, and no copy lights
  await page.evaluate(() => localStorage.setItem('baque-virado:volume-alfaia', 'mute'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.baque && document.readyState === 'complete');
  await mangueAt(page, 'introducao', 4 * SIXTEENTH);
  assert.deepEqual(await litCopies(page), []);
  assert.deepEqual(await page.$eval('#graphic [data-graphic="eco"]', trail => [trail.dataset.voice, trail.getAttribute('opacity')]), ['main', '0.38']);
  assert.equal(await page.$eval('#graphic svg > text:last-of-type', name => `${name.textContent}|${getComputedStyle(name).display !== 'none'}`), 'ALFAIA|true');
  await page.evaluate(() => localStorage.removeItem('baque-virado:volume-alfaia'));
  assert.deepEqual(errors, []);
  await page.close();
});

/** No two of `boxes` overlap, and nothing of the graphic is outside the main circle. */
async function assertClear(page, boxes, what) {
  for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) assert.ok(apart(a, b), `two ${what} overlap: «${a.name}» and «${b.name}»`);
  await assertInsideMainCircle(page);
}
/** Reload the page with only `instrument` muted, as the volume a desktop viewer stored; with none, every volume as it was. */
async function reloadMuted(page, instrument) {
  await page.evaluate(muted => {
    for (const key of Object.keys(localStorage)) if (key.startsWith('baque-virado:volume-')) localStorage.removeItem(key);
    if (muted) localStorage.setItem(`baque-virado:volume-${muted}`, 'mute');
  }, instrument);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.baque && document.readyState === 'complete');
}
// ---------- the forró's own graphics (#54) ----------
const FORRO_SCENES = scenesOf('forro');
const STEP = 1 / 8; // a sixteenth of its 2/4 bar
const forroAt = (page, id, offset) => drawAt(page, FORRO_SCENES, id, offset);
const litKeys = page => page.$$eval('#graphic [data-key][data-lit="true"]', keys => keys.map(key => Number(key.dataset.key)).sort());
const litButtons = page => page.$$eval('#graphic [data-button][data-lit="true"]', buttons => buttons.map(button => button.dataset.button).sort());
const litHeads = page => page.$$eval('#graphic [data-head][data-lit="true"]', heads => heads.map(head => `${head.dataset.head}:${head.dataset.stroke}`));
const fillOf = (page, selector) => page.$eval(selector, element => element.getAttribute('fill-opacity'));
const [A4, C5, A5] = [69, 72, 81]; // MIDI numbers

for (const viewport of [PHONES[0], DESKTOP])
  test(`the forró draws the sanfona's keys and buttons and the zabumba's two heads in the main square, at ${viewport.width} px`, async () => {
    const { page, errors } = await openPage(viewport, { query: '?ritmo=forro' });
    assert.equal(await page.$eval('#stage', stage => stage.classList.contains('has-graphic')), true);
    assert.match(await page.$eval('#graphic svg', svg => `${svg.getAttribute('role')}: ${svg.getAttribute('aria-label')}`), /^img: Sanfona: .*Zabumba: /);
    assert.deepEqual(await page.$$eval('#graphic [data-graphic]', groups => groups.map(group => group.dataset.graphic)), ['sanfona', 'zabumba']);
    assert.deepEqual(await page.$$eval('#graphic [data-key], #graphic [data-button]', parts => parts.length), 18 + 24); // E4 to A5, four rows of six
    // the first scene: the triângulo alone, so both instruments are at rest
    await forroAt(page, 'triangulo', 0.3);
    assert.deepEqual([await litKeys(page), await litButtons(page), await litHeads(page)], [[], [], []]);
    // the trio: the bass button and the maceta's open stroke on the bar's first sixteenth
    await forroAt(page, 'trio', 0.2 * STEP);
    assert.deepEqual([await litButtons(page), await litHeads(page)], [['baixo-A'], ['grave:aberto']]);
    // the bacalhau on the off-beat, under the chord button's second stroke
    await forroAt(page, 'trio', 2.3 * STEP);
    assert.deepEqual(await litHeads(page), ['bacalhau:aberto']);
    assert.ok((await litButtons(page)).includes('menor-A'));
    // the second beat: the fifth's bass button, and the maceta pressed into the skin lights the middle alone
    await forroAt(page, 'trio', 4.3 * STEP);
    assert.ok((await litButtons(page)).includes('baixo-E'));
    assert.deepEqual(await litHeads(page), ['grave:abafada']);
    assert.equal(await fillOf(page, '#graphic [data-head="grave"] ellipse'), '0.100');
    assert.ok(Number(await fillOf(page, '#graphic [data-head="grave"] ellipse:last-of-type')) > 0.4);
    // the tune: a key is lit while its note is held, over the bar line too (the top note arrives a sixteenth early)
    await forroAt(page, 'sanfona', 4.5 * STEP);
    assert.deepEqual(await litKeys(page), [A5]);
    await forroAt(page, 'sanfona', 1 + 0.5 * STEP);
    assert.deepEqual(await litKeys(page), [A5]);
    await forroAt(page, 'sanfona', 1 + 2.5 * STEP);
    assert.deepEqual(await litKeys(page), [79]); // G5: the held note has ended
    // thirds: two keys together
    await forroAt(page, 'rabeca', 4 + 0.5 * STEP);
    assert.deepEqual(await litKeys(page), [A4, C5]);
    // a lit key also carries a dot where the finger is, so it differs from a key at rest by more than its red
    assert.equal(
      await page.$$eval(
        '#graphic [data-graphic="sanfona"] circle:not([data-button])',
        dots => dots.filter(dot => dot.getAttribute('display') !== 'none').length,
      ),
      2,
    );
    // every button stands nearer its own column's name than any other, in the last row too
    const columns = await page.evaluate(() => {
      const middle = element => {
        const box = element.getBoundingClientRect();
        return box.left + box.width / 2;
      };
      const names = [...document.querySelectorAll('#graphic [data-graphic="sanfona"] text')].slice(0, 6).map(text => [text.textContent, middle(text)]);
      return [...document.querySelectorAll('#graphic [data-button]')].map(button => {
        const x = middle(button);
        return [button.dataset.button.split('-')[1], names.reduce((near, name) => (Math.abs(name[1] - x) < Math.abs(near[1] - x) ? name : near))[0]];
      });
    });
    const NAME_OF = { C: 'DÓ', G: 'SOL', D: 'RÉ', A: 'LÁ', E: 'MI', B: 'SI' };
    for (const [note, nearest] of columns) assert.equal(nearest, NAME_OF[note], `a ${note} button stands under «${nearest}»`);
    // the jogo de fole: the chord button on every sixteenth, bright on the accents of 3 + 3 + 2 and faint between them
    await forroAt(page, 'fole', 0.5 * STEP);
    assert.equal(await fillOf(page, '#graphic [data-button="menor-A"]'), '0.900');
    await forroAt(page, 'fole', 2.5 * STEP);
    assert.equal(await fillOf(page, '#graphic [data-button="menor-A"]'), '0.460');
    await forroAt(page, 'fole', 3.5 * STEP);
    assert.equal(await fillOf(page, '#graphic [data-button="menor-A"]'), '0.900');
    await assertLabelSizes(page);
    const { marks: names } = await drawnBoxes(page, '#graphic text');
    await assertClear(page, names, 'names');
    assert.deepEqual(errors, []);
    await page.close();
  });

test('with reduced motion the forró lights a button and a head whole and nothing fades, and a muted sanfona or zabumba shows disabled', async () => {
  const { page, errors } = await openStill('?ritmo=forro');
  await forroAt(page, 'fole', 2.5 * STEP); // a faint stroke: lit whole
  assert.equal(await fillOf(page, '#graphic [data-button="menor-A"]'), '0.900');
  await forroAt(page, 'trio', 1.5 * STEP); // half way through the open stroke's ring: as lit as at its start
  assert.equal(await fillOf(page, '#graphic [data-head="grave"] ellipse'), '0.900');
  assert.deepEqual(await litButtons(page), []); // the bass button's sixteenth has passed: plain, not fading
  // the sanfona muted (the volume a desktop viewer stored): its keys and buttons are dimmed and none lights
  await reloadMuted(page, 'sanfona');
  await forroAt(page, 'rabeca', 4 + 0.5 * STEP);
  assert.equal(await page.$eval('#graphic [data-graphic="sanfona"]', group => group.getAttribute('opacity')), '0.38');
  assert.deepEqual([await litKeys(page), await litButtons(page)], [[], []]);
  assert.deepEqual(await litHeads(page), ['grave:aberto']); // the zabumba still plays
  // the zabumba muted: its heads are dimmed and none lights
  await reloadMuted(page, 'zabumba');
  await forroAt(page, 'trio', 0.2 * STEP);
  assert.equal(await page.$eval('#graphic [data-graphic="zabumba"]', group => group.getAttribute('opacity')), '0.38');
  assert.deepEqual(await litHeads(page), []);
  assert.deepEqual(await litButtons(page), ['baixo-A']);
  assert.deepEqual(errors, []);
  await page.close();
});

// ---------- the frevo's own graphics (#55) ----------
const FREVO_SCENES = scenesOf('frevo');
const frevoAt = (page, id, offset) => drawAt(page, FREVO_SCENES, id, offset);
const frevoStart = id => FREVO_SCENES.find(scene => scene.id === id).start;
const nowNotes = page =>
  page.$$eval('#graphic [data-now="true"]', notes => notes.map(note => `${note.dataset.bar}:${note.dataset.step}:${note.dataset.degree}`));
const pressedValves = page => page.$$eval('#graphic [data-valve][data-pressed="true"]', valves => valves.map(valve => Number(valve.dataset.valve)));
const valveNote = page => page.$eval('#graphic [data-note]', name => name.textContent);
const cursorOf = page => page.$eval('#graphic [data-cursor]', cursor => [cursor.dataset.staff, Number(cursor.getAttribute('x1'))]);
const [F_SHARP_4, G4_DEGREE, D5_DEGREE] = [31, 32, 36]; // a note's place among the seven of each octave

for (const viewport of [PHONES[0], DESKTOP])
  test(`the frevo draws the tune's score and the trompete's valves in the main square, at ${viewport.width} px`, async () => {
    const { page, errors } = await openPage(viewport, { query: '?ritmo=frevo' });
    assert.equal(await page.$eval('#stage', stage => stage.classList.contains('has-graphic')), true);
    assert.match(await page.$eval('#graphic svg', svg => `${svg.getAttribute('role')}: ${svg.getAttribute('aria-label')}`), /^img: Partitura: .*Pistos: /);
    assert.deepEqual(await page.$$eval('#graphic [data-graphic]', groups => groups.map(group => group.dataset.graphic)), ['partitura', 'pistos']);
    // a scene with no tune: its four bars are four whole rests, no note is lit and no valve is pressed
    await frevoAt(page, 'caixa', 0.3);
    assert.deepEqual(await page.$$eval('#graphic [data-rest]', rests => rests.map(rest => rest.dataset.rest)), ['8', '8', '8', '8']);
    assert.deepEqual([await nowNotes(page), await pressedValves(page), await valveNote(page)], [[], [], '']);
    // the tune: the note that sounds is lit, and the cursor is on its staff
    const palhetas = frevoStart('palhetas');
    await frevoAt(page, 'palhetas', 1 + 1.5 / 8);
    assert.deepEqual(await nowNotes(page), [`${palhetas + 1}:0:${D5_DEGREE}`]);
    assert.equal((await cursorOf(page))[0], '0');
    // the second staff: a sharp the key lacks is written before its note
    await frevoAt(page, 'palhetas', 3 + 6.5 / 8);
    assert.deepEqual(await nowNotes(page), [`${palhetas + 3}:6:${F_SHARP_4}`]);
    assert.equal(await page.$eval(`#graphic [data-bar="${palhetas + 3}"][data-step="6"]`, note => note.dataset.accidental), '1');
    assert.equal((await cursorOf(page))[0], '1');
    // the next page: a note held over the bar line lights on both sides of it
    await frevoAt(page, 'palhetas', 7 + 1.5 / 8);
    assert.deepEqual(await nowNotes(page), [`${palhetas + 6}:6:${G4_DEGREE}`, `${palhetas + 7}:0:${G4_DEGREE}`]);
    assert.deepEqual(
      await page.$$eval('#graphic [data-bar]', pieces => [...new Set(pieces.map(piece => Number(piece.dataset.bar)))]),
      [4, 5, 6, 7].map(bar => palhetas + bar),
    );
    // the valves: an open note names itself with no valve down; then two valves, then one
    await frevoAt(page, 'metais', 1 + 2.5 / 8);
    assert.deepEqual([await pressedValves(page), await valveNote(page)], [[], 'SI♭']);
    await frevoAt(page, 'metais', 1 + 5.5 / 8);
    assert.deepEqual([await pressedValves(page), await valveNote(page)], [[1, 2], 'SOL']);
    await frevoAt(page, 'metais', 3 + 2.5 / 8);
    assert.deepEqual([await pressedValves(page), await valveNote(page)], [[2], 'LÁ']);
    await frevoAt(page, 'metais', 3 + 5.5 / 8);
    assert.deepEqual([await pressedValves(page), await valveNote(page)], [[2, 3], 'FÁ♯']);
    await assertLabelSizes(page);
    // the busiest bar of the tune (six notes, two accidentals): no notehead on another, and nothing outside the main circle
    await frevoAt(page, 'palhetas', 13 + 0.5 / 8);
    const { marks: heads } = await drawnBoxes(page, '#graphic [data-degree] > ellipse');
    assert.equal(heads.length, 11); // three, six, and the half note tied to a quarter
    await assertClear(page, heads, 'noteheads');
    // no accidental and no rest stands on a sign of another note: on this page, on the one with a rest after a flag
    // and on the one with a natural after a flag
    for (const [bar, at] of [
      [13, 0.5 / 8],
      [3, 0.5 / 8],
      [7, 0.5 / 8],
    ]) {
      await frevoAt(page, 'palhetas', bar + at);
      const marks = await page.$$eval('#graphic [data-mark]:not([data-mark=""])', all =>
        all.map(mark => {
          const { left, right, top, bottom } = mark.getBoundingClientRect(),
            piece = mark.closest('[data-step]');
          return { left, right, top, bottom, kind: mark.dataset.mark, piece: `${piece.dataset.bar}:${piece.dataset.step}` };
        }),
      );
      const signs = marks.filter(mark => mark.kind === 'accidental' || mark.kind === 'rest');
      assert.ok(signs.length >= 2, `bar ${bar + 1}: only ${signs.length} accidentals and rests on its page`);
      for (const sign of signs)
        for (const other of marks.filter(mark => mark.piece !== sign.piece))
          assert.ok(apart(sign, other), `bar ${bar + 1}: the ${sign.kind} of ${sign.piece} stands on the ${other.kind} of ${other.piece}`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  });

test('with reduced motion the frevo cursor stands on the note that holds the show, and a muted saxofone or trompete shows disabled', async () => {
  const { page, errors } = await openStill('?ritmo=frevo');
  // inside a dotted quarter the cursor does not move
  await frevoAt(page, 'palhetas', 1 + 0.5 / 8);
  const [, early] = await cursorOf(page);
  await frevoAt(page, 'palhetas', 1 + 4.5 / 8);
  assert.equal((await cursorOf(page))[1], early);
  await frevoAt(page, 'palhetas', 1 + 6.5 / 8); // the next note
  assert.ok((await cursorOf(page))[1] > early);
  // the saxofone muted (the volume a desktop viewer stored): the score is dimmed and no note lights
  await reloadMuted(page, 'sax');
  await frevoAt(page, 'palhetas', 1 + 1.5 / 8);
  assert.equal(await page.$eval('#graphic [data-graphic="partitura"]', group => group.getAttribute('opacity')), '0.38');
  assert.deepEqual(await nowNotes(page), []);
  // the trompete muted: its valves are dimmed, none goes down and no name shows
  await reloadMuted(page, 'trompete');
  await frevoAt(page, 'metais', 1 + 5.5 / 8);
  assert.equal(await page.$eval('#graphic [data-graphic="pistos"]', group => group.getAttribute('opacity')), '0.38');
  assert.deepEqual([await pressedValves(page), await valveNote(page)], [[], '']);
  assert.deepEqual(errors, []);
  await page.close();
});

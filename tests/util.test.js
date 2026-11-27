import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hash, pauseWhileHidden, setStyle } from '../src/util.js';

test('hash is deterministic and in [0, 1)', () => {
  for (let seed = -500; seed < 5000; seed += 7) {
    const value = hash(seed);
    assert.equal(hash(seed), value);
    assert.ok(value >= 0 && value < 1, `hash(${seed}) = ${value}`);
  }
});

// The per-hit sound variation and the video export depend on these exact values.
test('hash keeps its pinned values', () => {
  assert.equal(hash(0), 0.8587904749438167);
  assert.equal(hash(12345), 0.18747909599915147);
});

test('index.html preloads every module of src/', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const modules = readdirSync(new URL('../src/', import.meta.url), { recursive: true }).filter(name => name.endsWith('.js') && name !== 'main.js');
  const missing = modules.filter(name => !html.includes(`<link rel="modulepreload" href="src/${name}">`));
  assert.deepEqual(missing, []);
});

test('setStyle writes a style only when it differs from its last write', () => {
  const writes = [];
  const element = { style: new Proxy({}, { set: (target, name, value) => writes.push([name, value]) && Reflect.set(target, name, value) }) };
  setStyle(element, 'opacity', 0.5);
  setStyle(element, 'opacity', '0.5');
  setStyle(element, 'transform', '');
  setStyle(element, 'opacity', 1);
  assert.deepEqual(writes, [
    ['opacity', '0.5'],
    ['transform', ''],
    ['opacity', '1'],
  ]);
});

// A fake document: `hidden` and one visibilitychange listener, enough for pauseWhileHidden.
function fakePage() {
  const listeners = new Set();
  return {
    hidden: false,
    addEventListener: (type, listener) => type === 'visibilitychange' && listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    set(hidden) {
      this.hidden = hidden;
      for (const listener of listeners) listener();
    },
    listeners,
  };
}
function fakeShow(playing) {
  const calls = [];
  return {
    calls,
    playing: () => playing,
    pause: () => {
      playing = false;
      calls.push('pause');
    },
    play: () => {
      playing = true;
      calls.push('play');
    },
  };
}

test('a playing show pauses when the page is hidden and resumes when it is shown (#45)', () => {
  const page = fakePage(),
    show = fakeShow(true);
  pauseWhileHidden(page, show);
  page.set(true);
  assert.deepEqual(show.calls, ['pause']);
  page.set(false);
  assert.deepEqual(show.calls, ['pause', 'play']);
});

test('a show paused before the page is hidden stays paused when it is shown again (#45)', () => {
  const page = fakePage(),
    show = fakeShow(false);
  pauseWhileHidden(page, show);
  page.set(true);
  page.set(false);
  assert.deepEqual(show.calls, []);
});

test('pauseWhileHidden returns a function that removes its listener', () => {
  const page = fakePage();
  const stop = pauseWhileHidden(page, fakeShow(true));
  stop();
  assert.equal(page.listeners.size, 0);
});

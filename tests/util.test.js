import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hash, setStyle } from '../src/util.js';

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

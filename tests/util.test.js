import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hash } from '../src/util.js';

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

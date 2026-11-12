import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderScore } from '../src/score.js';

test('renderScore returns SVG markup and 16 slot positions per bar', () => {
  const bars = [
    { main: [0, 9, 13], answer: [8, 12] },
    { main: [0], answer: [], stick: [4, 8, 12] },
  ];
  const score = renderScore({ bars, height: 60 });
  assert.match(score.markup, /^<svg/);
  assert.equal(score.slotX.length, 32);
  for (let i = 1; i < score.slotX.length; i++) assert.ok(score.slotX[i] > score.slotX[i - 1]);
});

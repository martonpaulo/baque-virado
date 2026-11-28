// The motion lab's arithmetic: what it reports for frames whose motion and flashes are known.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { correlation, parseArguments, summarise } from '../lab/motion.mjs';

const FPS = 30;
const CELLS = 4;
/** One second and a half of frames; `cellAt(frame)` gives the first cell's luminance, the others stay dark. */
const framesOf = cellAt => [...Array(FPS * 1.5).keys()].map(frame => [cellAt(frame), ...Array(CELLS - 1).fill(0.02)]);

test('the motion lab reads its rhythms and options, and refuses anything else', () => {
  assert.deepEqual(parseArguments(['coco', 'frevo']), { ids: ['coco', 'frevo'], seconds: 3, shots: null });
  assert.deepEqual(parseArguments(['coco', '--seconds', '1.5', '--shots', 'out']), { ids: ['coco'], seconds: 1.5, shots: 'out' });
  assert.equal(parseArguments([]), null);
  assert.equal(parseArguments(['--seconds', '2']), null); // no rhythm
  assert.equal(parseArguments(['coco', '--seconds']), null); // an option with no value
  assert.equal(parseArguments(['coco', '--frames', '9']), null); // an unknown option
});

test('a still picture has no motion and no flash', () => {
  assert.deepEqual(
    summarise(
      framesOf(() => 0.02),
      FPS,
    ),
    { moving: 0, change: 0, flashes: 0, flashing: 0 },
  );
});

test('a cell that drifts slowly counts as moving and never as a flash', () => {
  const result = summarise(
    framesOf(frame => 0.02 + frame * 0.002),
    FPS,
  );
  assert.equal(result.moving, 1 / CELLS, 'one cell of four changes by a step of lightness in half a second');
  assert.ok(result.change > 0);
  assert.equal(result.flashes, 0);
});

test('a cell that goes bright and dark five times a second is over the limit of three flashes', () => {
  const result = summarise(
    framesOf(frame => (Math.floor(frame / 3) % 2 ? 0.5 : 0.02)),
    FPS,
  );
  assert.equal(result.flashes, 5);
  assert.equal(result.flashing, 1 / CELLS);
  // twice a second, the same change is within the limit
  const slow = summarise(
    framesOf(frame => (Math.floor(frame / 8) % 2 ? 0.5 : 0.02)),
    FPS,
  );
  assert.ok(slow.flashes <= 3 && slow.flashes >= 1, `${slow.flashes} flashes`);
  assert.equal(slow.flashing, 0);
  // a change under 10 % of relative luminance is no flash, however fast
  assert.equal(
    summarise(
      framesOf(frame => (frame % 2 ? 0.1 : 0.02)),
      FPS,
    ).flashes,
    0,
  );
});

test('the correlation is 1 for lists that rise together, -1 for opposite ones, 0 when one does not vary', () => {
  assert.ok(Math.abs(correlation([1, 2, 3], [10, 20, 30]) - 1) < 1e-12);
  assert.ok(Math.abs(correlation([1, 2, 3], [3, 2, 1]) + 1) < 1e-12);
  assert.equal(correlation([1, 2, 3], [5, 5, 5]), 0);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COPY } from '../src/copy.js';
import { SCENES, TOTAL_BARS } from '../src/show.js';

test('TOTAL_BARS is the sum of the scene lengths', () => {
  assert.equal(
    TOTAL_BARS,
    SCENES.reduce((sum, scene) => sum + scene.bars, 0),
  );
  assert.equal(TOTAL_BARS, 54);
});

test('scenes are contiguous from bar 0', () => {
  let expected = 0;
  for (const scene of SCENES) {
    assert.equal(scene.start, expected, `scene ${scene.id} starts at ${scene.start}`);
    expected += scene.bars;
  }
});

test('every scene id and every section has copy', () => {
  for (const scene of SCENES) {
    assert.ok(COPY.scenes[scene.id], `no copy for scene ${scene.id}`);
    assert.ok(COPY.sections[scene.section], `no copy for section ${scene.section}`);
  }
});

test('the hits of a bar are computed once and cannot be changed by a caller', async () => {
  const { hitsInBar } = await import('../src/show.js');
  const first = hitsInBar(21);
  assert.equal(hitsInBar(21), first);
  assert.ok(Object.isFrozen(first) && Object.isFrozen(first[0]));
});

test('every sounding hit comes from the bar timeline the wheel draws', async () => {
  const { barTimeline, hitsInBar, TOTAL_BARS } = await import('../src/show.js');
  for (let bar = 0; bar < TOTAL_BARS; bar++) {
    const { playing, voices } = barTimeline(bar);
    const expected = playing.flatMap(voice => voices[voice].map(entry => [voice, entry.hit, bar + entry.position / 16]));
    assert.deepEqual(
      hitsInBar(bar).map(h => [h.voice, h.hit, h.at]),
      expected,
      `bar ${bar}`,
    );
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COPY } from '../src/copy.js';
import { COLD_BOUNDARY_SHARE, createShow, LEAD_INS, SCENES, TOTAL_BARS } from '../src/show.js';
import { TWO_FOUR } from './support/rhythm-two-four.js';

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

test('every scene id has copy', () => {
  for (const scene of SCENES) {
    assert.ok(COPY.scenes[scene.id], `no copy for scene ${scene.id}`);
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

test('the baque scenes follow BAQUE_ORDER', async () => {
  const { SCENES } = await import('../src/show.js');
  const { BAQUE_ORDER } = await import('../src/rhythms/maracatu.js');
  assert.deepEqual(
    SCENES.filter(scene => scene.named && scene.id !== 'summary').map(scene => scene.id),
    BAQUE_ORDER,
  );
});

// ---------- lead-ins (#46): a scene declares how it is entered, and the script writes the bar ----------
/** The 2/4 fixture with other scenes, its bar function recording what the engine told it. */
function showWith(scenes, seen = []) {
  const barHits = (scene, barInScene, context) => {
    seen.push([scene.id, barInScene, context.leadsInto]);
    return TWO_FOUR.barHits(scene, barInScene);
  };
  return createShow({ ...TWO_FOUR, scenes, barHits });
}
const DUO = () => ['main', 'answer'];

test('the script reads how the next scene is entered in the last bar before it, and nowhere else', () => {
  const seen = [];
  const show = showWith(
    [
      { id: 'entrada', bars: 2, voices: DUO },
      { id: 'roda', bars: 3, leadIn: 'fill' },
    ],
    seen,
  );
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) show.barTimeline(bar);
  assert.deepEqual(seen, [
    ['entrada', 0, null],
    ['entrada', 1, 'fill'],
    ['roda', 0, null],
    ['roda', 1, null],
    ['roda', 2, null], // the last bar of the show leads into nothing
  ]);
});

test('a scene of one bar is entered and leads on in that same bar', () => {
  const seen = [];
  const show = showWith(
    [
      { id: 'entrada', bars: 1, voices: DUO },
      { id: 'virada', bars: 1, voices: DUO, leadIn: 'pickup' },
      { id: 'roda', bars: 2, leadIn: 'fill' },
    ],
    seen,
  );
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) show.barTimeline(bar);
  assert.deepEqual(seen.slice(0, 2), [
    ['entrada', 0, 'pickup'],
    ['virada', 0, 'fill'],
  ]);
  // the boundary after a one-bar scene reads that scene's own bar, never a bar of the scene before it
  assert.deepEqual(
    show.boundaries().map(({ from, to, changed, voices }) => [from, to, changed, voices]),
    [
      ['entrada', 'virada', 0, 2],
      ['virada', 'roda', 1, 3],
    ],
  );
});

test('an unknown lead-in and a lead-in on the first scene are refused by name', () => {
  assert.throws(
    () =>
      showWith([
        { id: 'entrada', bars: 2 },
        { id: 'roda', bars: 2, leadIn: 'roll' },
      ]),
    /scene roda: unknown lead-in «roll»/,
  );
  assert.throws(() => showWith([{ id: 'entrada', bars: 2, leadIn: 'fill' }]), /scene entrada: the first scene has no bar before it/);
  assert.deepEqual(LEAD_INS, ['fill', 'pickup', 'dropOut', 'ringOver']);
});

test('a boundary that changes more than a quarter of the voices is cold until the entered scene declares a lead-in', () => {
  const scenes = leadIn => [
    { id: 'entrada', bars: 2, voices: DUO },
    { id: 'roda', bars: 2, ...(leadIn ? { leadIn } : {}) },
  ];
  const [cold] = showWith(scenes()).boundaries();
  assert.deepEqual(cold, { from: 'entrada', to: 'roda', changed: 1, voices: 3, share: 1 / 3, leadIn: null, cold: true }); // the agogô enters
  assert.ok(cold.share > COLD_BOUNDARY_SHARE);
  assert.equal(showWith(scenes('pickup')).boundaries()[0].cold, false);
  // the same band on both sides is never cold
  assert.equal(
    showWith([
      { id: 'entrada', bars: 2 },
      { id: 'roda', bars: 2 },
    ]).boundaries()[0].cold,
    false,
  );
});

test('a voice whose bar holds only a silent mark still counts as written in that bar', () => {
  const marks = { ...TWO_FOUR, barHits: () => ({ main: [{ step: 0, velocity: 1 }], answer: [{ step: 4, velocity: 0, mark: true }], agogo: [] }) };
  const [boundary] = createShow({
    ...marks,
    scenes: [
      { id: 'entrada', bars: 2, voices: DUO },
      { id: 'roda', bars: 2, voices: () => ['main'] },
    ],
  }).boundaries();
  assert.deepEqual([boundary.changed, boundary.voices], [1, 2]); // the answer's mark is written before the boundary and gone after it
});

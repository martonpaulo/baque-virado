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

// ---------- the music's energy (#63) ----------
const { RHYTHMS } = await import('../src/rhythms/index.js');
const { meterOf } = await import('../src/music.js');
const { CALM_PACE, RECENT_WINDOW } = await import('../src/show.js');

// Found with the coco (a bar of 0.91 s): right after a bar line, the hits of the bar before the last
// were missing from the window, so a shape that lives a second vanished there and came back.
test('the recent hits reach as far back as the window, across bars shorter than it', () => {
  for (const rhythm of RHYTHMS) {
    const show = createShow(rhythm),
      { barSeconds } = meterOf(rhythm);
    for (let bar = 2; bar < show.TOTAL_BARS; bar++) {
      const position = bar + 0.01,
        expected = [bar - 2, bar - 1, bar].flatMap(b => show.hitsInBar(b)).filter(h => h.at <= position && (position - h.at) * barSeconds < RECENT_WINDOW);
      assert.equal(show.recentHits(position, RECENT_WINDOW).length, expected.length, `${rhythm.id}, bar ${bar}`);
    }
  }
});

test('the energy is 0 in silence, 1 at the busiest moment of each show, and lower with a voice muted', () => {
  for (const rhythm of RHYTHMS) {
    const show = createShow(rhythm),
      { stepsPerBar } = meterOf(rhythm);
    assert.equal(show.energyOf([]), 0, rhythm.id);
    let highest = 0;
    for (let step = 0; step <= show.TOTAL_BARS * stepsPerBar; step++) {
      const energy = show.energyAt(step / stepsPerBar);
      assert.ok(energy >= 0 && energy <= 1, `${rhythm.id}: ${energy} at step ${step}`);
      highest = Math.max(highest, energy);
    }
    assert.equal(highest, 1, rhythm.id);
    // a moment under the full band, where the energy is not held at 1: muting the voice with the most strokes there calms it
    const under = [...Array(show.TOTAL_BARS * stepsPerBar).keys()]
        .map(step => step / stepsPerBar)
        .find(position => show.energyAt(position) > 0.5 && show.energyAt(position) < 1),
      recent = show.recentHits(under, RECENT_WINDOW),
      strokes = Object.groupBy(recent, h => h.voice),
      most = Object.keys(strokes).reduce((a, b) => (strokes[b].length > strokes[a].length ? b : a));
    assert.ok(show.energyOf(recent.filter(h => h.voice !== most)) < show.energyOf(recent), `${rhythm.id}: muting ${most} calms it`);
  }
});

// The energy counted every stroke of every voice, so a passage of one or two instruments read as
// near silence: 0.05 for the coco's alfaia alone and 0.1 for its rufadas, the fastest playing of the
// show, where the sound lab hears a level 2 dB under the full band (lab/show-sections.txt).
test('strokes that sound together count as one sound, and a thin passage reads as a good part of the full band', () => {
  for (const rhythm of RHYTHMS) {
    const show = createShow(rhythm),
      { barSeconds, stepsPerBar } = meterOf(rhythm),
      stepSeconds = barSeconds / stepsPerBar;
    const stroke = (voice, steps) => ({ voice, grid: -steps / stepsPerBar, at: -steps / stepsPerBar, age: steps * stepSeconds, hit: { velocity: 1 } });
    // one stroke, and nine voices on that same stroke
    const one = show.energyOf([stroke('a', 2)]),
      nine = show.energyOf([...'abcdefghi'].map(voice => stroke(voice, 2)));
    assert.ok(one > 0 && nine > one, `${rhythm.id}: more voices, more energy`);
    assert.ok(nine < 2 * one, `${rhythm.id}: nine voices on one stroke read ${(nine / one).toFixed(2)} times one`);
    // one instrument alone, a stroke on every step, at full strength
    const alone = show.energyOf([...Array(Math.floor(RECENT_WINDOW / stepSeconds)).keys()].map(steps => stroke('a', steps + 1)));
    assert.ok(alone >= 1 / 3, `${rhythm.id}: one instrument on every step reads ${alone.toFixed(2)}`);
  }
});

test('each show has calm and busy scenes for the background to follow', () => {
  // the shows whose background reads the energy: the maracatu's has its own speed for each scene
  for (const rhythm of RHYTHMS.filter(candidate => candidate.background)) {
    const show = createShow(rhythm);
    const mean = scene => [...Array(scene.bars * 4).keys()].reduce((sum, i) => sum + show.energyAt(scene.start + i / 4), 0) / (scene.bars * 4);
    const means = show.SCENES.map(mean);
    assert.ok(
      Math.max(...means) - Math.min(...means) >= 0.3,
      `${rhythm.id}: scene energies from ${Math.min(...means).toFixed(2)} to ${Math.max(...means).toFixed(2)}`,
    );
  }
});

test('the energy clock never stops or runs back: between CALM_PACE and real time, by the position alone', () => {
  for (const rhythm of RHYTHMS) {
    const show = createShow(rhythm),
      { barSeconds, stepsPerBar } = meterOf(rhythm),
      stepSeconds = barSeconds / stepsPerBar;
    assert.equal(show.flowAt(0), 0);
    for (let step = 0; step < show.TOTAL_BARS * stepsPerBar; step++) {
      const pace = (show.flowAt((step + 1) / stepsPerBar) - show.flowAt(step / stepsPerBar)) / stepSeconds;
      assert.ok(pace >= CALM_PACE - 1e-9 && pace <= 1 + 1e-9, `${rhythm.id}: pace ${pace} at step ${step}`);
    }
    assert.equal(show.flowAt(7.3), show.flowAt(7.3), 'the same position, the same clock');
    assert.equal(show.flowAt(show.TOTAL_BARS + 5), show.flowAt(show.TOTAL_BARS), 'past the end it holds');
    assert.equal(show.flowAt(-1), 0);
    assert.ok(show.flowAt(show.TOTAL_BARS) < show.TOTAL_SECONDS, 'slower than real time over a whole show');
  }
});

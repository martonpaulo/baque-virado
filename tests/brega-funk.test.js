// The brega funk package: one tempo, its beat, the hook's form, its background and the flash limit.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { meterOf } from '../src/music.js';
import { BEAT, BREGA_FUNK, HOOK, HOOK_VARIED, TAMBORZAO } from '../src/rhythms/brega-funk.js';
import { createBregaFunkBackground } from '../src/rhythms/brega-funk-background.js';
import { createShow } from '../src/show.js';

const show = createShow(BREGA_FUNK);
const leadBars = () =>
  [...Array(show.TOTAL_BARS).keys()].map(bar => ({
    bar,
    scene: show.sceneAt(bar).id,
    notes: show
      .hitsInBar(bar)
      .filter(h => h.voice === 'lead')
      .map(h => [h.hit.step, h.hit.tone]),
  }));
const asHits = bar => bar.map(([step, note, length]) => [step, `${note}:${length}`]);

test('one tempo for the whole show: 170 BPM in half time, one 16-step bar per turn', () => {
  const meter = meterOf(BREGA_FUNK);
  assert.equal(BREGA_FUNK.bpm, 85);
  assert.equal(meter.stepsPerBar, 16);
  assert.equal(show.TOTAL_BARS, 34);
  assert.equal(show.SCENES.length, 11);
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) for (const h of show.hitsInBar(bar)) assert.equal(h.swing, 0, 'hard-quantized: no swing');
});

test('the bumbo on 1 and 9 and the lata on 4, 7, 12 and 15 group each half bar as 3 + 3 + 2', () => {
  const lata = show.sceneById('lata');
  const steps = voice =>
    show
      .hitsInBar(lata.start)
      .filter(h => h.voice === voice)
      .map(h => h.hit.step);
  assert.deepEqual(steps('lata'), BEAT.lata.steps);
  assert.deepEqual(steps('lata'), [3, 6, 11, 14]);
  assert.deepEqual(steps('bumbo'), [0, 6, 8, 14]);
  // the contrast scene drops the lata for the Rio atabaque line
  const rio = show.hitsInBar(show.sceneById('tamborzao').start);
  assert.equal(rio.filter(h => h.voice === 'lata').length, 0);
  assert.deepEqual(
    rio.filter(h => h.voice === 'tamborzao').map(h => h.hit.step),
    TAMBORZAO.drum.steps,
  );
});

test('each part enters on its own: a scene draws and plays only its voices', () => {
  assert.deepEqual([...new Set(show.hitsInBar(0).map(h => h.voice))], ['lead']);
  assert.deepEqual([...new Set(show.hitsInBar(show.sceneById('bumbo').start).map(h => h.voice))], ['bumbo']);
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) {
    const { voices, playing } = show.barTimeline(bar);
    for (const voice of Object.keys(voices)) if (!playing.includes(voice)) assert.equal(voices[voice].length, 0, `${voice} in bar ${bar}`);
  }
});

test('the hook is stated first, repeated, varied once on the drop and back unchanged at the end', () => {
  const bars = leadBars();
  const first = asHits(HOOK[0]),
    second = asHits(HOOK[1]),
    varied = asHits(HOOK_VARIED[1]);
  const statements = bars.filter((b, i) => JSON.stringify(b.notes) === JSON.stringify(first) && JSON.stringify(bars[i + 1]?.notes) === JSON.stringify(second));
  assert.equal(bars[0].scene, 'tema');
  assert.deepEqual(bars[0].notes, first);
  assert.ok(statements.length >= 3, `${statements.length} full statements`);
  const variations = bars.filter(b => JSON.stringify(b.notes) === JSON.stringify(varied));
  assert.deepEqual(
    variations.map(b => b.scene),
    ['drop'],
  );
  assert.equal(statements.at(-1).scene, 'final');
});

test('the quebra leaves its last beat silent before the drop', () => {
  const quebra = show.sceneById('quebra');
  const last = show.hitsInBar(quebra.start + quebra.bars - 1);
  assert.ok(last.length > 0);
  for (const h of last) assert.ok(h.hit.step < 12, `${h.voice} on ${h.hit.step + 1}`);
  // and no note rings into it
  for (const h of last.filter(h => h.voice === 'lead')) assert.ok(h.hit.step + Number(h.hit.tone.split(':')[1]) <= 12);
});

test('the background flashes at most 3 times in any second (WCAG 2.3.1)', () => {
  const FPS = 30;
  const layer = createBregaFunkBackground();
  const noop = () => {};
  const ctx = new Proxy({}, { get: (_target, key) => (key === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop), set: () => true });
  const geometry = { width: 400, height: 800, centreX: 200, centreY: 330, scopeRadius: 120, dpr: 1, shapes: [] };
  for (let frame = 0; frame < show.TOTAL_SECONDS * FPS; frame++) {
    const time = frame / FPS,
      position = time / meterOf(BREGA_FUNK).barSeconds;
    const recent = show.recentHits(position, 1.2);
    layer.draw(ctx, { ...geometry, position, params: { sceneId: show.sceneAt(Math.floor(position)).id }, recent, time, step: 1 / FPS, fresh: frame === 0 });
  }
  const flashes = [...new Set(layer.flashTimes())];
  assert.ok(flashes.length > 0);
  for (const start of flashes) assert.ok(flashes.filter(t => t >= start && t < start + 1).length <= 3, `flashes from ${start.toFixed(2)} s`);
});

test('the wheel leans with the beat and swells on the bumbo, by position alone', () => {
  const still = BREGA_FUNK.wheelMotion(0, []);
  assert.deepEqual(still, { rotate: 0, scale: 1 });
  const lean = BREGA_FUNK.wheelMotion(1 / 8, []);
  assert.ok(lean.rotate > 0);
  assert.ok(BREGA_FUNK.wheelMotion(3 / 8, []).rotate < 0, 'the next beat leans the other way');
  const swell = BREGA_FUNK.wheelMotion(2, [{ voice: 'bumbo', hit: { velocity: 1 }, age: 0 }]);
  assert.ok(swell.scale > 1);
});

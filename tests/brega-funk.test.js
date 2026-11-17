// The brega funk package: one tempo, its beat, the hook's form, its background and the flash limit.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { meterOf } from '../src/music.js';
import { BEAT, BREGA_FUNK, HOOK, HOOK_VARIED, TAMBORZAO } from '../src/rhythms/brega-funk.js';
import { createBregaFunkBackground, PALETTE } from '../src/rhythms/brega-funk-background.js';
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

test('one tempo for the whole show, felt at 170 BPM: one 16-sixteenth bar of 1.41 s per turn', () => {
  const meter = meterOf(BREGA_FUNK);
  assert.equal(BREGA_FUNK.bpm, 170);
  assert.equal(meter.stepsPerBar, 16);
  assert.ok(Math.abs(meter.barSeconds - 1.41) < 0.01, `${meter.barSeconds} s per turn`);
  assert.equal(show.TOTAL_BARS, 68);
  assert.ok(show.TOTAL_SECONDS >= 90 && show.TOTAL_SECONDS <= 120, `${show.TOTAL_SECONDS} s`);
  // the chimbal runs in sixteenths of 170 in the full beat
  const hats = show.hitsInBar(show.sceneById('batida').start).filter(h => h.voice === 'chimbal');
  assert.deepEqual(
    hats.map(h => h.hit.step),
    [...Array(16).keys()],
  );
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
    'varied once, in one bar of the drop',
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

// #23: the bloom and the gold and leather rings stayed under the wheel's dots, and the bumbo's purple
// fell to 2.7:1 against them. Under the wheel the background must keep every wheel colour at 3:1
// (WCAG 1.4.11), and the rings are born outside it.
test('under the wheel the background keeps the wheel colours at 3:1 or more', () => {
  const FPS = 30,
    RADIUS = 120;
  const channel = c => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const ground = rgb(PALETTE.ground);
  let darkest = Infinity,
    innermostRing = Infinity;
  const record = {
    createRadialGradient: (_x0, _y0, r0, _x1, _y1, r1) => ({
      addColorStop: (offset, colour) => {
        if (r0 + offset * (r1 - r0) > RADIUS) return;
        const [r, g, b, a] = colour.match(/[\d.]+/g).map(Number);
        const under = [r, g, b].map((c, i) => c * a + ground[i] * (1 - a)); // over the night
        for (const voice of ['purple', 'violet']) {
          const ratio = (luminance(rgb(PALETTE[voice])) + 0.05) / (luminance(under) + 0.05);
          darkest = Math.min(darkest, ratio);
        }
      },
    }),
    arc: (_x, _y, radius) => {
      innermostRing = Math.min(innermostRing, radius);
    },
  };
  const ctx = new Proxy({}, { get: (_target, key) => record[key] || (() => {}), set: () => true });
  const layer = createBregaFunkBackground(),
    { barSeconds } = meterOf(BREGA_FUNK);
  const geometry = { width: 400, height: 800, centreX: 200, centreY: 330, scopeRadius: RADIUS, dpr: 1, shapes: [] };
  for (const id of ['tamborzao', 'drop']) {
    const scene = show.sceneById(id);
    for (let frame = 0; frame < scene.bars * barSeconds * FPS; frame++) {
      const time = scene.start * barSeconds + frame / FPS,
        position = time / barSeconds;
      const recent = show.recentHits(position, 1.2);
      layer.draw(ctx, { ...geometry, position, params: { sceneId: id }, recent, time, step: 1 / FPS, fresh: frame === 0 });
    }
  }
  assert.ok(darkest >= 3, `the wheel's purple at ${darkest.toFixed(2)}:1`);
  assert.ok(innermostRing > RADIUS, 'the gold and leather rings are born outside the wheel');
});

test('the wheel leans on alternate beats and swells on the bumbo, by position alone', () => {
  const still = BREGA_FUNK.wheelMotion(0, []);
  assert.deepEqual(still, { rotate: 0, scale: 1 });
  // at 170 the hips lean on alternate beats: one way over beats 1 and 2, the other over 3 and 4
  const lean = BREGA_FUNK.wheelMotion(1 / 4, []);
  assert.ok(lean.rotate > 0);
  assert.ok(BREGA_FUNK.wheelMotion(1 / 8, []).rotate > 0, 'the second beat keeps the lean');
  assert.ok(BREGA_FUNK.wheelMotion(3 / 4, []).rotate < 0, 'beats 3 and 4 lean the other way');
  const swell = BREGA_FUNK.wheelMotion(2, [{ voice: 'bumbo', hit: { velocity: 1 }, age: 0 }]);
  assert.ok(swell.scale > 1);
});

// The bregafunk package: one tempo, its sparse beat, the flute hook's form, the synthesized sounds, its
// background and the flash limit.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { meterOf } from '../src/music.js';
import { BEAT, BREGAFUNK, HOOK, HOOK_VARIED_BAR, PASSINHO, ROOTS, TAMBORZAO } from '../src/rhythms/bregafunk.js';
import { createBregafunkBackground, PALETTE } from '../src/rhythms/bregafunk-background.js';
import { SYNTH_TAKES } from '../src/rhythms/bregafunk-synth.js';
import { TAKES } from '../src/rhythms/recorded-takes.js';
import { createShow } from '../src/show.js';

const show = createShow(BREGAFUNK);
const ALL_FILES = new Set(Object.values(TAKES).flatMap(list => list.map(take => take.file)));
const stepsOf = (bar, voice) =>
  show
    .hitsInBar(bar)
    .filter(h => h.voice === voice)
    .map(h => h.hit.step);
const fluteBars = () =>
  [...Array(show.TOTAL_BARS).keys()].map(bar => ({
    bar,
    scene: show.sceneAt(bar).id,
    notes: show
      .hitsInBar(bar)
      .filter(h => h.voice === 'flauta')
      .map(h => [h.hit.step, h.hit.tone]),
  }));
const asHits = bar => bar.map(([step, note, length, ornament]) => [step, `${note}:${length}${ornament ? `:${ornament}` : ''}`]);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test('one tempo for the whole show, 170 BPM: one 16-sixteenth bar of 1.41 s per turn', () => {
  const meter = meterOf(BREGAFUNK);
  assert.equal(BREGAFUNK.bpm, 170);
  assert.equal(meter.stepsPerBar, 16);
  assert.ok(Math.abs(meter.barSeconds - 1.41) < 0.01, `${meter.barSeconds} s per turn`);
  assert.equal(show.TOTAL_BARS, 65);
  assert.ok(show.TOTAL_SECONDS >= 80 && show.TOTAL_SECONDS <= 130, `${show.TOTAL_SECONDS} s`);
  assert.equal(show.SCENES.length, 12);
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) for (const h of show.hitsInBar(bar)) assert.equal(h.swing, 0, 'hard-quantized: no swing');
});

// The reference recordings play about 5 onsets a second; the first version of this show played 10.
test('the beat is sparse: a few hard hits with space between them, never a wall of sixteenths', () => {
  const batida = show.sceneById('batida');
  let onsets = 0;
  for (let bar = batida.start; bar < batida.start + batida.bars; bar++) {
    const steps = new Set(show.hitsInBar(bar).map(h => h.hit.step));
    onsets += steps.size;
    assert.ok(steps.size <= 12, `bar ${bar} sounds on ${steps.size} of 16 sixteenths`);
    assert.ok(stepsOf(bar, 'chimbal').length <= 5, `the chimbal plays ${stepsOf(bar, 'chimbal').length} strokes in bar ${bar}`);
  }
  const rate = onsets / (batida.bars * meterOf(BREGAFUNK).barSeconds);
  assert.ok(rate >= 4 && rate <= 7.5, `${rate.toFixed(1)} onsets a second`);
});

test('the bumbo on 1 and 9 and the lata on 7 and 13 group the bar as 3 + 3 + 2 eighths, the palma with the second bumbo', () => {
  const lata = show.sceneById('lata');
  assert.deepEqual(stepsOf(lata.start, 'lata'), BEAT.lata.steps);
  assert.deepEqual(stepsOf(lata.start, 'lata'), [6, 12]);
  assert.deepEqual(stepsOf(lata.start, 'bumbo'), [0, 8]);
  const tresillo = [BEAT.bumbo.steps[0], ...BEAT.lata.steps];
  assert.deepEqual(
    tresillo.map((step, i) => ((tresillo[(i + 1) % tresillo.length] - step + 16) % 16) / 2),
    [3, 3, 2],
  );
  assert.deepEqual(stepsOf(show.sceneById('palmas').start, 'palma'), [8]);
  // the contrast scene drops the lata for the Rio atabaque line
  const rio = show.sceneById('tamborzao').start;
  assert.equal(stepsOf(rio, 'lata').length, 0);
  assert.deepEqual(stepsOf(rio, 'tamborzao'), TAMBORZAO.drum.steps);
  // the passinho doubles the bumbo
  assert.deepEqual(stepsOf(show.sceneById('passinho').start, 'bumbo'), PASSINHO.bumbo.steps);
});

test('each part enters on its own: a scene draws and plays only its voices', () => {
  assert.deepEqual([...new Set(show.hitsInBar(0).map(h => h.voice))], ['flauta']);
  assert.deepEqual([...new Set(show.hitsInBar(show.sceneById('bumbo').start).map(h => h.voice))], ['bumbo']);
  const entering = ['tema', 'bumbo', 'lata', 'palmas', 'grave', 'teclado', 'batida'].map(id => show.barTimeline(show.sceneById(id).start).playing.length);
  assert.deepEqual(entering, [1, 1, 2, 4, 5, 6, 7], 'the parts add up, scene by scene');
  for (let bar = 0; bar < show.TOTAL_BARS; bar++) {
    const { voices, playing } = show.barTimeline(bar);
    for (const voice of Object.keys(voices)) if (!playing.includes(voice)) assert.equal(voices[voice].length, 0, `${voice} in bar ${bar}`);
  }
});

test('the hook is an eight-bar flute tune: stated alone, played whole, varied once on the drop, back at the end', () => {
  const bars = fluteBars();
  assert.equal(HOOK.length, 8);
  const tema = show.sceneById('tema');
  for (let i = 0; i < tema.bars; i++) assert.deepEqual(bars[tema.start + i].notes, asHits(HOOK[i]), `tema, bar ${i}`);
  const batida = show.sceneById('batida');
  for (let i = 0; i < HOOK.length; i++) assert.deepEqual(bars[batida.start + i].notes, asHits(HOOK[i]), `batida, bar ${i}`);
  const variations = bars.filter(b => same(b.notes, asHits(HOOK_VARIED_BAR)));
  assert.deepEqual(
    variations.map(b => b.scene),
    ['drop'],
    'varied once, in one bar of the drop',
  );
  const final = show.sceneById('final');
  for (let i = 0; i < final.bars - 1; i++) assert.deepEqual(bars[final.start + i].notes, asHits(HOOK[i]), `final, bar ${i}`);
});

// What the reference's hook is like: high, short notes, fast repeated notes, one line at a time.
test('the hook is written for a flute: high, monophonic, with repeated notes, slides and room to breathe', () => {
  const NOTES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = note => 12 * (Number(note.at(-1)) + 1) + NOTES[note[0]] + (note.includes('#') ? 1 : note.includes('b') ? -1 : 0);
  const pitches = HOOK.flat().map(([, note]) => midi(note));
  assert.ok(Math.min(...pitches) >= midi('G4') && Math.max(...pitches) <= midi('A5'), 'inside the flute takes: G4 to A5');
  for (const [i, bar] of HOOK.entries()) {
    assert.ok(bar.length >= 4 && bar.length <= 9, `bar ${i} has ${bar.length} notes`);
    for (const [j, [step, , length]] of bar.entries())
      assert.ok(step + length <= (bar[j + 1]?.[0] ?? 16), `bar ${i}: the note on ${step + 1} runs into the next`);
  }
  const all = HOOK.flat();
  const repeated = all.filter(([step, note], i) => all[i + 1]?.[1] === note && all[i + 1][0] === step + 1);
  assert.ok(repeated.length >= 6, `${repeated.length} fast repeated notes`);
  assert.ok(all.filter(([, , , ornament]) => ornament).length >= 4, 'slides into the long notes');
  assert.ok(!same(HOOK[2], HOOK[0]) && !same(HOOK[6], HOOK[2]) && !same(HOOK[7], HOOK[3]), 'the phrase develops: it is not a two-bar loop');
});

test('the grave follows the bumbo, on the roots of an eight-bar harmony, and slides into the next bar', () => {
  const grave = show.sceneById('grave');
  const notesOf = i => show.hitsInBar(grave.start + (i % grave.bars)).filter(h => h.voice === 'grave');
  const roots = [];
  for (let i = 0; i < grave.bars; i++) {
    const notes = notesOf(i);
    assert.deepEqual(
      notes.slice(0, 2).map(h => h.hit.step),
      BEAT.bumbo.steps,
      `bar ${i}`,
    );
    roots.push(notes[0].hit.tone.split('>')[0]);
    if (i % 2) assert.equal(notes.at(-1).hit.tone.split(/[>:]/)[1], notesOf(i + 1)[0].hit.tone.split('>')[0], `bar ${i} slides into the next root`);
  }
  assert.deepEqual(roots, ['A1', 'Bb1', 'G1', 'A1', 'A1', 'Bb1', 'G1', 'E2']);
  assert.equal(ROOTS.Am, 'A1');
});

test('the quebra drops the drums, stutters the hook and leaves its last beat silent before the pancadão', () => {
  const quebra = show.sceneById('quebra');
  for (let i = 0; i < quebra.bars; i++) {
    assert.equal(stepsOf(quebra.start + i, 'bumbo').length, 0, 'no bumbo in the quebra');
    assert.equal(stepsOf(quebra.start + i, 'grave').length, 0, 'no grave in the quebra');
  }
  const last = show.hitsInBar(quebra.start + quebra.bars - 1);
  assert.ok(last.length > 0);
  for (const h of last) assert.ok(h.hit.step < 12, `${h.voice} on ${h.hit.step + 1}`);
  // and no note rings into it, the riser included
  for (const h of last.filter(h => h.voice === 'flauta')) assert.ok(h.hit.step + Number(h.hit.tone.split(':')[1]) <= 12);
  const riser = show.hitsInBar(quebra.start + quebra.bars - 2).find(h => h.voice === 'teclado' && h.hit.tone.startsWith('subida'));
  assert.equal(riser.hit.step + Number(riser.hit.tone.split(':')[1]), 16 + 12);
  // the pancadão comes back with everything
  assert.equal(show.barTimeline(quebra.start + quebra.bars).playing.length, 8);
  assert.deepEqual(stepsOf(quebra.start + quebra.bars, 'bumbo'), [0, 8]);
});

// Owner limit: a synthesized voice is never one sample repeated unchanged, and all sound is a pure
// function of the show position.
test('the synthesized sounds are deterministic, finite, and each instrument has several different takes', () => {
  const RATE = 44100;
  const synth = BREGAFUNK.sounds.synth;
  const rendered = Object.fromEntries(Object.entries(synth).map(([name, render]) => [name, render(RATE)]));
  for (const [name, samples] of Object.entries(rendered)) {
    assert.ok(samples.length > RATE / 10, `${name} lasts`);
    assert.ok(
      samples.every(value => Number.isFinite(value) && Math.abs(value) <= 1),
      `${name} is finite and inside ±1`,
    );
    assert.ok(Math.abs(samples.at(-1)) < 0.01, `${name} ends in silence`);
  }
  assert.deepEqual([...synth['bf-bumbo-1'](RATE)], [...rendered['bf-bumbo-1']], 'the same sound every time');
  for (const [voice, takes] of Object.entries(SYNTH_TAKES)) {
    for (const take of takes) assert.ok(rendered[take.file], `${voice}: ${take.file} is synthesized`);
    if (voice === 'riser') continue; // one riser, played once
    const [first, second] = takes.filter(take => take.root === takes[0].root);
    assert.ok(second, `${voice} has more than one take`);
    assert.notDeepEqual([...rendered[first.file]], [...rendered[second.file]], `${voice}: two takes differ`);
  }
  // every file the studio voices name is a recorded take the page can fetch or a synthesized sound
  for (const [voice, spec] of Object.entries(BREGAFUNK.sounds.studio.voices))
    for (const list of Object.values(spec.strokes({})))
      for (const take of list) assert.ok(synth[take.file] || ALL_FILES.has(take.file), `${voice}: ${take.file}`);
});

test('the background flashes at most 3 times in any second (WCAG 2.3.1)', () => {
  const FPS = 30;
  const layer = createBregafunkBackground();
  const noop = () => {};
  const ctx = new Proxy({}, { get: (_target, key) => (key === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop), set: () => true });
  const geometry = { width: 400, height: 800, centreX: 200, centreY: 330, scopeRadius: 120, dpr: 1, shapes: [] };
  for (let frame = 0; frame < show.TOTAL_SECONDS * FPS; frame++) {
    const time = frame / FPS,
      position = time / meterOf(BREGAFUNK).barSeconds;
    const recent = show.recentHits(position, 1.2);
    layer.draw(ctx, {
      ...geometry,
      position,
      params: { sceneId: show.sceneAt(Math.floor(position)).id },
      recent,
      time,
      step: 1 / FPS,
      fresh: frame === 0,
      energy: show.energyOf(recent),
      flow: show.flowAt(position),
    });
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
  const layer = createBregafunkBackground(),
    { barSeconds } = meterOf(BREGAFUNK);
  const geometry = { width: 400, height: 800, centreX: 200, centreY: 330, scopeRadius: RADIUS, dpr: 1, shapes: [] };
  for (const id of ['tamborzao', 'drop']) {
    const scene = show.sceneById(id);
    for (let frame = 0; frame < scene.bars * barSeconds * FPS; frame++) {
      const time = scene.start * barSeconds + frame / FPS,
        position = time / barSeconds;
      const recent = show.recentHits(position, 1.2);
      layer.draw(ctx, {
        ...geometry,
        position,
        params: { sceneId: id },
        recent,
        time,
        step: 1 / FPS,
        fresh: frame === 0,
        energy: show.energyOf(recent),
        flow: show.flowAt(position),
      });
    }
  }
  assert.ok(darkest >= 3, `the wheel's purple at ${darkest.toFixed(2)}:1`);
  assert.ok(innermostRing > RADIUS, 'the gold and leather rings are born outside the wheel');
});

test('the wheel leans on alternate beats and swells on the bumbo, by position alone', () => {
  const still = BREGAFUNK.wheelMotion(0, []);
  assert.deepEqual(still, { rotate: 0, scale: 1 });
  // at 170 the hips lean on alternate beats: one way over beats 1 and 2, the other over 3 and 4
  const lean = BREGAFUNK.wheelMotion(1 / 4, []);
  assert.ok(lean.rotate > 0);
  assert.ok(BREGAFUNK.wheelMotion(1 / 8, []).rotate > 0, 'the second beat keeps the lean');
  assert.ok(BREGAFUNK.wheelMotion(3 / 4, []).rotate < 0, 'beats 3 and 4 lean the other way');
  const swell = BREGAFUNK.wheelMotion(2, [{ voice: 'bumbo', hit: { velocity: 1 }, age: 0 }]);
  assert.ok(swell.scale > 1);
});

// The engine takes a rhythm package; a path `/<id>` or `?ritmo=<id>` picks one (the 2/4 fixture is tests-only).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { meterOf } from '../src/music.js';
import { FORRO_PE_DE_SERRA } from '../src/rhythms/forro.js';
import { FREVO } from '../src/rhythms/frevo.js';
import { preparingIds, RHYTHM, RHYTHMS, ROUTES, redirectFor, rhythmChoices, rhythmFor } from '../src/rhythms/index.js';
import { MARACATU } from '../src/rhythms/maracatu.js';
import { createShow } from '../src/show.js';
import { TWO_FOUR } from './support/rhythm-two-four.js';

const BOTH = [MARACATU, TWO_FOUR];

test('the site ships maracatu, the coco, frevo, forró, manguebeat, brega and bregafunk, and shows maracatu by default', () => {
  assert.deepEqual(
    RHYTHMS.map(rhythm => rhythm.id),
    ['maracatu', 'coco', 'frevo', 'forro', 'manguebeat', 'brega', 'bregafunk'],
  );
  assert.equal(RHYTHM, MARACATU);
});

test('?ritmo=<id> picks a rhythm; an unknown or missing id falls back to maracatu', () => {
  assert.equal(rhythmFor('?ritmo=dois-por-quatro', BOTH), TWO_FOUR);
  assert.equal(rhythmFor('?ritmo=frevo', BOTH), MARACATU);
  assert.equal(rhythmFor('', BOTH), MARACATU);
  assert.equal(rhythmFor('?ritmo=dois-por-quatro'), MARACATU); // not shipped
  assert.equal(rhythmFor('?ritmo=forro'), FORRO_PE_DE_SERRA);
});

test('a path /<id> picks a rhythm, and wins over ?ritmo=', () => {
  assert.equal(rhythmFor('', RHYTHMS, '/forro'), FORRO_PE_DE_SERRA);
  assert.equal(rhythmFor('?ritmo=maracatu', RHYTHMS, '/forro'), FORRO_PE_DE_SERRA);
  assert.equal(rhythmFor('', RHYTHMS, '/forro.html'), FORRO_PE_DE_SERRA);
  assert.equal(rhythmFor('', RHYTHMS, '/frevo'), FREVO);
  assert.equal(rhythmFor('', RHYTHMS, '/brega').id, 'brega');
  assert.equal(rhythmFor('', RHYTHMS, '/nenhum'), MARACATU);
  assert.equal(rhythmFor('', RHYTHMS, '/'), MARACATU);
});

test('seven paths, in the order the owner set; the ones with no package yet are being prepared', () => {
  assert.deepEqual(ROUTES, ['maracatu', 'coco', 'frevo', 'forro', 'manguebeat', 'brega', 'bregafunk']);
  assert.deepEqual(preparingIds(), []);
});

test('?ritmo=<id> of a route redirects to its path and keeps the rest of the query', () => {
  assert.equal(redirectFor('?ritmo=coco'), '/coco');
  assert.equal(redirectFor('?ritmo=frevo&x=1'), '/frevo?x=1');
  assert.equal(redirectFor('?ritmo=desconhecido'), null);
  assert.equal(redirectFor(''), null);
});

test('the paths that were live before the rename move to the new ones, the query kept (#37)', () => {
  assert.equal(redirectFor('', ROUTES, '/brega-funk'), '/bregafunk');
  assert.equal(redirectFor('?x=1', ROUTES, '/brega-romantico.html'), '/brega?x=1');
  assert.equal(redirectFor('?ritmo=brega-funk'), '/bregafunk');
  assert.equal(redirectFor('?ritmo=brega-romantico&x=1'), '/brega?x=1');
  assert.equal(redirectFor('', ROUTES, '/bregafunk'), null);
  assert.equal(rhythmFor('', RHYTHMS, '/brega-funk').id, 'bregafunk');
});

test('the selector has no entry with one route, and one link per route with two or more', () => {
  assert.deepEqual(rhythmChoices('maracatu', [MARACATU], ['maracatu']), []);
  assert.deepEqual(rhythmChoices('dois-por-quatro', BOTH, ['maracatu', 'dois-por-quatro']), [
    { id: 'maracatu', label: 'maracatu', href: '/maracatu', current: false },
    { id: 'dois-por-quatro', label: 'dois por quatro', href: '/dois-por-quatro', current: true },
  ]);
  assert.deepEqual(
    rhythmChoices('frevo').map(choice => [choice.label, choice.href, choice.current]),
    [
      ['maracatu', '/maracatu', false],
      ['coco', '/coco', false],
      ['frevo', '/frevo', true],
      ['forró', '/forro', false],
      ['manguebeat', '/manguebeat', false],
      ['brega', '/brega', false],
      ['bregafunk', '/bregafunk', false],
    ],
  );
});

test('a 2/4 rhythm runs on an 8-step bar, one bar per turn, with its own tempo and swing', () => {
  const meter = meterOf(TWO_FOUR);
  assert.equal(meter.stepsPerBar, 8);
  assert.equal(meter.barSeconds, 1.2);
  assert.equal(meter.swingOffset('main', 1, true), 0.08);
  assert.equal(meter.swingOffset('agogo', 1, true), 0);
  const show = createShow(TWO_FOUR);
  assert.equal(show.TOTAL_BARS, 5);
  assert.equal(show.TOTAL_SECONDS, 6);
  assert.deepEqual(
    show.hitsInBar(0).map(h => h.voice),
    ['main', 'main', 'main', 'answer'],
  );
  for (let bar = 0; bar < show.TOTAL_BARS; bar++)
    for (const h of show.hitsInBar(bar)) assert.ok(h.grid >= bar && h.grid < bar + 1, `${h.voice} at ${h.grid} is outside bar ${bar}`);
  assert.equal(show.sceneAt(2).id, 'roda');
  assert.deepEqual(show.barTimeline(3).playing, ['main', 'answer', 'agogo']);
});

// One scene leads into the next as a band does, never cold on the bar line (docs/product.md, Rhythm
// shows; #46). The maracatu is outside the rule. A show whose round-two rewrite has not landed keeps
// the cold boundaries it has today: its list only shrinks, and its rewrite (#47) empties it.
const COLD_BOUNDARIES = {
  coco: ['toque>rufo'],
  frevo: ['introducao>surdo', 'surdo>caixa', 'caixa>pandeiro', 'palhetas>metais', 'metais>la-e-ca', 'fotografia>final'],
  forro: ['triangulo>zabumba', 'zabumba>bacalhau', 'sanfona>baixo', 'rabeca>fole', 'fole>baiao'],
  manguebeat: ['introducao>celula', 'guitarra>dub', 'dub>retorno', 'conversa>corte', 'corte>segunda'],
  brega: ['introducao>base', 'base>baixo', 'guitarra>virada', 'virada>refrao'],
  bregafunk: ['tema>bumbo', 'bumbo>lata', 'lata>palmas', 'batida>tamborzao', 'tamborzao>quebra', 'quebra>drop'],
};

test('no show but the maracatu gains a scene that arrives cold on the bar line', () => {
  const others = RHYTHMS.filter(rhythm => rhythm !== MARACATU);
  assert.deepEqual(others.map(rhythm => rhythm.id).sort(), Object.keys(COLD_BOUNDARIES).sort());
  for (const rhythm of others) {
    const cold = createShow(rhythm)
      .boundaries()
      .filter(boundary => boundary.cold)
      .map(boundary => `${boundary.from}>${boundary.to}`);
    assert.deepEqual(cold, COLD_BOUNDARIES[rhythm.id], `${rhythm.id}: declare how the scene is entered (leadIn), or shorten its list when one is fixed`);
  }
});

test('the coco declares the rufada that leads into each scene but the Rufo', () => {
  const coco = RHYTHMS.find(rhythm => rhythm.id === 'coco');
  const entered = createShow(coco).boundaries();
  assert.deepEqual(
    entered.map(boundary => boundary.leadIn),
    ['fill', 'fill', 'fill', 'fill', 'fill', 'fill', 'fill', 'fill', 'fill', 'fill', null, 'fill'],
  );
});

// Each show's musical graphics belong to its own instruments (docs/product.md, Rhythm shows; #49):
// no two shows share a graphic, and the shows that still draw only the maracatu's set are listed
// here. The list only shrinks: each show leaves it with its own issue.
const WITHOUT_GRAPHICS = ['coco', 'bregafunk'];

test('no two shows share a graphic of their own, and no show joins the ones without any', () => {
  const others = RHYTHMS.filter(rhythm => rhythm !== MARACATU);
  assert.deepEqual(
    others.filter(rhythm => !rhythm.graphics).map(rhythm => rhythm.id),
    WITHOUT_GRAPHICS,
  );
  const ids = others.flatMap(rhythm => rhythm.graphics?.ids ?? []);
  assert.deepEqual([...new Set(ids)], ids, 'a graphic id is used twice');
  for (const rhythm of others.filter(rhythm => rhythm.graphics)) {
    assert.ok(rhythm.graphics.ids.length >= 2, `${rhythm.id} has at least two graphics of its own`);
    assert.equal(typeof rhythm.graphics.create, 'function');
    assert.ok(rhythm.copy.graphics.label.length > 0, `${rhythm.id} names what its graphics show`);
  }
  assert.equal(MARACATU.graphics, undefined); // the wheel, the lanes and the score are its own set
});

// ---------- every rhythm's own background follows the music (#63) ----------
// Each painter is drawn on a canvas that records every call, with the frame the engine hands it.
const PAINTED = RHYTHMS.filter(rhythm => rhythm.background);
const STAGE = { width: 400, height: 800, centreX: 200, centreY: 330, scopeRadius: 120, dpr: 1, shapes: [] };
const HALF_SECOND = 0.5;
const motion = { matches: false }; // the reduced-motion setting every painter reads
globalThis.matchMedia = () => motion;

/** What one frame draws at `position`: every canvas call with its arguments. `values` replaces the engine's energy and clock. */
function drawn(rhythm, position, values = {}) {
  const show = createShow(rhythm),
    meter = meterOf(rhythm),
    calls = [];
  const record =
    name =>
    (...shape) => {
      calls.push([name, ...shape]);
    };
  const gradient = { addColorStop: record('stop') };
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) =>
        key.startsWith('create')
          ? (...shape) => {
              record(key)(...shape);
              return gradient;
            }
          : record(key),
      set: (_target, key, value) => {
        if (typeof value !== 'object') calls.push([key, value]);
        return true;
      },
    },
  );
  const layer = rhythm.background.create({ stepsPerBar: meter.stepsPerBar, angleOf: step => (step / meter.stepsPerBar) * Math.PI * 2 }),
    blend = show.blendAt(position, 1.5),
    bar = Math.floor(position),
    recent = show.recentHits(position, 1.2);
  layer.draw(ctx, {
    ...STAGE,
    position,
    totalBars: show.TOTAL_BARS,
    params: { from: rhythm.looks[blend.from.id], to: rhythm.looks[blend.to.id], mix: blend.amount, sceneId: blend.scene.id },
    recent,
    time: position * meter.barSeconds,
    step: 1 / 30,
    fresh: true,
    mode: blend.scene.mode(bar - blend.scene.start),
    barStart: bar,
    energy: show.energyOf(recent),
    flow: show.flowAt(position),
    ...values,
  });
  return calls;
}
const middleOf = scene => scene.start + scene.bars / 2 + 0.31; // off the beat, where nothing has just been hit

test('every show but the maracatu paints its own background', () => {
  assert.deepEqual(
    RHYTHMS.filter(rhythm => !rhythm.background).map(rhythm => rhythm.id),
    ['maracatu'],
  );
});

test('with motion on, the background of every scene of every show moves', () => {
  for (const rhythm of PAINTED) {
    const show = createShow(rhythm),
      { barSeconds } = meterOf(rhythm);
    for (const scene of show.SCENES) {
      const position = Math.min(middleOf(scene), scene.start + scene.bars - HALF_SECOND / barSeconds);
      assert.notDeepEqual(drawn(rhythm, position), drawn(rhythm, position + HALF_SECOND / barSeconds / 2), `${rhythm.id}, ${scene.id}`);
    }
  }
});

test('every background moves by the energy clock and by the energy, with nothing else changed', () => {
  for (const rhythm of PAINTED) {
    const position = middleOf(createShow(rhythm).SCENES.at(-2));
    assert.notDeepEqual(
      drawn(rhythm, position, { energy: 0.5, flow: 20 }),
      drawn(rhythm, position, { energy: 0.5, flow: 20.4 }),
      `${rhythm.id}: the energy clock`,
    );
    assert.notDeepEqual(drawn(rhythm, position, { energy: 0.1, flow: 20 }), drawn(rhythm, position, { energy: 0.9, flow: 20 }), `${rhythm.id}: the energy`);
  }
});

test('a frame with no energy and no clock, or in silence, still draws: no shape at a place that is not a number', () => {
  for (const rhythm of PAINTED) {
    const position = middleOf(createShow(rhythm).SCENES[1]);
    for (const values of [
      { energy: undefined, flow: undefined },
      { energy: 0, flow: 0, recent: [] },
    ])
      for (const [name, ...shape] of drawn(rhythm, position, values))
        for (const value of shape) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${rhythm.id}: ${name}(${shape})`);
  }
});

test('with reduced motion, the energy and its clock move nothing', () => {
  motion.matches = true;
  try {
    for (const rhythm of PAINTED) {
      const position = middleOf(createShow(rhythm).SCENES.at(-2));
      assert.deepEqual(drawn(rhythm, position, { energy: 0.1, flow: 20 }), drawn(rhythm, position, { energy: 0.9, flow: 31.7 }), rhythm.id);
    }
  } finally {
    motion.matches = false;
  }
});

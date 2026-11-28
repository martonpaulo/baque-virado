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

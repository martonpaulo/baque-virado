import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COPY } from '../src/copy.js';
import { BAQUE_ORDER, barHits, PATTERNS, patternHits, VOICE_ORDER } from '../src/music.js';
import { sceneById } from '../src/show.js';

const steps = hits => hits.map(h => h.step);
const playingVoices = bar => VOICE_ORDER.filter(voice => bar[voice].length > 0);

test("a 'call' bar has only whistle hits", () => {
  const opening = sceneById('opening');
  assert.equal(opening.mode(0), 'call');
  assert.deepEqual(playingVoices(barHits(opening, 0)), ['whistle']);
});

test("a 'roll' bar plays exactly one recorded roll on the caixa alone", () => {
  const opening = sceneById('opening');
  assert.equal(opening.mode(1), 'roll');
  const bar = barHits(opening, 1);
  assert.deepEqual(playingVoices(bar), ['caixa']);
  assert.equal(bar.caixa.filter(h => h.tone === 'roll').length, 1);
});

test('a non-final cut brings the caixa back on steps 13-15; the final cut does not', () => {
  const imale = sceneById('imale'),
    finale = sceneById('finale');
  assert.equal(imale.mode(3), 'cut');
  assert.equal(finale.mode(2), 'cut');
  assert.deepEqual(steps(barHits(imale, 3).caixa), [0, 13, 14, 15]);
  assert.deepEqual(steps(barHits(finale, 2).caixa), [0]);
});

test("a 'break' bar plays the virada with one whistle blow", () => {
  const marcacao = sceneById('marcacao');
  assert.equal(marcacao.mode(3), 'break');
  const bar = barHits(marcacao, 3);
  assert.deepEqual(steps(bar.main), PATTERNS.virada.main);
  assert.deepEqual(steps(bar.answer), PATTERNS.virada.answer);
  assert.equal(bar.whistle.length, 1);
});

test('every baque has a pattern and copy', () => {
  for (const id of BAQUE_ORDER) {
    assert.ok(PATTERNS[id], `no pattern for ${id}`);
    assert.ok(COPY.patterns[id], `no pattern copy for ${id}`);
    assert.ok(COPY.scenes[id], `no scene copy for ${id}`);
  }
});

test('parada spans two bars, with stick hits on 4, 8 and 12 of the second', () => {
  assert.equal(PATTERNS.parada.bars, 2);
  assert.deepEqual(steps(patternHits('parada', 0).stick), []);
  assert.deepEqual(steps(patternHits('parada', 1).stick), [4, 8, 12]);
});

test('the page counts five drumming instruments, not their seven voices', async () => {
  const { INSTRUMENT_COUNT, INSTRUMENTS } = await import('../src/music.js');
  const { COPY } = await import('../src/copy.js');
  assert.equal(INSTRUMENT_COUNT, 5);
  assert.equal(INSTRUMENTS.length, 7);
  assert.match(COPY.scenes.ensemble.eyebrow, /^5 instrumentos$/);
  assert.match(COPY.controls.facts(7, 54, '1:52'), / 5 instrumentos /);
});

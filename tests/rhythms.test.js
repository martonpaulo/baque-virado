// The engine takes a rhythm package, and `?ritmo=<id>` picks one (the 2/4 fixture is tests-only).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { meterOf } from '../src/music.js';
import { RHYTHM, RHYTHMS, rhythmFor } from '../src/rhythms/index.js';
import { MARACATU } from '../src/rhythms/maracatu.js';
import { createShow } from '../src/show.js';
import { TWO_FOUR } from './support/rhythm-two-four.js';

const BOTH = [MARACATU, TWO_FOUR];

test('the site ships one rhythm, maracatu, and shows it by default', () => {
  assert.deepEqual(
    RHYTHMS.map(rhythm => rhythm.id),
    ['maracatu'],
  );
  assert.equal(RHYTHM, MARACATU);
});

test('?ritmo=<id> picks a rhythm; an unknown or missing id falls back to maracatu', () => {
  assert.equal(rhythmFor('?ritmo=dois-por-quatro', BOTH), TWO_FOUR);
  assert.equal(rhythmFor('?ritmo=frevo', BOTH), MARACATU);
  assert.equal(rhythmFor('', BOTH), MARACATU);
  assert.equal(rhythmFor('?ritmo=dois-por-quatro'), MARACATU); // not shipped
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

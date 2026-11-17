import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { installRecordingContext, namedBank } from './support/recording-context.js';

// The maracatu show must sound exactly as it did before the studio engine (src/studio.js): the same samples,
// at the same times, rates and levels. The digest was taken from the render before that change.
const MARACATU_DIGEST = '591568e292401e1cb0b3dbbcdee8faaf0466e1dde840be31d446a03529407852';

test('the maracatu render is unchanged', async () => {
  const log = installRecordingContext();
  const { renderShowWav, DEFAULT_CHOICES } = await import('../src/audio.js');
  await renderShowWav(namedBank, DEFAULT_CHOICES, 0.5);
  const text = log.map(e => `${e.name}|${e.time.toFixed(6)}|${e.rate.toFixed(6)}|${e.level.toFixed(6)}`).join('\n');
  assert.ok(log.length > 1000, `only ${log.length} hits`);
  assert.equal(createHash('sha256').update(text).digest('hex'), MARACATU_DIGEST);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keyVoices } from '../src/lanes.js';
import { VOICES } from '../src/music.js';
import { barTimeline, sceneAt, TOTAL_BARS } from '../src/show.js';

// #12: every dot colour the wheel draws is named on the stage, by a lane row or by the key.
test('every voice the wheel draws is a lane row or in the key, never both', () => {
  const unnamed = [];
  for (let bar = 0; bar < TOTAL_BARS; bar++) {
    const rows = sceneAt(bar).lanes,
      key = keyVoices(bar);
    const drawn = Object.entries(barTimeline(bar).voices)
      .filter(([voice, hits]) => VOICES[voice].ring && hits.length > 0)
      .map(([voice]) => voice);
    for (const voice of drawn) if (!rows.includes(voice) && !key.includes(voice)) unnamed.push(`${bar}: ${voice}`);
    assert.deepEqual(
      key.filter(voice => rows.includes(voice)),
      [],
    );
  }
  assert.deepEqual(unnamed, []);
});

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ALL_SOUND_FILES, DEFAULT_CHOICES, filesFor, SOUND_CHOICES } from '../src/audio.js';

const soundsDir = new URL('../sounds/', import.meta.url);
const missingFiles = names => names.filter(name => !existsSync(fileURLToPath(new URL(`${name}.wav`, soundsDir))));

test('every sound file the page can fetch exists', () => {
  assert.deepEqual(missingFiles(ALL_SOUND_FILES), []);
});

test('every default sound is one of its options', () => {
  for (const choice of SOUND_CHOICES) {
    const options = choice.options.map(([option]) => option);
    assert.ok(options.includes(DEFAULT_CHOICES[choice.id]), `${choice.id}: default ${DEFAULT_CHOICES[choice.id]} is not an option`);
  }
});

// Phones download only these, so keep the default set small and present.
test('the default choices need 11 files, all present and known', () => {
  const files = filesFor(DEFAULT_CHOICES);
  assert.equal(files.length, 11);
  assert.deepEqual(missingFiles(files), []);
  assert.deepEqual(
    files.filter(name => !ALL_SOUND_FILES.includes(name)),
    [],
  );
});

import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ALL_SOUND_FILES, DEFAULT_CHOICES, filesFor, isHeard, SOUND_CHOICES, SOUND_EXTENSION, visualOf } from '../src/audio.js';

const soundsDir = new URL('../sounds/', import.meta.url);
const pathOf = (name, extension) => fileURLToPath(new URL(`${name}${extension}`, soundsDir));
const missingFiles = (names, extension = SOUND_EXTENSION) => names.filter(name => !existsSync(pathOf(name, extension)));
const PHONE_BYTES = 100_000; // #3: what a phone downloads before Play

test('the page fetches AAC', () => {
  assert.equal(SOUND_EXTENSION, '.m4a');
});

test('every sound file the page can fetch exists, beside its WAV master', () => {
  assert.equal(ALL_SOUND_FILES.length, 31);
  assert.deepEqual(missingFiles(ALL_SOUND_FILES), []);
  assert.deepEqual(missingFiles(ALL_SOUND_FILES, '.wav'), []);
});

test('every default sound is one of its options', () => {
  for (const choice of SOUND_CHOICES) {
    const options = choice.options.map(([option]) => option);
    assert.ok(options.includes(DEFAULT_CHOICES[choice.id]), `${choice.id}: default ${DEFAULT_CHOICES[choice.id]} is not an option`);
  }
});

// Phones download only these, so keep the default set small and present.
test('the default choices need 11 files, all present and known, under 100 KB in all', () => {
  const files = filesFor(DEFAULT_CHOICES);
  assert.equal(files.length, 11);
  assert.deepEqual(missingFiles(files), []);
  assert.deepEqual(
    files.filter(name => !ALL_SOUND_FILES.includes(name)),
    [],
  );
  const bytes = files.reduce((sum, name) => sum + statSync(pathOf(name, SOUND_EXTENSION)).size, 0);
  assert.ok(bytes < PHONE_BYTES, `the default samples weigh ${bytes} bytes`);
});

test('every sound lists its default option first', async () => {
  const { SOUND_CHOICES } = await import('../src/audio.js');
  for (const sound of SOUND_CHOICES) assert.equal(sound.options[0][0], sound.defaultOption, sound.id);
});

// A volume belongs to an instrument (VOICES[voice].instrument): muting it silences every voice of it.
test('an instrument’s volume reaches every voice of that instrument, and only those', async () => {
  const { VOICE_ORDER, VOICES } = await import('../src/music.js');
  for (const sound of SOUND_CHOICES) {
    const volume = { [sound.id]: 'mute' };
    for (const voice of VOICE_ORDER) {
      const own = VOICES[voice].instrument === sound.id;
      assert.equal(isHeard(volume, voice), !own, `${voice} with ${sound.id} muted`);
      assert.equal(visualOf(volume, voice) < 1, own, `${voice} drawn with ${sound.id} muted`);
    }
  }
});

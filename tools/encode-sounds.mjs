#!/usr/bin/env node
// Encode every sounds/<name>.wav to sounds/<name>.m4a: AAC-LC at 96 kbps, which the page fetches (#3).
// The WAVs stay as the masters; run this again after a WAV changes.
// Usage: node tools/encode-sounds.mjs   (needs ffmpeg; set FFMPEG_PATH when it is not on PATH)
//
// The MP4 muxer writes an edit list that skips the AAC encoder's priming samples, so a decoder that
// honours it (Chrome, Safari) starts each sample on the same audio frame as the WAV;
// tests/sounds-decode.test.js checks that in Chromium.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOUNDS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'sounds');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
// Pinned: change these only together with a fresh encode of every file.
const ENCODE_ARGS = ['-c:a', 'aac', '-b:a', '96k', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', '-movflags', '+faststart'];

const names = readdirSync(SOUNDS)
  .filter(file => file.endsWith('.wav'))
  .map(file => file.slice(0, -'.wav'.length));
for (const name of names) {
  const result = spawnSync(
    FFMPEG,
    ['-nostdin', '-loglevel', 'error', '-y', '-i', path.join(SOUNDS, `${name}.wav`), ...ENCODE_ARGS, path.join(SOUNDS, `${name}.m4a`)],
    {
      stdio: 'inherit',
    },
  );
  if (result.status !== 0) {
    console.error(`encode-sounds: ffmpeg failed on ${name}.wav`);
    process.exit(1);
  }
}
console.log(`encode-sounds: ${names.length} files encoded`);

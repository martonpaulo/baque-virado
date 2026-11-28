// The sound lab's renderer runs on the browser the repository pins, with nothing installed beside it.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parseArguments } from '../lab/render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WAV_HEADER_BYTES = 44;

test('the renderer reads an output file, a rhythm and its options, and refuses anything else', () => {
  assert.deepEqual(parseArguments(['out.wav', 'forro']), { out: 'out.wav', id: 'forro', options: {} });
  assert.deepEqual(parseArguments(['out.wav', 'forro', '--from', '60', '--to', '76', '--only', 'sanfona']), {
    out: 'out.wav',
    id: 'forro',
    options: { from: '60', to: '76', only: 'sanfona' },
  });
  assert.equal(parseArguments([]), null);
  assert.equal(parseArguments(['out.wav']), null);
  assert.equal(parseArguments(['out.wav', 'forro', '--from']), null); // an option with no value
  assert.equal(parseArguments(['out.wav', 'forro', '--bars', '2']), null); // an unknown option
  assert.equal(parseArguments(['/a/checkout', 'out.wav', 'forro']), null); // the old form, with the root first
});

test('the renderer writes one bar of a show as a WAV through the page', async () => {
  const folder = mkdtempSync(path.join(tmpdir(), 'batuque-render-'));
  try {
    const out = path.join(folder, 'bar.wav');
    const { stdout } = await promisify(execFile)(process.execPath, ['lab/render.mjs', out, 'coco', '--from', '4', '--to', '5'], { cwd: ROOT });
    assert.match(stdout, /^coco -> .*bar\.wav in /);
    const wav = readFileSync(out);
    assert.equal(wav.subarray(0, 4).toString('latin1'), 'RIFF');
    assert.equal(wav.subarray(8, 12).toString('latin1'), 'WAVE');
    const samples = new Int16Array(wav.buffer, wav.byteOffset + WAV_HEADER_BYTES, (wav.length - WAV_HEADER_BYTES) >> 1);
    assert.ok(
      samples.some(sample => Math.abs(sample) > 1000),
      'the bar holds sound, not silence',
    );
  } finally {
    rmSync(folder, { recursive: true });
  }
});

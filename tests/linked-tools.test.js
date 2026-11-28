// Every command-line tool runs when it is called through a linked folder. Found while rendering a copy
// of the repository under macOS's /tmp, a link to /private/tmp (#60): each tool compared the path it
// was called by with its file's real path, so it did nothing there and ended with status 0.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

const folder = mkdtempSync(path.join(tmpdir(), 'linked-tools-')),
  linked = path.join(folder, 'repository');
symlinkSync(path.resolve(import.meta.dirname, '..'), linked, 'dir');
after(() => rmSync(folder, { recursive: true }));

// a command line each tool refuses: only a tool that ran says so
const REFUSED = [
  { tool: 'tools/render-stage.mjs', words: ['--out'], status: 2, says: /render-stage: --out needs a folder/ },
  { tool: 'tools/build-site.mjs', words: [], status: 1, says: /usage: node tools\/build-site\.mjs/ },
  { tool: 'lab/motion.mjs', words: [], status: 2, says: /usage: node lab\/motion\.mjs/ },
  { tool: 'lab/render.mjs', words: [], status: 2, says: /usage: node lab\/render\.mjs/ },
];
for (const { tool, words, status, says } of REFUSED)
  test(`${tool} runs when called through a linked folder`, () => {
    const run = spawnSync(process.execPath, [path.join(linked, tool), ...words], { encoding: 'utf8' });
    assert.equal(run.status, status, run.stderr);
    assert.match(run.stderr, says);
  });

test('tools/static-server.mjs serves when called through a linked folder', async () => {
  const server = spawn(process.execPath, [path.join(linked, 'tools', 'static-server.mjs'), '0']);
  try {
    const said = await new Promise((resolve, reject) => {
      server.stdout.once('data', chunk => resolve(String(chunk)));
      server.once('exit', code => reject(new Error(`the server ended with status ${code} and said nothing`)));
    });
    assert.match(said, /^serving .+ at http:/);
  } finally {
    server.kill();
  }
});

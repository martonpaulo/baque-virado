import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { startStaticServer } from '../tools/static-server.mjs';

// Raw requests: fetch would normalise `..` and refuses a custom Host header.
const get = (url, rawPath, host) =>
  new Promise((resolve, reject) => {
    const { hostname, port } = new URL(url);
    const req = request({ hostname, port, path: rawPath, headers: host ? { Host: host } : {} }, response => {
      response.resume();
      resolve(response.statusCode);
    });
    req.on('error', reject);
    req.end();
  });

test('the local server serves only its root, by name, and no hidden folder', async () => {
  const parent = mkdtempSync(path.join(os.tmpdir(), 'baque-server-'));
  const root = path.join(parent, 'site');
  mkdirSync(path.join(root, '.git'), { recursive: true });
  mkdirSync(path.join(parent, 'site-private'));
  writeFileSync(path.join(root, 'index.html'), 'ok');
  writeFileSync(path.join(root, '.git', 'config'), 'secret');
  writeFileSync(path.join(parent, 'site-private', 'note.txt'), 'secret');
  const server = await startStaticServer(root, 0);
  try {
    assert.equal(await get(server.url, '/'), 200);
    assert.equal(await get(server.url, '/..%2Fsite-private%2Fnote.txt'), 403);
    assert.equal(await get(server.url, '/.git/config'), 403);
    assert.equal(await get(server.url, '/', 'attacker.example'), 403);
  } finally {
    await server.close();
    rmSync(parent, { recursive: true, force: true });
  }
});

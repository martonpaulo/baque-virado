// Render a show's audio through the real page (window.baque.renderAudio) to a WAV.
// usage: node render.mjs <repoRoot> <out.wav> <id> [--from BAR] [--to BAR] [--mute a,b] [--only a,b]
//   --mute / --only take instrument ids (the `instrument` of the rhythm's VOICES).
// Starts its own static server on a free port, so several can run at once.

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';

const { chromium } = createRequire(import.meta.url)('playwright');
const [root, out, id, ...rest] = process.argv.slice(2);
const opt = {};
for (let i = 0; i < rest.length; i += 2) opt[rest[i].slice(2)] = rest[i + 1];
const port = await new Promise(r => {
  const s = net.createServer();
  s.listen(0, () => {
    const p = s.address().port;
    s.close(() => r(p));
  });
});
const server = spawn('node', ['tools/static-server.mjs', String(port)], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', e => console.error('pageerror', e.message));
  page.on('console', m => m.type() === 'error' && console.error('console', m.text()));
  await page.goto(`http://127.0.0.1:${port}/?ritmo=${id}`);
  await page.waitForFunction(() => window.baque && typeof window.baque.renderAudio === 'function', null, { timeout: 60000 });
  const t = Date.now();
  const b64 = await page.evaluate(async o => {
    const { VOICES } = await import('/src/music.js');
    const instruments = [...new Set(Object.values(VOICES).map(v => v.instrument))];
    const volume = {};
    if (o.only) for (const i of instruments) if (!o.only.split(',').includes(i)) volume[i] = 'mute';
    if (o.mute) for (const i of o.mute.split(',')) volume[i] = 'mute';
    const options = { volume };
    if (o.from !== undefined) options.fromBar = Number(o.from);
    if (o.to !== undefined) options.toBar = Number(o.to);
    const bytes = new Uint8Array(await window.baque.renderAudio(options));
    let s = '';
    const C = 0x8000;
    for (let i = 0; i < bytes.length; i += C) s += String.fromCharCode.apply(null, bytes.subarray(i, i + C));
    return btoa(s);
  }, opt);
  writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log(`${id} -> ${out} in ${((Date.now() - t) / 1000).toFixed(1)} s`);
} finally {
  await browser.close();
  server.kill();
}

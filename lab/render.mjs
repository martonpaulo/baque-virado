// Render a show's audio through the real page (window.baque.renderAudio) to a WAV.
// usage: node lab/render.mjs <out.wav> <id> [--from BAR] [--to BAR] [--mute a,b] [--only a,b]
//   --mute / --only take instrument ids (the `instrument` of the rhythm's VOICES).
// It opens the browser the page tests use (tests/support/browser.js: the pinned Chrome, or the one
// CHROME_PATH names) on its own static server and a free port, so several can run at once, and it
// serves the checkout this file is in.

import { writeFileSync } from 'node:fs';
import { openBrowser } from '../tests/support/browser.js';

const READY_MS = 60000; // the page fetches and decodes every sample before it can render
const CHUNK = 0x8000; // bytes per String.fromCharCode call, under the engine's argument limit

/** The command line as { out, id, options }: `--name value` pairs after the two positional words. */
export function parseArguments(words) {
  const [out, id, ...rest] = words;
  if (!out || !id || out.startsWith('--') || id.startsWith('--') || rest.length % 2) return null;
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!['--from', '--to', '--mute', '--only'].includes(rest[i])) return null;
    options[rest[i].slice(2)] = rest[i + 1];
  }
  return { out, id, options };
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (!parsed) {
    console.error('usage: node lab/render.mjs <out.wav> <id> [--from BAR] [--to BAR] [--mute a,b] [--only a,b]');
    process.exit(2);
  }
  // no protocol limit, as tools/export-video.mjs sets: a whole show renders in seconds (#58), but in minutes on a
  // browser that cannot suspend an offline render, where the default 180 s would cut it off
  const { server, browser, close } = await openBrowser({ protocolTimeout: 0 });
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => console.error('pageerror', error.message));
    page.on('console', message => message.type() === 'error' && console.error('console', message.text()));
    await page.goto(`${server.url}${parsed.id}`); // the rhythm's own path: `?ritmo=` would redirect there mid-load
    await page.waitForFunction(() => window.baque && typeof window.baque.renderAudio === 'function', { timeout: READY_MS });
    const started = Date.now();
    const base64 = await page.evaluate(
      async (wanted, chunk) => {
        const { VOICES } = await import('/src/music.js');
        const instruments = [...new Set(Object.values(VOICES).map(voice => voice.instrument))];
        const volume = {};
        if (wanted.only) for (const instrument of instruments) if (!wanted.only.split(',').includes(instrument)) volume[instrument] = 'mute';
        if (wanted.mute) for (const instrument of wanted.mute.split(',')) volume[instrument] = 'mute';
        const options = { volume };
        if (wanted.from !== undefined) options.fromBar = Number(wanted.from);
        if (wanted.to !== undefined) options.toBar = Number(wanted.to);
        const bytes = new Uint8Array(await window.baque.renderAudio(options));
        let text = '';
        for (let i = 0; i < bytes.length; i += chunk) text += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        return btoa(text);
      },
      parsed.options,
      CHUNK,
    );
    writeFileSync(parsed.out, Buffer.from(base64, 'base64'));
    console.log(`${parsed.id} -> ${parsed.out} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  } finally {
    await close();
  }
}

// the platform's own flag, never a comparison of paths: called through a linked folder, the path Node
// was given is not the file's real path (tests/linked-tools.test.js)
if (import.meta.main) await main();

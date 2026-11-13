#!/usr/bin/env node
// Render the share image and the home-screen icon from the page itself.
// Usage: node tools/make-images.mjs   (writes social.png and apple-touch-icon.png at the root)
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startStaticServer } from './static-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const SOCIAL = { width: 1200, height: 630 }; // the size Open Graph previews expect
const ICON_SIZE = 180; // apple-touch-icon
const SOCIAL_POSITION = 21.4; // bars: the marcação, with its score and wheel
const SETTLE_MS = 1500;
const WARM_FPS = 30; // the exporter's frame rate
const WARM_FRAMES = 2 * WARM_FPS; // two seconds before the captured frame, so the background trail looks live

const server = await startStaticServer(ROOT, 0);
const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ ...SOCIAL, deviceScaleFactor: 1 });
  await page.goto(server.url, { waitUntil: 'networkidle0' });
  await page.evaluate(
    async (at, frames, fps) => {
      await document.fonts.ready;
      for (let i = 0; i < frames; i++) window.baque.render(at - (frames - i) / fps / window.baque.BAR);
    },
    SOCIAL_POSITION,
    WARM_FRAMES,
    WARM_FPS,
  );
  await new Promise(done => setTimeout(done, SETTLE_MS));
  writeFileSync(path.join(ROOT, 'social.png'), await page.screenshot({ type: 'png' }));

  const icon = await browser.newPage();
  await icon.setViewport({ width: ICON_SIZE, height: ICON_SIZE, deviceScaleFactor: 1 });
  const svg = await page.$eval('link[rel=icon]', link => decodeURIComponent(link.href.split(',')[1]));
  await icon.setContent(`<body style="margin:0;background:#07060b">${svg.replace('<svg ', `<svg width="${ICON_SIZE}" height="${ICON_SIZE}" `)}</body>`);
  writeFileSync(path.join(ROOT, 'apple-touch-icon.png'), await icon.screenshot({ type: 'png' }));
} finally {
  await browser.close();
  await server.close();
}
console.log('wrote social.png and apple-touch-icon.png');

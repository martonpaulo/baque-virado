#!/usr/bin/env node
// Render the share card (the brand, the icon and a frame of the page's stage) and every PNG icon
// from icon.svg (#30).
// Usage: node tools/make-images.mjs   (writes social.png, apple-touch-icon.png and icons/*.png)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startStaticServer } from './static-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const SOCIAL = { width: 1200, height: 630 }; // the size Open Graph previews expect
// Each PNG fallback of icon.svg: the browser tab, the iOS home screen, and the two Android sizes.
const ICONS = [
  { file: 'icons/icon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icons/icon-192.png', size: 192 },
  { file: 'icons/icon-512.png', size: 512 },
];
// shortcut: the share card names the brand the issue gives (#30) while index.html still reads the
// old name; read it from the page once its <title> carries it.
const BRAND = 'Batuque';
const STAGE_HEIGHT = 590; // the stage capture's height in the card; its width follows the stage
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
  const rhythms = await page.evaluate(
    async (at, frames, fps) => {
      // the frame as it plays: no Play overlay and no rhythm selector over the stage
      document.head.insertAdjacentHTML('beforeend', '<style>.tap, .rhythms-stage { display: none !important; }</style>');
      await document.fonts.ready;
      for (let i = 0; i < frames; i++) window.baque.render(at - (frames - i) / fps / window.baque.BAR);
      return [...document.querySelectorAll('.rhythms-side a')].map(link => link.textContent.trim());
    },
    SOCIAL_POSITION,
    WARM_FRAMES,
    WARM_FPS,
  );
  await new Promise(done => setTimeout(done, SETTLE_MS));
  const stage = (await (await page.$('#stage')).screenshot({ type: 'png', encoding: 'base64' })).toString();
  const svg = readFileSync(path.join(ROOT, 'icon.svg'), 'utf8');
  const card = await browser.newPage();
  await card.setViewport({ ...SOCIAL, deviceScaleFactor: 1 });
  await card.goto(server.url, { waitUntil: 'networkidle0' }); // the site's fonts and colours
  await card.evaluate(
    async (brand, rhythms, icon, image, height) => {
      document.body.innerHTML = `<div class="share">${icon}<h1>${brand}</h1><p>${rhythms.map(name => name.replaceAll(' ', '\u00a0')).join(' · ')}</p></div><img src="data:image/png;base64,${image}">`;
      document.head.insertAdjacentHTML(
        'beforeend',
        `<style>
          body { margin: 0; height: 100vh; display: flex; align-items: center; justify-content: space-between; padding: 0 80px; box-sizing: border-box; background: var(--void); overflow: hidden; }
          .share svg { width: 168px; height: 168px; display: block; }
          .share h1 { margin: 32px 0 12px; font: 700 112px/1 var(--f-display); color: var(--fg); letter-spacing: -0.02em; }
          .share p { margin: 0; font: 26px/1.3 var(--f-mono); color: var(--accent); max-width: 560px; }
          img { height: ${height}px; border-radius: 16px; }
        </style>`,
      );
      await document.fonts.ready;
      await document.querySelector('img').decode();
    },
    BRAND,
    rhythms,
    svg,
    stage,
    STAGE_HEIGHT,
  );
  writeFileSync(path.join(ROOT, 'social.png'), await card.screenshot({ type: 'png' }));

  const icon = await browser.newPage();
  mkdirSync(path.join(ROOT, 'icons'), { recursive: true });
  for (const { file, size } of ICONS) {
    await icon.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await icon.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body>`);
    writeFileSync(path.join(ROOT, file), await icon.screenshot({ type: 'png', omitBackground: true }));
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`wrote social.png and ${ICONS.map(icon => icon.file).join(', ')}`);

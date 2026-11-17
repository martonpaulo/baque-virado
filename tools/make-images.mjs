#!/usr/bin/env node
// Render the share cards (the brand, or one rhythm's name, the icon and a frame of the stage) and
// every PNG icon from icon.svg (#30, #31).
// Usage: node tools/make-images.mjs   (writes social.png, social/<id>.png, apple-touch-icon.png and icons/*.png)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { RHYTHMS, ROUTES, rhythmChoices } from '../src/rhythms/index.js';
import { createShow } from '../src/show.js';
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
const BRAND = 'Batuque'; // the site name, as tools/build-site.mjs SITE_NAME
const STAGE_HEIGHT = 590; // the stage capture's height in the card; its width follows the stage
const SOCIAL_POSITION = 21.4; // bars: the marcação, with its score and wheel
const SETTLE_MS = 1500;
const LATE_IN_SCENE = 0.6; // bars before a scene's end: its title has settled
const WARM_FPS = 30; // the exporter's frame rate
const WARM_FRAMES = 2 * WARM_FPS; // two seconds before the captured frame, so the background trail looks live

/** A 1200x630 share card: the icon, a heading and a line beside a frame of the stage of `route` at
 * `position` bars, the background warmed up for two seconds first, as it plays. */
async function shareCard(browser, url, { route, position, heading, line }) {
  const page = await browser.newPage();
  await page.setViewport({ ...SOCIAL, deviceScaleFactor: 1 });
  await page.goto(`${url}${route}`, { waitUntil: 'networkidle0' });
  await page.evaluate(
    async (wanted, frames, fps) => {
      // the frame as it plays: no Play overlay and no rhythm selector over the stage
      document.head.insertAdjacentHTML('beforeend', '<style>.tap, .rhythms-stage { display: none !important; }</style>');
      await document.fonts.ready;
      for (let i = 0; i < frames; i++) window.baque.render(wanted - (frames - i) / fps / window.baque.BAR);
    },
    position,
    WARM_FRAMES,
    WARM_FPS,
  );
  await new Promise(done => setTimeout(done, SETTLE_MS));
  const stage = (await (await page.$('#stage')).screenshot({ type: 'png', encoding: 'base64' })).toString();
  await page.close();
  const svg = readFileSync(path.join(ROOT, 'icon.svg'), 'utf8');
  const card = await browser.newPage();
  await card.setViewport({ ...SOCIAL, deviceScaleFactor: 1 });
  await card.goto(url, { waitUntil: 'networkidle0' }); // the site's fonts and colours
  await card.evaluate(
    async (heading, text, icon, image, height) => {
      document.body.innerHTML = `<div class="share">${icon}<h1>${heading}</h1><p>${text}</p></div><img src="data:image/png;base64,${image}">`;
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
    heading,
    line,
    svg,
    stage,
    STAGE_HEIGHT,
  );
  const png = await card.screenshot({ type: 'png' });
  await card.close();
  return png;
}

const server = await startStaticServer(ROOT, 0, { routes: ROUTES });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', ...(process.getuid?.() === 0 ? ['--no-sandbox'] : [])],
});
try {
  // the site's card: the brand and every rhythm's chip
  const line = rhythmChoices('')
    .map(choice => choice.label.replaceAll(' ', '\u00a0'))
    .join(' · ');
  writeFileSync(path.join(ROOT, 'social.png'), await shareCard(browser, server.url, { route: '', position: SOCIAL_POSITION, heading: BRAND, line }));
  // one card per shipped rhythm (#31): its name over a frame from the middle of its show
  mkdirSync(path.join(ROOT, 'social'), { recursive: true });
  for (const rhythm of RHYTHMS) {
    const name = rhythm.copy.selector || rhythm.copy.name;
    const heading = name.charAt(0).toUpperCase() + name.slice(1);
    // late in the middle scene, so its title has settled and its full texture plays
    const { SCENES } = createShow(rhythm);
    const scene = SCENES[Math.floor(SCENES.length / 2)];
    const position = scene.start + scene.bars - LATE_IN_SCENE;
    writeFileSync(path.join(ROOT, 'social', `${rhythm.id}.png`), await shareCard(browser, server.url, { route: rhythm.id, position, heading, line: BRAND }));
  }

  const svg = readFileSync(path.join(ROOT, 'icon.svg'), 'utf8');
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
console.log(`wrote social.png, social/<id>.png and ${ICONS.map(icon => icon.file).join(', ')}`);

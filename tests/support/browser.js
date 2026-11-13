// Headless Chromium for the browser tests, served by the project's own static server.
import { existsSync } from 'node:fs';
import { computeExecutablePath } from '@puppeteer/browsers';
import puppeteer from 'puppeteer-core';
import { startStaticServer } from '../../tools/static-server.mjs';
import { PINNED_BROWSER } from './pinned-browser.js';

// CHROME_PATH wins; then the pinned browser `node tools/install-browser.mjs` downloads (CI does);
// then a cloud session's Playwright Chromium, the macOS Chrome for Testing the exporter uses, and a
// Linux Chrome or Chromium.
const CANDIDATES = [
  process.env.CHROME_PATH,
  computeExecutablePath(PINNED_BROWSER),
  '/opt/pw-browsers/chromium',
  '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

export function chromePath() {
  const found = CANDIDATES.find(candidate => existsSync(candidate));
  if (!found) throw new Error(`no Chrome or Chromium found; set CHROME_PATH (looked in: ${CANDIDATES.join(', ')})`);
  return found;
}

/** Start the static server and a headless browser; `close()` stops both. */
export async function openBrowser() {
  const server = await startStaticServer();
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  return {
    server,
    browser,
    close: async () => {
      await browser.close();
      await server.close();
    },
  };
}

// The browser the tests pin: Chrome headless shell at the build puppeteer-core 25.17.0 was made for.
// Change it together with puppeteer-core.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PINNED_BROWSER = {
  browser: 'chrome-headless-shell',
  buildId: '157.0.8103.50',
  cacheDir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.scratch', 'browsers'),
};

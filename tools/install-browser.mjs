#!/usr/bin/env node
// Download the pinned Chrome headless shell the browser tests use (#9) into .scratch/browsers and
// print its executable path. CI runs this before `pnpm validate`; tests/support/browser.js finds it.
// Usage: node tools/install-browser.mjs
import { install } from '@puppeteer/browsers';
import { PINNED_BROWSER } from '../tests/support/pinned-browser.js';

const installed = await install({ ...PINNED_BROWSER, unpack: true });
console.log(installed.executablePath);

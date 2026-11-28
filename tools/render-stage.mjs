// Renders of the stage for an interface change, made off screen (#60): a show's scenes, dark (the
// site's one appearance), at a phone's, a desktop's and a large desktop's window, one PNG each, named
// `<show>-<scene>-dark-<small|default|large>.png`, as Workbench's landing script reads them.
//
//   node tools/render-stage.mjs [--out DIR] [SHOT...]
//
// A SHOT is `<show>` (each scene of the show, half a bar in), `<show>:<scene>` or
// `<show>:<scene>+<bars>` (that many bars into the scene; `+-0.1` is before its start), and a `!` at
// its end draws it with reduced motion. With no SHOT: each scene of every show.
// DIR is by default the folder the landing script names for the change of this checkout
// (`render_evidence.py dir`, read from the Workbench checkout WORKBENCH names, else the one beside
// this repository), so commit the change first: the folder is named for the committed change.
// Exit status: 0 done, 1 a page failed, 2 a usage error.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RHYTHMS } from '../src/rhythms/index.js';
import { createShow } from '../src/show.js';
import { openBrowser } from '../tests/support/browser.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHONE = 2,
  DESKTOP = 1; // device pixels per CSS pixel: a phone's screen is dense, and its small text is read from the render
/** The three windows of an interface change: the smallest, the default and a large one. */
export const SIZES = {
  small: { width: 375, height: 667, deviceScaleFactor: PHONE },
  default: { width: 1440, height: 900, deviceScaleFactor: DESKTOP },
  large: { width: 1920, height: 1200, deviceScaleFactor: DESKTOP },
};
const APPEARANCE = 'dark'; // the site's one appearance
const MID_BAR = 0.5; // bars into a scene, where a SHOT names none
const RUN_UP = { frames: 12, perBar: 240 }; // frames drawn up to the position, so the background has its trail whatever was drawn before
const READY_MS = 120000; // a loaded machine takes up to a minute to open a page
const FAILED = 1,
  USAGE = 2; // exit statuses

/** `<show>[:<scene>[+<bars>]][!]` as the renders it asks for; throws a message for one it cannot read. */
export function shotsOf(text, rhythms = RHYTHMS) {
  const still = text.endsWith('!'),
    [id, where] = (still ? text.slice(0, -1) : text).split(':'),
    rhythm = rhythms.find(candidate => candidate.id === id);
  if (!rhythm) throw new Error(`no show «${id}»: one of ${rhythms.map(candidate => candidate.id).join(', ')}`);
  const { SCENES } = createShow(rhythm);
  if (!where) return SCENES.map(scene => ({ show: id, name: scene.id, at: scene.start + MID_BAR, still }));
  const [sceneId, bars] = where.split('+'),
    scene = SCENES.find(candidate => candidate.id === sceneId),
    offset = bars === undefined ? MID_BAR : Number(bars);
  if (!scene) throw new Error(`the ${id} has no scene «${sceneId}»: one of ${SCENES.map(candidate => candidate.id).join(', ')}`);
  if (bars === '' || Number.isNaN(offset)) throw new Error(`«${bars}» is not a number of bars`);
  return [{ show: id, name: bars === undefined ? sceneId : `${sceneId}+${bars}`, at: scene.start + offset, still }];
}

/** The file a render is written to: the landing script reads its appearance and its size from the end of the name. */
export const fileName = (shot, size) => `${shot.show}-${shot.name}${shot.still ? '-still' : ''}-${APPEARANCE}-${size}.png`;

/** The command line as { out, shots }: `out` is null where no folder is named; throws a message for a line it cannot read. */
export function parseArguments(words, rhythms = RHYTHMS) {
  const texts = [];
  let out = null;
  for (let i = 0; i < words.length; i++) {
    if (words[i] === '--out') {
      if (!words[i + 1] || words[i + 1].startsWith('--')) throw new Error('--out needs a folder');
      out = words[++i];
    } else if (words[i].startsWith('--')) throw new Error(`no option «${words[i]}»`);
    else texts.push(words[i]);
  }
  return { out, shots: (texts.length ? texts : rhythms.map(rhythm => rhythm.id)).flatMap(text => shotsOf(text, rhythms)) };
}

/** The folder Workbench's landing script reads this change's renders from. */
function evidenceFolder() {
  const workbench = process.env.WORKBENCH || path.resolve(REPO_ROOT, '..', 'workbench'),
    script = path.join(workbench, 'skills', 'bench-backlog', 'scripts', 'render_evidence.py');
  if (!existsSync(script)) throw new Error(`no ${script}: pass --out DIR, or name the Workbench checkout in WORKBENCH`);
  const folder = execFileSync('python3', [script, 'dir', '--checkout', REPO_ROOT], { encoding: 'utf8' }).trim();
  if (!path.isAbsolute(folder)) throw new Error(`the landing script names no folder (${folder || 'no output'}): pass --out DIR`);
  return folder;
}

/** In the page: draw the stage at `at` bars as it is while the show plays, and wait until it is painted. */
async function drawStage(at, runUp) {
  document.getElementById('tap').dataset.state = 'pause'; // no veil and no Play button over the stage
  for (let back = runUp.frames; back >= 0; back--) window.baque.render(Math.max(0, at - back / runUp.perBar));
  for (const animation of document.getAnimations()) animation.finish(); // a readout that fades in is shown whole
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/** Every shot of one show at one size and one motion setting, on one page: opening a page is what takes the time. */
async function renderGroup(session, out, size, shots) {
  const [{ show, still }] = shots,
    // its own context, so nothing a page stores (a volume, a sound) reaches the next one
    context = await session.browser.createBrowserContext(),
    page = await context.newPage(),
    errors = [];
  try {
    page.setDefaultTimeout(READY_MS);
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport(SIZES[size]);
    // stated, never the machine's own setting, so a render is the same picture on every machine
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: still ? 'reduce' : 'no-preference' }]);
    await page.goto(`${session.server.url}${show}`, { waitUntil: 'load', timeout: READY_MS });
    await page.waitForFunction(() => window.baque && document.readyState === 'complete');
    await page.evaluate(() => document.fonts.ready);
    for (const shot of shots) {
      await page.evaluate(drawStage, shot.at, RUN_UP);
      const file = fileName(shot, size);
      await page.screenshot({ path: path.join(out, file) });
      console.log(file);
    }
  } finally {
    await context.close();
  }
  if (errors.length) throw new Error(`the ${show} page failed at ${size}: ${errors.join(' | ')}`);
}

async function main() {
  let parsed;
  try {
    parsed = parseArguments(process.argv.slice(2));
    parsed.out = parsed.out === null ? evidenceFolder() : path.resolve(parsed.out);
  } catch (error) {
    console.error(`render-stage: ${error.message}`);
    console.error('usage: node tools/render-stage.mjs [--out DIR] [SHOT...]');
    process.exit(USAGE);
  }
  mkdirSync(parsed.out, { recursive: true });
  const groups = Map.groupBy(parsed.shots, shot => `${shot.show} ${shot.still}`);
  const session = await openBrowser();
  try {
    for (const size of Object.keys(SIZES)) for (const shots of groups.values()) await renderGroup(session, parsed.out, size, shots);
  } catch (error) {
    console.error(`render-stage: ${error.message}`);
    process.exitCode = FAILED;
  } finally {
    await session.close();
  }
  console.log(parsed.out);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

// Builds the deployed site: only what the browser loads, plus one page per rhythm path.
//   node tools/build-site.mjs <out>   → writes the site into <out> (which must not exist)
// `/` is index.html (the first rhythm). Each route in src/rhythms/index.js gets `<id>.html`, which
// GitHub Pages serves at `/<id>` with status 200: a shipped rhythm's page is index.html with its own
// title and address (the page reads the rhythm from its path); a rhythm being prepared gets a page
// with the selector and one line, and no show. Assets stay at the root, so the relative links work.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COPY } from '../src/copy.js';
import { RHYTHMS, ROUTES, rhythmChoices } from '../src/rhythms/index.js';
import { PREPARING, preparingLine } from '../src/rhythms/preparing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_NAME = 'O Baque Virado';
const COPIED = ['index.html', '404.html', 'styles.css', 'src', 'social.png', 'apple-touch-icon.png', 'CNAME', '.nojekyll'];

const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const capitalized = text => text.charAt(0).toUpperCase() + text.slice(1);

/** index.html with the title, the social title and the address of one route. */
function withRoute(html, { id, title, origin }) {
  const fullTitle = escapeHtml(`${title} · ${SITE_NAME}`);
  const url = `${origin}/${id}`;
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${fullTitle}</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${fullTitle}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`);
}

/** The page of a rhythm being prepared: index.html's head without the show's scripts, and a body with
 * the rhythm's name, one line and the selector. It works without JavaScript. */
export function preparingPage(html, id) {
  const rhythm = PREPARING[id];
  const links = rhythmChoices(id)
    .map(choice => `<a class="chip" href="${choice.href}"${choice.current ? ' aria-current="true"' : ''}>${escapeHtml(choice.label)}</a>`)
    .join('');
  const head = html
    .slice(0, html.indexOf('<body>'))
    .replace(/<script type="module"[^>]*><\/script>\n/, '')
    .replace(/<link rel="modulepreload"[^>]*>\n/g, '')
    .replace(/<script type="application\/ld\+json">.*<\/script>\n/, '');
  const body = `<body>
<div class="wrap">
  <main class="center preparing">
    <h1>${escapeHtml(rhythm.name)}</h1>
    <p>${escapeHtml(preparingLine(rhythm))}</p>
    <nav class="rhythms" aria-label="${escapeHtml(COPY.controls.rhythm)}">${links}</nav>
  </main>
</div>
</body>
</html>
`;
  return head + body;
}

/** Write the whole site into `out`. */
export function buildSite(out, root = ROOT) {
  if (existsSync(out)) throw new Error(`${out} already exists`);
  mkdirSync(out, { recursive: true });
  for (const entry of COPIED) cpSync(path.join(root, entry), path.join(out, entry), { recursive: true });
  // the page fetches only the AAC samples; the WAV masters stay in the repository
  mkdirSync(path.join(out, 'sounds'));
  for (const file of readdirSync(path.join(root, 'sounds')).filter(name => name.endsWith('.m4a')))
    cpSync(path.join(root, 'sounds', file), path.join(out, 'sounds', file));
  mkdirSync(path.join(out, 'fonts'));
  for (const file of readdirSync(path.join(root, 'fonts')).filter(name => name.endsWith('.woff2') || /^OFL-.*\.txt$/.test(name)))
    cpSync(path.join(root, 'fonts', file), path.join(out, 'fonts', file));

  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const origin = new URL(html.match(/<link rel="canonical" href="([^"]+)"/)[1]).origin; // the live address, which index.html owns
  for (const id of ROUTES) {
    const rhythm = RHYTHMS.find(candidate => candidate.id === id);
    if (rhythm) {
      writeFileSync(path.join(out, `${id}.html`), withRoute(html, { id, title: capitalized(rhythm.copy.selector || rhythm.copy.name), origin }));
    } else if (PREPARING[id]) {
      writeFileSync(path.join(out, `${id}.html`), withRoute(preparingPage(html, id), { id, title: PREPARING[id].name, origin }));
    } else {
      throw new Error(`route ${id} has neither a rhythm package nor an entry in src/rhythms/preparing.js`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) throw new Error('usage: node tools/build-site.mjs <out>');
  buildSite(path.resolve(out));
  console.log(`built the site in ${out}`);
}

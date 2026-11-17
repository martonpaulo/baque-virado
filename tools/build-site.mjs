// Builds the deployed site: only what the browser loads, plus one page per rhythm path.
//   node tools/build-site.mjs <out>   → writes the site into <out> (which must not exist)
// `/` is index.html (the first rhythm). Each route in src/rhythms/index.js gets `<id>.html`, which
// GitHub Pages serves at `/<id>` with status 200: a shipped rhythm's page is index.html with its own
// title and address (the page reads the rhythm from its path); a rhythm being prepared gets a page
// with the selector and one line, and no show. Assets stay at the root, so the relative links work.
//   node tools/build-site.mjs <out> <commit>  → also versions every module, the stylesheet and the
// sounds with `?v=<commit>` and writes build.txt, so a page never runs assets cached from another
// build (#35). The repository's own pages stay unversioned for the dev server.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COPY } from '../src/copy.js';
import { MOVED, RHYTHMS, ROUTES, rhythmChoices } from '../src/rhythms/index.js';
import { PREPARING, preparingLine } from '../src/rhythms/preparing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_NAME = 'Batuque';
const COPIED = [
  'index.html',
  '404.html',
  'styles.css',
  'src',
  'vendor',
  'social.png',
  'social',
  'apple-touch-icon.png',
  'icon.svg',
  'icons',
  'CNAME',
  '.nojekyll',
];

const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LD_JSON = /<script type="application\/ld\+json">(.*)<\/script>/;
const capitalized = text => text.charAt(0).toUpperCase() + text.slice(1);

/** index.html with the title, description, address, preview and structured data of one route (#31). */
function withRoute(html, { id, title, description, origin, image }) {
  const fullTitle = escapeHtml(`${title} · ${SITE_NAME}`);
  const url = `${origin}/${id}`;
  const text = escapeHtml(description);
  // the page of a rhythm being prepared has no structured data: preparingPage drops it
  const site = LD_JSON.test(html) ? siteData(html) : null;
  const data = site && {
    '@context': site['@context'], // index.html's structured data owns the vocabulary
    '@type': 'WebPage',
    name: `${title} · ${SITE_NAME}`,
    description,
    url,
    inLanguage: site.inLanguage,
    about: { '@type': 'Thing', name: title },
    isPartOf: { '@type': site['@type'], name: site.name, url: site.url },
  };
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${fullTitle}</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${fullTitle}"`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${text}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${text}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:image" content=")[^"]*"/, (all, start) => (image ? `${start}${origin}/${image}"` : all))
    .replace(LD_JSON, () => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`);
}

/** index.html's own structured data: the site as a schema.org WebSite. */
const siteData = html => JSON.parse(html.match(LD_JSON)[1]);

/** The sitemap (tools/sitemap-template.xml): the home page and every route's own address. Moved paths are left out. */
export const sitemap = origin =>
  readFileSync(path.join(ROOT, 'tools', 'sitemap-template.xml'), 'utf8').replace(
    '<!-- urls -->',
    ['', ...ROUTES].map(id => `  <url><loc>${origin}/${id}</loc></url>`).join('\n'),
  );

/** robots.txt: everything may be crawled, and the sitemap is named. */
export const robots = origin => `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;

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

/** The page at a moved path: it sends the viewer to the new route at once, the query and the fragment
 * kept, and tells search engines the new address. Without JavaScript the refresh still moves (#37). */
export function movedPage(to, origin) {
  const url = `${origin}/${to}`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(capitalized(to))} · ${SITE_NAME}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${url}">
<meta http-equiv="refresh" content="0; url=/${to}">
<script>location.replace('/${to}' + location.search + location.hash);</script>
</head>
<body><p><a href="/${to}">${escapeHtml(capitalized(to))}</a></p></body>
</html>
`;
}

const listModules = (dir, prefix) =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? listModules(path.join(dir, entry.name), `${prefix}${entry.name}/`) : entry.name.endsWith('.js') ? [`${prefix}${entry.name}`] : [],
  );

/** The page with every module and the stylesheet at `?v=<version>`, and an import map that sends each
 * module of `src/` to the same versioned URL, so the imports inside `src/` stay in this build too.
 * `src/audio.js` reads the version from its own URL for the sounds. */
export function versioned(html, version, modules) {
  if (!/^[0-9a-f]{7,40}$/.test(version)) throw new Error(`the build version must be a commit, not ${version}`);
  const query = `?v=${version}`;
  const imports = Object.fromEntries(modules.map(module => [`/${module}`, `/${module}${query}`]));
  const importMap = `<script type="importmap">${JSON.stringify({ imports })}</script>\n`;
  const page = html.replace(/((?:src|href)=")((?:src\/[^"?]+\.js)|styles\.css)"/g, `$1$2${query}"`);
  const firstModule = page.search(/<script type="module"|<link rel="modulepreload"/);
  return firstModule < 0 ? page : page.slice(0, firstModule) + importMap + page.slice(firstModule);
}

/** Write the whole site into `out`; with a `version`, every page loads only that build's assets. */
export function buildSite(out, root = ROOT, version = '') {
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

  const modules = listModules(path.join(root, 'src'), 'src/');
  const finish = page => (version ? versioned(page, version, modules) : page);
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  if (version) {
    writeFileSync(path.join(out, 'index.html'), finish(html));
    writeFileSync(path.join(out, 'build.txt'), `${version}\n`);
  }
  const origin = new URL(html.match(/<link rel="canonical" href="([^"]+)"/)[1]).origin; // the live address, which index.html owns
  for (const id of ROUTES) {
    const rhythm = RHYTHMS.find(candidate => candidate.id === id);
    if (rhythm) {
      const title = capitalized(rhythm.copy.selector || rhythm.copy.name);
      writeFileSync(
        path.join(out, `${id}.html`),
        finish(withRoute(html, { id, title, description: rhythm.copy.description, origin, image: `social/${id}.png` })),
      );
    } else if (PREPARING[id]) {
      writeFileSync(
        path.join(out, `${id}.html`),
        finish(withRoute(preparingPage(html, id), { id, title: PREPARING[id].name, description: PREPARING[id].description, origin })),
      );
    } else {
      throw new Error(`route ${id} has neither a rhythm package nor an entry in src/rhythms/preparing.js`);
    }
  }
  writeFileSync(path.join(out, 'sitemap.xml'), sitemap(origin));
  writeFileSync(path.join(out, 'robots.txt'), robots(origin));
  for (const [from, to] of Object.entries(MOVED)) writeFileSync(path.join(out, `${from}.html`), movedPage(to, origin));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) throw new Error('usage: node tools/build-site.mjs <out> [<commit>]');
  buildSite(path.resolve(out), ROOT, process.argv[3] || '');
  console.log(`built the site in ${out}`);
}

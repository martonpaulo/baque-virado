// The deployed site has one page per rhythm path (tools/build-site.mjs), and the local server answers
// `/<id>` with `<id>.html` as GitHub Pages does.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { MOVED, RHYTHMS, ROUTES } from '../src/rhythms/index.js';
import { PREPARING } from '../src/rhythms/preparing.js';
import { buildSite, preparingPage } from '../tools/build-site.mjs';
import { startStaticServer } from '../tools/static-server.mjs';

test('every rhythm path answers 200 from the built site; a shipped one is the show, one being prepared says so', async () => {
  const parent = mkdtempSync(path.join(os.tmpdir(), 'baque-site-'));
  const out = path.join(parent, 'site');
  buildSite(out);
  const server = await startStaticServer(out, 0);
  try {
    for (const id of ['', ...ROUTES]) assert.equal((await fetch(`${server.url}${id}`)).status, 200, `/${id}`);
    assert.equal((await fetch(`${server.url}nenhum`)).status, 404);
    const page = id => readFileSync(path.join(out, `${id}.html`), 'utf8');
    const index = readFileSync(path.join(out, 'index.html'), 'utf8');
    // a shipped rhythm: index.html with its own title and address, so the show is the same page
    assert.match(page('forro'), /<title>Forró · Batuque<\/title>/);
    assert.match(page('forro'), /<link rel="canonical" href="https:\/\/batuque\.martonpaulo\.com\/forro">/);
    const showOnly = html =>
      html
        .replace(/<title>.*<\/title>/, '')
        .replace(/<meta property="og:title"[^>]*>/, '')
        .replace(/<meta property="og:image" [^>]*>/, '')
        .replace(/<meta (?:name|property)="(?:og:)?description"[^>]*>/g, '')
        .replace(/<script type="application\/ld\+json">.*<\/script>/, '')
        .replace(/https:\/\/batuque\.martonpaulo\.com\/[a-z-]*/g, '');
    assert.equal(showOnly(page('maracatu')), showOnly(index));
    // a rhythm being prepared (none is today; a test entry): its name, one line, the selector, and no show
    PREPARING.teste = { selector: 'teste', name: 'Teste', description: 'Teste.' };
    try {
      const preparing = preparingPage(index, 'teste');
      assert.match(preparing, /<h1>Teste<\/h1>/);
      assert.match(preparing, /<p>O show de teste está sendo preparado\.<\/p>/);
      assert.equal((preparing.match(/class="chip"/g) || []).length, ROUTES.length);
      assert.doesNotMatch(preparing, /<script type="module"|id="stage"/);
    } finally {
      delete PREPARING.teste;
    }
    // a path that was live before the rename (#37): it answers and moves to the new path, query kept
    for (const [from, to] of Object.entries(MOVED)) {
      assert.equal((await fetch(`${server.url}${from}`)).status, 200, `/${from}`);
      assert.match(page(from), new RegExp(`location\\.replace\\('/${to}' \\+ location\\.search`));
      assert.match(page(from), new RegExp(`<link rel="canonical" href="https://batuque\\.martonpaulo\\.com/${to}">`));
      assert.match(page(from), new RegExp(`<meta http-equiv="refresh" content="0; url=/${to}">`));
    }
  } finally {
    await server.close();
    rmSync(parent, { recursive: true, force: true });
  }
});

// #35: after a deploy, a page loaded the new HTML with modules cached from the previous build.
test('a versioned build loads only its own modules, stylesheet and sounds', () => {
  const parent = mkdtempSync(path.join(os.tmpdir(), 'baque-site-'));
  try {
    const pages = version => {
      const out = path.join(parent, version);
      buildSite(out, undefined, version);
      assert.equal(readFileSync(path.join(out, 'build.txt'), 'utf8'), `${version}\n`);
      return ['index', ...ROUTES].map(id => [id, readFileSync(path.join(out, `${id}.html`), 'utf8'), out]);
    };
    const [a, b] = ['aaaaaaa', 'bbbbbbb'];
    const built = pages(a);
    pages(b);
    for (const [id, html, out] of built) {
      assert.doesNotMatch(html, new RegExp(b), id);
      // every local script, module and stylesheet carries this build's version
      const refs = [...html.matchAll(/(?:src|href)="((?:src\/|styles)[^"]*)"/g)].map(match => match[1]);
      assert.ok(refs.length > 0, id);
      for (const ref of refs) assert.ok(ref.endsWith(`?v=${a}`), `${id}: ${ref}`);
      if (!html.includes('<script type="module"')) continue;
      // the import map comes before any module, and every relative import inside src/ resolves to a
      // module the map sends to this build
      const mapAt = html.indexOf('<script type="importmap">');
      assert.ok(mapAt >= 0 && mapAt < html.search(/<script type="module"|<link rel="modulepreload"/), id);
      const { imports } = JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/)[1]);
      for (const value of Object.values(imports)) assert.ok(value.endsWith(`?v=${a}`), value);
      for (const module of Object.keys(imports)) {
        const source = readFileSync(path.join(out, module), 'utf8');
        for (const [, spec] of source.matchAll(/(?:from|import)\s*'(\.[^']+)'/g)) {
          const target = new URL(spec, `https://site${module}`).pathname;
          assert.ok(imports[target], `${module} imports ${target}, which the import map misses`);
        }
      }
    }
    // the sounds take the version from the URL of src/audio.js
    assert.match(readFileSync(path.join(built[0][2], 'src/audio.js'), 'utf8'), /SOUND_EXTENSION\}\$\{BUILD_QUERY\}/);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

// #31: each path has its own title, description, address and structured data; the sitemap lists them.
test('each rhythm path has its own description and structured data, and the sitemap lists every path', () => {
  const parent = mkdtempSync(path.join(os.tmpdir(), 'baque-site-'));
  const out = path.join(parent, 'site');
  try {
    buildSite(out);
    const descriptions = new Set();
    for (const id of ROUTES) {
      const html = readFileSync(path.join(out, `${id}.html`), 'utf8');
      const description = html.match(/<meta name="description" content="([^"]+)">/)[1];
      assert.equal(html.match(/<meta property="og:description" content="([^"]+)">/)[1], description, id);
      assert.match(html, /<title>[^<]+ · Batuque<\/title>/, id);
      descriptions.add(description);
      const data = html.match(/<script type="application\/ld\+json">(.*)<\/script>/);
      if (data) assert.equal(JSON.parse(data[1]).url, `https://batuque.martonpaulo.com/${id}`, id);
    }
    assert.equal(descriptions.size, ROUTES.length, 'no two paths share a description');
    // a shipped rhythm's preview is its own card (tools/make-images.mjs), served by the site
    for (const rhythm of RHYTHMS) {
      const html = readFileSync(path.join(out, `${rhythm.id}.html`), 'utf8');
      assert.match(html, new RegExp(`<meta property="og:image" content="https://batuque\\.martonpaulo\\.com/social/${rhythm.id}\\.png">`));
      assert.ok(existsSync(path.join(out, 'social', `${rhythm.id}.png`)), rhythm.id);
    }
    const sitemap = readFileSync(path.join(out, 'sitemap.xml'), 'utf8');
    assert.deepEqual(
      [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]),
      ['', ...ROUTES].map(id => `https://batuque.martonpaulo.com/${id}`),
    );
    for (const from of Object.keys(MOVED)) assert.doesNotMatch(sitemap, new RegExp(`/${from}<`));
    assert.equal(readFileSync(path.join(out, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\n\nSitemap: https://batuque.martonpaulo.com/sitemap.xml\n');
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

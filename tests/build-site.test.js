// The deployed site has one page per rhythm path (tools/build-site.mjs), and the local server answers
// `/<id>` with `<id>.html` as GitHub Pages does.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { ROUTES } from '../src/rhythms/index.js';
import { buildSite } from '../tools/build-site.mjs';
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
    assert.match(page('forro'), /<title>Forró · O Baque Virado<\/title>/);
    assert.match(page('forro'), /<link rel="canonical" href="https:\/\/batuque\.martonpaulo\.com\/forro">/);
    const showOnly = html =>
      html
        .replace(/<title>.*<\/title>/, '')
        .replace(/<meta property="og:title"[^>]*>/, '')
        .replace(/https:\/\/batuque\.martonpaulo\.com\/[a-z-]*/g, '');
    assert.equal(showOnly(page('maracatu')), showOnly(index));
    // a rhythm being prepared: its name in the title, one line, the selector, and no show
    const manguebeat = page('manguebeat');
    assert.match(manguebeat, /<title>Manguebeat · O Baque Virado<\/title>/);
    assert.match(manguebeat, /<p>O show de manguebeat está sendo preparado\.<\/p>/);
    assert.match(manguebeat, /<a class="chip" href="\/manguebeat" aria-current="true">manguebeat<\/a>/);
    assert.equal((manguebeat.match(/class="chip"/g) || []).length, ROUTES.length);
    assert.doesNotMatch(manguebeat, /<script type="module"|id="stage"/);
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

// The site icon (#30): every icon a page links exists, ships with the Deploy workflow, and a PNG
// has the size its link declares.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);
const PAGES = ['index.html', '404.html'];
const ICON_LINK = /<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"[^>]*>/g;
const DEPLOY = readFileSync(new URL('.github/workflows/deploy.yml', ROOT), 'utf8');
const SHIPPED = DEPLOY.match(/cp -R ([^\n]+) _site\//)[1].split(' ');
const PNG_WIDTH_OFFSET = 16; // IHDR: width then height, big-endian, after the 8-byte signature and the chunk header

test('every linked icon exists and ships', () => {
  for (const page of PAGES) {
    const links = [...readFileSync(new URL(page, ROOT), 'utf8').matchAll(ICON_LINK)];
    assert.ok(links.length > 0, `${page} links an icon`);
    for (const [tag, href] of links) {
      const file = href.replace(/^\//, '');
      assert.ok(existsSync(new URL(file, ROOT)), `${page}: ${file} exists`);
      assert.ok(SHIPPED.includes(file.split('/')[0]), `${file} is in the Deploy copy list`);
      const sizes = tag.match(/sizes="(\d+)x(\d+)"/);
      if (sizes) {
        const png = readFileSync(new URL(file, ROOT));
        assert.deepEqual([png.readUInt32BE(PNG_WIDTH_OFFSET), png.readUInt32BE(PNG_WIDTH_OFFSET + 4)], [Number(sizes[1]), Number(sizes[2])], file);
      }
    }
  }
});

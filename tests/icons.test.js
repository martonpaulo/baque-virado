// The site icon (#30): every icon each built page links (index.html, 404.html and every rhythm path
// tools/build-site.mjs writes) answers 200 from the built site, and a PNG has the size its link declares.
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { buildSite } from '../tools/build-site.mjs';
import { startStaticServer } from '../tools/static-server.mjs';

const ICON_LINK = /<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"[^>]*>/g;
const PNG_WIDTH_OFFSET = 16; // IHDR: width then height, big-endian, after the 8-byte signature and the chunk header

test('every page of the built site links icons that it serves, at their declared sizes', async () => {
  const parent = mkdtempSync(path.join(os.tmpdir(), 'baque-icons-'));
  const out = path.join(parent, 'site');
  buildSite(out);
  const server = await startStaticServer(out, 0);
  try {
    for (const page of readdirSync(out).filter(name => name.endsWith('.html'))) {
      const links = [...readFileSync(path.join(out, page), 'utf8').matchAll(ICON_LINK)];
      assert.ok(
        links.some(([tag]) => tag.includes('image/svg+xml')),
        `${page} links the SVG icon`,
      );
      for (const [tag, href] of links) {
        const response = await fetch(new URL(href, server.url));
        assert.equal(response.status, 200, `${page}: ${href}`);
        const sizes = tag.match(/sizes="(\d+)x(\d+)"/);
        const png = Buffer.from(await response.arrayBuffer());
        if (sizes) assert.deepEqual([png.readUInt32BE(PNG_WIDTH_OFFSET), png.readUInt32BE(PNG_WIDTH_OFFSET + 4)], [Number(sizes[1]), Number(sizes[2])], href);
      }
    }
  } finally {
    await server.close();
    rmSync(parent, { recursive: true, force: true });
  }
});

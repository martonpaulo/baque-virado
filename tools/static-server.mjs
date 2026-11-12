// Minimal static file server for local preview, tests and the video exporter (no dependencies).
//   node tools/static-server.mjs [port]   → serves the repository root

import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
};

/** Serve `root` on 127.0.0.1. Resolves to { url, close() } once listening. */
export function startStaticServer(root = REPO_ROOT, port = 0) {
  const base = path.resolve(root);
  const server = createServer(async (request, response) => {
    try {
      const urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = path.resolve(base, `.${urlPath}`);
      if (!file.startsWith(base)) {
        response.writeHead(403).end();
        return;
      }
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () =>
      resolve({
        url: `http://127.0.0.1:${server.address().port}/`,
        close: () => new Promise(done => server.close(done)),
      }),
    );
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await startStaticServer(REPO_ROOT, Number(process.argv[2]) || 8000);
  console.log(`serving ${REPO_ROOT} at ${url}`);
}

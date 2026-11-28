// Minimal static file server for local preview, tests and the video exporter (no dependencies).
//   node tools/static-server.mjs [port]   → serves the repository root
// As GitHub Pages does, `/<name>` serves `<name>.html` when there is no `<name>` file. On the
// repository root, which has no per-rhythm pages (tools/build-site.mjs writes them at deploy time),
// a rhythm's path (`ROUTES`) serves index.html, which reads the rhythm from the path.

import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOVED, ROUTES } from '../src/rhythms/index.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OK = 200,
  FORBIDDEN = 403,
  NOT_FOUND = 404;
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.woff2': 'font/woff2',
};

/** True when `file` is `base` or inside it (a sibling such as `<base>-private` is outside). */
const isInside = (base, file) => {
  const relative = path.relative(base, file);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};
/** A dot segment (`.git`, `.scratch`) is local state, never part of the site. */
const hasHiddenSegment = urlPath => urlPath.split('/').some(segment => segment.startsWith('.'));

const exists = file =>
  stat(file).then(
    () => true,
    () => false,
  );
/** The file a request path names: a folder's index.html, `<name>.html`, or index.html for a route. */
async function resolveFile(base, file, routes) {
  if (await exists(file)) return (await stat(file)).isDirectory() ? path.join(file, 'index.html') : file;
  if (path.extname(file) === '' && (await exists(`${file}.html`))) return `${file}.html`;
  if (path.dirname(file) === base && routes.includes(path.basename(file))) return path.join(base, 'index.html');
  return file; // missing: the read fails and the request gets 404
}

/**
 * Serve `root` on 127.0.0.1. Resolves to { url, close() } once listening. Only requests addressed to
 * this server by name (127.0.0.1 or localhost) are answered, so a page that rebinds its own domain
 * to 127.0.0.1 cannot read the working tree. A missing `/<id>` for an id in `routes` serves index.html.
 */
export function startStaticServer(root = REPO_ROOT, port = 0, { routes = [] } = {}) {
  const base = path.resolve(root);
  const server = createServer(async (request, response) => {
    try {
      const { port: listening } = server.address();
      if (![`127.0.0.1:${listening}`, `localhost:${listening}`].includes(request.headers.host)) {
        response.writeHead(FORBIDDEN).end();
        return;
      }
      const urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = path.resolve(base, `.${urlPath}`);
      if (!isInside(base, file) || hasHiddenSegment(urlPath)) {
        response.writeHead(FORBIDDEN).end();
        return;
      }
      file = await resolveFile(base, file, routes);
      const body = await readFile(file);
      response.writeHead(OK, { 'Content-Type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(NOT_FOUND).end();
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

// the platform's own flag, never a comparison of paths: called through a linked folder, the path Node
// was given is not the file's real path (tests/linked-tools.test.js)
if (import.meta.main) {
  const { url } = await startStaticServer(REPO_ROOT, Number(process.argv[2]) || 8000, { routes: [...ROUTES, ...Object.keys(MOVED)] });
  console.log(`serving ${REPO_ROOT} at ${url}`);
}

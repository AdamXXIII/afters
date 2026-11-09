// Tiny static server for dist/ (used by shoot + e2e). SPA fallback to index.html.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
};

export function serve(dir, port = 0) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      let p = path.join(dir, decodeURIComponent(url.pathname));
      if (!p.startsWith(dir)) { res.writeHead(403).end(); return; }
      let s = await stat(p).catch(() => null);
      if (s?.isDirectory()) { p = path.join(p, 'index.html'); s = await stat(p).catch(() => null); }
      if (!s) p = path.join(dir, 'index.html');
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

if (process.argv[1] && process.argv[1].endsWith('serve.mjs')) {
  const dir = path.resolve(process.argv[2] || 'dist');
  const { url } = await serve(dir, Number(process.argv[3] || 4173));
  console.log(`serving ${dir} at ${url}`);
}

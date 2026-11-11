// A small static server over dist/ for the layout sweep: the pages, their
// assets and the 404s the way Workers static assets serve them (a missing
// /hr/… path gets dist/hr/404.html, anything else dist/404.html). No Worker:
// the sweep measures layout, not /api or byte ranges (tests/dist covers those).

import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.vtt': 'text/vtt',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webm': 'audio/webm',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
};

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

export interface DistServer {
  origin: string;
  close: () => Promise<void>;
}

export async function serveDist(dist: string): Promise<DistServer> {
  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (pathname === '/') {
      res.writeHead(302, { location: '/en/' }).end();
      return;
    }
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    let file = join(dist, safe.endsWith('/') ? `${safe}index.html` : safe);
    let status = 200;
    if (!isFile(file)) {
      if (!safe.endsWith('/') && isFile(join(dist, safe, 'index.html'))) {
        res.writeHead(301, { location: `${pathname}/` }).end();
        return;
      }
      status = 404;
      file = join(dist, pathname.startsWith('/hr/') ? 'hr/404.html' : '404.html');
    }
    res.writeHead(status, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

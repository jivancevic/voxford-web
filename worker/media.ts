import type { Env } from './env';

// GET/HEAD /media/<key>: the videos, posters and reels in the R2 bucket
// (binding MEDIA), served from the site's own origin. Same URLs in production
// and in `wrangler dev` (which uses a local R2 bucket), so the static pages
// can link `/media/…` without knowing where the bucket lives. Supports byte
// ranges (Safari will not play a video without them) and conditional requests.
//
// Only two prefixes are public: `top/` (the encoded top videos, uploaded by
// scripts/upload-media.sh) and `reels/` (written by the daily sync).
//
// Keys never change content: top videos sit under a content version
// (top/<slug>/<version>/…) and a reel's files under its Instagram id, so they
// are served `immutable` for a year and kept in the edge cache (Cache API), so
// a repeat play is answered at the edge, not by R2. Only reels/manifest.json
// changes; it gets five minutes and skips the edge cache. The Cache API is a
// no-op on *.workers.dev; it takes effect on the production domain (ticket G).

export const MEDIA_PREFIX = '/media/';

const PUBLIC_KEY = /^(top|reels)\/[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/;

export const CACHE_MANIFEST = 'public, max-age=300';
export const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable';
const MANIFEST_SUFFIX = 'manifest.json';

/** The Workers edge cache, when the runtime has one (not in unit tests). */
const edgeCache = (): Cache | undefined => (globalThis as { caches?: { default?: Cache } }).caches?.default;

/** The bucket key for a request path, or undefined when it is not a public media key. */
export function mediaKey(pathname: string): string | undefined {
  if (!pathname.startsWith(MEDIA_PREFIX)) return undefined;
  let key: string;
  try {
    key = decodeURIComponent(pathname.slice(MEDIA_PREFIX.length));
  } catch {
    return undefined;
  }
  if (key.includes('..') || !PUBLIC_KEY.test(key)) return undefined;
  return key;
}

const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

/**
 * A single `bytes=` range as R2 takes it; undefined for no header, a
 * multi-range or anything malformed (those get the whole file, as RFC 9110 allows).
 */
export function parseRange(header: string | null): R2Range | undefined {
  const m = header ? /^bytes=(\d*)-(\d*)$/.exec(header.trim()) : null;
  if (!m) return undefined;
  const [, from, to] = m;
  if (from === '' && to === '') return undefined;
  if (from === '') return { suffix: Number(to) };
  const offset = Number(from);
  if (to === '') return { offset };
  const end = Number(to);
  return end < offset ? undefined : { offset, length: end - offset + 1 };
}

/** The first and last byte a parsed range covers in a file of `size` bytes (start > end: unsatisfiable). */
export function contentRange(range: R2Range, size: number): { start: number; end: number } {
  if ('suffix' in range) {
    const length = Math.min(range.suffix, size);
    return { start: size - length, end: size - 1 };
  }
  const start = range.offset ?? 0;
  const end = range.length === undefined ? size - 1 : Math.min(start + range.length, size) - 1;
  return { start, end };
}

export async function handleMedia(
  request: Request,
  env: Env,
  ctx: Pick<ExecutionContext, 'waitUntil'>,
  cache: Cache | undefined = edgeCache(),
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const url = new URL(request.url);
  const key = mediaKey(url.pathname);
  if (!key) return notFound();

  // The edge cache answers ranges and conditionals from a cached full copy. It
  // does nothing on *.workers.dev, where filling it would only double R2 reads.
  const cachesHere = !url.hostname.endsWith('.workers.dev');
  const edge = request.method === 'GET' && cachesHere && !key.endsWith(MANIFEST_SUFFIX) ? cache : undefined;
  // One cache entry per file: the query string is ignored, the visitor's
  // Range and conditional headers are kept for the lookup.
  const cacheKey = new Request(`${url.origin}${url.pathname}`);
  if (edge) {
    const hit = await edge.match(new Request(cacheKey.url, { headers: request.headers }));
    if (hit) return hit;
  }

  // Parsed here, not passed through as headers: the R2 binding's echo of a
  // header range differs between production and local mode.
  const range = parseRange(request.headers.get('Range'));
  let object: R2Object | R2ObjectBody | null;
  try {
    object = await env.MEDIA.get(key, { onlyIf: request.headers, ...(range ? { range } : {}) });
  } catch (err) {
    // R2 rejects a range it cannot satisfy; any other failure is a real error.
    if (!range) throw err;
    const head = await env.MEDIA.head(key);
    if (!head) return notFound();
    const unsatisfiable = 'suffix' in range ? range.suffix === 0 : (range.offset ?? 0) >= head.size;
    if (!unsatisfiable) throw err;
    return new Response('Range not satisfiable', {
      status: 416,
      headers: { 'Content-Range': `bytes */${head.size}` },
    });
  }
  if (!object) return notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cache-Control', key.endsWith(MANIFEST_SUFFIX) ? CACHE_MANIFEST : CACHE_IMMUTABLE);

  // A failed precondition returns the object without a body.
  if (!('body' in object)) {
    const conditionalGet = request.headers.has('If-None-Match') || request.headers.has('If-Modified-Since');
    return new Response(null, { status: conditionalGet ? 304 : 412, headers });
  }

  let status = 200;
  let length = object.size;
  if (range) {
    const { start, end } = contentRange(range, object.size);
    if (start > end || start >= object.size) {
      await object.body.cancel();
      return new Response('Range not satisfiable', { status: 416, headers: { 'Content-Range': `bytes */${object.size}` } });
    }
    status = 206;
    length = end - start + 1;
    headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
  }
  headers.set('Content-Length', String(length));

  if (request.method === 'HEAD') {
    await object.body.cancel();
    return new Response(null, { status, headers });
  }
  const response = new Response(object.body, { status, headers });
  if (edge) {
    if (status === 200) {
      ctx.waitUntil(edge.put(cacheKey, response.clone()));
    } else {
      // A range miss (the usual first request of a video): cache the full file
      // in the background, so later ranges come from the edge.
      ctx.waitUntil(fillCache(edge, cacheKey, env.MEDIA, key, headers));
    }
  }
  return response;
}

async function fillCache(cache: Cache, cacheKey: Request, bucket: R2Bucket, key: string, partial: Headers) {
  if (await cache.match(cacheKey)) return; // a parallel range request filled it already
  const full = await bucket.get(key);
  if (!full || !('body' in full)) return;
  const headers = new Headers(partial);
  headers.delete('Content-Range');
  headers.set('Content-Length', String(full.size));
  await cache.put(cacheKey, new Response(full.body, { status: 200, headers }));
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from './env';
import { handleMedia, mediaKey, parseRange } from './media';
import { FakeR2 } from './test-support/fake-r2';

let bucket: FakeR2;
let pending: Promise<unknown>[];
const ctx = { waitUntil: (p: Promise<unknown>) => void pending.push(p) };
const env = () => ({ MEDIA: bucket.asBinding() }) as unknown as Env;
const get = (path: string, headers?: HeadersInit, method = 'GET', cache?: Cache) =>
  handleMedia(new Request(`https://voxford.example${path}`, { method, headers }), env(), ctx, cache);

/** A Cache API stand-in: stores full responses by URL, answers a Range from them like Cloudflare does. */
class FakeCache {
  readonly store = new Map<string, { body: Uint8Array; headers: Headers }>();
  async match(request: Request): Promise<Response | undefined> {
    const hit = this.store.get(request.url);
    if (!hit) return undefined;
    const m = /^bytes=(\d+)-(\d*)$/.exec(request.headers.get('Range') ?? '');
    if (!m) return new Response(hit.body, { headers: hit.headers });
    const start = Number(m[1]);
    const end = m[2] ? Number(m[2]) : hit.body.length - 1;
    return new Response(hit.body.slice(start, end + 1), { status: 206, headers: hit.headers });
  }
  async put(request: Request, response: Response): Promise<void> {
    if (response.status !== 200) throw new Error('Cache.put refuses non-200');
    this.store.set(request.url, { body: new Uint8Array(await response.arrayBuffer()), headers: response.headers });
  }
}

beforeEach(async () => {
  bucket = new FakeR2();
  pending = [];
  await bucket.put('top/carol/loop.h264.mp4', '0123456789', { httpMetadata: { contentType: 'video/mp4' } });
  await bucket.put('reels/manifest.json', '{"reels":[]}', { httpMetadata: { contentType: 'application/json' } });
  await bucket.put('private/notes.txt', 'secret');
});

describe('mediaKey', () => {
  it('maps public paths to bucket keys', () => {
    expect(mediaKey('/media/top/carol/poster.jpg')).toBe('top/carol/poster.jpg');
    expect(mediaKey('/media/reels/123/video.mp4')).toBe('reels/123/video.mp4');
  });

  it('refuses other prefixes, traversal and odd characters', () => {
    expect(mediaKey('/media/private/notes.txt')).toBeUndefined();
    expect(mediaKey('/media/top/../private/notes.txt')).toBeUndefined();
    expect(mediaKey('/media/top/%2e%2e/x')).toBeUndefined();
    expect(mediaKey('/media/top/')).toBeUndefined();
    expect(mediaKey('/media/top/Carol.mp4')).toBeUndefined();
    expect(mediaKey('/media/top/%E0%A4%A')).toBeUndefined();
    expect(mediaKey('/other/top/x.mp4')).toBeUndefined();
  });
});

describe('GET /media/*', () => {
  it('serves an object with its type, an ETag and a year of immutable caching', async () => {
    const res = await get('/media/top/carol/loop.h264.mp4');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('0123456789');
    expect(res.headers.get('Content-Type')).toBe('video/mp4');
    expect(res.headers.get('Content-Length')).toBe('10');
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    expect(res.headers.get('ETag')).toMatch(/^".+"$/);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it('caches the reels manifest briefly', async () => {
    const res = await get('/media/reels/manifest.json');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
  });

  it('answers a byte range with 206 and Content-Range', async () => {
    const res = await get('/media/top/carol/loop.h264.mp4', { Range: 'bytes=2-5' });
    expect(res.status).toBe(206);
    expect(await res.text()).toBe('2345');
    expect(res.headers.get('Content-Range')).toBe('bytes 2-5/10');
    expect(res.headers.get('Content-Length')).toBe('4');
  });

  it('answers open-ended and suffix ranges', async () => {
    const open = await get('/media/top/carol/loop.h264.mp4', { Range: 'bytes=7-' });
    expect(open.headers.get('Content-Range')).toBe('bytes 7-9/10');
    expect(await open.text()).toBe('789');
    const suffix = await get('/media/top/carol/loop.h264.mp4', { Range: 'bytes=-3' });
    expect(suffix.headers.get('Content-Range')).toBe('bytes 7-9/10');
  });

  it('answers 416 for a range past the end', async () => {
    const res = await get('/media/top/carol/loop.h264.mp4', { Range: 'bytes=50-' });
    expect(res.status).toBe(416);
    expect(res.headers.get('Content-Range')).toBe('bytes */10');
  });

  it('answers 304 when the ETag matches', async () => {
    const first = await get('/media/top/carol/loop.h264.mp4');
    const res = await get('/media/top/carol/loop.h264.mp4', { 'If-None-Match': first.headers.get('ETag')! });
    expect(res.status).toBe(304);
  });

  it('answers HEAD without a body', async () => {
    const res = await get('/media/top/carol/loop.h264.mp4', undefined, 'HEAD');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Length')).toBe('10');
    expect(await res.text()).toBe('');
  });

  it('404s missing objects and private prefixes', async () => {
    expect((await get('/media/top/nope.mp4')).status).toBe(404);
    expect((await get('/media/private/notes.txt')).status).toBe(404);
  });

  it('keeps a full copy in the edge cache and answers repeats from it', async () => {
    const cache = new FakeCache();
    const gets = vi.spyOn(bucket, 'get');
    expect(await (await get('/media/top/carol/loop.h264.mp4', undefined, 'GET', cache as unknown as Cache)).text()).toBe('0123456789');
    await Promise.all(pending);
    const again = await get('/media/top/carol/loop.h264.mp4', { Range: 'bytes=2-3' }, 'GET', cache as unknown as Cache);
    expect(again.status).toBe(206);
    expect(await again.text()).toBe('23');
    expect(gets).toHaveBeenCalledTimes(1);
  });

  it('fills the edge cache with the whole file after a range miss', async () => {
    const cache = new FakeCache();
    const first = await get('/media/top/carol/loop.h264.mp4', { Range: 'bytes=0-1' }, 'GET', cache as unknown as Cache);
    expect(await first.text()).toBe('01');
    await Promise.all(pending);
    const stored = cache.store.get('https://voxford.example/media/top/carol/loop.h264.mp4')!;
    expect(new TextDecoder().decode(stored.body)).toBe('0123456789');
    expect(stored.headers.get('Content-Range')).toBeNull();
    expect(stored.headers.get('Content-Length')).toBe('10');
  });

  it('skips the edge cache on workers.dev, where it would only double R2 reads', async () => {
    const cache = new FakeCache();
    const gets = vi.spyOn(bucket, 'get');
    const res = await handleMedia(
      new Request('https://voxford-web.example.workers.dev/media/top/carol/loop.h264.mp4', { headers: { Range: 'bytes=0-1' } }),
      env(),
      ctx,
      cache as unknown as Cache,
    );
    expect(res.status).toBe(206);
    await Promise.all(pending);
    expect(cache.store.size).toBe(0);
    expect(gets).toHaveBeenCalledTimes(1);
  });

  it('ignores the query string for the edge cache', async () => {
    const cache = new FakeCache();
    const gets = vi.spyOn(bucket, 'get');
    await get('/media/top/carol/loop.h264.mp4', undefined, 'GET', cache as unknown as Cache);
    await Promise.all(pending);
    const res = await get('/media/top/carol/loop.h264.mp4?utm=x', undefined, 'GET', cache as unknown as Cache);
    expect(await res.text()).toBe('0123456789');
    expect(gets).toHaveBeenCalledTimes(1);
  });

  it('rethrows an R2 failure on a satisfiable range instead of answering 416', async () => {
    vi.spyOn(bucket, 'get').mockRejectedValueOnce(new Error('R2 unavailable'));
    await expect(get('/media/top/carol/loop.h264.mp4', { Range: 'bytes=0-' })).rejects.toThrow('R2 unavailable');
  });

  it('lets a real R2 failure surface as an error, not as 416', async () => {
    vi.spyOn(bucket, 'get').mockRejectedValueOnce(new Error('R2 unavailable'));
    await expect(get('/media/top/carol/loop.h264.mp4')).rejects.toThrow('R2 unavailable');
  });

  it('never edge-caches the reels manifest or a 404', async () => {
    const cache = new FakeCache();
    await get('/media/reels/manifest.json', undefined, 'GET', cache as unknown as Cache);
    await get('/media/top/nope.mp4', undefined, 'GET', cache as unknown as Cache);
    await Promise.all(pending);
    expect(cache.store.size).toBe(0);
  });

  it('refuses writes', async () => {
    const res = await get('/media/top/carol/loop.h264.mp4', undefined, 'POST');
    expect(res.status).toBe(405);
  });
});

describe('the router', () => {
  it('sends /media/* to the media handler', async () => {
    const { default: worker } = await import('./index');
    const ctx = { waitUntil: () => {}, passThroughOnException: () => {}, props: {} } as unknown as ExecutionContext;
    const res = await worker.fetch!(new Request('https://voxford.example/media/top/carol/loop.h264.mp4') as never, env(), ctx);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('0123456789');
  });
});

describe('parseRange', () => {
  it('reads single byte ranges', () => {
    expect(parseRange('bytes=0-99')).toEqual({ offset: 0, length: 100 });
    expect(parseRange('bytes=100-')).toEqual({ offset: 100 });
    expect(parseRange('bytes=-500')).toEqual({ suffix: 500 });
  });

  it('ignores what it cannot serve as one range', () => {
    expect(parseRange(null)).toBeUndefined();
    expect(parseRange('bytes=0-1,5-6')).toBeUndefined();
    expect(parseRange('bytes=9-2')).toBeUndefined();
    expect(parseRange('bytes=-')).toBeUndefined();
    expect(parseRange('items=0-1')).toBeUndefined();
  });
});

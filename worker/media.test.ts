import { beforeEach, describe, expect, it } from 'vitest';
import type { Env } from './env';
import { handleMedia, mediaKey } from './media';
import { FakeR2 } from './test-support/fake-r2';

let bucket: FakeR2;
const env = () => ({ MEDIA: bucket.asBinding() }) as unknown as Env;
const get = (path: string, headers?: HeadersInit, method = 'GET') =>
  handleMedia(new Request(`https://voxford.example${path}`, { method, headers }), env());

beforeEach(async () => {
  bucket = new FakeR2();
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
  it('serves an object with its type, an ETag and a week of caching', async () => {
    const res = await get('/media/top/carol/loop.h264.mp4');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('0123456789');
    expect(res.headers.get('Content-Type')).toBe('video/mp4');
    expect(res.headers.get('Content-Length')).toBe('10');
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    expect(res.headers.get('ETag')).toMatch(/^".+"$/);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=604800');
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

import { describe, expect, it, vi } from 'vitest';
import { handleRangedAsset, RANGED_ASSET } from './asset-ranges';
import type { Env } from './env';
import worker from './index';

const FILE = '0123456789';
const ETAG = '"abc"';

/** The static-assets binding as production behaves: the whole file, whatever the Range header says. */
const assets = {
  fetch: vi.fn(async (request: Request) => {
    if (!request.url.endsWith('.webm') && !request.url.endsWith('.m4a')) return new Response('page', { status: 200 });
    if (request.headers.get('If-None-Match') === ETAG) return new Response(null, { status: 304, headers: { ETag: ETAG } });
    return new Response(FILE, {
      status: 200,
      headers: { 'Content-Type': 'audio/webm', 'Cache-Control': 'public, max-age=31536000, immutable', ETag: ETAG },
    });
  }),
};
const env = { ASSETS: assets } as unknown as Env;
const get = (headers?: HeadersInit, method = 'GET', path = '/_astro/carol-chord.CIOgtpCn.webm') =>
  handleRangedAsset(new Request(`https://voxford.example${path}`, { method, headers }), env);

describe('RANGED_ASSET', () => {
  it('matches the build audio only', () => {
    expect(RANGED_ASSET.test('/_astro/carol-chord.CIOgtpCn.webm')).toBe(true);
    expect(RANGED_ASSET.test('/_astro/carol-chord.BUI1HiGr.m4a')).toBe(true);
    expect(RANGED_ASSET.test('/_astro/index.Bx1.js')).toBe(false);
    expect(RANGED_ASSET.test('/_astro/deep/x.webm')).toBe(false);
    expect(RANGED_ASSET.test('/media/top/x.webm')).toBe(false);
  });
});

describe('GET /_astro/*.webm|m4a', () => {
  it('serves the whole file with Accept-Ranges when no range is asked', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    expect(res.headers.get('Content-Type')).toBe('audio/webm');
    expect(await res.text()).toBe(FILE);
  });

  it('answers a byte range with 206 and Content-Range', async () => {
    const res = await get({ Range: 'bytes=2-5' });
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe('bytes 2-5/10');
    expect(res.headers.get('Content-Length')).toBe('4');
    expect(res.headers.get('Content-Type')).toBe('audio/webm');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('ETag')).toBe(ETAG);
    expect(await res.text()).toBe('2345');
  });

  it('answers open-ended, suffix and over-long ranges', async () => {
    expect(await (await get({ Range: 'bytes=7-' })).text()).toBe('789');
    expect(await (await get({ Range: 'bytes=-3' })).text()).toBe('789');
    const long = await get({ Range: 'bytes=8-99' });
    expect(long.headers.get('Content-Range')).toBe('bytes 8-9/10');
    expect(await long.text()).toBe('89');
  });

  it('answers 416 for a range past the end', async () => {
    const res = await get({ Range: 'bytes=10-' });
    expect(res.status).toBe(416);
    expect(res.headers.get('Content-Range')).toBe('bytes */10');
  });

  it('serves the whole file for a malformed range or a stale If-Range', async () => {
    expect((await get({ Range: 'bytes=0-1,4-5' })).status).toBe(200);
    expect((await get({ Range: 'bytes=2-5', 'If-Range': '"old"' })).status).toBe(200);
    expect((await get({ Range: 'bytes=2-5', 'If-Range': ETAG })).status).toBe(206);
  });

  it('passes a 304 through and keeps HEAD bodiless', async () => {
    expect((await get({ 'If-None-Match': ETAG })).status).toBe(304);
    const head = await get({ Range: 'bytes=2-5' }, 'HEAD');
    expect(head.status).toBe(206);
    expect(head.headers.get('Content-Length')).toBe('4');
    expect(await head.text()).toBe('');
  });

  it('asks the asset server for the whole file', async () => {
    assets.fetch.mockClear();
    await get({ Range: 'bytes=2-5' });
    const inner = assets.fetch.mock.calls[0]![0];
    expect(inner.headers.has('Range')).toBe(false);
  });

  it('is wired into the Worker', async () => {
    const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} } as unknown as ExecutionContext;
    const res = await worker.fetch!(
      new Request('https://voxford.example/_astro/carol-chord.BUI1HiGr.m4a', { headers: { Range: 'bytes=0-1' } }) as never,
      env,
      ctx,
    );
    expect(res.status).toBe(206);
    expect(await res.text()).toBe('01');
  });
});

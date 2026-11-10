import { describe, expect, it, vi } from 'vitest';
import type { Env } from './env';
import worker from './index';
import { pickLocale, preferredLanguages } from './lang-redirect';

const assets = { fetch: vi.fn(async () => new Response('asset', { status: 200 })) };
const env = (vars: Partial<Env> = {}) => ({ ASSETS: assets, ...vars }) as unknown as Env;
const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} } as unknown as ExecutionContext;

const call = (path: string, init?: RequestInit, vars?: Partial<Env>) =>
  worker.fetch!(new Request(`https://voxford.example${path}`, init) as never, env(vars), ctx);

describe('GET /', () => {
  it('sends Croatian browsers to /hr/', async () => {
    const res = await call('/', { headers: { 'Accept-Language': 'hr-HR,hr;q=0.9,en;q=0.8' } });
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('https://voxford.example/hr/');
    expect(res.headers.get('Vary')).toBe('Accept-Language');
  });

  it('sends everyone else, and no header, to /en/', async () => {
    expect((await call('/', { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } })).headers.get('Location')).toBe(
      'https://voxford.example/en/',
    );
    expect((await call('/')).headers.get('Location')).toBe('https://voxford.example/en/');
  });

  it('keeps the query string', async () => {
    const res = await call('/?utm_source=ig', { headers: { 'Accept-Language': 'hr' } });
    expect(res.headers.get('Location')).toBe('https://voxford.example/hr/?utm_source=ig');
  });
});

describe('Accept-Language parsing', () => {
  it('orders by quality, then by position', () => {
    expect(preferredLanguages('en;q=0.5, hr, de;q=0.5')).toEqual(['hr', 'en', 'de']);
  });

  it('ignores q=0 and wildcards', () => {
    expect(pickLocale('hr;q=0, *;q=0.5')).toBe('en');
  });

  it('picks the first language the site has, not just the first listed', () => {
    expect(pickLocale('de-DE, de;q=0.9, hr;q=0.8, en;q=0.7')).toBe('hr');
    expect(pickLocale('de, en;q=0.9, hr;q=0.8')).toBe('en');
  });

  it('only treats hr as Croatian', () => {
    expect(pickLocale('hr-BA')).toBe('hr');
    expect(pickLocale('sr, bs')).toBe('en');
  });
});

describe('GET /healthz', () => {
  it('answers ok with the deployed commit', async () => {
    const res = await call('/healthz', undefined, { COMMIT_SHA: 'abc123' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, commit: 'abc123' });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('reports a null commit locally', async () => {
    expect(await (await call('/healthz')).json()).toEqual({ ok: true, commit: null });
  });
});

describe('/api', () => {
  it('routes /api/inquiry to the inquiry handler (worker/inquiry.test.ts covers it)', async () => {
    expect((await call('/api/inquiry')).status).toBe(405);
    expect((await call('/api/inquiry/', { method: 'POST' })).status).toBe(415);
  });

  it('404s unknown API paths as JSON', async () => {
    const res = await call('/api/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('everything else', () => {
  it('falls through to static assets', async () => {
    const res = await call('/en/about/');
    expect(await res.text()).toBe('asset');
    expect(assets.fetch).toHaveBeenCalled();
  });
});

describe('scheduled', () => {
  it('runs the reels sync', async () => {
    await worker.scheduled!({} as ScheduledController, env(), ctx);
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
  });
});

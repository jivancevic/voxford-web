import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from './env';
import { IG_GRAPH } from './instagram';
import { MANIFEST_KEY, readManifest, syncReels, type ReelsManifest } from './reels';
import { FakeR2 } from './test-support/fake-r2';

// A fake Instagram API and CDN: the account's media list (newest first, paged),
// the files behind media_url/thumbnail_url and the deploy hook. Every request
// is recorded.

const HOOK = 'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/test-hook';
const TOKEN = 'EAAtest-system-user-token';
const USER_ID = '17841400000000000';
const MEDIA_URL = `${IG_GRAPH}/v24.0/${USER_ID}/media`;
const ASSIGNED_URL = `${IG_GRAPH}/v24.0/me/assigned_instagram_accounts`;

interface FakeMedia {
  id: string;
  type?: 'VIDEO' | 'IMAGE';
  product?: 'REELS' | 'FEED';
  caption?: string;
  day: number;
}

function media(m: FakeMedia) {
  return {
    id: m.id,
    caption: m.caption ?? `Reel ${m.id} #voxford`,
    media_type: m.type ?? 'VIDEO',
    media_product_type: m.product ?? 'REELS',
    media_url: `https://cdn.example/${m.id}.mp4?sig=x`,
    ...(m.type === 'IMAGE' ? {} : { thumbnail_url: `https://cdn.example/${m.id}.jpg?sig=x` }),
    permalink: `https://www.instagram.com/reel/${m.id}/`,
    timestamp: `2026-11-${String(m.day).padStart(2, '0')}T12:00:00+0000`,
  };
}

class FakeInstagram {
  pages: FakeMedia[][] = [];
  apiStatus = 200;
  /** The Instagram accounts assigned to the token's system user. */
  assigned: { id: string; username: string }[] = [{ id: USER_ID, username: 'voxford.official' }];
  cdnFails = new Set<string>();
  hookStatus = 200;
  requests: { url: string; method: string }[] = [];

  fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    this.requests.push({ url, method: init?.method ?? 'GET' });
    if (url === HOOK) return Response.json({ success: true }, { status: this.hookStatus });
    if (url.startsWith(`${ASSIGNED_URL}?`)) return Response.json({ data: this.assigned });
    if (url.startsWith(`${MEDIA_URL}?`)) {
      if (this.apiStatus !== 200) {
        return Response.json({ error: { message: 'Error validating access token', code: 190 } }, { status: this.apiStatus });
      }
      const page = Number(new URL(url).searchParams.get('page') ?? '0');
      const next = page + 1 < this.pages.length ? `${MEDIA_URL}?page=${page + 1}` : undefined;
      return Response.json({ data: (this.pages[page] ?? []).map(media), ...(next ? { paging: { next } } : {}) });
    }
    if (url.startsWith('https://cdn.example/')) {
      const file = new URL(url).pathname.slice(1);
      if (this.cdnFails.has(file)) return new Response('gone', { status: 403 });
      const type = file.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
      const body = `bytes of ${file}`;
      return new Response(body, { headers: { 'Content-Type': type, 'Content-Length': String(body.length) } });
    }
    return new Response('unexpected', { status: 599 });
  });

  hits(prefix: string) {
    return this.requests.filter((r) => r.url.startsWith(prefix));
  }
}

let ig: FakeInstagram;
let bucket: FakeR2;
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const ctx = {} as ExecutionContext;
let NOW = new Date('2026-11-10T04:17:00Z');
const later = (days: number) => (NOW = new Date(NOW.getTime() + days * 86_400_000));

const env = (vars: Partial<Env> = {}) =>
  ({ MEDIA: bucket.asBinding(), INSTAGRAM_TOKEN: TOKEN, DEPLOY_HOOK_URL: HOOK, ...vars }) as unknown as Env;
const run = (vars?: Partial<Env>) => syncReels(env(vars), ctx, { fetch: ig.fetch as typeof fetch, now: () => NOW, log });
const manifest = () => JSON.parse(bucket.text(MANIFEST_KEY)!) as ReelsManifest;
const reels = (...ids: number[]): FakeMedia[] => ids.map((id) => ({ id: String(id), day: id }));

beforeEach(() => {
  NOW = new Date('2026-11-10T04:17:00Z');
  ig = new FakeInstagram();
  bucket = new FakeR2();
  vi.clearAllMocks();
});

describe('syncReels', () => {
  it('copies the newest six reels into R2, writes the manifest and triggers a rebuild', async () => {
    ig.pages = [reels(9, 8, 7, 6, 5, 4, 3, 2)];
    const result = await run();

    expect(result).toEqual({ status: 'updated', reels: 6, rebuilt: true });
    const m = manifest();
    expect(m.version).toBe(1);
    expect(m.updatedAt).toBe(NOW.toISOString());
    expect(m.reels.map((r) => r.id)).toEqual(['9', '8', '7', '6', '5', '4']);
    expect(m.reels[0]).toEqual({
      id: '9',
      caption: 'Reel 9 #voxford',
      permalink: 'https://www.instagram.com/reel/9/',
      timestamp: '2026-11-09T12:00:00+0000',
      video: 'reels/9/video.mp4',
      thumbnail: 'reels/9/thumb.jpg',
    });
    expect(bucket.text('reels/9/video.mp4')).toBe('bytes of 9.mp4');
    expect(bucket.text('reels/9/thumb.jpg')).toBe('bytes of 9.jpg');
    expect(bucket.objects.get('reels/9/video.mp4')!.httpMetadata.contentType).toBe('video/mp4');
    expect(bucket.objects.has('reels/3/video.mp4')).toBe(false);
    expect(ig.hits(HOOK)).toEqual([{ url: HOOK, method: 'POST' }]);
  });

  it('never stores Instagram CDN URLs or the token', async () => {
    ig.pages = [reels(3, 2, 1)];
    await run();
    const stored = [...bucket.objects.keys()].map((k) => bucket.text(k)).join('\n');
    expect(stored).not.toContain('cdn.example');
    expect(stored).not.toContain(TOKEN);
  });

  it('skips photos, carousels and feed videos', async () => {
    ig.pages = [
      [
        { id: '5', day: 5, type: 'IMAGE' },
        { id: '4', day: 4, product: 'FEED' },
        { id: '3', day: 3 },
      ],
    ];
    await run();
    expect(manifest().reels.map((r) => r.id)).toEqual(['3']);
  });

  it('follows paging until it has six reels', async () => {
    ig.pages = [
      [{ id: '20', day: 20, type: 'IMAGE' }, ...reels(19, 18)],
      reels(17, 16, 15),
      reels(14, 13),
      reels(12),
    ];
    await run();
    expect(manifest().reels.map((r) => r.id)).toEqual(['19', '18', '17', '16', '15', '14']);
    expect(ig.hits(MEDIA_URL)).toHaveLength(3);
  });

  it('does nothing when nothing changed: no writes, no rebuild', async () => {
    ig.pages = [reels(3, 2, 1)];
    await run();
    const etag = bucket.objects.get(MANIFEST_KEY)!.etag;
    ig.requests = [];

    const result = await run();
    expect(result).toEqual({ status: 'unchanged', reels: 3, rebuilt: false });
    expect(bucket.objects.get(MANIFEST_KEY)!.etag).toBe(etag);
    expect(ig.hits('https://cdn.example/')).toHaveLength(0);
    expect(ig.hits(HOOK)).toHaveLength(0);
  });

  it('adds a new reel, downloads only it, and drops the oldest a week later', async () => {
    ig.pages = [reels(6, 5, 4, 3, 2, 1)];
    await run();
    ig.requests = [];
    ig.pages = [reels(7, 6, 5, 4, 3, 2, 1)];

    const result = await run();
    expect(result.status).toBe('updated');
    expect(manifest().reels.map((r) => r.id)).toEqual(['7', '6', '5', '4', '3', '2']);
    expect(ig.hits('https://cdn.example/').map((r) => r.url)).toEqual([
      'https://cdn.example/7.mp4?sig=x',
      'https://cdn.example/7.jpg?sig=x',
    ]);
    expect(ig.hits(HOOK)).toHaveLength(1);
    // A live page may show reel 1 until the rebuild lands: its files stay for RETIRE_DAYS.
    expect(manifest().retired).toEqual([{ id: '1', since: NOW.toISOString() }]);

    later(6);
    await run();
    expect(bucket.objects.has('reels/1/video.mp4')).toBe(true);

    later(2);
    await run();
    expect(manifest().retired).toEqual([]);
    expect(bucket.objects.has('reels/1/video.mp4')).toBe(false);
    expect(bucket.objects.has('reels/1/thumb.jpg')).toBe(false);
    expect(bucket.objects.has('reels/2/video.mp4')).toBe(true);
  });

  it('takes a reel back out of retirement when it returns to the feed', async () => {
    ig.pages = [reels(2, 1)];
    await run();
    ig.pages = [reels(3, 2)];
    await run();
    ig.pages = [reels(2, 1)];
    await run();
    expect(manifest().retired.map((r) => r.id)).toEqual(['3']);
  });

  it('keeps the feed when Instagram answers with no reels at all', async () => {
    ig.pages = [reels(2, 1)];
    await run();
    const before = bucket.text(MANIFEST_KEY);
    ig.pages = [[]];
    const result = await run();
    expect(result).toEqual({ status: 'unchanged', reels: 2, rebuilt: false });
    expect(bucket.text(MANIFEST_KEY)).toBe(before);
    expect(bucket.objects.has('reels/1/video.mp4')).toBe(true);
    expect(log.warn).toHaveBeenCalledWith('reels: Instagram returned no reels; keeping the current feed');
  });

  it('skips a video without a thumbnail rather than store the video as one', async () => {
    ig.pages = [reels(2, 1)];
    const original = ig.fetch.getMockImplementation()!;
    ig.fetch.mockImplementation(async (input, init) => {
      const res = await original(input, init);
      if (!String(input).startsWith(MEDIA_URL)) return res;
      const body = (await res.json()) as { data: Record<string, unknown>[] };
      delete body.data[0]!.thumbnail_url;
      return Response.json(body);
    });
    await run();
    expect(manifest().reels.map((r) => r.id)).toEqual(['1']);
  });

  it('writes the manifest before it asks for the rebuild', async () => {
    ig.pages = [reels(1)];
    let manifestAtHook: string | undefined;
    const original = ig.fetch.getMockImplementation()!;
    ig.fetch.mockImplementation(async (input, init) => {
      if (String(input) === HOOK) manifestAtHook = bucket.text(MANIFEST_KEY);
      return original(input, init);
    });
    await run();
    expect(manifestAtHook).toContain('"id": "1"');
  });

  it('retries a failed rebuild on the next run', async () => {
    ig.pages = [reels(2, 1)];
    await run();
    ig.hookStatus = 500;
    ig.pages = [reels(3, 2)];
    expect((await run()).rebuilt).toBe(false);
    expect(manifest().rebuilt).toBe(false);

    ig.hookStatus = 200;
    ig.requests = [];
    const retry = await run();
    expect(retry).toEqual({ status: 'unchanged', reels: 2, rebuilt: true });
    expect(ig.hits(HOOK)).toHaveLength(1);
    expect(manifest().rebuilt).toBe(true);
    // Retired reel 1 still waits out its week.
    expect(bucket.objects.has('reels/1/video.mp4')).toBe(true);
  });

  it('keeps retired files past the week while the rebuild is still pending', async () => {
    ig.pages = [reels(2, 1)];
    await run({ DEPLOY_HOOK_URL: undefined });
    ig.pages = [reels(3, 2)];
    await run({ DEPLOY_HOOK_URL: undefined });
    later(30);
    await run({ DEPLOY_HOOK_URL: undefined });
    expect(manifest().rebuilt).toBe(false);
    expect(bucket.objects.has('reels/1/video.mp4')).toBe(true);
    later(1);
    await run();
    expect(bucket.objects.has('reels/1/video.mp4')).toBe(false);
  });

  it('rebuilds when only a caption changed', async () => {
    ig.pages = [reels(2, 1)];
    await run();
    ig.pages = [[{ id: '2', day: 2, caption: 'Edited caption' }, ...reels(1)]];
    const result = await run();
    expect(result.rebuilt).toBe(true);
    expect(manifest().reels[0]!.caption).toBe('Edited caption');
  });

  it('keeps the last good feed when the API is down', async () => {
    ig.pages = [reels(2, 1)];
    await run();
    const before = bucket.text(MANIFEST_KEY);
    ig.apiStatus = 500;

    await expect(run()).rejects.toThrow('Instagram API 500');
    expect(bucket.text(MANIFEST_KEY)).toBe(before);
  });

  it('reports an expired token without leaking it', async () => {
    ig.apiStatus = 400;
    const err = await run().catch((e: Error) => e);
    expect(String(err)).toContain('190 Error validating access token');
    expect(String(err)).not.toContain(TOKEN);
  });

  it('writes no manifest when a download fails, so the feed never points at a missing file', async () => {
    ig.pages = [reels(2, 1)];
    await run();
    const before = bucket.text(MANIFEST_KEY);
    ig.pages = [reels(3, 2, 1)];
    ig.cdnFails.add('3.jpg');

    await expect(run()).rejects.toThrow('download reels/3/thumb.jpg: HTTP 403');
    expect(bucket.text(MANIFEST_KEY)).toBe(before);
    expect(ig.hits(HOOK)).toHaveLength(1); // only the first run's
  });

  it('re-copies a reel whose files went missing', async () => {
    ig.pages = [reels(1)];
    await run();
    await bucket.delete('reels/1/video.mp4');
    ig.requests = [];
    await run();
    expect(bucket.text('reels/1/video.mp4')).toBe('bytes of 1.mp4');
  });

  it('does nothing without a token', async () => {
    const result = await run({ INSTAGRAM_TOKEN: undefined, INSTAGRAM_USER_ID: USER_ID });
    expect(result).toEqual({ status: 'skipped', reels: 0, rebuilt: false });
    expect(ig.requests).toHaveLength(0);
  });

  it('updates the feed without a deploy hook, and says so', async () => {
    ig.pages = [reels(1)];
    const result = await run({ DEPLOY_HOOK_URL: undefined });
    expect(result).toEqual({ status: 'updated', reels: 1, rebuilt: false });
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('DEPLOY_HOOK_URL is not set'));
  });

  it('logs a failed deploy hook without failing the sync', async () => {
    ig.pages = [reels(1)];
    ig.hookStatus = 500;
    const result = await run();
    expect(result.rebuilt).toBe(false);
    expect(manifest().rebuilt).toBe(false);
    expect(log.error).toHaveBeenCalledWith('reels: deploy hook answered 500');
  });

  it("reads the reels of the account assigned to the token's system user, and never refreshes the token", async () => {
    ig.pages = [reels(1)];
    await run();
    const api = ig.hits(`${IG_GRAPH}/`).map((r) => new URL(r.url));
    expect(api.map((u) => u.pathname)).toEqual(['/v24.0/me/assigned_instagram_accounts', `/v24.0/${USER_ID}/media`]);
    expect(api.every((u) => u.searchParams.get('access_token') === TOKEN)).toBe(true);
    expect(api[1]!.searchParams.get('fields')).toContain('media_product_type');
  });

  it('reads the account INSTAGRAM_USER_ID names without asking which is assigned', async () => {
    ig.pages = [reels(1)];
    ig.assigned = [];
    await run({ INSTAGRAM_USER_ID: USER_ID });
    expect(ig.hits(ASSIGNED_URL)).toHaveLength(0);
    expect(manifest().reels.map((r) => r.id)).toEqual(['1']);
  });

  it('stops, writing nothing, unless exactly one Instagram account is assigned', async () => {
    ig.pages = [reels(1)];
    ig.assigned = [];
    await expect(run()).rejects.toThrow('0 Instagram accounts assigned');
    ig.assigned = [
      { id: USER_ID, username: 'voxford.official' },
      { id: '17841499999999999', username: 'someone.else' },
    ];
    await expect(run()).rejects.toThrow('2 Instagram accounts assigned; assign exactly one or set INSTAGRAM_USER_ID');
    expect(ig.hits(MEDIA_URL)).toHaveLength(0);
    expect(bucket.objects.size).toBe(0);
  });

  it('refuses a user id that is not numeric, before reading media', async () => {
    await expect(run({ INSTAGRAM_USER_ID: 'voxford.official' })).rejects.toThrow('not a numeric Instagram user id');
    expect(ig.requests).toHaveLength(0);
  });

  it('refuses media ids that would escape the reels/ prefix', async () => {
    ig.pages = [[{ id: '../top/x', day: 1 }]];
    await expect(run()).rejects.toThrow('unexpected media id');
    expect(bucket.objects.size).toBe(0);
  });
});

describe('readManifest', () => {
  it('ignores a corrupt or foreign manifest', async () => {
    await bucket.put(MANIFEST_KEY, 'not json');
    expect(await readManifest(bucket.asBinding())).toBeUndefined();
    await bucket.put(MANIFEST_KEY, JSON.stringify({ version: 99, reels: [] }));
    expect(await readManifest(bucket.asBinding())).toBeUndefined();
  });
});

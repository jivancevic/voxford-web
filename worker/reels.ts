import type { Env } from './env';
import { latestReels, refreshToken, type Fetch, type IgMedia } from './instagram';

// Daily reels sync (cron in wrangler.jsonc, called from worker/index.ts).
//
// 1. Ask the Instagram API for the newest REEL_COUNT reels.
// 2. Copy each new reel's video and thumbnail into R2 (the Instagram CDN URLs
//    expire, so the site never links them).
// 3. Write reels/manifest.json, which the static build reads (src/lib/reels.ts).
// 4. If the set of reels changed, POST the Workers Builds deploy hook, so the
//    Videos page is rebuilt as static HTML.
// 5. Extend the token's 60-day life.
//
// All or nothing: the manifest is written only after every file is in R2, so a
// failed run leaves the last good feed in place and the site keeps rendering.
// Without INSTAGRAM_TOKEN the sync does nothing (local dev, before setup).

export const REEL_COUNT = 6;
export const MANIFEST_KEY = 'reels/manifest.json';
export const MANIFEST_VERSION = 1;
const CAPTION_MAX = 2200; // Instagram's own caption limit

export interface Reel {
  id: string;
  caption: string;
  permalink: string;
  /** ISO 8601, from Instagram. */
  timestamp: string;
  /** R2 keys, served at /media/<key>. */
  video: string;
  thumbnail: string;
}

export interface ReelsManifest {
  version: typeof MANIFEST_VERSION;
  /** When the feed last changed (ISO 8601). */
  updatedAt: string;
  reels: Reel[];
}

export interface SyncResult {
  status: 'skipped' | 'unchanged' | 'updated';
  reels: number;
  rebuilt: boolean;
}

interface Deps {
  fetch: Fetch;
  now: () => Date;
  log: Pick<Console, 'info' | 'warn' | 'error'>;
}

const defaultDeps = (): Deps => ({ fetch: (input, init) => fetch(input, init), now: () => new Date(), log: console });

const keysFor = (id: string) => ({ video: `reels/${id}/video.mp4`, thumbnail: `reels/${id}/thumb.jpg` });

/** Two feeds show the same thing: same reels, same order, same captions. */
function sameFeed(a: readonly Reel[], b: readonly Reel[]): boolean {
  return a.length === b.length && a.every((r, i) => r.id === b[i]!.id && r.caption === b[i]!.caption);
}

export async function readManifest(bucket: R2Bucket): Promise<ReelsManifest | undefined> {
  const object = await bucket.get(MANIFEST_KEY);
  if (!object || !('body' in object)) return undefined;
  try {
    const data = (await object.json()) as ReelsManifest;
    return data.version === MANIFEST_VERSION && Array.isArray(data.reels) ? data : undefined;
  } catch {
    return undefined;
  }
}

/** Download a URL into R2 under `key`. Throws on a non-2xx answer. */
async function copyToR2(deps: Deps, bucket: R2Bucket, url: string, key: string, fallbackType: string): Promise<void> {
  const res = await deps.fetch(url);
  if (!res.ok || !res.body) throw new Error(`download ${key}: HTTP ${res.status}`);
  const contentType = res.headers.get('Content-Type') ?? fallbackType;
  // R2 needs a known length for a stream; buffer when the CDN sends none.
  const body = res.headers.has('Content-Length') ? res.body : await res.arrayBuffer();
  await bucket.put(key, body, { httpMetadata: { contentType, cacheControl: 'public, max-age=604800' } });
}

function toReel(media: IgMedia): Reel {
  if (!/^\d+$/.test(media.id)) throw new Error(`unexpected media id ${JSON.stringify(media.id)}`);
  return {
    id: media.id,
    caption: (media.caption ?? '').slice(0, CAPTION_MAX),
    permalink: media.permalink,
    timestamp: media.timestamp,
    ...keysFor(media.id),
  };
}

export async function syncReels(env: Env, _ctx: ExecutionContext, deps: Deps = defaultDeps()): Promise<SyncResult> {
  const { log } = deps;
  const token = env.INSTAGRAM_TOKEN;
  if (!token) {
    log.info('reels: INSTAGRAM_TOKEN is not set, skipping');
    return { status: 'skipped', reels: 0, rebuilt: false };
  }
  const bucket = env.MEDIA;

  const media = await latestReels(deps.fetch, token, REEL_COUNT);
  const reels = media.map(toReel);
  const previous = await readManifest(bucket);
  const known = new Set((previous?.reels ?? []).map((r) => r.id));

  // Copy every reel not already in R2 (a re-run after a failure re-copies).
  for (const [i, m] of media.entries()) {
    const reel = reels[i]!;
    if (known.has(reel.id) && (await bucket.head(reel.video)) && (await bucket.head(reel.thumbnail))) continue;
    await copyToR2(deps, bucket, m.media_url!, reel.video, 'video/mp4');
    await copyToR2(deps, bucket, m.thumbnail_url ?? m.media_url!, reel.thumbnail, 'image/jpeg');
  }

  let status: SyncResult['status'] = 'unchanged';
  let rebuilt = false;
  if (!previous || !sameFeed(previous.reels, reels)) {
    const manifest: ReelsManifest = { version: MANIFEST_VERSION, updatedAt: deps.now().toISOString(), reels };
    await bucket.put(MANIFEST_KEY, JSON.stringify(manifest, null, 2), {
      httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl: 'public, max-age=300' },
    });
    status = 'updated';

    // Old reels leave R2 only after the new manifest no longer points at them.
    const keep = new Set(reels.flatMap((r) => [r.video, r.thumbnail]));
    const stale = (await bucket.list({ prefix: 'reels/' })).objects
      .map((o) => o.key)
      .filter((k) => k !== MANIFEST_KEY && !keep.has(k));
    if (stale.length) await bucket.delete(stale);

    rebuilt = await triggerRebuild(env, deps);
  }

  await extendToken(token, deps);
  log.info(`reels: ${status}, ${reels.length} reels${rebuilt ? ', rebuild triggered' : ''}`);
  return { status, reels: reels.length, rebuilt };
}

async function triggerRebuild(env: Env, deps: Deps): Promise<boolean> {
  if (!env.DEPLOY_HOOK_URL) {
    deps.log.warn('reels: feed changed but DEPLOY_HOOK_URL is not set; the page updates on the next deploy');
    return false;
  }
  const res = await deps.fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  if (!res.ok) {
    deps.log.error(`reels: deploy hook answered ${res.status}`);
    return false;
  }
  return true;
}

/** A failed refresh never fails the sync; the log says how long the token has left. */
async function extendToken(token: string, deps: Deps): Promise<void> {
  try {
    const refreshed = await refreshToken(deps.fetch, token);
    const days = Math.floor(refreshed.expires_in / 86_400);
    if (refreshed.access_token !== token) {
      deps.log.warn(
        `reels: Instagram issued a new token (valid ${days} days); the stored one still works until it expires. Store the new one with scripts/instagram-wizard.sh refresh.`,
      );
    } else {
      deps.log.info(`reels: token extended, valid ${days} more days`);
    }
  } catch (err) {
    deps.log.warn(`reels: token refresh failed: ${(err as Error).message}`);
  }
}

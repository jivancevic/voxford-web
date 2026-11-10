import type { Env } from './env';
import { CACHE_IMMUTABLE, CACHE_MANIFEST } from './media';
import { instagramAccountId, latestReels, type Fetch, type IgMedia } from './instagram';

// Daily reels sync (cron in wrangler.jsonc, called from worker/index.ts).
//
// 1. Ask the Instagram API for the newest REEL_COUNT reels.
// 2. Copy each new reel's video and thumbnail into R2 (the Instagram CDN URLs
//    expire, so the site never links them).
// 3. Write reels/manifest.json, which the static build reads (src/lib/reels.ts).
// 4. If the set of reels changed, POST the Workers Builds deploy hook, so the
//    Videos page is rebuilt as static HTML.
//
// All or nothing: the manifest is written only after every file is in R2, so a
// failed run leaves the last good feed in place and the site keeps rendering.
// An empty answer from Instagram keeps the feed too. A reel that leaves the
// feed keeps its files for RETIRE_DAYS and while a rebuild is pending, so a
// live page never loses a file.
// Without INSTAGRAM_TOKEN the sync does nothing (local dev, before setup). The
// token is a system-user token that never expires, so there is nothing to
// refresh; the account is the one it reaches (through the Voxford Page or
// directly), unless INSTAGRAM_USER_ID names it (docs/adr/0004).

export const REEL_COUNT = 6;
export const MANIFEST_KEY = 'reels/manifest.json';
export const MANIFEST_VERSION = 1;
/** Days a replaced reel's files stay in R2 after it left the feed. */
export const RETIRE_DAYS = 7;
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
  /** Whether the deploy hook accepted a rebuild for this feed; a failed one is retried on the next run. */
  rebuilt: boolean;
  /**
   * Reels that left the feed, with when. Their files stay in R2 for RETIRE_DAYS,
   * because a deployed page may still show them (the rebuild may be slow or fail).
   */
  retired: { id: string; since: string }[];
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
    if (data.version !== MANIFEST_VERSION || !Array.isArray(data.reels)) return undefined;
    return { ...data, rebuilt: data.rebuilt !== false, retired: Array.isArray(data.retired) ? data.retired : [] };
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
  await bucket.put(key, body, { httpMetadata: { contentType, cacheControl: CACHE_IMMUTABLE } });
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
    log.info('reels: INSTAGRAM_TOKEN is not set, skipping (scripts/instagram-wizard.sh)');
    return { status: 'skipped', reels: 0, rebuilt: false };
  }
  const bucket = env.MEDIA;
  const userId = env.INSTAGRAM_USER_ID || (await instagramAccountId(deps.fetch, token));

  const media = await latestReels(deps.fetch, token, userId, REEL_COUNT);
  const previous = await readManifest(bucket);
  if (media.length === 0) {
    // An empty answer is more likely an API hiccup than a deleted account: keep the feed.
    log.warn('reels: Instagram returned no reels; keeping the current feed');
    return { status: 'unchanged', reels: previous?.reels.length ?? 0, rebuilt: false };
  }
  const reels = media.map(toReel);
  const known = new Set((previous?.reels ?? []).map((r) => r.id));

  // Copy every reel not already in R2 (a re-run after a failure re-copies).
  for (const [i, m] of media.entries()) {
    const reel = reels[i]!;
    if (known.has(reel.id) && (await bucket.head(reel.video)) && (await bucket.head(reel.thumbnail))) continue;
    await copyToR2(deps, bucket, m.media_url!, reel.video, 'video/mp4');
    await copyToR2(deps, bucket, m.thumbnail_url!, reel.thumbnail, 'image/jpeg');
  }

  const now = deps.now();
  let status: SyncResult['status'] = 'unchanged';
  let rebuilt = false;
  let current: ReelsManifest;
  if (!previous || !sameFeed(previous.reels, reels)) {
    const inFeed = new Set(reels.map((r) => r.id));
    const leaving = (previous?.reels ?? []).filter((r) => !inFeed.has(r.id)).map((r) => ({ id: r.id, since: now.toISOString() }));
    const retired = [...(previous?.retired ?? []).filter((r) => !inFeed.has(r.id)), ...leaving];
    current = { version: MANIFEST_VERSION, updatedAt: now.toISOString(), reels, rebuilt: false, retired };
    // The build reads the manifest, so it is written before the rebuild is asked for.
    await writeManifest(bucket, current);
    status = 'updated';
    rebuilt = await triggerRebuild(env, deps);
    if (rebuilt) await writeManifest(bucket, (current = { ...current, rebuilt }));
  } else {
    current = previous;
    if (!previous.rebuilt) {
      rebuilt = await triggerRebuild(env, deps);
      if (rebuilt) await writeManifest(bucket, (current = { ...current, rebuilt }));
    }
  }

  // Retired reels' files go once no deployed page can still show them: at least
  // RETIRE_DAYS after they left, and never while this feed's rebuild is pending.
  const cutoff = now.getTime() - RETIRE_DAYS * 86_400_000;
  const kept = current.rebuilt ? current.retired.filter((r) => Date.parse(r.since) > cutoff) : current.retired;
  if (kept.length !== current.retired.length) await writeManifest(bucket, (current = { ...current, retired: kept }));
  const keep = new Set([MANIFEST_KEY, ...[...current.reels.map((r) => r.id), ...kept.map((r) => r.id)].flatMap((id) => Object.values(keysFor(id)))]);
  const stale = (await bucket.list({ prefix: 'reels/' })).objects.map((o) => o.key).filter((k) => !keep.has(k));
  if (stale.length) await bucket.delete(stale);

  log.info(`reels: ${status}, ${reels.length} reels${rebuilt ? ', rebuild triggered' : ''}`);
  return { status, reels: reels.length, rebuilt };
}

async function writeManifest(bucket: R2Bucket, manifest: ReelsManifest): Promise<void> {
  await bucket.put(MANIFEST_KEY, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl: CACHE_MANIFEST },
  });
}

async function triggerRebuild(env: Env, deps: Deps): Promise<boolean> {
  if (!env.DEPLOY_HOOK_URL) {
    deps.log.warn('reels: feed changed but DEPLOY_HOOK_URL is not set; the page updates on the next deploy (retried daily)');
    return false;
  }
  const res = await deps.fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  if (!res.ok) {
    deps.log.error(`reels: deploy hook answered ${res.status}`);
    return false;
  }
  return true;
}

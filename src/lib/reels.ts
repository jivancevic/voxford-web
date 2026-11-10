// The latest reels, read at BUILD time from the manifest the daily sync writes
// to R2 (worker/reels.ts), so the Videos page stays static HTML. The build
// fetches it from the deployed site (`<SITE>/media/reels/manifest.json`); the
// sync's deploy hook rebuilds the site when the feed changes.
//
// Anything wrong (no site yet, sync never ran, API down, a malformed file)
// means no reels: the page renders without the feed, never fails the build.
// REELS_MANIFEST_URL overrides the source; REELS_MANIFEST_URL=off skips it.

export interface Reel {
  id: string;
  caption: string;
  permalink: string;
  timestamp: string;
  /** Root-relative URLs served by the Worker. */
  video: string;
  thumbnail: string;
}

const INSTAGRAM_POST = /^https:\/\/www\.instagram\.com\/(reel|p)\/[A-Za-z0-9_-]+\/?$/;

/** Validate one manifest entry; undefined when anything is off. */
function parseReel(value: unknown): Reel | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const r = value as Record<string, unknown>;
  const id = typeof r.id === 'string' && /^\d+$/.test(r.id) ? r.id : undefined;
  if (!id) return undefined;
  if (r.video !== `reels/${id}/video.mp4` || r.thumbnail !== `reels/${id}/thumb.jpg`) return undefined;
  if (typeof r.permalink !== 'string' || !INSTAGRAM_POST.test(r.permalink)) return undefined;
  if (typeof r.timestamp !== 'string' || Number.isNaN(Date.parse(r.timestamp))) return undefined;
  return {
    id,
    caption: typeof r.caption === 'string' ? r.caption : '',
    permalink: r.permalink,
    timestamp: r.timestamp,
    video: `/media/${r.video}`,
    thumbnail: `/media/${r.thumbnail}`,
  };
}

/** The reels in a manifest body, newest first; [] for anything that is not a version-1 manifest. */
export function parseReelsManifest(body: unknown): Reel[] {
  if (!body || typeof body !== 'object') return [];
  const m = body as { version?: unknown; reels?: unknown };
  if (m.version !== 1 || !Array.isArray(m.reels)) return [];
  return m.reels
    .map(parseReel)
    .filter((r): r is Reel => !!r)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

/** First line of a caption, without trailing hashtags, cut to `max` characters on a word. */
export function captionExcerpt(caption: string, max = 110): string {
  const line = (caption.split('\n').find((l) => l.trim()) ?? '').replace(/(\s+#[\p{L}\p{N}_]+)+\s*$/u, '').trim();
  if (line.length <= max) return line;
  const cut = line.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).trimEnd()}…`;
}

export function manifestUrl(site: URL | undefined, override = process.env.REELS_MANIFEST_URL): string | undefined {
  if (override === 'off') return undefined;
  if (override) return override;
  return site ? new URL('/media/reels/manifest.json', site).href : undefined;
}

let cached: Promise<Reel[]> | undefined;

/** The latest reels for this build (fetched once per build). */
export function loadReels(site: URL | undefined): Promise<Reel[]> {
  cached ??= (async () => {
    const url = manifestUrl(site);
    if (!url) return [];
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      return parseReelsManifest(await res.json());
    } catch {
      return [];
    }
  })();
  return cached;
}

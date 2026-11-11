// The newest uploads of the @voxford.official YouTube channel, read at BUILD
// time from the channel's public RSS feed (no API key), so the Videos page
// stays static HTML. The thumbnails are downloaded and resized by the build
// (Astro assets, `image.domains` in astro.config.mjs) and served from our own
// origin; a video plays in place on a press, from youtube-nocookie
// (src/scripts/youtube-play.ts). So a visitor's browser asks YouTube for
// nothing before the press.
//
// Anything wrong (feed down, timeout, not a feed, a malformed entry, no
// thumbnail that answers) means fewer or no videos: the page renders without
// the row, never fails the build.
// YOUTUBE_FEED_URL overrides the source; YOUTUBE_FEED_URL=off skips it.

import { YOUTUBE_CHANNEL_ID } from '@/data/site-facts';

export interface YouTubeVideo {
  id: string;
  title: string;
  /** ISO 8601, UTC. */
  published: string;
  /** Shorts are vertical (9:16); regular uploads are 16:9. */
  kind: 'short' | 'video';
  /** Where the video lives on YouTube: the no-JS fallback and the "open on YouTube" link. */
  url: string;
  /** Thumbnails to try in order, with their source size. */
  thumbnails: Thumbnail[];
}

export interface Thumbnail {
  src: string;
  width: number;
  height: number;
}

/** A video whose thumbnail the build has checked. */
export type LatestYouTubeVideo = Omit<YouTubeVideo, 'thumbnails'> & { thumbnail: Thumbnail };

/** How many uploads the Videos page shows. */
export const LATEST_UPLOADS = 8;

const ytimg = (id: string, name: string) => `https://i.ytimg.com/vi/${id}/${name}.jpg`;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, ref: string) => {
    if (ref[0] === '#') {
      const code = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[ref.toLowerCase()] ?? match;
  });
}

function tag(xml: string, name: string): string | undefined {
  const m = new RegExp(`<${name}>([^<]*)</${name}>`).exec(xml);
  return m?.[1] === undefined ? undefined : decodeXml(m[1].trim());
}

/** One `<entry>`; undefined when anything is off. URLs are rebuilt from the id, never taken from the feed. */
function parseEntry(xml: string): YouTubeVideo | undefined {
  const id = tag(xml, 'yt:videoId');
  if (!id || !VIDEO_ID.test(id)) return undefined;
  const published = tag(xml, 'published');
  const time = published ? Date.parse(published) : NaN;
  if (Number.isNaN(time)) return undefined;
  const title = tag(xml, 'title') ?? '';
  const isShort = /<link rel="alternate" href="https:\/\/www\.youtube\.com\/shorts\//.test(xml);
  return {
    id,
    title,
    published: new Date(time).toISOString(),
    kind: isShort ? 'short' : 'video',
    url: isShort ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
    // A Short's own vertical frame (oar2) is undocumented; hqdefault (4:3, the
    // Short pillarboxed in the middle, which a 9:16 crop recovers) always exists.
    thumbnails: [
      ...(isShort ? [{ src: ytimg(id, 'oar2'), width: 1080, height: 1920 }] : []),
      { src: ytimg(id, 'hqdefault'), width: 480, height: 360 },
    ],
  };
}

/** The uploads in a channel feed, newest first; [] for anything that is not one. */
export function parseYouTubeFeed(xml: string): YouTubeVideo[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  return entries
    .map(parseEntry)
    .filter((v): v is YouTubeVideo => !!v)
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
}

/** "Voxford - Andromeda" → "Andromeda": the channel name says nothing on our own page. */
export function shortTitle(title: string): string {
  const rest = title.replace(/^voxford\s*[-–—|:]\s*/i, '').trim();
  return rest || title;
}

export function feedUrl(override = process.env.YOUTUBE_FEED_URL): string | undefined {
  if (override === 'off') return undefined;
  return override || `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
}

/** Does this URL answer with an image right now? */
export type Probe = (url: string) => Promise<boolean>;

/** HEAD with a 5 s timeout; also used for the reel thumbnails (ReelCard). */
export const probeImage: Probe = async (url) => {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return res.ok && (res.headers.get('content-type') ?? '').startsWith('image/');
  } catch {
    return false;
  }
};

/**
 * The first `limit` videos with a thumbnail that answers, each with the first
 * of its candidates that does. A video with none is left out, so the build
 * never asks Astro to download an image that is not there.
 */
export async function withThumbnails(videos: YouTubeVideo[], limit = LATEST_UPLOADS, probe: Probe = probeImage): Promise<LatestYouTubeVideo[]> {
  const checked = await Promise.all(
    videos.slice(0, limit + 4).map(async ({ thumbnails, ...video }) => {
      for (const thumbnail of thumbnails) if (await probe(thumbnail.src)) return { ...video, thumbnail };
      return undefined;
    }),
  );
  return checked.filter((v): v is LatestYouTubeVideo => !!v).slice(0, limit);
}

let cached: Promise<LatestYouTubeVideo[]> | undefined;

/** The channel's newest uploads for this build, thumbnails checked (fetched once per build). */
export function loadYouTubeUploads(): Promise<LatestYouTubeVideo[]> {
  cached ??= (async () => {
    const url = feedUrl();
    if (!url) return [];
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/atom+xml, application/xml' } });
      if (!res.ok) return [];
      return await withThumbnails(parseYouTubeFeed(await res.text()));
    } catch {
      return [];
    }
  })();
  return cached;
}

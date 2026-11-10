// URLs of the self-hosted videos. The files live in the R2 bucket and the
// Worker serves them from the site's own origin at /media/<key>
// (worker/media.ts), so pages link root-relative paths and the JSON-LD makes
// them absolute.

export const MEDIA_BASE = '/media/';

/** Root-relative URL of an R2 key, e.g. top/dreams/full.h264.mp4 → /media/top/dreams/full.h264.mp4. */
export function mediaUrl(key: string): string {
  return `${MEDIA_BASE}${key}`;
}

export interface VideoSource {
  src: string;
  /** MIME type with codecs, so a browser skips what it cannot play. */
  type: string;
}

/** AV1 first (smaller), H.264 for everything else. */
const RENDITIONS = [
  { codec: 'av1', type: 'video/mp4; codecs="av01.0.08M.08"' },
  { codec: 'h264', type: 'video/mp4; codecs="avc1.640028"' },
] as const;

/** Sources of a top video: `loop` is the short muted clip, `full` the whole video with sound. */
export function videoSources(mediaPrefix: string, kind: 'loop' | 'full'): VideoSource[] {
  const withAudio = kind === 'full' ? ', mp4a.40.2' : '';
  return RENDITIONS.map((r) => ({
    src: mediaUrl(`${mediaPrefix}/${kind}.${r.codec}.mp4`),
    type: r.type.replace(/"$/, `${withAudio}"`),
  }));
}

/** ISO 8601 duration (PT38S) as m:ss for display. */
export function formatDuration(iso: string): string {
  const seconds = Number(/^PT(\d+)S$/.exec(iso)?.[1] ?? 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

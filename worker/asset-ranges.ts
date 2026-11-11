import type { Env } from './env';
import { contentRange, parseRange } from './media';

// GET/HEAD for the audio in the static build (the home chord, /_astro/*.webm
// and *.m4a), with byte ranges. Workers static assets answer a `Range` request
// with 200 and the whole file and no `Accept-Ranges`, so Chrome marks the audio
// unseekable: the chord's pause rewinds to where the visitor pressed it
// (`audio.currentTime = held`), and an unseekable element jumps to 0 instead,
// so a resume started the chord over. Safari also wants ranges for media.
// wrangler.jsonc routes exactly these paths here (`run_worker_first`); the
// files are small (about 0.5 MB), so the Worker slices the asset in memory.

/** Static-build paths that are served with byte ranges. Keep in step with `run_worker_first` in wrangler.jsonc. */
export const RANGED_ASSET = /^\/_astro\/[^/]+\.(?:webm|m4a)$/;

/** Headers that describe the whole body; a 206 sets its own. Everything else (the `_headers` policy) carries over. */
const WHOLE_BODY = ['Content-Length', 'Content-Encoding', 'Transfer-Encoding'];

/** RFC 9110 › If-Range: only a strong validator that matches exactly lets the range apply. */
function ifRangeHolds(ifRange: string | null, asset: Response): boolean {
  if (ifRange === null) return true;
  if (ifRange.startsWith('W/')) return false;
  if (ifRange.startsWith('"')) return ifRange === asset.headers.get('ETag');
  return ifRange === asset.headers.get('Last-Modified');
}

export async function handleRangedAsset(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);

  // Ask the asset server for the whole file, keeping the visitor's conditionals.
  const headers = new Headers(request.headers);
  headers.delete('Range');
  headers.delete('If-Range');
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: 'GET', headers }));
  if (asset.status !== 200) return asset; // 304, 404: as the asset server said

  const range = parseRange(request.headers.get('Range'));
  if (!range || !ifRangeHolds(request.headers.get('If-Range'), asset)) {
    if (request.method === 'HEAD') await asset.body?.cancel();
    const whole = new Response(request.method === 'HEAD' ? null : asset.body, asset);
    whole.headers.set('Accept-Ranges', 'bytes');
    return whole;
  }

  const bytes = new Uint8Array(await asset.arrayBuffer());
  const size = bytes.byteLength;
  const { start, end } = contentRange(range, size);
  if (start > end || start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  const out = new Headers(asset.headers);
  for (const name of WHOLE_BODY) out.delete(name);
  out.set('Accept-Ranges', 'bytes');
  out.set('Content-Range', `bytes ${start}-${end}/${size}`);
  out.set('Content-Length', String(end - start + 1));
  return new Response(request.method === 'HEAD' ? null : bytes.slice(start, end + 1), { status: 206, headers: out });
}

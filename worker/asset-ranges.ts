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

/** Headers of the asset response that describe the file, kept on a 206. */
const KEPT = ['Content-Type', 'Cache-Control', 'ETag', 'Last-Modified'];

export async function handleRangedAsset(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);

  // Ask the asset server for the whole file, keeping the visitor's conditionals.
  const headers = new Headers(request.headers);
  headers.delete('Range');
  headers.delete('If-Range');
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: 'GET', headers }));
  if (asset.status !== 200) return asset; // 304, 404: as the asset server said

  const range = parseRange(request.headers.get('Range'));
  // If-Range: the range only applies while the file is still the one the client holds.
  const ifRange = request.headers.get('If-Range');
  const stale = ifRange !== null && ifRange !== asset.headers.get('ETag') && ifRange !== asset.headers.get('Last-Modified');

  if (!range || stale) {
    const whole = new Response(request.method === 'HEAD' ? null : asset.body, asset);
    whole.headers.set('Accept-Ranges', 'bytes');
    return whole;
  }

  const bytes = new Uint8Array(await asset.arrayBuffer());
  const size = bytes.byteLength;
  const out = new Headers({ 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff' });
  for (const name of KEPT) {
    const value = asset.headers.get(name);
    if (value) out.set(name, value);
  }
  const { start, end } = contentRange(range, size);
  if (start > end || start >= size) {
    out.set('Content-Range', `bytes */${size}`);
    return new Response(null, { status: 416, headers: out });
  }
  out.set('Content-Range', `bytes ${start}-${end}/${size}`);
  out.set('Content-Length', String(end - start + 1));
  return new Response(request.method === 'HEAD' ? null : bytes.slice(start, end + 1), { status: 206, headers: out });
}

// Every audio or video file in the static build must be served with byte
// ranges: static assets answer a Range request with 200 and the whole file,
// so Chrome cannot seek it (the chord's pause rewind restarted it) and Safari
// may refuse it. worker/asset-ranges.ts serves the matching paths, and
// wrangler.jsonc has to route them to the Worker.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RANGED_ASSET } from '../../worker/asset-ranges';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
if (!existsSync(dist)) throw new Error('dist/ is missing: run `npm run build` first');

const media = readdirSync(dist, { recursive: true })
  .map((f) => `/${String(f)}`)
  .filter((f) => /\.(webm|m4a|mp3|mp4|ogg|oga|wav|aac|flac|mov)$/.test(f));

describe('media in the static build', () => {
  it('has the chord audio', () => {
    expect(media.some((f) => f.endsWith('.webm'))).toBe(true);
    expect(media.some((f) => f.endsWith('.m4a'))).toBe(true);
  });

  it('is all served with byte ranges by the Worker', () => {
    expect(media.filter((f) => !RANGED_ASSET.test(f))).toEqual([]);
  });

  it('is routed to the Worker first in wrangler.jsonc', () => {
    const config = readFileSync(new URL('../../wrangler.jsonc', import.meta.url), 'utf8');
    for (const ext of new Set(media.map((f) => f.split('.').pop()))) expect(config).toContain(`"/_astro/*.${ext}"`);
  });
});

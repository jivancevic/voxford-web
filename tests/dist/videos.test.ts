// Ticket E's built-HTML checks: every watch page carries a complete VideoObject
// in static HTML, and no page makes the browser download a video before the
// visitor asks for one (Lighthouse/CWV budget in docs/spec.md › Acceptance).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
if (!existsSync(dist)) throw new Error('dist/ is missing: run `npm run build` first');

const read = (rel: string) => readFileSync(`${dist}${rel}`, 'utf8');
const watchPages = ['en/videos', 'hr/videi'].flatMap((dir) =>
  readdirSync(`${dist}${dir}`, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `${dir}/${d.name}/index.html`),
);
const allPages = readdirSync(dist, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith('.html'));

type Node = Record<string, unknown> & { '@type': string };
const graph = (html: string) =>
  (JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1]!) as { '@graph': Node[] })['@graph'];

describe('watch pages', () => {
  it('exist for every top video in both languages', () => {
    expect(watchPages.length).toBeGreaterThanOrEqual(10);
    expect(watchPages.filter((p) => p.startsWith('en/')).length).toBe(watchPages.filter((p) => p.startsWith('hr/')).length);
  });

  it.each(watchPages)('%s has a complete VideoObject', (page) => {
    const video = graph(read(page)).find((n) => n['@type'] === 'VideoObject');
    expect(video).toBeDefined();
    for (const key of ['name', 'description', 'thumbnailUrl', 'uploadDate', 'duration', 'contentUrl', 'url']) {
      expect(video![key], key).toBeTruthy();
    }
    expect(String(video!.thumbnailUrl)).toMatch(/^https?:\/\//);
    expect(String(video!.contentUrl)).toMatch(/^https?:\/\/[^/]+\/media\/top\/[a-z0-9-]+\/[0-9a-f]{8}\/full\.h264\.mp4$/);
    expect(String(video!.duration)).toMatch(/^PT\d+S$/);
  });

  it.each(watchPages)('%s loads its player only on play', (page) => {
    const tags = read(page).match(/<video[^>]*>/g) ?? [];
    expect(tags).toHaveLength(1);
    expect(tags[0]).toContain('preload="none"');
    expect(tags[0]).not.toContain('autoplay');
  });
});

describe('every page', () => {
  it.each(allPages.filter((p) => !watchPages.includes(p)))('%s ships no <video> in its HTML', (page) => {
    // Loops and reels are added by script after the page is idle or on a tap.
    expect(read(page)).not.toMatch(/<video[\s>]/);
  });
});

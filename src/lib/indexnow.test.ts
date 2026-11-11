import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// IndexNow (spec › SEO/GEO): the smoke workflow pings with a key, and the engines
// accept the ping only if https://<site>/<key>.txt serves that same key. The key
// lives in two files; this keeps them equal.
describe('IndexNow key', () => {
  const workflow = readFileSync('.github/workflows/smoke.yml', 'utf8');
  const key = /INDEXNOW_KEY:\s*([0-9a-f]{32})\b/.exec(workflow)?.[1];

  it('is set in the smoke workflow', () => {
    expect(key).toMatch(/^[0-9a-f]{32}$/);
  });

  it('is served from public/<key>.txt, and no other key file is', () => {
    const keyFiles = readdirSync('public').filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
    expect(keyFiles).toEqual([`${key}.txt`]);
    expect(readFileSync(`public/${key}.txt`, 'utf8')).toBe(key);
  });
});

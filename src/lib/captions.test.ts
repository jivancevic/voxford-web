import { describe, expect, it } from 'vitest';
import { getStrings } from '@/i18n';
import { captionPath, captionVtt } from './captions';

describe('captions', () => {
  it('is a valid one-cue WebVTT file', () => {
    const vtt = captionVtt('[A cappella]');
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toMatch(/^00:00:00\.000 --> \d{2}:\d{2}:\d{2}\.\d{3}\n\[A cappella\]\n$/m);
  });

  it('has a line in both languages, on a path per language', () => {
    for (const lang of ['en', 'hr'] as const) {
      expect(getStrings(lang).videos.watch.captionLine.length).toBeGreaterThan(5);
      expect(captionPath(lang)).toBe(`/captions/${lang}.vtt`);
    }
  });
});

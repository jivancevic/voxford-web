import { describe, expect, it } from 'vitest';
import { captionExcerpt, manifestUrl, parseReelsManifest } from './reels';

const reel = (id: string, day: number, extra: Record<string, unknown> = {}) => ({
  id,
  caption: `Caption ${id}`,
  permalink: `https://www.instagram.com/reel/Abc${id}/`,
  timestamp: `2026-11-${String(day).padStart(2, '0')}T12:00:00+0000`,
  video: `reels/${id}/video.mp4`,
  thumbnail: `reels/${id}/thumb.jpg`,
  ...extra,
});

describe('parseReelsManifest', () => {
  it('reads the sync worker’s manifest into root-relative URLs, newest first', () => {
    const reels = parseReelsManifest({ version: 1, updatedAt: '2026-11-10T04:17:00Z', reels: [reel('1', 1), reel('2', 2)] });
    expect(reels.map((r) => r.id)).toEqual(['2', '1']);
    expect(reels[0]).toEqual({
      id: '2',
      caption: 'Caption 2',
      permalink: 'https://www.instagram.com/reel/Abc2/',
      timestamp: '2026-11-02T12:00:00+0000',
      video: '/media/reels/2/video.mp4',
      thumbnail: '/media/reels/2/thumb.jpg',
    });
  });

  it('drops entries that point anywhere unexpected', () => {
    const reels = parseReelsManifest({
      version: 1,
      reels: [
        reel('1', 1, { video: 'top/carol/full.h264.mp4' }),
        reel('2', 2, { permalink: 'https://evil.example/reel/x/' }),
        reel('../3', 3),
        reel('4', 4, { timestamp: 'yesterday' }),
        reel('5', 5),
      ],
    });
    expect(reels.map((r) => r.id)).toEqual(['5']);
  });

  it('returns nothing for a missing, foreign or broken manifest', () => {
    expect(parseReelsManifest(undefined)).toEqual([]);
    expect(parseReelsManifest('nope')).toEqual([]);
    expect(parseReelsManifest({ version: 2, reels: [reel('1', 1)] })).toEqual([]);
    expect(parseReelsManifest({ version: 1, reels: 'x' })).toEqual([]);
  });
});

describe('captionExcerpt', () => {
  it('takes the first line and drops trailing hashtags', () => {
    expect(captionExcerpt('Carol of the Bells 🔔 #acappella #voxford\nsecond line')).toBe('Carol of the Bells 🔔');
  });

  it('cuts long captions on a word', () => {
    const out = captionExcerpt('word '.repeat(40), 30);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(31);
    expect(out).not.toMatch(/\s…$/);
  });

  it('is empty for an empty caption', () => {
    expect(captionExcerpt('')).toBe('');
  });
});

describe('manifestUrl', () => {
  it('reads the manifest from the deployed site by default', () => {
    expect(manifestUrl(new URL('https://voxford.example'), undefined)).toBe(
      'https://voxford.example/media/reels/manifest.json',
    );
  });

  it('can be overridden or switched off', () => {
    expect(manifestUrl(new URL('https://voxford.example'), 'http://localhost:8787/media/reels/manifest.json')).toBe(
      'http://localhost:8787/media/reels/manifest.json',
    );
    expect(manifestUrl(new URL('https://voxford.example'), 'off')).toBeUndefined();
  });
});

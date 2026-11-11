import { describe, expect, it } from 'vitest';
import { PROFILE_ICONS } from '@/data/profile-icons';
import { PROFILE_LABELS, PROFILES, type ProfileKey } from '@/data/site-facts';

const keys = Object.keys(PROFILES) as ProfileKey[];

describe('PROFILES', () => {
  // KB brand/geo-checklista.md (Wikidata table), brand/u-medijima.md, KB PR #10.
  it('lists Deezer and Apple Music with the KB URLs', () => {
    expect(PROFILES.deezer).toBe('https://www.deezer.com/artist/320441671');
    expect(PROFILES.appleMusic).toBe('https://music.apple.com/us/artist/voxford/1811236594');
  });

  it('gives every profile https, a label and an icon', () => {
    for (const k of keys) {
      expect(PROFILES[k]).toMatch(/^https:\/\//);
      expect(PROFILE_LABELS[k]).toBeTruthy();
      expect(PROFILE_ICONS[k]).toBeTruthy();
    }
    expect(Object.keys(PROFILE_LABELS).sort()).toEqual([...keys].sort());
    expect(Object.keys(PROFILE_ICONS).sort()).toEqual([...keys].sort());
  });
});

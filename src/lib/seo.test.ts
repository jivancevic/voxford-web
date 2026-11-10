import { describe, expect, it } from 'vitest';
import { alternatesFor } from '@/i18n/routes';
import { hreflangAlternates, robotsMeta } from './seo';

const site = new URL('https://voxford.example/');

describe('hreflangAlternates', () => {
  it('lists every language plus x-default pointing at EN', () => {
    expect(hreflangAlternates(site, alternatesFor('conferences'))).toEqual([
      { hreflang: 'en', href: 'https://voxford.example/en/conferences/' },
      { hreflang: 'hr', href: 'https://voxford.example/hr/konferencije/' },
      { hreflang: 'x-default', href: 'https://voxford.example/en/conferences/' },
    ]);
  });
});

describe('robotsMeta', () => {
  it('is noindex unless the site is indexable', () => {
    expect(robotsMeta(false)).toBe('noindex, follow');
    expect(robotsMeta(true)).toMatch(/^index, follow/);
    expect(robotsMeta(true, true)).toBe('noindex, follow');
  });
});

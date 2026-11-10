import { describe, expect, it } from 'vitest';
import { alternatesFor } from '@/i18n/routes';
import { buildSitemap } from './sitemap';

describe('buildSitemap', () => {
  const xml = buildSitemap(new URL('https://voxford.example/'), [{ alternates: alternatesFor('weddings'), lastmod: '2026-11-10' }]);

  it('lists every language version as its own <url>', () => {
    expect(xml).toContain('<loc>https://voxford.example/en/weddings/</loc>');
    expect(xml).toContain('<loc>https://voxford.example/hr/vjencanja/</loc>');
    expect(xml.match(/<url>/g)).toHaveLength(2);
  });

  it('pairs the versions with reciprocal hreflang and x-default', () => {
    expect(xml.match(/hreflang="hr" href="https:\/\/voxford.example\/hr\/vjencanja\/"/g)).toHaveLength(2);
    expect(xml.match(/hreflang="x-default" href="https:\/\/voxford.example\/en\/weddings\/"/g)).toHaveLength(2);
  });

  it('carries lastmod', () => {
    expect(xml).toContain('<lastmod>2026-11-10</lastmod>');
  });
});

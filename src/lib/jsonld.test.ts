import { describe, expect, it } from 'vitest';
import { MEMBERS, PACKAGES, PROFILES } from '@/data/site-facts';
import {
  breadcrumbJsonLd,
  concertJsonLd,
  faqPageJsonLd,
  groupId,
  jsonLdGraph,
  musicGroupJsonLd,
  packageServiceJsonLd,
  serializeJsonLd,
  videoObjectJsonLd,
} from './jsonld';

const site = new URL('https://voxford.example/');

describe('musicGroupJsonLd', () => {
  const node = musicGroupJsonLd(site, 'en', { description: 'Five voices.' });

  it('is the MusicGroup entity with a stable @id', () => {
    expect(node['@type']).toBe('MusicGroup');
    expect(node['@id']).toBe('https://voxford.example/#voxford');
    expect(musicGroupJsonLd(site, 'hr', { description: 'x' })['@id']).toBe(node['@id']);
  });

  it('carries the facts from site-facts', () => {
    expect(node.foundingDate).toBe('2021');
    expect(node.sameAs).toEqual(Object.values(PROFILES));
    expect(node.member).toHaveLength(MEMBERS.length);
    expect(node.url).toBe('https://voxford.example/en/');
    expect(node.disambiguatingDescription).toMatch(/Zagreb, Croatia/);
  });

  it('localizes member roles', () => {
    const hr = musicGroupJsonLd(site, 'hr', { description: 'x' });
    expect(JSON.stringify(hr.member)).toContain('sopran');
  });
});

describe('packageServiceJsonLd', () => {
  it('offers without any price', () => {
    for (const pkg of PACKAGES) {
      const json = JSON.stringify(
        packageServiceJsonLd(site, 'en', pkg, { description: 'd', serviceType: 'Live a cappella performance' }),
      );
      expect(json).not.toMatch(/price/i);
      expect(json).toContain(groupId(site));
    }
  });
});

describe('other builders', () => {
  it('numbers breadcrumbs from 1 with absolute URLs', () => {
    const node = breadcrumbJsonLd(site, [
      { name: 'Home', path: '/en/' },
      { name: 'FAQ', path: '/en/faq/' },
    ]);
    expect(node.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://voxford.example/en/' },
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: 'https://voxford.example/en/faq/' },
    ]);
  });

  it('builds FAQPage questions', () => {
    const node = faqPageJsonLd([{ question: 'Do you need a sound system?', answer: 'For CLASSIC, yes.' }]);
    expect(node.mainEntity).toEqual([
      { '@type': 'Question', name: 'Do you need a sound system?', acceptedAnswer: { '@type': 'Answer', text: 'For CLASSIC, yes.' } },
    ]);
  });

  it('builds a VideoObject that points at the group', () => {
    const node = videoObjectJsonLd(site, {
      name: 'Carol of the Bells',
      description: 'd',
      thumbnailUrl: 'https://voxford.example/t.jpg',
      uploadDate: '2023-12-01',
      duration: 'PT38S',
      path: '/en/videos/carol-of-the-bells/',
    });
    expect(node.url).toBe('https://voxford.example/en/videos/carol-of-the-bells/');
    expect(node.creator).toEqual({ '@id': groupId(site) });
  });

  it('builds a MusicEvent for a public concert', () => {
    const node = concertJsonLd(site, {
      name: 'Musiksommer',
      startDate: '2027-09-11',
      venue: 'Bad Schallerbach',
      city: 'Bad Schallerbach',
      countryCode: 'AT',
    });
    expect(node['@type']).toBe('MusicEvent');
    expect(node.performer).toEqual({ '@id': groupId(site) });
  });
});

describe('serializeJsonLd', () => {
  it('cannot be broken out of a script tag', () => {
    const out = serializeJsonLd(jsonLdGraph([{ '@type': 'Thing', name: '</script><script>alert(1)</script> & co' }]));
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<');
    expect(JSON.parse(out)['@graph'][0].name).toBe('</script><script>alert(1)</script> & co');
  });
});

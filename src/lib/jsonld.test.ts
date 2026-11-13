import { describe, expect, it } from 'vitest';
import { LISTINGS, MEMBERS, PACKAGES, PROFILES } from '@/data/site-facts';
import {
  breadcrumbJsonLd,
  concertJsonLd,
  faqPageJsonLd,
  groupId,
  jsonLdGraph,
  musicGroupJsonLd,
  pageServiceJsonLd,
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
    expect(node.sameAs).toEqual([...Object.values(PROFILES), ...Object.values(LISTINGS)]);
    expect(node.member).toHaveLength(MEMBERS.length);
    expect(node.url).toBe('https://voxford.example/en/');
    expect(node.disambiguatingDescription).toMatch(/Zagreb, Croatia/);
  });

  it('localizes member roles', () => {
    const hr = musicGroupJsonLd(site, 'hr', { description: 'x' });
    expect(JSON.stringify(hr.member)).toContain('sopran');
  });
});

describe('pageServiceJsonLd', () => {
  const node = pageServiceJsonLd(site, 'en', {
    serviceType: 'Live music for conferences and corporate events',
    path: '/en/conferences/',
  });

  it('is one Service for the page, offered by the group, with every package as an Offer', () => {
    expect(node).toEqual({
      '@type': 'Service',
      '@id': 'https://voxford.example/en/conferences/#service',
      name: 'Voxford: Live music for conferences and corporate events',
      serviceType: 'Live music for conferences and corporate events',
      provider: { '@id': groupId(site) },
      areaServed: [
        { '@type': 'Country', name: 'Croatia' },
        { '@type': 'Country', name: 'Slovenia' },
        { '@type': 'Country', name: 'Austria' },
      ],
      url: 'https://voxford.example/en/conferences/',
      offers: PACKAGES.map((p) => ({
        '@type': 'Offer',
        name: `Voxford ${p.name}`,
        description: p.summary.en,
        url: `https://voxford.example/en/inquiry/?package=${p.key}`,
        availability: 'https://schema.org/InStock',
        seller: { '@id': groupId(site) },
      })),
    });
  });

  it('never carries a price', () => {
    expect(JSON.stringify(node)).not.toMatch(/price/i);
  });

  it('localizes the offers', () => {
    const hr = pageServiceJsonLd(site, 'hr', { serviceType: 'Glazba uživo za vjenčanja', path: '/hr/vjencanja/' });
    expect(hr['@id']).toBe('https://voxford.example/hr/vjencanja/#service');
    expect(hr.offers).toContainEqual(expect.objectContaining({ description: PACKAGES[1]!.summary.hr }));
  });
});

describe('concertJsonLd', () => {
  const base = { name: 'Voxford at Advent in Sisak', startDate: '2026-12-17', city: 'Sisak', countryCode: 'HR' };

  it('builds a MusicEvent the group performs, at a named venue', () => {
    const node = concertJsonLd(site, {
      name: 'Musiksommer',
      startDate: '2027-09-11T19:00:00+02:00',
      venue: 'Atrium Europasaal',
      city: 'Bad Schallerbach',
      countryCode: 'AT',
      url: 'https://example.at/musiksommer',
    });
    expect(node).toEqual({
      '@type': 'MusicEvent',
      name: 'Musiksommer',
      startDate: '2027-09-11T19:00:00+02:00',
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: 'Atrium Europasaal',
        address: { '@type': 'PostalAddress', addressLocality: 'Bad Schallerbach', addressCountry: 'AT' },
      },
      performer: { '@id': groupId(site) },
      url: 'https://example.at/musiksommer',
    });
  });

  it('names the Place after the city when the venue is not known, never a guess', () => {
    const node = concertJsonLd(site, base);
    expect(node.location).toEqual({
      '@type': 'Place',
      name: 'Sisak',
      address: { '@type': 'PostalAddress', addressLocality: 'Sisak', addressCountry: 'HR' },
    });
  });

  it('has no organizer unless one is known, and never defaults to the group', () => {
    expect(concertJsonLd(site, base)).not.toHaveProperty('organizer');
    expect(concertJsonLd(site, { ...base, organizer: 'Turistička zajednica Grada Siska' }).organizer).toEqual({
      '@type': 'Organization',
      name: 'Turistička zajednica Grada Siska',
    });
  });

  it('points at the group entity when the group organizes the concert itself', () => {
    expect(concertJsonLd(site, { ...base, organizer: 'Voxford' }).organizer).toEqual({ '@id': groupId(site) });
  });

  it('states free entry only when it is known to be free', () => {
    expect(concertJsonLd(site, { ...base, isAccessibleForFree: true }).isAccessibleForFree).toBe(true);
    expect(concertJsonLd(site, { ...base, isAccessibleForFree: false })).not.toHaveProperty('isAccessibleForFree');
    expect(concertJsonLd(site, base)).not.toHaveProperty('isAccessibleForFree');
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
});

describe('serializeJsonLd', () => {
  it('cannot be broken out of a script tag', () => {
    const out = serializeJsonLd(jsonLdGraph([{ '@type': 'Thing', name: '</script><script>alert(1)</script> & co' }]));
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<');
    expect(JSON.parse(out)['@graph'][0].name).toBe('</script><script>alert(1)</script> & co');
  });
});

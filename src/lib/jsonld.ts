// JSON-LD builders. Every structured-data block on the site comes from here and
// reads its facts from site-facts, so the schema, the copy and llms.txt say the
// same thing. Builders are pure: they take the site origin (Astro.site) and
// return plain objects; <JsonLd> serializes them into static HTML.
//
// Nodes reference each other by stable @id, so a page can emit a Service that
// points at the MusicGroup without repeating it.

import {
  AREA_SERVED,
  GROUP,
  MEMBERS,
  PROFILES,
  type Package,
} from '@/data/site-facts';
import type { Locale } from '@/i18n/locales';
import { LOCALE_META } from '@/i18n/locales';
import { pathFor } from '@/i18n/routes';

export type JsonLdNode = Record<string, unknown> & { '@type': string | string[] };

const abs = (site: URL, path: string) => new URL(path, site).href;

/** Stable @id of the group entity; the same on every page and in both languages. */
export const groupId = (site: URL) => abs(site, '/#voxford');
export const websiteId = (site: URL) => abs(site, '/#website');

export function musicGroupJsonLd(site: URL, lang: Locale, opts: { description: string; image?: string; logo?: string }): JsonLdNode {
  return {
    '@type': 'MusicGroup',
    '@id': groupId(site),
    name: GROUP.name,
    alternateName: GROUP.handle,
    description: opts.description,
    disambiguatingDescription: GROUP.disambiguation[lang],
    url: abs(site, pathFor('home', lang)),
    ...(opts.image ? { image: opts.image } : {}),
    ...(opts.logo ? { logo: opts.logo } : {}),
    email: GROUP.email,
    foundingDate: String(GROUP.foundingYear),
    foundingLocation: { '@type': 'Place', name: `${GROUP.city}, Croatia` },
    location: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: GROUP.city, addressCountry: GROUP.countryCode },
    },
    areaServed: AREA_SERVED.map((name) => ({ '@type': 'Country', name })),
    genre: [...GROUP.genres],
    sameAs: Object.values(PROFILES),
    member: MEMBERS.map((m) => ({
      '@type': 'OrganizationRole',
      roleName: m.voice[lang],
      member: { '@type': 'Person', name: m.name },
    })),
  };
}

export function webSiteJsonLd(site: URL, lang: Locale): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': websiteId(site),
    url: abs(site, '/'),
    name: GROUP.name,
    inLanguage: LOCALE_META[lang].htmlLang,
    publisher: { '@id': groupId(site) },
  };
}

export interface Crumb {
  name: string;
  /** Root-relative path. */
  path: string;
}

export function breadcrumbJsonLd(site: URL, crumbs: readonly Crumb[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(site, c.path),
    })),
  };
}

export interface QA {
  question: string;
  /** Plain text or simple HTML (links, lists) as shown on the page. */
  answer: string;
}

export function faqPageJsonLd(qas: readonly QA[]): JsonLdNode {
  return {
    '@type': 'FAQPage',
    mainEntity: qas.map((qa) => ({
      '@type': 'Question',
      name: qa.question,
      acceptedAnswer: { '@type': 'Answer', text: qa.answer },
    })),
  };
}

/** A package as a Service with an Offer that deliberately has no price (spec: prices on request). */
export function packageServiceJsonLd(
  site: URL,
  lang: Locale,
  pkg: Package,
  opts: { description: string; serviceType: string; path?: string },
): JsonLdNode {
  const url = abs(site, opts.path ?? pathFor('packages', lang));
  return {
    '@type': 'Service',
    '@id': `${url}#${pkg.key}`,
    name: `${GROUP.name} ${pkg.name}`,
    serviceType: opts.serviceType,
    description: opts.description,
    provider: { '@id': groupId(site) },
    areaServed: AREA_SERVED.map((name) => ({ '@type': 'Country', name })),
    url,
    offers: {
      '@type': 'Offer',
      url: abs(site, pathFor('inquiry', lang)),
      availability: 'https://schema.org/InStock',
      seller: { '@id': groupId(site) },
    },
  };
}

export interface VideoInput {
  name: string;
  description: string;
  /** Absolute URLs. */
  thumbnailUrl: string;
  contentUrl?: string;
  embedUrl?: string;
  /** ISO 8601 date or date-time. */
  uploadDate: string;
  /** ISO 8601 duration, e.g. PT38S. */
  duration?: string;
  /** Root-relative watch page path. */
  path: string;
}

export function videoObjectJsonLd(site: URL, video: VideoInput): JsonLdNode {
  return {
    '@type': 'VideoObject',
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    ...(video.duration ? { duration: video.duration } : {}),
    ...(video.contentUrl ? { contentUrl: video.contentUrl } : {}),
    ...(video.embedUrl ? { embedUrl: video.embedUrl } : {}),
    url: abs(site, video.path),
    creator: { '@id': groupId(site) },
  };
}

export interface ConcertInput {
  name: string;
  /** ISO 8601 date or date-time (local time with offset when known). */
  startDate: string;
  venue: string;
  city: string;
  countryCode: string;
  description?: string;
  image?: string;
  /** Official event or ticket page. */
  url?: string;
}

/** A public concert. Never corporate or private gigs (spec › Information architecture). */
export function concertJsonLd(site: URL, concert: ConcertInput): JsonLdNode {
  return {
    '@type': 'MusicEvent',
    name: concert.name,
    startDate: concert.startDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: concert.venue,
      address: { '@type': 'PostalAddress', addressLocality: concert.city, addressCountry: concert.countryCode },
    },
    performer: { '@id': groupId(site) },
    organizer: { '@id': groupId(site) },
    ...(concert.description ? { description: concert.description } : {}),
    ...(concert.image ? { image: concert.image } : {}),
    ...(concert.url ? { url: concert.url } : {}),
  };
}

/** Wrap nodes in one @graph document. */
export function jsonLdGraph(nodes: readonly JsonLdNode[]): Record<string, unknown> {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), 'g');
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), 'g');

/**
 * Serialize for a <script type="application/ld+json"> body. Escapes `<`, `>`
 * and `&` so copy containing `</script>` cannot break out of the tag, and the
 * line/paragraph separators that are invalid in some JS parsers.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEPARATOR, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR, '\\u2029');
}

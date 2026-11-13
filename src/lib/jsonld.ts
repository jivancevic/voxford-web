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
  LISTINGS,
  MEMBERS,
  PACKAGES,
  PROFILES,
  type Package,
} from '@/data/site-facts';
import type { Locale } from '@/i18n/locales';
import { LOCALE_META } from '@/i18n/locales';
import { pathFor } from '@/i18n/routes';
import { inquiryUrl } from '@/lib/inquiry-url';

export type JsonLdNode = Record<string, unknown> & { '@type': string | string[] };

const abs = (site: URL, path: string) => new URL(path, site).href;
const areaServed = () => AREA_SERVED.map((name) => ({ '@type': 'Country', name }));

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
    foundingLocation: { '@type': 'Place', name: `${GROUP.city}, ${GROUP.country}` },
    location: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: GROUP.city, addressCountry: GROUP.countryCode },
    },
    areaServed: areaServed(),
    genre: [...GROUP.genres],
    sameAs: [...Object.values(PROFILES), ...Object.values(LISTINGS)],
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

/**
 * The one Service a page sells (e.g. live music for conferences), with every
 * package as an Offer that deliberately has no price (spec: prices on request).
 *
 * One Service per page, not one per package: the page describes one service
 * and the packages are its tiers, which schema.org models as several `offers`
 * on that Service. Google's guidelines want markup that represents the page's
 * main content, and three sibling Services per page would also mint three new
 * "Voxford CLASSIC"-style entities on every event page.
 */
export function pageServiceJsonLd(
  site: URL,
  lang: Locale,
  opts: { serviceType: string; path: string; packages?: readonly Package[] },
): JsonLdNode {
  const url = abs(site, opts.path);
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: `${GROUP.name}: ${opts.serviceType}`,
    serviceType: opts.serviceType,
    provider: { '@id': groupId(site) },
    areaServed: areaServed(),
    url,
    offers: (opts.packages ?? PACKAGES).map((pkg) => ({
      '@type': 'Offer',
      name: `${GROUP.name} ${pkg.name}`,
      description: pkg.summary[lang],
      url: abs(site, inquiryUrl(lang, { package: pkg.key })),
      availability: 'https://schema.org/InStock',
      seller: { '@id': groupId(site) },
    })),
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
  /** The venue's proper name; when it is not known the Place is named after the city, never a guessed venue. */
  venue?: string | undefined;
  city: string;
  countryCode: string;
  /**
   * Who runs the concert (a tourist board, a festival), by name, only when it
   * is known. Left out otherwise: never defaulted to the group. The group's
   * own name points at its entity.
   */
  organizer?: string | undefined;
  /** True only when entry is known to be free; anything else leaves the property out. */
  isAccessibleForFree?: boolean | undefined;
  description?: string | undefined;
  image?: string | undefined;
  /** Official event or ticket page. */
  url?: string | undefined;
}

/** A public concert. Never corporate or private gigs (spec › Information architecture). */
export function concertJsonLd(site: URL, concert: ConcertInput): JsonLdNode {
  const organizer =
    concert.organizer === undefined
      ? undefined
      : concert.organizer === GROUP.name
        ? { '@id': groupId(site) }
        : { '@type': 'Organization', name: concert.organizer };
  return {
    '@type': 'MusicEvent',
    name: concert.name,
    startDate: concert.startDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: concert.venue ?? concert.city,
      address: { '@type': 'PostalAddress', addressLocality: concert.city, addressCountry: concert.countryCode },
    },
    performer: { '@id': groupId(site) },
    ...(organizer ? { organizer } : {}),
    ...(concert.isAccessibleForFree === true ? { isAccessibleForFree: true } : {}),
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

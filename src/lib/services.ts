// Service JSON-LD for a page that sells Voxford (the event pages and Packages):
// one Service for the page with every package as a price-less Offer. Why one
// and not one per package: src/lib/jsonld.ts › pageServiceJsonLd.
import { PACKAGES, type PackageKey } from '@/data/site-facts';
import type { Locale } from '@/i18n';
import { pathFor, type PageKey } from '@/i18n/routes';
import { pageServiceJsonLd, type JsonLdNode } from './jsonld';

/** `packages`: the ones this page offers (default all three). */
export function servicesFor(
  site: URL,
  lang: Locale,
  page: PageKey,
  serviceType: string,
  packages?: readonly PackageKey[],
): JsonLdNode[] {
  const offered = packages && PACKAGES.filter((p) => packages.includes(p.key));
  return [pageServiceJsonLd(site, lang, { serviceType, path: pathFor(page, lang), ...(offered ? { packages: offered } : {}) })];
}

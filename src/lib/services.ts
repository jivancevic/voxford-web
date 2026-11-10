// Service JSON-LD for a page that sells Voxford (the event pages and Packages):
// one Service for the page with every package as a price-less Offer. Why one
// and not one per package: src/lib/jsonld.ts › pageServiceJsonLd.
import type { Locale } from '@/i18n';
import { pathFor, type PageKey } from '@/i18n/routes';
import { pageServiceJsonLd, type JsonLdNode } from './jsonld';

export function servicesFor(site: URL, lang: Locale, page: PageKey, serviceType: string): JsonLdNode[] {
  return [pageServiceJsonLd(site, lang, { serviceType, path: pathFor(page, lang) })];
}

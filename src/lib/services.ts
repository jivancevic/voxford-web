// Service JSON-LD for an event page (ticket C): one Service per package, each
// with an Offer that has no price, tied to the page it describes.
import { PACKAGES } from '@/data/site-facts';
import type { Locale } from '@/i18n';
import { pathFor, type PageKey } from '@/i18n/routes';
import { packageServiceJsonLd, type JsonLdNode } from './jsonld';

export function servicesFor(site: URL, lang: Locale, page: PageKey, serviceType: string): JsonLdNode[] {
  return PACKAGES.map((p) =>
    packageServiceJsonLd(site, lang, p, {
      description: `${p.summary[lang]} ${p.lineup[lang]}.`,
      serviceType,
      path: pathFor(page, lang),
    }),
  );
}

// Head metadata helpers: canonical, hreflang alternates and the robots policy.
// Pure functions of the site origin, so they are testable without Astro.

import { DEFAULT_LOCALE, LOCALES, LOCALE_META, type Locale } from '@/i18n/locales';

export interface Alternate {
  hreflang: string;
  href: string;
}

/**
 * Reciprocal, self-referencing hreflang set plus x-default (= EN), as absolute
 * URLs. `paths` is every language version of the current page.
 */
export function hreflangAlternates(site: URL, paths: Record<Locale, string>): Alternate[] {
  const list = LOCALES.map((l) => ({ hreflang: LOCALE_META[l].htmlLang, href: new URL(paths[l], site).href }));
  list.push({ hreflang: 'x-default', href: new URL(paths[DEFAULT_LOCALE], site).href });
  return list;
}

export function canonicalUrl(site: URL, path: string): string {
  return new URL(path, site).href;
}

/**
 * Pages are indexable only on the production domain (SITE_INDEXABLE=true,
 * ticket G). Everywhere else, workers.dev and previews included, they say
 * noindex; public/_headers adds the same as an HTTP header on *.workers.dev.
 */
export function robotsMeta(indexable: boolean, pageNoindex = false): string {
  return indexable && !pageNoindex ? 'index, follow, max-image-preview:large, max-video-preview:-1' : 'noindex, follow';
}

// The route table: the ONE place that knows every page's path in each language.
// Nav, the language switch, hreflang, the sitemap, llms.txt and InquiryCTA all
// read paths from here, so a slug changes in one line. Each page key has a
// thin wrapper in src/pages/{en,hr}/ that renders src/views/<View>.astro;
// routes.test.ts fails when a wrapper is missing.

import { DEFAULT_LOCALE, LOCALES, type Locale } from './locales';

export const PAGE_KEYS = [
  'home',
  'conferences',
  'weddings',
  'advent',
  'private',
  'about',
  'packages',
  'faq',
  'videos',
  'concerts',
  'inquiry',
] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

/**
 * Slug per language, without the locale prefix and without slashes ('' = the
 * locale's home). `inquiry` keeps the literal `/{lang}/inquiry/` path in both
 * languages because the prefill contract (docs/spec.md) names it.
 */
export const ROUTES: Record<PageKey, Record<Locale, string>> = {
  home: { en: '', hr: '' },
  conferences: { en: 'conferences', hr: 'konferencije' },
  weddings: { en: 'weddings', hr: 'vjencanja' },
  advent: { en: 'advent-and-concerts', hr: 'advent-i-koncerti' },
  private: { en: 'private-celebrations', hr: 'privatne-proslave' },
  about: { en: 'about', hr: 'o-nama' },
  packages: { en: 'packages', hr: 'paketi' },
  faq: { en: 'faq', hr: 'cesta-pitanja' },
  videos: { en: 'videos', hr: 'videi' },
  concerts: { en: 'upcoming-concerts', hr: 'nadolazeci-koncerti' },
  inquiry: { en: 'inquiry', hr: 'inquiry' },
};

/** Root-relative path with a trailing slash, e.g. `/hr/konferencije/`. */
export function pathFor(page: PageKey, lang: Locale): string {
  const slug = ROUTES[page][lang];
  return slug ? `/${lang}/${slug}/` : `/${lang}/`;
}

/** Root-relative path of a video watch page (ticket E fills the collection). */
export function videoPathFor(slug: string, lang: Locale): string {
  return `${pathFor('videos', lang)}${slug}/`;
}

/** Every language version of one page, for hreflang and the language switch. */
export function alternatesFor(page: PageKey): Record<Locale, string> {
  return Object.fromEntries(LOCALES.map((l) => [l, pathFor(page, l)])) as Record<Locale, string>;
}

/** Reverse lookup: which page key and language a root-relative path belongs to. */
export function pageForPath(pathname: string): { page: PageKey; lang: Locale } | undefined {
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  for (const page of PAGE_KEYS) {
    for (const lang of LOCALES) {
      if (pathFor(page, lang) === normalized) return { page, lang };
    }
  }
  return undefined;
}

/** Pages in the primary navigation, in order. Home is the crest, inquiry is the pill. */
export const NAV_PAGES: readonly PageKey[] = ['conferences', 'weddings', 'advent', 'about', 'videos', 'packages'];

/** Pages in the footer's secondary list. */
export const FOOTER_PAGES: readonly PageKey[] = [
  'conferences',
  'weddings',
  'advent',
  'private',
  'about',
  'packages',
  'faq',
  'videos',
  'concerts',
];

export { DEFAULT_LOCALE };

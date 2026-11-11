import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCALES } from './locales';
import {
  FOOTER_PAGES,
  NAV_EVENTS,
  NAV_EVENTS_AFTER_DIVIDER,
  NAV_FLAT,
  PAGE_KEYS,
  ROUTES,
  alternatesFor,
  pageForPath,
  pathFor,
} from './routes';

const pagesDir = fileURLToPath(new URL('../pages/', import.meta.url));

describe('route table', () => {
  it('has a page wrapper for every page in every language', () => {
    const missing: string[] = [];
    for (const page of PAGE_KEYS) {
      for (const lang of LOCALES) {
        const slug = ROUTES[page][lang];
        const base = slug ? `${pagesDir}${lang}/${slug}` : `${pagesDir}${lang}/index`;
        const found = [`${base}.astro`, `${base}/index.astro`].some((f) => existsSync(f));
        if (!found) missing.push(`${page}/${lang} → src/pages/${lang}/${slug || 'index'}.astro`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("serves each concert's .ics under the concerts path in every language (ConcertList links there)", () => {
    for (const lang of LOCALES) {
      expect(existsSync(`${pagesDir}${lang}/${ROUTES.concerts[lang]}/[id].ics.ts`), lang).toBe(true);
    }
  });

  it('gives every page a distinct path per language', () => {
    for (const lang of LOCALES) {
      const paths = PAGE_KEYS.map((p) => pathFor(p, lang));
      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it('uses lowercase ASCII slugs', () => {
    for (const page of PAGE_KEYS) {
      for (const lang of LOCALES) expect(ROUTES[page][lang]).toMatch(/^[a-z0-9-]*$/);
    }
  });

  it('builds paths with the locale prefix and a trailing slash', () => {
    expect(pathFor('home', 'en')).toBe('/en/');
    expect(pathFor('conferences', 'hr')).toBe('/hr/konferencije/');
    expect(alternatesFor('weddings')).toEqual({ en: '/en/weddings/', hr: '/hr/vjencanja/' });
  });

  it('keeps the literal inquiry path the prefill contract names', () => {
    expect(pathFor('inquiry', 'en')).toBe('/en/inquiry/');
    expect(pathFor('inquiry', 'hr')).toBe('/hr/inquiry/');
  });

  it('maps a path back to its page', () => {
    expect(pageForPath('/hr/o-nama/')).toEqual({ page: 'about', lang: 'hr' });
    expect(pageForPath('/en/about')).toEqual({ page: 'about', lang: 'en' });
    expect(pageForPath('/en/nope/')).toBeUndefined();
  });
});

describe('header and footer (#48)', () => {
  it('opens the Events group with the booking pages, conferences first, packages after the divider', () => {
    expect(NAV_EVENTS).toEqual(['conferences', 'advent', 'weddings']);
    expect(NAV_EVENTS_AFTER_DIVIDER).toEqual(['packages']);
  });

  it('puts videos first among the flat links, then concerts, about and the FAQ', () => {
    expect(NAV_FLAT).toEqual(['videos', 'concerts', 'about', 'faq']);
  });

  it('reaches every page from the footer (home is the crest, inquiry the pill)', () => {
    const unreachable = PAGE_KEYS.filter((p) => p !== 'home' && p !== 'inquiry' && !FOOTER_PAGES.includes(p));
    expect(unreachable).toEqual([]);
  });
});

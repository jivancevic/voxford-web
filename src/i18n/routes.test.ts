import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCALES } from './locales';
import { PAGE_KEYS, ROUTES, alternatesFor, pageForPath, pathFor } from './routes';

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

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCALES } from './locales';
import { PAGE_KEYS, ROUTES, alternatesFor, pageForPath, pathFor } from './routes';

const pagesDir = fileURLToPath(new URL('../pages/', import.meta.url));
const redirectsFile = fileURLToPath(new URL('../../public/_redirects', import.meta.url));

/** `public/_redirects` rules (Workers static assets): source, target, status. */
function readRedirects(): { from: string; to: string; status: string }[] {
  return readFileSync(redirectsFile, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [from = '', to = '', status = ''] = line.split(/\s+/);
      return { from, to, status };
    });
}

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

describe('public/_redirects (retired pages)', () => {
  it('moves the retired Private celebrations page to Home, with and without the slash (#52)', () => {
    const rules = readRedirects().map(({ from, to }) => `${from} ${to}`);
    expect(rules).toEqual(
      expect.arrayContaining([
        '/en/private-celebrations /en/',
        '/en/private-celebrations/ /en/',
        '/hr/privatne-proslave /hr/',
        '/hr/privatne-proslave/ /hr/',
      ]),
    );
  });

  it('redirects only paths that are no longer pages, only to pages, always with a 301', () => {
    for (const { from, to, status } of readRedirects()) {
      expect(pageForPath(from), `${from} is still a page`).toBeUndefined();
      expect(pageForPath(to), `${to} is not a page`).toBeDefined();
      expect(status, from).toBe('301');
    }
  });
});

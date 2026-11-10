// Guards on ticket C's copy (the `content` namespace, the content pages, the
// FAQ and the concerts): this repo is public, so no prices or phone numbers;
// canonical numbers come from site-facts through {tokens}, never typed in; and
// every fact token the copy uses exists.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/i18n/locales';
import { PAGE_KEYS } from '@/i18n/routes';
import { factTokens } from './copy';

const root = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel: string) => readFileSync(root(rel), 'utf8');
const list = (rel: string, ext: string) =>
  readdirSync(root(rel))
    .filter((f) => f.endsWith(ext))
    .map((f) => `${rel}${f}`);

const CONTENT_PAGES = ['conferences', 'weddings', 'advent', 'private', 'about', 'packages', 'faq', 'concerts'];

const files = [
  ...LOCALES.map((l) => `../i18n/${l}/content.json`),
  ...LOCALES.flatMap((l) => CONTENT_PAGES.map((p) => `../content/pages/${l}/${p}.md`)),
  ...LOCALES.flatMap((l) => list(`../content/faq/${l}/`, '.md')),
  ...list('../content/concerts/', '.json'),
];

describe('content copy (ticket C)', () => {
  for (const file of files) {
    const text = read(file);

    it(`${file}: no prices or currency`, () => {
      expect(text).not.toMatch(/€|\bEUR\b|\beura?\b|\bkn\b|\bHRK\b/i);
    });

    it(`${file}: no phone numbers, OIB or IBAN`, () => {
      expect(text).not.toMatch(/\+\d{3}[\s\d]{6,}|\bOIB\b|\bIBAN\b|\bHR\d{19}\b/);
    });

    it(`${file}: canonical numbers only through tokens`, () => {
      expect(text).not.toMatch(/\b\d{2,3}\s?[KM]\+|\b\d{2,3}\s?(million|milijuna)\b/i);
    });

    it(`${file}: every {token} exists in site-facts`, () => {
      const known = Object.keys(factTokens('en'));
      const used = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      // {credit} and {name} are format() slots, filled where the string is used.
      const formatSlots = ['credit', 'name'];
      expect(used.filter((u) => u && !known.includes(u) && !formatSlots.includes(u))).toEqual([]);
    });
  }

  it('copy shown as running text has no em or en dashes (house style)', () => {
    for (const file of files.filter((f) => !f.endsWith('.json') || f.includes('/i18n/'))) {
      const body = read(file).replace(/^---\n[\s\S]*?\n---\n/, '');
      expect(body, file).not.toMatch(/[–—]/);
    }
  });

  it('FAQ entries only point at pages that exist', () => {
    for (const lang of LOCALES) {
      for (const file of list(`../content/faq/${lang}/`, '.md')) {
        const pages = /^pages: \[(.*)\]$/m.exec(read(file))?.[1]?.split(',').map((s) => s.trim()) ?? [];
        for (const p of pages) expect(PAGE_KEYS, `${file} → ${p}`).toContain(p);
      }
    }
  });
});

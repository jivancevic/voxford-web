// EN/HR parity: every UI string namespace and every page copy entry exists in
// both languages with the same shape, and nothing renders empty. A key added in
// EN and forgotten in HR builds fine and shows `undefined` to half the
// visitors; this is the test that catches it. Keep every locale-pair assertion
// in this one file.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCALES } from './locales';

const root = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Flatten to `path:kind` entries so a missing key, a type change and a shorter array all differ. */
function shape(value: Json, path = ''): string[] {
  if (Array.isArray(value)) return [`${path}:array(${value.length})`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  if (value !== null && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  return [`${path}:${value === null ? 'null' : typeof value}`];
}

function emptyStrings(value: Json, path = ''): string[] {
  if (typeof value === 'string') return value.trim() === '' ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => emptyStrings(v, `${path}[${i}]`));
  if (value !== null && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => emptyStrings(v, path ? `${path}.${k}` : k));
  return [];
}

const listFiles = (dir: string, ext: string) =>
  readdirSync(dir, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(ext))
    .sort();

describe('UI string namespaces (src/i18n/<lang>/*.json)', () => {
  const [canonical, ...others] = LOCALES;
  const namespaces = listFiles(root(`./${canonical}/`), '.json');

  it('has the same namespace files in every language', () => {
    for (const lang of others) expect(listFiles(root(`./${lang}/`), '.json')).toEqual(namespaces);
  });

  for (const ns of namespaces) {
    const load = (lang: string) => JSON.parse(readFileSync(root(`./${lang}/${ns}`), 'utf8')) as Json;

    it(`${ns}: same key tree in every language`, () => {
      const expected = shape(load(canonical));
      for (const lang of others) expect(shape(load(lang))).toEqual(expected);
    });

    it(`${ns}: no empty strings`, () => {
      for (const lang of LOCALES) expect(emptyStrings(load(lang)), lang).toEqual([]);
    });
  }
});

/** Top-level frontmatter keys of a Markdown file (enough for parity; Astro's schema validates values). */
function frontmatterKeys(file: string): string[] {
  const match = /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, 'utf8'));
  if (!match?.[1]) return [];
  return match[1]
    .split('\n')
    .filter((line) => /^[A-Za-z_][\w-]*:/.test(line))
    .map((line) => line.slice(0, line.indexOf(':')))
    .sort();
}

/** Collections whose entries are Markdown files under <collection>/<lang>/. */
const LOCALIZED_MD_COLLECTIONS = ['pages', 'faq'];

describe('localized content collections (src/content/<collection>/<lang>/)', () => {
  const [canonical, ...others] = LOCALES;

  for (const collection of LOCALIZED_MD_COLLECTIONS) {
    const dir = (lang: string) => root(`../content/${collection}/${lang}/`);
    const entries = (lang: string) => {
      try {
        return listFiles(dir(lang), '.md');
      } catch {
        return [];
      }
    };

    it(`${collection}: the same entries in every language`, () => {
      for (const lang of others) expect(entries(lang)).toEqual(entries(canonical));
    });

    it(`${collection}: the same frontmatter keys per entry`, () => {
      for (const entry of entries(canonical)) {
        const expected = frontmatterKeys(`${dir(canonical)}${entry}`);
        for (const lang of others) expect(frontmatterKeys(`${dir(lang)}${entry}`), `${lang}/${entry}`).toEqual(expected);
      }
    });
  }
});

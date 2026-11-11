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

const CONTENT_PAGES = ['conferences', 'weddings', 'advent', 'about', 'packages', 'faq', 'concerts'];

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
      // {credit}, {name}, {min} and {max} are format() slots, filled where the string is used.
      const formatSlots = ['credit', 'name', 'min', 'max'];
      expect(used.filter((u) => u && !known.includes(u) && !formatSlots.includes(u))).toEqual([]);
    });
  }

  it('copy shown as running text has no em or en dashes (house style)', () => {
    for (const file of files.filter((f) => !f.endsWith('.json') || f.includes('/i18n/'))) {
      const body = read(file).replace(/^---\n[\s\S]*?\n---\n/, '');
      expect(body, file).not.toMatch(/[–—]/);
    }
  });

  it('FAQ answers from the riders state numbers only through tokens', () => {
    for (const lang of LOCALES) {
      for (const file of list(`../content/faq/${lang}/`, '.md')) {
        const text = read(file);
        if (!/^source: .*rideri\.md/m.test(text)) continue;
        // A digit after a letter is a model name (SM58), not a rider number.
        const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
        expect(body.replace(/\{\w+\}/g, ''), file).not.toMatch(/(?<![A-Za-z\d])\d/);
      }
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

  it('recent public concerts on the Advent page are listed newest first (Josip, #40)', () => {
    for (const lang of LOCALES) {
      const past: { year: string }[] = JSON.parse(read(`../i18n/${lang}/content.json`)).advent.past;
      // A range ("2023 to 2025") counts by its last year.
      const years = past.map((p) => Number(p.year.match(/\d{4}/g)?.at(-1)));
      expect(years.every((y) => Number.isInteger(y)), lang).toBe(true);
      expect(years, lang).toEqual([...years].sort((a, b) => b - a));
    }
  });

  it('never mentions La Nuit des Chœurs: it did not happen (Josip, #40)', () => {
    for (const file of files) expect(read(file), file).not.toMatch(/Nuit des|Ch(œ|oe)urs/i);
  });

  describe('Voxford speaks as "we" (Josip, #35)', () => {
    // "<file> <key>" (or "<file> body" for a markdown body) → reason. AGENTS.md exempts entity
    // statements, noun labels and questions from the client's side; add one here only with a reason.
    const WE_ALLOW: Record<string, string> = {
      'src/i18n/hr/content.json about.membersHeading': 'noun label (a heading over the five members), exempt in AGENTS.md',
    };

    // Sentence-initial subjects that mean Voxford, and "Voxford ... they" within one sentence.
    // Precision over recall: a bare "It" is not matched ("It depends on the package" is about the package),
    // so "it" meaning Voxford is left to review. "their" about singers ("each singer ... their voice") is fine.
    const THIRD_PERSON = [
      /^(?:They|The group|The ensemble|The band|Skupina|Petorka|Ansambl|Oni)\b/i,
      /\bVoxford\b[^.!?]*\b(?:they|their|them)\b/i,
    ];

    const sentences = (text: string) =>
      text
        .split('\n')
        .flatMap((line) => line.split(/(?<=[.!?:])\s+/))
        .map((s) => s.replace(/^[\s#>*_"'-]+/, '').trim())
        .filter(Boolean);

    /** [location, text] for every copy string: md bodies and every string value in the i18n json. */
    const strings = (): [string, string][] => {
      const out: [string, string][] = [];
      const collect = (file: string, v: unknown, path: string) => {
        if (typeof v === 'string') out.push([`${file} ${path}`, v]);
        else if (Array.isArray(v)) v.forEach((x, i) => collect(file, x, `${path}[${i}]`));
        else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) collect(file, x, path ? `${path}.${k}` : k);
      };
      for (const l of LOCALES) {
        for (const f of readdirSync(root(`../i18n/${l}/`)).filter((n) => n.endsWith('.json'))) {
          collect(`src/i18n/${l}/${f}`, JSON.parse(read(`../i18n/${l}/${f}`)), '');
        }
      }
      const md = LOCALES.flatMap((l) => [...list(`../content/faq/${l}/`, '.md'), ...list(`../content/pages/${l}/`, '.md')]);
      for (const f of md) out.push([`${f.replace('../', 'src/')} body`, read(f).replace(/^---\n[\s\S]*?\n---\n/, '')]);
      return out;
    };

    it('no sentence has "they" or "the group" (or the HR equivalents) as Voxford', () => {
      const out: string[] = [];
      for (const [where, text] of strings()) {
        if (where in WE_ALLOW) continue;
        for (const s of sentences(text)) {
          if (THIRD_PERSON.some((re) => re.test(s))) {
            out.push(`${where}: "${s.slice(0, 90)}": Voxford speaks as "we" / "mi, naša petorka" (AGENTS.md, #35). Rewrite, or add the key to WE_ALLOW with a reason.`);
          }
        }
      }
      expect(out).toEqual([]);
    });

    it('allow list carries a reason per entry', () => {
      for (const [k, v] of Object.entries(WE_ALLOW)) expect(v.length, k).toBeGreaterThan(10);
    });

    it('catches the #38 shape and leaves singer and guest wording alone (self-check)', () => {
      const hit = (s: string) => THIRD_PERSON.some((re) => re.test(s));
      expect(hit('They bring their own sound engineer.')).toBe(true);
      expect(hit('Voxford sings in Zagreb and they travel by van.')).toBe(true);
      expect(hit('The group has five singers.')).toBe(true);
      expect(hit('Skupina nastupa u Zagrebu.')).toBe(true);
      expect(hit('We bring our own sound engineer.')).toBe(false);
      expect(hit('Press play and each singer lights up when their voice comes in.')).toBe(false);
      expect(hit('Your guests will love it.')).toBe(false);
    });
  });
});

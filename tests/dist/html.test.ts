// Checks the built site in dist/ (run `npm run build` first): every page has
// its head in order, hreflang is reciprocal across languages, JSON-LD parses,
// and the sitemap lists only pages that exist. This is what crawlers and AI
// answer engines read, without JavaScript.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PROFILES } from '../../src/data/site-facts';
import { pathFor, type PageKey } from '../../src/i18n/routes';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
if (!existsSync(dist)) throw new Error('dist/ is missing: run `npm run build` first');

const htmlFiles = readdirSync(dist, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith('.html') && !f.endsWith('404.html'));

/** /en/about/ for en/about/index.html */
const pathOf = (file: string) => `/${file.replace(/index\.html$/, '')}`;

const attr = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];

interface Page {
  path: string;
  html: string;
  canonical?: string;
  hreflang: Map<string, string>;
}

const pages: Page[] = htmlFiles.map((file) => {
  const html = readFileSync(`${dist}${file}`, 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  const hreflang = new Map<string, string>();
  for (const tag of head.match(/<link rel="alternate" hreflang="[^"]+" href="[^"]+"[^>]*>/g) ?? []) {
    hreflang.set(attr(tag, 'hreflang')!, new URL(attr(tag, 'href')!).pathname);
  }
  const canonicalTag = /<link rel="canonical" href="([^"]+)"/.exec(head)?.[1];
  return { path: pathOf(file), html, canonical: canonicalTag ? new URL(canonicalTag).pathname : undefined, hreflang };
});
const byPath = new Map(pages.map((p) => [p.path, p]));

describe('built pages', () => {
  it('found the pages', () => {
    expect(pages.length).toBeGreaterThanOrEqual(22);
  });

  it.each(pages.map((p) => [p.path, p] as const))('%s has a complete head', (path, page) => {
    const { html } = page;
    expect(html).toMatch(/<html lang="(en|hr)"/);
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]{50,}"/);
    expect(html).toMatch(/<meta name="robots" content="[^"]+"/);
    expect(html).toMatch(/<meta property="og:image" content="https?:\/\/[^"]+"/);
    expect(page.canonical).toBe(path);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).not.toMatch(/>\s*undefined\s*</);
  });

  it.each(pages.map((p) => [p.path, p] as const))('%s has reciprocal, self-referencing hreflang', (path, page) => {
    expect([...page.hreflang.keys()].sort()).toEqual(['en', 'hr', 'x-default']);
    expect(page.hreflang.get(path.startsWith('/hr/') ? 'hr' : 'en')).toBe(path);
    expect(page.hreflang.get('x-default')).toBe(page.hreflang.get('en'));
    for (const target of page.hreflang.values()) {
      const other = byPath.get(target);
      expect(other, `${path} → ${target} does not exist`).toBeDefined();
      expect(Object.fromEntries(other!.hreflang)).toEqual(Object.fromEntries(page.hreflang));
    }
  });

  it.each(pages.map((p) => [p.path, p] as const))('%s has JSON-LD with the MusicGroup', (_path, page) => {
    const scripts = [...page.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(scripts).toHaveLength(1);
    const data = JSON.parse(scripts[0]![1]!) as { '@graph': { '@type': string }[] };
    expect(data['@graph'].map((n) => n['@type'])).toContain('MusicGroup');
  });
});

describe('profiles', () => {
  const profiles = [PROFILES.deezer, PROFILES.appleMusic, PROFILES.musicBrainz, PROFILES.discogs, PROFILES.wikidata];

  it.each(pages.map((p) => [p.path, p] as const))('%s lists the music services and databases in sameAs and the footer', (_path, page) => {
    const data = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(page.html)![1]!) as {
      '@graph': { '@type': string; sameAs?: string[] }[];
    };
    const group = data['@graph'].find((n) => n['@type'] === 'MusicGroup')!;
    for (const url of profiles) {
      expect(group.sameAs).toContain(url);
      expect(page.html).toContain(`href="${url}"`);
    }
  });
});

describe('JSON-LD shapes', () => {
  const graphOf = (page: Page) =>
    (JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(page.html)![1]!) as {
      '@graph': (Record<string, unknown> & { '@type': string })[];
    })['@graph'];

  it('a page that sells has one Service, its packages as price-less Offers', () => {
    const selling = pages.filter((p) => graphOf(p).some((n) => n['@type'] === 'Service'));
    // Conferences, Weddings, Advent and Packages, in both languages (Private celebrations retired, #52).
    expect(selling.length).toBeGreaterThanOrEqual(8);
    // Weddings offers only POP-UP, the surprise; its ceremony is no package (Josip, #40).
    const weddings = new Set(['/en/weddings/', '/hr/vjencanja/']);
    for (const page of selling) {
      const services = graphOf(page).filter((n) => n['@type'] === 'Service');
      expect(services, page.path).toHaveLength(1);
      const offers = services[0]!.offers as { name: string }[];
      if (weddings.has(page.path)) expect(offers.map((o) => o.name), page.path).toEqual(['Voxford POP-UP']);
      else expect(offers, page.path).toHaveLength(3);
      expect(JSON.stringify(services[0]), page.path).not.toMatch(/price/i);
    }
  });

  // The FAQ is a closed-by-default accordion (spec › Acceptance): every answer
  // the FAQPage carries must still be in the HTML, inside its own <details>.
  it('every FAQPage question is a closed <details> in one exclusive group, its answer in the HTML', () => {
    const text = (s: string) =>
      s
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;|&#x26;|&#38;/g, '&')
        .replace(/&#39;|&#x27;/g, "'")
        .replace(/&quot;|&#x22;|&#34;/g, '"')
        .replace(/&lt;|&#x3C;|&#60;/gi, '<')
        .replace(/&gt;|&#x3E;|&#62;/gi, '>')
        .replace(/&nbsp;|&#xA0;|&#160;|\u00a0/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const withFaq = pages.filter((p) => graphOf(p).some((n) => n['@type'] === 'FAQPage'));
    expect(withFaq.length).toBeGreaterThanOrEqual(10);
    for (const page of withFaq) {
      const faq = graphOf(page).find((n) => n['@type'] === 'FAQPage') as unknown as {
        mainEntity: { name: string; acceptedAnswer: { text: string } }[];
      };
      const items = [...page.html.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)].filter((m) => /class="faq__item/.test(m[1]!));
      expect(items, page.path).toHaveLength(faq.mainEntity.length);
      expect(new Set(items.map((m) => attr(m[1]!, 'name'))), page.path).toEqual(new Set(['faq']));
      for (const [, attrs] of items) expect(attrs, page.path).not.toMatch(/\sopen(?=[\s=>]|$)/);
      for (const q of faq.mainEntity) {
        const item = items.find((m) => text(/<summary[\s\S]*?<\/summary>/.exec(m[2]!)![0]) === text(q.name));
        expect(item, `${page.path}: ${q.name}`).toBeDefined();
        expect(text(item![2]!), `${page.path}: ${q.name}`).toContain(text(q.acceptedAnswer.text));
      }
    }
  });
});

describe('header (#48)', () => {
  /**
   * Written out, not read from NAV_*: an independent oracle for #48's order. Events group,
   * then the divider's packages, then the flat links; concerts only while its page is built.
   */
  // The concerts page is built even when nothing is upcoming (noindex then); the
  // sitemap lists it only while a concert is upcoming, the header's own rule.
  const sitemap = readFileSync(`${dist}sitemap.xml`, 'utf8');
  const order = (lang: 'en' | 'hr') =>
    (['conferences', 'advent', 'weddings', 'packages', 'videos', 'concerts', 'about', 'faq'] as PageKey[])
      .filter((p) => p !== 'concerts' || sitemap.includes(`${pathFor(p, lang)}</loc>`))
      .map((p) => pathFor(p, lang));
  const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((m) => m[1]!);

  it.each(pages.map((p) => [p.path, p] as const))('%s carries every header link in the static HTML, in order', (path, page) => {
    const lang = path.startsWith('/hr/') ? 'hr' : 'en';
    const wide = /<nav class="header__wide[^"]*"[^>]*>([\s\S]*?)<\/nav>/.exec(page.html)?.[1];
    expect(wide, 'desktop nav').toBeDefined();
    expect(hrefs(wide!)).toEqual(order(lang));
    const menu = /<nav class="header__overlay-nav[^"]*"[^>]*>([\s\S]*?)<\/nav>/.exec(page.html)?.[1];
    expect(menu, 'mobile menu').toBeDefined();
    expect(hrefs(menu!)).toEqual(order(lang));
  });
});

describe('404 pages', () => {
  it('serves /hr/… a Croatian 404 and everything else the English one', () => {
    expect(readFileSync(`${dist}404.html`, 'utf8')).toMatch(/<html lang="en"/);
    expect(readFileSync(`${dist}hr/404.html`, 'utf8')).toMatch(/<html lang="hr"/);
    for (const file of ['404.html', 'hr/404.html']) {
      expect(readFileSync(`${dist}${file}`, 'utf8')).toMatch(/<meta name="robots" content="noindex/);
    }
  });
});

describe('sitemap.xml', () => {
  const xml = readFileSync(`${dist}sitemap.xml`, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);

  it('lists only pages that exist, each once', () => {
    expect(locs.length).toBeGreaterThan(0);
    expect(new Set(locs).size).toBe(locs.length);
    for (const loc of locs) expect(byPath.has(loc), loc).toBe(true);
  });

});

describe('robots.txt and llms.txt', () => {
  // A photo shown twice on one page reads as a mistake (#92: the Tvornica kulture frame in the
  // About prose and again as a references tile). Compared by file stem, so a different size of the
  // same file counts as a repeat. The home hero's depth planes are layers of one frame on purpose.
  const photoStems = (readdirSync(fileURLToPath(new URL('../../src/assets/photos/', import.meta.url)), { recursive: true }) as string[])
    .map(String)
    .filter((f) => /\.(jpe?g|webp|png)$/.test(f) && !/(^|\/)hero-/.test(f))
    .map((f) => f.replace(/^.*\//, '').replace(/\.[^.]+$/, ''));

  it('finds the photo files to guard', () => {
    expect(photoStems).toContain('stage-zlokic-jozinovic');
  });

  it.each(pages.map((p) => [p.path, p] as const))('%s shows no photo twice', (_path, page) => {
    const seen = new Map<string, number>();
    for (const tag of page.html.match(/<img\b[^>]*>/g) ?? []) {
      const stem = /\ssrc="\/_astro\/([^."/]+)\./.exec(tag)?.[1];
      if (stem && photoStems.includes(stem)) seen.set(stem, (seen.get(stem) ?? 0) + 1);
    }
    expect([...seen].filter(([, n]) => n > 1)).toEqual([]);
  });

  it('allows the AI crawlers and points at the sitemap', () => {
    const robots = readFileSync(`${dist}robots.txt`, 'utf8');
    for (const bot of ['OAI-SearchBot', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
      expect(robots).toContain(`User-agent: ${bot}`);
    }
    expect(robots).toMatch(/^Sitemap: https?:\/\/.+\/sitemap\.xml$/m);
  });

  it('llms.txt links only to built pages', () => {
    const llms = readFileSync(`${dist}llms.txt`, 'utf8');
    const links = [...llms.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => new URL(m[1]!).pathname);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(byPath.has(link), link).toBe(true);
  });
});

// Checks the built site in dist/ (run `npm run build` first): every page has
// its head in order, hreflang is reciprocal across languages, JSON-LD parses,
// and the sitemap lists only pages that exist. This is what crawlers and AI
// answer engines read, without JavaScript.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

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

describe('JSON-LD shapes', () => {
  const graphOf = (page: Page) =>
    (JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(page.html)![1]!) as {
      '@graph': (Record<string, unknown> & { '@type': string })[];
    })['@graph'];

  it('a page that sells has one Service, its packages as price-less Offers', () => {
    const selling = pages.filter((p) => graphOf(p).some((n) => n['@type'] === 'Service'));
    expect(selling.length).toBeGreaterThanOrEqual(10);
    for (const page of selling) {
      const services = graphOf(page).filter((n) => n['@type'] === 'Service');
      expect(services, page.path).toHaveLength(1);
      expect(services[0]!.offers, page.path).toHaveLength(3);
      expect(JSON.stringify(services[0]), page.path).not.toMatch(/price/i);
    }
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

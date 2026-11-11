// What a tab, a search result, a share preview and a home screen show of the
// site (#66): titles and descriptions within the lengths search engines show,
// unique per language; a 1200×630 share image on every page; the icons and the
// web manifest present and well-formed.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
if (!existsSync(dist)) throw new Error('dist/ is missing: run `npm run build` first');

const TITLE_MAX = 60;
const DESCRIPTION = { min: 100, max: 160 };

const decode = (s: string) =>
  s.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');

const meta = (head: string, key: string) => {
  const m = new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`).exec(head);
  return m ? decode(m[1]!) : undefined;
};
const link = (head: string, rel: string, extra = '') =>
  new RegExp(`<link rel="${rel}" href="([^"]+)"${extra}`).exec(head)?.[1];

interface Page {
  path: string;
  lang: string;
  head: string;
  title: string;
  description: string;
}

const pages: Page[] = readdirSync(dist, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith('.html') && !f.endsWith('404.html'))
  .map((file) => {
    const html = readFileSync(`${dist}${file}`, 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    return {
      path: `/${file.replace(/index\.html$/, '')}`,
      lang: /<html lang="([a-z]+)/.exec(html)![1]!,
      head,
      title: decode(/<title>([^<]*)<\/title>/.exec(head)![1]!),
      description: meta(head, 'description') ?? '',
    };
  });
const each = pages.map((p) => [p.path, p] as const);
/** The build's site (voxfordofficial.com in production, localhost in a local build), read off the canonical. */
const SITE = new URL(/<link rel="canonical" href="([^"]+)"/.exec(pages[0]!.head)![1]!).origin;

/** Width and height from a PNG's IHDR. */
const pngSize = (file: string) => {
  const b = readFileSync(file);
  expect(b.subarray(1, 4).toString()).toBe('PNG');
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
};

describe('titles and descriptions', () => {
  it('found the pages', () => {
    expect(pages.length).toBeGreaterThanOrEqual(22);
  });

  it.each(each)('%s: title ≤ 60 characters, in the site pattern', (_path, page) => {
    expect(page.title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(page.title.startsWith('Voxford · ') || page.title.endsWith(' · Voxford')).toBe(true);
    expect(page.title.match(/Voxford/g), 'says Voxford once').toHaveLength(1);
  });

  it.each(each)('%s: description %i–%i characters', (_path, page) => {
    expect(page.description.length).toBeGreaterThanOrEqual(DESCRIPTION.min);
    expect(page.description.length).toBeLessThanOrEqual(DESCRIPTION.max);
    expect(page.description).not.toMatch(/\{\w+\}/);
  });

  it.each(['en', 'hr'])('titles and descriptions are unique in %s', (lang) => {
    const own = pages.filter((p) => p.lang === lang);
    expect(new Set(own.map((p) => p.title)).size).toBe(own.length);
    expect(new Set(own.map((p) => p.description)).size).toBe(own.length);
  });
});

describe('share previews', () => {
  it.each(each)('%s: Open Graph and Twitter card', (_path, page) => {
    const { head } = page;
    expect(meta(head, 'og:title')).toBe(page.title);
    expect(meta(head, 'og:description')).toBe(page.description);
    expect(meta(head, 'og:site_name')).toBe('Voxford');
    expect(meta(head, 'og:url')).toBe(`${SITE}${page.path}`);
    expect(meta(head, 'og:locale')).toBe(page.lang === 'hr' ? 'hr_HR' : 'en_US');
    expect(meta(head, 'og:locale:alternate')).toBe(page.lang === 'hr' ? 'en_US' : 'hr_HR');
    expect(meta(head, 'og:image:alt')?.length).toBeGreaterThan(10);
    expect(meta(head, 'twitter:card')).toBe('summary_large_image');
  });

  // 1200×630; a photo narrower than 1200 px keeps the ratio at its own width (never upscaled), at least 1080.
  const images = new Map(pages.map((p) => [meta(p.head, 'og:image')!, p.head]));
  it.each([...images])('%s is on the site, about 1200×630, as its meta says', async (url, head) => {
    expect(url.startsWith(`${SITE}/`)).toBe(true);
    const file = `${dist}${new URL(url).pathname.slice(1)}`;
    expect(existsSync(file), `${file} is not in dist/`).toBe(true);
    const { width = 0, height = 0 } = await sharp(file).metadata();
    expect([String(width), String(height)]).toEqual([meta(head, 'og:image:width'), meta(head, 'og:image:height')]);
    expect(width).toBeGreaterThanOrEqual(1080);
    expect(width / height).toBeCloseTo(1200 / 630, 2);
  });

  it('every watch page shares its own video card', () => {
    const watch = pages.filter((p) => /^\/(en\/videos|hr\/videi)\/[^/]+\/$/.test(p.path));
    expect(watch.length).toBeGreaterThanOrEqual(10);
    for (const p of watch) expect(meta(p.head, 'og:image')).toBe(`${SITE}/og/${p.path.split('/')[3]}.jpg`);
  });
});

describe('icons and manifest', () => {
  it.each(each)('%s links the icons and the manifest', (_path, page) => {
    const { head } = page;
    expect(link(head, 'icon', ' sizes="32x32"')).toBe('/favicon.ico');
    expect(link(head, 'icon', ' type="image/svg\\+xml"')).toBe('/favicon.svg');
    expect(link(head, 'apple-touch-icon')).toBe('/apple-touch-icon.png');
    expect(link(head, 'manifest')).toBe('/site.webmanifest');
    expect(meta(head, 'theme-color')).toMatch(/^#[0-9a-f]{6}$/);
    expect(meta(head, 'application-name')).toBe('Voxford');
    expect(meta(head, 'apple-mobile-web-app-title')).toBe('Voxford');
  });

  it('favicon.svg follows the browser theme', () => {
    const svg = readFileSync(`${dist}favicon.svg`, 'utf8');
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 64">/);
    expect(svg).toContain('@media (prefers-color-scheme:dark)');
  });

  it('favicon.ico holds 16, 32 and 48 px', () => {
    const b = readFileSync(`${dist}favicon.ico`);
    expect(b.readUInt16LE(2)).toBe(1);
    const count = b.readUInt16LE(4);
    expect(Array.from({ length: count }, (_, i) => b.readUInt8(6 + 16 * i))).toEqual([16, 32, 48]);
  });

  it('apple-touch-icon is 180 px', () => {
    expect(pngSize(`${dist}apple-touch-icon.png`)).toEqual({ width: 180, height: 180 });
  });

  it('site.webmanifest is valid and its icons exist at their stated sizes', () => {
    const manifest = JSON.parse(readFileSync(`${dist}site.webmanifest`, 'utf8')) as {
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      theme_color: string;
      background_color: string;
      icons: { src: string; sizes: string; type: string; purpose: string }[];
    };
    expect(manifest.name).toBe('Voxford');
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.start_url).toBe('/');
    expect(['fullscreen', 'standalone', 'minimal-ui', 'browser']).toContain(manifest.display);
    expect(manifest.theme_color).toBe(meta(pages[0]!.head, 'theme-color'));
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/);
    for (const size of [192, 512]) {
      for (const purpose of ['any', 'maskable']) {
        expect(manifest.icons.some((i) => i.sizes === `${size}x${size}` && i.purpose === purpose)).toBe(true);
      }
    }
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png');
      const [w, h] = icon.sizes.split('x').map(Number);
      expect(pngSize(`${dist}${icon.src.slice(1)}`)).toEqual({ width: w, height: h });
    }
  });
});

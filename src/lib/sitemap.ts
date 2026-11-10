// sitemap.xml with hreflang alternates (xhtml:link) for every language version,
// so localized slugs (/en/weddings/ ↔ /hr/vjencanja/) stay paired.
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, type Locale } from '@/i18n/locales';

export interface SitemapPage {
  /** Root-relative path of every language version. */
  alternates: Record<Locale, string>;
  /** YYYY-MM-DD */
  lastmod: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildSitemap(site: URL, pages: readonly SitemapPage[]): string {
  const urls = pages.flatMap((page) =>
    LOCALES.map((lang) => {
      const links = [
        ...LOCALES.map((l) => ({ hreflang: LOCALE_META[l].htmlLang, href: new URL(page.alternates[l], site).href })),
        { hreflang: 'x-default', href: new URL(page.alternates[DEFAULT_LOCALE], site).href },
      ]
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}"/>`)
        .join('\n');
      return `  <url>\n    <loc>${esc(new URL(page.alternates[lang], site).href)}</loc>\n    <lastmod>${page.lastmod}</lastmod>\n${links}\n  </url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

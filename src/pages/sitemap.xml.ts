import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { LOCALES, type Locale } from '@/i18n/locales';
import { PAGE_KEYS, alternatesFor, videoPathFor } from '@/i18n/routes';
import { getUpcomingConcerts } from '@/lib/concerts';
import { buildSitemap, type SitemapPage } from '@/lib/sitemap';

// Every page in the route table (minus an empty concerts page) plus every
// video watch page. lastmod is the build date: the whole site rebuilds on
// every deploy, so it is the date the HTML last changed at the latest.
export const GET: APIRoute = async ({ site }) => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const hasConcerts = (await getUpcomingConcerts()).length > 0;

  const pages: SitemapPage[] = PAGE_KEYS.filter((p) => p !== 'concerts' || hasConcerts).map((p) => ({
    alternates: alternatesFor(p),
    lastmod,
  }));
  for (const video of await getCollection('videos')) {
    pages.push({
      alternates: Object.fromEntries(LOCALES.map((l) => [l, videoPathFor(video.id, l)])) as Record<Locale, string>,
      lastmod,
    });
  }

  return new Response(buildSitemap(site!, pages), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

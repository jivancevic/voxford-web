import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { LOCALES, type Locale } from '@/i18n/locales';
import { PAGE_KEYS, alternatesFor, videoPathFor } from '@/i18n/routes';
import { withoutEmptyConcerts } from '@/lib/concerts';
import { lastCommitDate, pageFiles } from '@/lib/lastmod';
import { buildSitemap, type SitemapPage } from '@/lib/sitemap';

// Every page in the route table (minus an empty concerts page) plus every
// video watch page. lastmod is the last commit touching the page's files
// (src/lib/lastmod.ts).
export const GET: APIRoute = async ({ site }) => {
  const pages: SitemapPage[] = (await withoutEmptyConcerts(PAGE_KEYS)).map((p) => ({
    alternates: alternatesFor(p),
    lastmod: lastCommitDate(pageFiles(p)),
  }));
  for (const video of await getCollection('videos')) {
    pages.push({
      alternates: Object.fromEntries(LOCALES.map((l) => [l, videoPathFor(video.id, l)])) as Record<Locale, string>,
      lastmod: lastCommitDate([`src/content/videos/${video.id}.json`, 'src/views/VideoWatchView.astro']),
    });
  }

  return new Response(buildSitemap(site!, pages), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

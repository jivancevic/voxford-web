// Upcoming public concerts: entries in the `concerts` collection dated today or
// later at build time. The concerts page, its footer link and its sitemap entry
// all hide when there are none (spec › Information architecture).
import { getCollection } from 'astro:content';
import type { Locale } from '@/i18n';
import { concertIcs, concertPlace } from './concert-ics';

export async function getUpcomingConcerts(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return (await getCollection('concerts'))
    .filter((c) => c.data.startDate.slice(0, 10) >= today)
    .sort((a, b) => a.data.startDate.localeCompare(b.data.startDate));
}

/** Page keys from `pages` minus `concerts` when there is nothing upcoming. */
export async function withoutEmptyConcerts<T extends string>(pages: readonly T[]): Promise<T[]> {
  const hasConcerts = (await getUpcomingConcerts()).length > 0;
  return pages.filter((p) => p !== 'concerts' || hasConcerts);
}

/** The .ics endpoint behind each concert's "Add to calendar", for one language. */
export function icsRoute(lang: Locale) {
  return {
    async getStaticPaths() {
      return (await getCollection('concerts')).map((c) => ({ params: { id: c.id } }));
    },
    async GET({ params, site }: { params: { id?: string }; site: URL | undefined }) {
      const entry = (await getCollection('concerts')).find((c) => c.id === params.id);
      if (!entry || !site) return new Response(null, { status: 404 });
      const ics = concertIcs(
        {
          uid: `${entry.id}@${site.hostname}`,
          name: entry.data.name[lang],
          startDate: entry.data.startDate,
          place: concertPlace(entry.data, lang),
          description: entry.data.description?.[lang],
          url: entry.data.url,
        },
        new Date(),
      );
      return new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
    },
  };
}

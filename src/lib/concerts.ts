// Upcoming public concerts: entries in the `concerts` collection dated today or
// later at build time. The concerts page, its footer link and its sitemap entry
// all hide when there are none (spec › Information architecture).
import { getCollection } from 'astro:content';

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

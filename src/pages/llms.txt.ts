import type { APIRoute } from 'astro';
import { GROUP, MEMBERS, NUMBERS, PACKAGES, PRICE_ON_REQUEST, PROFILES, STAGES } from '@/data/site-facts';
import { getStrings } from '@/i18n';
import { PAGE_KEYS, pathFor } from '@/i18n/routes';
import { getUpcomingConcerts } from '@/lib/concerts';

// llmstxt.org: a short, AI-readable map of the site, built from the same
// site-facts as the JSON-LD so the two cannot drift. A cheap extra, not a
// pillar (spec › SEO/GEO). Links only to routes that exist.
export const GET: APIRoute = async ({ site }) => {
  const en = getStrings('en');
  const hr = getStrings('hr');
  const hasConcerts = (await getUpcomingConcerts()).length > 0;
  const abs = (path: string) => new URL(path, site).href;
  const pages = PAGE_KEYS.filter((p) => p !== 'concerts' || hasConcerts);

  const body = `# ${GROUP.name}

> ${GROUP.disambiguation.en}. Five singers, founded in ${GROUP.foundingYear}, booked for conferences and corporate events, weddings, Advent and summer concerts and private celebrations in Zagreb, across Croatia and the region. ${NUMBERS.followers.display} ${NUMBERS.followers.label.en}, ${NUMBERS.views.display} ${NUMBERS.views.label.en}.

- Members (stage order): ${MEMBERS.map((m) => `${m.name} (${m.voice.en})`).join('; ')}
- Packages: ${PACKAGES.map((p) => `${p.name}: ${p.summary.en}`).join(' ')} ${PRICE_ON_REQUEST.en}
- Notable stages: ${STAGES.map((s) => `${s.name} (${s.city.en})`).join(', ')}
- Bookings: ${GROUP.email} (management: ${GROUP.manager.name}, ${GROUP.manager.company})
- Not to be confused with vOx Chamber Choir, Oxford.

## Pages (English)
${pages.map((p) => `- [${en.common.nav[p]}](${abs(pathFor(p, 'en'))})`).join('\n')}

## Stranice (Hrvatski)
${pages.map((p) => `- [${hr.common.nav[p]}](${abs(pathFor(p, 'hr'))})`).join('\n')}

## Profiles
${Object.entries(PROFILES)
  .map(([k, url]) => `- ${k}: ${url}`)
  .join('\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

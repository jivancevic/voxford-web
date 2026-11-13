import type { APIRoute } from 'astro';
import {
  GROUP,
  LISTING_LABELS,
  LISTINGS,
  MEMBERS,
  NUMBERS,
  PACKAGES,
  PRICE_ON_REQUEST,
  PROFILE_LABELS,
  PROFILES,
  STAGES,
  type ListingKey,
  type ProfileKey,
} from '@/data/site-facts';
import { format, getStrings } from '@/i18n';
import { PAGE_KEYS, pathFor } from '@/i18n/routes';
import { withoutEmptyConcerts } from '@/lib/concerts';

// llmstxt.org: a short, AI-readable map of the site, built from the same
// site-facts as the JSON-LD so the two cannot drift. A cheap extra, not a
// pillar (spec › SEO/GEO). Links only to routes that exist. Summary in EN
// (canonical); the page list in both languages.
export const GET: APIRoute = async ({ site }) => {
  const en = getStrings('en').common;
  const hr = getStrings('hr').common;
  const l = en.llms;
  const abs = (path: string) => new URL(path, site).href;
  const pages = await withoutEmptyConcerts(PAGE_KEYS);

  const body = `# ${GROUP.name}

> ${GROUP.disambiguation.en}. ${format(l.summary, { year: GROUP.foundingYear })} ${NUMBERS.followers.display} ${NUMBERS.followers.label.en}, ${NUMBERS.views.display} ${NUMBERS.views.label.en}.

- ${l.members}: ${MEMBERS.map((m) => `${m.name} (${m.voice.en})`).join('; ')}
- ${l.packages}: ${PACKAGES.map((p) => `${p.name}: ${p.summary.en}`).join(' ')} ${PRICE_ON_REQUEST.en}
- ${l.stages}: ${STAGES.map((s) => `${s.name} (${s.city.en})`).join(', ')}
- ${l.bookings}: ${GROUP.email} (${l.management}: ${GROUP.manager.name}, ${GROUP.manager.company})
- ${l.notConfused}

## ${l.pages}
${pages.map((p) => `- [${en.nav[p]}](${abs(pathFor(p, 'en'))})`).join('\n')}

## ${hr.llms.pages}
${pages.map((p) => `- [${hr.nav[p]}](${abs(pathFor(p, 'hr'))})`).join('\n')}

## ${l.profiles}
${(Object.keys(PROFILES) as ProfileKey[]).map((k) => `- ${PROFILE_LABELS[k]}: ${PROFILES[k]}`).join('\n')}
${(Object.keys(LISTINGS) as ListingKey[]).map((k) => `- ${LISTING_LABELS[k]}: ${LISTINGS[k]}`).join('\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

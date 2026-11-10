// FAQ entries (ticket C): the `faq` collection, filled with site-facts and
// ready to render and to put into FAQPage JSON-LD. The same answer HTML goes
// to the page and to the schema, so they cannot say different things.
import { getCollection } from 'astro:content';
import type { Locale } from '@/i18n/locales';
import type { PageKey } from '@/i18n/routes';
import { fillFacts, fillFactsHtml } from './copy';
import type { QA } from './jsonld';

import type { FaqGroup } from './faq-groups';

export type { FaqGroup };

export interface Faq extends QA {
  id: string;
  group: FaqGroup;
}

/** FAQ entries in one language, in `order`; with `page`, only those tagged for that page. */
export async function getFaqs(lang: Locale, page?: PageKey): Promise<Faq[]> {
  const entries = await getCollection('faq', (e) => e.id.startsWith(`${lang}/`));
  return entries
    .filter((e) => !page || e.data.pages.includes(page))
    .sort((a, b) => a.data.order - b.data.order)
    .map((e) => ({
      id: e.id.slice(lang.length + 1),
      group: e.data.group,
      question: fillFacts(e.data.question, lang),
      answer: fillFactsHtml(e.rendered?.html ?? '', lang),
    }));
}

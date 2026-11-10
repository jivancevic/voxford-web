// Helpers for the page views in src/views/: load a page's copy entry and build
// its breadcrumb trail. Kept here so every view does it the same way.
import { getEntry } from 'astro:content';
import { getStrings, type Locale } from '@/i18n';
import { pathFor, type PageKey } from '@/i18n/routes';
import { breadcrumbJsonLd, type Crumb, type JsonLdNode } from './jsonld';

/** The `pages` collection entry for one page in one language (src/content/pages/<lang>/<page>.md). */
export async function loadPage(page: PageKey, lang: Locale) {
  const entry = await getEntry('pages', `${lang}/${page}`);
  if (!entry) throw new Error(`Missing page copy: src/content/pages/${lang}/${page}.md`);
  return entry;
}

/** Home → this page; extra crumbs (e.g. a video) go after it. */
export function breadcrumbsFor(site: URL, page: PageKey, lang: Locale, extra: readonly Crumb[] = []): JsonLdNode {
  const t = getStrings(lang);
  const crumbs: Crumb[] = [{ name: t.common.nav.home, path: pathFor('home', lang) }];
  if (page !== 'home') crumbs.push({ name: t.common.nav[page], path: pathFor(page, lang) });
  return breadcrumbJsonLd(site, [...crumbs, ...extra]);
}

import { DEFAULT_LOCALE, type Locale } from '../src/i18n/locales';

// `/` picks a language from Accept-Language: Croatian → /hr/, anything else →
// /en/ (spec › Languages). Language pages themselves never redirect.

/** The language tags in an Accept-Language header, best first (q=0 dropped). */
export function preferredLanguages(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const quality = q ? Number(q.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((l) => l.tag && l.tag !== '*' && l.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
    .map((l) => l.tag);
}

/** The first language the visitor prefers that the site has; EN when none. */
export function pickLocale(header: string | null): Locale {
  for (const tag of preferredLanguages(header)) {
    const base = tag.split('-')[0];
    if (base === 'hr') return 'hr';
    if (base === 'en') return 'en';
  }
  return DEFAULT_LOCALE;
}

export function handleRootRedirect(request: Request): Response {
  const url = new URL(request.url);
  const locale = pickLocale(request.headers.get('Accept-Language'));
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL(`/${locale}/${url.search}`, url).href,
      Vary: 'Accept-Language',
      'Cache-Control': 'private, no-store',
    },
  });
}

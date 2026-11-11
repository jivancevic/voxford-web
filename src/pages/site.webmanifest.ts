import type { APIRoute } from 'astro';
import { getStrings } from '@/i18n';
import { THEME_COLOR } from '@/styles/theme';

// The web app manifest: what a phone shows when the site is added to the home
// screen. The site is EN canonical, so the manifest speaks English; the name
// is the same in both languages. Icons are written by scripts/icons.mjs and
// keep the shield inside the maskable safe zone, so each serves both purposes.
export const GET: APIRoute = () => {
  const t = getStrings('en');
  const manifest = {
    id: '/',
    name: t.common.meta.siteName,
    short_name: t.common.meta.siteName,
    description: t.common.meta.defaultDescription,
    lang: 'en',
    start_url: '/',
    scope: '/',
    display: 'browser',
    theme_color: THEME_COLOR,
    background_color: THEME_COLOR,
    icons: [192, 512].flatMap((size) =>
      (['any', 'maskable'] as const).map((purpose) => ({
        src: `/icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose,
      })),
    ),
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
};

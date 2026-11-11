import type { APIRoute, GetStaticPaths } from 'astro';
import { getStrings, LOCALES, type Locale } from '@/i18n';
import { captionVtt } from '@/lib/captions';

// The one-line caption track of the top videos, per language (src/lib/captions.ts).
export const getStaticPaths = (() => LOCALES.map((lang) => ({ params: { lang } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const t = getStrings(params.lang as Locale);
  return new Response(captionVtt(t.videos.watch.captionLine), {
    headers: { 'Content-Type': 'text/vtt; charset=utf-8' },
  });
};

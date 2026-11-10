import type { APIRoute } from 'astro';

// Search and AI crawlers are welcome (spec › SEO/GEO): they are named so a
// future blanket rule cannot shut them out by accident. Non-production hosts
// stay out of the index through noindex (meta + X-Robots-Tag), not robots.txt,
// because a crawler must fetch a page to see its noindex.
const AI_AND_SEARCH_BOTS = [
  'Googlebot',
  'Bingbot',
  'Applebot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
];

export const GET: APIRoute = ({ site }) => {
  const body = [
    // One group: the named bots and everyone else share the same rules.
    ...AI_AND_SEARCH_BOTS.map((bot) => `User-agent: ${bot}`),
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${new URL('/sitemap.xml', site).href}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

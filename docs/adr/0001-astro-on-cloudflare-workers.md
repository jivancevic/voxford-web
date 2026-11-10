# Astro on Cloudflare Workers, not Next.js on Vercel

The house default for a marketing site is Next.js on Vercel, but Vercel's Hobby plan forbids commercial use and Voxford is a business. Astro ships plain static HTML with no JavaScript by default, which is what AI crawlers read (they do not run JS), and Cloudflare Workers serve that HTML as static assets on the free plan, with a small Worker for the few dynamic paths (the `/` language redirect, `/healthz`, `/api/inquiry`, the daily reels cron) and R2, Turnstile and email sending next door.

## Considered Options

- **Astro with the `@astrojs/cloudflare` adapter**: rejected for v1. Every page is static; the adapter would put Astro's SSR runtime in front of all of them for no gain. A hand-written Worker with `assets.run_worker_first` limited to four paths keeps the static pages off the Worker entirely and makes the Worker a plain module that unit tests can call.
- **Cloudflare Pages**: Cloudflare now steers new projects to Workers with static assets; Workers also carry the cron trigger the reels sync needs.

## Consequences

- `/` is not an Astro page: the Worker redirects it by `Accept-Language`. `npm run dev` (Astro alone) has no `/`; `npm run preview` does.
- `noindex` on `*.workers.dev` comes from `public/_headers` (host patterns) plus the `SITE_INDEXABLE` build flag for the meta tag.

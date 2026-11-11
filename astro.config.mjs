// @ts-check
import { rename, rmdir } from 'node:fs/promises';
import { defineConfig, envField, fontProviders } from 'astro/config';

// Static build only (ADR 0001): every page is prerendered HTML in dist/, served
// by Cloudflare Workers static assets. Dynamic paths live in worker/.

const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

/**
 * One file of a variable font, limited to a unicode range. Each family below
 * uses two: Latin, and Latin Extended (Č Ć Ž Đ Š), so Croatian text loads both.
 * @param {string} file
 * @param {'latin' | 'latin-ext'} subset
 * @param {string} weight
 */
const face = (file, subset, weight) => ({
  src: /** @type {[string]} */ ([`./src/assets/fonts/${file}-${subset}-wght-normal.woff2`]),
  weight,
  style: /** @type {const} */ ('normal'),
  unicodeRange: /** @type {[string]} */ ([subset === 'latin' ? LATIN : LATIN_EXT]),
});

/**
 * Workers assets serve the nearest 404.html for a missing path
 * (wrangler.jsonc › not_found_handling), so /hr/… needs dist/hr/404.html.
 * Only the root 404.astro escapes build.format 'directory'; this moves the
 * Croatian one from hr/404/index.html to hr/404.html.
 * If build.format or the i18n prefix changes, the rename fails the build
 * with ENOENT on purpose: fix the paths here rather than ship an English 404.
 * @type {import('astro').AstroIntegration}
 */
const croatian404 = {
  name: 'voxford:hr-404',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await rename(new URL('hr/404/index.html', dir), new URL('hr/404.html', dir));
      await rmdir(new URL('hr/404/', dir));
    },
  },
};

// Canonical origin. Set SITE_URL in Workers Builds; ticket G sets the domain.
const site = process.env.SITE_URL || 'http://localhost:8787';

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [croatian404],
  // The Videos page's YouTube thumbnails (src/lib/youtube.ts): downloaded and
  // resized at build, served from our origin, so visitors ask YouTube for
  // nothing before they press play (#41). The reel thumbnails the daily sync
  // copies to R2 come from our own origin and get the same treatment (#95).
  image: { domains: ['i.ytimg.com', new URL(site).hostname] },
  i18n: {
    locales: ['en', 'hr'],
    defaultLocale: 'en',
    // `/` is the Worker's Accept-Language redirect, not an Astro page.
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  env: {
    schema: {
      SITE_INDEXABLE: envField.boolean({ context: 'server', access: 'public', default: false }),
    },
  },
  fonts: [
    {
      // Brand display: Latin only, no Č Ć Ž Đ. Wordmark, package names, numbers.
      provider: fontProviders.local(),
      name: 'Staubach',
      cssVariable: '--font-staubach',
      fallbacks: ['Impact', 'sans-serif'],
      options: { variants: [{ src: ['./src/assets/fonts/staubach.woff2'], weight: '400', style: 'normal' }] },
    },
    {
      // Headlines that need Croatian letters.
      provider: fontProviders.local(),
      name: 'Big Shoulders',
      cssVariable: '--font-big-shoulders',
      fallbacks: ['Arial Narrow', 'sans-serif'],
      options: { variants: [face('big-shoulders', 'latin', '100 900'), face('big-shoulders', 'latin-ext', '100 900')] },
    },
    {
      provider: fontProviders.local(),
      name: 'Instrument Sans',
      cssVariable: '--font-instrument-sans',
      fallbacks: ['sans-serif'],
      options: { variants: [face('instrument-sans', 'latin', '400 700'), face('instrument-sans', 'latin-ext', '400 700')] },
    },
    {
      provider: fontProviders.local(),
      name: 'Jura',
      cssVariable: '--font-jura',
      fallbacks: ['sans-serif'],
      options: { variants: [face('jura', 'latin', '300 700'), face('jura', 'latin-ext', '300 700')] },
    },
  ],
  vite: {
    resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  },
});

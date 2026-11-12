# AGENTS.md

Voxford's public website: Astro (static) on Cloudflare Workers. Read `CONTEXT.md` for the words, `docs/spec.md` for what v1 is, `docs/tickets.md` for who builds what.

## Framework notes

- **Astro 7, static output.** Every page is prerendered HTML in `dist/`; there is no Astro adapter and no SSR. Dynamic paths (`/`, `/healthz`, `/api/*`, `/media/*`, the reels cron) are the Worker in `worker/` (ADR 0001), and so is the build's audio (`/_astro/*.webm`, `*.m4a`), because static assets do not answer byte ranges (`worker/asset-ranges.ts`). Astro's docs: https://docs.astro.build. Astro 7 is newer than most training data: check `node_modules/astro/dist/types/public/config.d.ts` before using a config option from memory.
- **TypeScript 6, not 7.** `typescript-eslint` and `@astrojs/check` do not support TS 7 yet. Bump when they do.
- **Content collections** are declared in `src/content.config.ts` (Astro 5+ location) with the `glob()` loader; Zod comes from `astro/zod` (Zod 4: `z.url()`, not `z.string().url()`).
- **Fonts** use Astro's Fonts API (`fonts` in `astro.config.mjs`, `<Font>` in the layout) with local woff2 files in `src/assets/fonts/`.
- **Builds inside `.claude/worktrees/<name>/` fail** with "Tsconfig not found astro/tsconfigs/strict" when the main checkout has no `node_modules`: the worktree sits inside the main checkout, and the native resolver also reads the main checkout's `tsconfig.json`, whose `extends` then cannot resolve. Fix: `npm ci` in the main checkout (`~/projects/business/voxford-web`); after that `npm run build`, `check` and `test:dist` work in place (#58 ran all three in a worktree). If you cannot touch the main checkout, run them on a copy outside the repo: `git worktree add --detach <scratch>/copy HEAD`, symlink `node_modules`, `rsync` your `src/` into it. `npm test` and `lint` always work in place. CI is not affected.
- **Layout changes: run the sweep, not a scratch script.** `npm run build && npm run test:layout` (`tests/layout/`, also in CI's `build` job) loads every page in Chromium at the viewports that bit us (phones upright and on their side, tablets, 1440×900, the home's stage forced to 358px) and fails on horizontal overflow, overlapping text, stretched pills, taps under 44px on touch and a pinned stage's content leaving it. A failing case leaves a half-scale screenshot and `summary.json` in `test-results/layout/` (a CI artifact). A real failure you cannot fix in your PR goes into `KNOWN` in `tests/layout/matrix.ts` with its issue. The sweep checks the symptoms of the `svh` and `%` rules in `CODING_STANDARDS.md`, not their causes.
- Dev: `npm run dev` (Astro, port 4321, no Worker) for pages; `npm run preview` (build + `wrangler dev`, port 8787) for the real thing, Worker included.

## Seams: who edits what

Each file below has one origin ticket (`docs/tickets.md`); the column only says where to look for history. Edit the shared files only as the "Others may" column allows. Changing a seam (a prop, a route, a schema field another page reads) belongs in its own PR: when a feature PR needs one, note it there and leave it for that follow-up.

| Seam | Files | Origin ticket | Others may |
|---|---|---|---|
| Design tokens | `src/styles/tokens.css` (the only place colours, type, spacing live), `src/styles/global.css` (pill, label, light line, `.tap-target`, base) | A | read only; a missing token is a PR note, not a local hex |
| Layout shell | `src/layouts/BaseLayout.astro`, `src/components/{SiteHeader,SiteFooter,LanguageSwitch,Crest,Pill,Photo,JsonLd,PagePlaceholder}.astro` | A | use; pass `jsonLd`, `noindex`, `ogPhoto` (or `ogImage`, a ready 1200×630 path) through props |
| Route table | `src/i18n/routes.ts` (paths per language, nav order), `src/pages/**` wrappers, `public/_redirects` (retired pages → 301) | A | read only; wrappers stay one line |
| Icons and manifest | `src/assets/brand/crest-shield.svg` (the crest's shield, traced; the only source), `scripts/icons.mjs` → `public/{favicon.svg,favicon.ico,apple-touch-icon.png,icon-192.png,icon-512.png}`; `src/pages/site.webmanifest.ts`; watch-page share cards `src/pages/og/[video].jpg.ts` | A | never edit the PNG/ICO by hand: change the source or `tokens.css`, run `node scripts/icons.mjs`, commit what it writes |
| 404 | `src/views/NotFoundView.astro`, wrappers `src/pages/404.astro` (EN) and `src/pages/hr/404.astro`; `astro.config.mjs` moves the HR one to `dist/hr/404.html`, the file Workers assets serve for a missing `/hr/…` path | A | — |
| Page views | `src/views/HomeView.astro` | B | — |
| | `src/views/{Conferences,Weddings,Advent,About,Packages,Faq,Concerts}View.astro` | C | — |
| | `src/views/InquiryView.astro` | D | — |
| | `src/views/{Videos,VideoWatch}View.astro` | E | — |
| UI strings | `src/i18n/{en,hr}/<ns>.json`: `common`, `home`, `content` (Conferences, Weddings, Advent, About, Packages, FAQ, Concerts), `inquiry`, `videos` (also the references wall) | per namespace | add keys in the namespace of the page you change, in both languages |
| Page copy | `src/content/pages/{en,hr}/<pageKey>.md` (title, description, heading, source, body) | the page's owner | edit only the entries of the pages you change; title ≤ 50 (the " · Voxford" suffix makes ≤ 60, Voxford said once), description 100–160 with facts filled in, unique per language: `tests/dist/meta.test.ts` checks the built pages |
| Collections | `src/content.config.ts`: `pages`, `faq`, `concerts`, `videos`, `references` | the layout shell declares | add fields to the schema of the collection you change only |
| Site facts | `src/data/site-facts.ts` (numbers, profiles, members, packages, stages) | A | read only; a wrong fact is fixed from the KB in its own PR |
| Photos | `src/data/photos.ts` + `src/assets/photos/` | A | add new keys and files; never change an existing key's meaning |
| JSON-LD | `src/lib/jsonld.ts` builders, rendered through `BaseLayout`'s `jsonLd` prop | A | call the builders; a missing builder is a PR note |
| Inquiry contract | `src/lib/inquiry-url.ts` (`inquiryUrl`, `parseInquiryPrefill`) | A | the inquiry form reads it; nobody changes the contract |
| `InquiryCTA` | `src/components/InquiryCTA.astro`, props `{ lang, prefill?, label?, variant?: 'primary' \| 'ghost', class? }` | the inquiry page styles it | the home and content pages place it; props are fixed |
| `AvailabilityCheck` | `src/components/AvailabilityCheck.astro`, props `{ lang, type?: EventType, class? }`: the date + city widget, a GET form to `/{lang}/inquiry/` in the prefill contract | the inquiry page | the home hero places it; others may place it; props are fixed |
| `ReferencesWall` | `src/components/ReferencesWall.astro`, props `{ lang, limit?, heading?: string \| false, class? }`, reads `references` itself; venues and artists are tiles, with our own photo where the entry names one (`photo`, a key in `photos.ts`) | the videos pages fill it | the home and content pages place it; props are fixed |
| `VideoRail` | `src/components/VideoRail.astro`, props `{ lang, source?: 'top' \| 'reels', limit?, heading?: string \| false, inline?: boolean, class? }`, reads its data itself; `inline` (the home) plays top videos in their card and grows cards on hover | the videos pages fill it | the home and content pages place it; props are fixed |
| Worker | `worker/index.ts` (router) and `worker/healthz.ts`, `worker/lang-redirect.ts` | A | — |
| | `worker/inquiry.ts` (`handleInquiry`) | D | — |
| | `worker/reels.ts` (`syncReels`) | E | — |
| | `worker/env.ts` | A | add bindings under the comment of the feature that needs them (inquiry, reels) |
| | `wrangler.jsonc` | A | reels add `r2_buckets`; the domain adds `routes`; the inquiry adds `send_email`, `vars` (`INQUIRY_FROM`) and `ratelimits` (#65) |

Shared rules:

- **Facts only from the KB** (`~/projects/business/voxford/`), through `site-facts.ts`. No invented numbers, quotes, clients or testimonials. This repo is public: no prices, OIB, IBAN, contracts, phone numbers or private clients' names, ever.
- **Copy is written natively in both languages**; HR addresses the reader with capitalised "Vi". Every page copy entry names its KB `source`.
- CSS, layout, voice and typography rules live in `CODING_STANDARDS.md`; read it before writing or reviewing a style, a component or copy.
- `npm test` must stay green: `src/i18n/parity.test.ts` fails when a key or page entry exists in one language only, `routes.test.ts` when a route has no wrapper, `contrast.test.ts` when a token pair drops below its ratio.

## How work ships

This repo follows `~/.agents/STANDARDS.md` (the loop, the gates, the never-list, `/ship`). Below are only this repo's facts and where it is stricter.

- **A merge to `main` is a production deploy**: Cloudflare Workers Builds builds and deploys every push to `main` (`npm run build`, then `npm run deploy`), no staging. The production URL is `https://voxfordofficial.com` (repo variable `PRODUCTION_URL`); the `workers.dev` URL is off and preview URLs are `noindex`.
- **Post-merge check**: the `smoke` workflow (`.github/workflows/smoke.yml`) waits for `$PRODUCTION_URL/healthz` to answer 200 with the merged commit. Red, or prod misbehaving after a merge: roll back first, diagnose after.
- **Rollback**: `npx wrangler rollback` (to the previous version), then a revert PR. Runbook: `docs/deploy-cloudflare.md` → Rollback.
- **Required checks**: `ci`, `Workers Builds: voxford-web` and `ship-review` (any source; proven on #111).
- **Stricter here**: nothing yet.

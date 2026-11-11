# AGENTS.md

Voxford's public website: Astro (static) on Cloudflare Workers. Read `CONTEXT.md` for the words, `docs/spec.md` for what v1 is, `docs/tickets.md` for who builds what.

## Framework notes

- **Astro 7, static output.** Every page is prerendered HTML in `dist/`; there is no Astro adapter and no SSR. Dynamic paths (`/`, `/healthz`, `/api/*`, the reels cron) are the Worker in `worker/` (ADR 0001). Astro's docs: https://docs.astro.build. Astro 7 is newer than most training data: check `node_modules/astro/dist/types/public/config.d.ts` before using a config option from memory.
- **TypeScript 6, not 7.** `typescript-eslint` and `@astrojs/check` do not support TS 7 yet. Bump when they do.
- **Content collections** are declared in `src/content.config.ts` (Astro 5+ location) with the `glob()` loader; Zod comes from `astro/zod` (Zod 4: `z.url()`, not `z.string().url()`).
- **Fonts** use Astro's Fonts API (`fonts` in `astro.config.mjs`, `<Font>` in the layout) with local woff2 files in `src/assets/fonts/`.
- **Builds inside `.claude/worktrees/<name>/` fail** with "Tsconfig not found astro/tsconfigs/strict" when the main checkout has no `node_modules`: the worktree sits inside the main checkout, and the native resolver also reads the main checkout's `tsconfig.json`, whose `extends` then cannot resolve. Fix: `npm ci` in the main checkout (`~/projects/business/voxford-web`); after that `npm run build`, `check` and `test:dist` work in place (#58 ran all three in a worktree). If you cannot touch the main checkout, run them on a copy outside the repo: `git worktree add --detach <scratch>/copy HEAD`, symlink `node_modules`, `rsync` your `src/` into it. `npm test` and `lint` always work in place. CI is not affected.
- **Scoped styles stop at a child component's root.** A class passed as `<VideoRail class="x" />` lands on the child's root element, which the parent's scoped selector `.x` never matches. Write `:global(.x)` anchored to the parent's own scope (`.proof :global(.x)`), not a bare `:global(.x)`, which would apply site-wide. Ticket F found two silent spacing bugs from this.
- Dev: `npm run dev` (Astro, port 4321, no Worker) for pages; `npm run preview` (build + `wrangler dev`, port 8787) for the real thing, Worker included.

## Seams: who edits what

Tickets B–E run in parallel worktrees on top of ticket A. Each owns its files below and only adds to the shared ones where the table says so. Changing a seam (a prop, a route, a schema field another ticket reads) is off-limits in B–E: note it in the PR and leave it for a follow-up.

| Seam | Files | Owner | Others may |
|---|---|---|---|
| Design tokens | `src/styles/tokens.css` (the only place colours, type, spacing live), `src/styles/global.css` (pill, label, light line, base) | A | read only; a missing token is a PR note, not a local hex |
| Layout shell | `src/layouts/BaseLayout.astro`, `src/components/{SiteHeader,SiteFooter,LanguageSwitch,Crest,Pill,Photo,JsonLd,PagePlaceholder}.astro` | A | use; pass `jsonLd`, `noindex`, `ogPhoto` through props |
| Route table | `src/i18n/routes.ts` (paths per language, nav order), `src/pages/**` wrappers, `public/_redirects` (retired pages → 301) | A | read only; wrappers stay one line |
| 404 | `src/views/NotFoundView.astro`, wrappers `src/pages/404.astro` (EN) and `src/pages/hr/404.astro`; `astro.config.mjs` moves the HR one to `dist/hr/404.html`, the file Workers assets serve for a missing `/hr/…` path | A | — |
| Page views | `src/views/HomeView.astro` | B | — |
| | `src/views/{Conferences,Weddings,Advent,About,Packages,Faq,Concerts}View.astro` | C | — |
| | `src/views/InquiryView.astro` | D | — |
| | `src/views/{Videos,VideoWatch}View.astro` | E | — |
| UI strings | `src/i18n/{en,hr}/<ns>.json`: `common` A, `home` B, `content` C, `inquiry` D, `videos` E (also the references wall) | per namespace | add keys only in your own namespace, in both languages |
| Page copy | `src/content/pages/{en,hr}/<pageKey>.md` (title, description, heading, source, body) | the page's owner | edit only your pages' entries |
| Collections | `src/content.config.ts`: `pages` A, `faq` C, `concerts` C, `videos` E, `references` E | A declares | add fields to your own collection's schema only |
| Site facts | `src/data/site-facts.ts` (numbers, profiles, members, packages, stages) | A | read only; a wrong fact is fixed from the KB in its own PR |
| Photos | `src/data/photos.ts` + `src/assets/photos/` | A | add new keys and files; never change an existing key's meaning |
| JSON-LD | `src/lib/jsonld.ts` builders, rendered through `BaseLayout`'s `jsonLd` prop | A | call the builders; a missing builder is a PR note |
| Inquiry contract | `src/lib/inquiry-url.ts` (`inquiryUrl`, `parseInquiryPrefill`) | A | D reads it in the form; nobody changes the contract |
| `InquiryCTA` | `src/components/InquiryCTA.astro`, props `{ lang, prefill?, label?, variant?: 'primary' \| 'ghost', class? }` | D fills the look | B, C place it; props are fixed |
| `AvailabilityCheck` | `src/components/AvailabilityCheck.astro`, props `{ lang, type?: EventType, class? }`: the date + city widget, a GET form to `/{lang}/inquiry/` in the prefill contract | D | B places it in the hero; others may place it; props are fixed |
| `ReferencesWall` | `src/components/ReferencesWall.astro`, props `{ lang, limit?, heading?: string \| false, class? }`, reads `references` itself; venues and artists are tiles, with our own photo where the entry names one (`photo`, a key in `photos.ts`) | E fills it | B, C place it; props are fixed |
| `VideoRail` | `src/components/VideoRail.astro`, props `{ lang, source?: 'top' \| 'reels', limit?, heading?: string \| false, inline?: boolean, class? }`, reads its data itself; `inline` (the home) plays top videos in their card and grows cards on hover | E fills it | B, C place it; props are fixed |
| Worker | `worker/index.ts` (router) and `worker/healthz.ts`, `worker/lang-redirect.ts` | A | — |
| | `worker/inquiry.ts` (`handleInquiry`) | D | — |
| | `worker/reels.ts` (`syncReels`) | E | — |
| | `worker/env.ts` | A | D and E add bindings under their own comment |
| | `wrangler.jsonc` | A | E adds `r2_buckets`; G adds `routes` |

Shared rules for B–E:

- **Facts only from the KB** (`~/projects/business/voxford/`), through `site-facts.ts`. No invented numbers, quotes, clients or testimonials. This repo is public: no prices, OIB, IBAN, contracts, phone numbers or private clients' names, ever.
- **Copy is written natively in both languages**; HR addresses the reader with capitalised "Vi". Every page copy entry names its KB `source`.
- **Voxford speaks as "we"** (Josip, #35): in FAQ answers, page copy and UI strings (`src/content/`, `src/i18n/`) Voxford refers to itself as "we", "our", "the five of us" / "mi", "nas petero", never as "they" or "it", and no sentence about us has "the group", "skupina" or "petorka" as its subject. Questions from the client's side ("How do we book Voxford?") stay. Noun labels are fine (headings, lineup labels, alt text, the footer tagline). Entity statements keep Voxford as the subject: the `{disambiguation}` lead openers, page titles, meta and default descriptions (the default one is also the `MusicGroup` JSON-LD description), `llms.txt`, `VideoObject` descriptions, the "Who is Voxford?" opening line.
- **Staubach (`.display`, `.numeral`) only for Latin-only words and numbers**: it has no Č Ć Ž Đ, and Š renders as S. Headlines that may carry Croatian letters use the headline face (h1–h3 default).
- **No stretched buttons**: use `Pill` or `InquiryCTA` (content-width, ≥48px tall, ~28px side padding, aspect ≤ 3:1); never `width: 100%` on a button.
- **One pill per block, arrow links for the rest** (Josip, #40): the block's primary action is a `Pill`/`InquiryCTA`; a secondary link ("All questions", "Compare the packages", Map) is `.arrow-link` from `global.css` (`--out` for another site), never a second pill or a default underlined link. Links inside running prose stay plain.
- **All text in static HTML**; motion only enhances what is already in the DOM.
- `npm test` must stay green: `src/i18n/parity.test.ts` fails when a key or page entry exists in one language only, `routes.test.ts` when a route has no wrapper, `contrast.test.ts` when a token pair drops below its ratio.

## How work ships

This repo follows `~/.agents/STANDARDS.md` (the loop, the gates, the never-list, `/ship`). Below are only this repo's facts and where it is stricter.

- **A merge to `main` is a production deploy**: Cloudflare Workers Builds builds and deploys every push to `main` (`npm run build`, then `npm run deploy`), no staging. Until ticket G the production URL is `https://voxford-web.josip-ivancevic00.workers.dev` (repo variable `PRODUCTION_URL`), `noindex`.
- **Post-merge check**: the `smoke` workflow (`.github/workflows/smoke.yml`) waits for `$PRODUCTION_URL/healthz` to answer 200 with the merged commit. Red, or prod misbehaving after a merge: roll back first, diagnose after.
- **Rollback**: `npx wrangler rollback` (to the previous version), then a revert PR. Runbook: `docs/deploy-cloudflare.md` → Rollback.
- **Required checks**: `ci` and `Workers Builds: voxford-web`.
- **Stricter here**: nothing yet.

# CLAUDE.md

@AGENTS.md

Voxford's public website (`jivancevic/voxford-web`): a Croatian a cappella group's site that turns visitors into booking inquiries and wins search and AI answers for music at conferences and corporate events. EN canonical, HR full parallel. Facts come from the private KB at `~/projects/business/voxford/` (read-only from here).

## Commands

```bash
npm run dev        # Astro dev server, localhost:4321 (pages only, no Worker)
npm run preview    # build + wrangler dev, localhost:8787 (the real thing: Worker, _headers, 404)
npm run build      # static build into dist/
npm run lint       # ESLint
npm run check      # astro check (TS + .astro) and the Worker's tsc
npm test           # unit tests: inquiry contract, routes, EN/HR parity, JSON-LD, sitemap, token contrast, Worker
npm run test:dist  # checks the built HTML in dist/ (head, hreflang reciprocity, JSON-LD, sitemap) and that its media is served with byte ranges
```

Tier A site with tests where they pay: the two dynamic paths (inquiry, reels sync: tickets D, E), the EN/HR parity check and the built-HTML checks. No feature suite for static pages, on purpose.

## Stack

- **Astro 7** static output, TypeScript strict (TS 6), content collections, Astro i18n routing (`/en/`, `/hr/`, prefix on both)
- **Cloudflare Workers** with static assets; the Worker in `worker/` handles `/`, `/healthz`, `/api/*`, `/media/*` (R2 videos), `/_astro/*.webm|m4a` (byte ranges), the reels cron
- Vanilla CSS with tokens (`src/styles/tokens.css`); no CSS framework, no client framework runtime
- Vitest, ESLint (typescript-eslint, eslint-plugin-astro)

## Architecture

`@/*` → `./src/*`. A page is a one-line wrapper in `src/pages/<lang>/<slug>.astro` that renders `src/views/<Page>View.astro`; the view loads its copy from `src/content/pages/<lang>/<pageKey>.md` and renders inside `BaseLayout`. Paths per language live only in `src/i18n/routes.ts`. The seam table in `AGENTS.md` says who edits which file.

## Hard rules

- **Re-skinnable shell**: no component hard-codes a colour, font or logo. Colours and type come from `tokens.css`, the logo from `Crest.astro` (browser and home-screen icons from `scripts/icons.mjs`, see AGENTS.md), photos from `src/data/photos.ts`.
- **No number, profile URL or member name outside `src/data/site-facts.ts`.**
- **No user-visible string outside `src/i18n/` and `src/content/`**, except the localized facts that travel with their data: `src/data/site-facts.ts` (package summaries, voice parts, number labels) and `src/data/photos.ts` (alt text, labels).
- **No prices, OIB, IBAN, contracts, phone numbers or private clients in this public repo.**

## Discovery docs

| Topic | File |
|---|---|
| What v1 is, decisions | `docs/spec.md` |
| Tickets A–G | `docs/tickets.md` |
| Domain glossary | `CONTEXT.md` |
| Seams, ownership, shipping facts | `AGENTS.md` |
| Decisions | `docs/adr/` |
| Deploy, rollback, setup | `docs/deploy-cloudflare.md` |
| Research (SEO/GEO, inspiration, domain) | `docs/research/` |
| Font files and licences | `src/assets/fonts/README.md` |

## Work plan

Operate in **Plan-First** mode. Start every task with a Plan of Action. After presenting it you may write/edit files automatically. Stop and ask before destructive commands (`rm`, `git reset`) or installing npm packages.

Work is **branch-and-PR per task**; parallel sessions run in their own git worktree (`.claude/settings.json`). How a PR reaches production is in `AGENTS.md` → How work ships.

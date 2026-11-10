# Tickets: Voxford website v1

Spec: `docs/spec.md`. Each ticket is one PR through `/implement` → `/ship`, in its own worktree. After A merges, B–E run in parallel; F follows them; G waits for the domain decision.

**Seams that make B–E parallel (built in A):** the design tokens and layout shell; the copy layer (`src/content/` + `src/i18n/`, EN canonical, HR parallel, parity test); the `site-facts` data file (numbers, profiles, members, packages); JSON-LD helpers; and three stub components with fixed props that later tickets fill in without touching their callers — `InquiryCTA` (renders a link to the prefill URL), `ReferencesWall`, `VideoRail`. The inquiry prefill URL contract is in the spec.

## A — Foundation (kickstart scaffold)
Blocked by: nothing. Blocks: B, C, D, E, F, G.
- `/kickstart` SCAFFOLD with the Astro stack (spec › Stack): CONTEXT.md (seed from the KB glossary terms the site uses), CLAUDE.md, AGENTS.md › How work ships, README, the three ADRs, `.claude/settings.json`, `.gitignore`, `.env.example`.
- Astro + TS strict, Cloudflare adapter/Workers config, i18n routing `/en/` `/hr/` + `/` redirect, base layout (nav, footer, language switch), 404.
- Design system with better-typography + better-colors: tokens on `:root`, fonts (Staubach, Instrument Sans, Jura, a diacritics-safe display face), pill buttons per Josip's rule, light/gradient primitives, crest component.
- SEO/GEO infra: meta + OG images, hreflang, sitemap, robots (AI crawlers allowed), `llms.txt`, JSON-LD helpers, `noindex` on non-production hosts.
- Image pipeline (Astro assets → AVIF/WebP) and the initial photo set copied from the KB/Drive.
- Stubs: `InquiryCTA`, `ReferencesWall`, `VideoRail`; placeholder routes for every page in the spec so B–E only fill them.
- Shipping: `ci` workflow (lint, typecheck, tests, build; docs-only skip with a gate job), `/healthz`, `smoke.yml`, `docs/deploy-cloudflare.md` with Rollback, Workers Builds connected; print the human's commands (branch protection, `allow_auto_merge`, allow entry, Cloudflare login) and read the state back.

## B — Home: the scroll experience
Blocked by: A.
- scroll-craft end to end (BRIEF self-authored under delegation, journey, grammar, fingerprint gate, feeling curve, score), layered hero, the five-voice chord signature move with the Carol audio span, sections that place `ReferencesWall`, `VideoRail` and `InquiryCTA`, calm end screen.
- Verify with scroll-craft's harness (desktop, mobile, reduced motion) and the contact sheet; feel check.

## C — Content pages
Blocked by: A.
- Conferences & corporate events (primary), Weddings, Advent & concerts, Private celebrations, About, Packages, FAQ, Upcoming concerts collection; EN canonical + native HR; answer-shaped copy from the KB, humanizer pass; per-page JSON-LD (`Service`, `FAQPage`, `Event`, `BreadcrumbList`); impeccable for layout.

## D — Inquiry
Blocked by: A.
- `/inquiry` page: date-first, chips, numbered steps, prefill contract, validation, success/error states; Worker `/api/inquiry` with Turnstile + honeypot, email transport behind an interface (fake in tests, Cloudflare Email Sending when the domain exists, `mailto` fallback before); tests for the path; fill in `InquiryCTA` and the hero date widget.

## E — Videos, reels and references
Blocked by: A.
- Videos page + watch pages with `VideoObject`, encode pipeline for self-hosted loops, `VideoRail` filled; reels sync cron Worker (Instagram API → R2 → rebuild; built on Instagram Login, moved to a Unified-login system-user token in #24, ADR 0004) with tests and a `/wizard` for Josip's Meta app and token; `ReferencesWall` with confirmed logos from `posao/klijenti/reference.md` (official SVG/PNG, monochrome).

## F — Polish and audit
Blocked by: B, C, D, E.
- impeccable audit across pages, `impeccable-finish-reviewer` as an independent critic, design-taste-frontend pre-flight, Lighthouse/CWV budgets, a11y pass, cross-browser, fix list closed; write the off-site GEO checklist into the KB; hand Josip the real-phone check.

## G — Domain go-live
Blocked by: A and the team's domain decision.
- Connect the domain on Cloudflare, `www` → apex, email sending for the inquiry, remove `noindex`, Search Console + Bing Webmaster verification (Josip), sitemap submission, IndexNow, AI-crawler block off, update `sameAs`/bios checklist.

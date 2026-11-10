# Spec: Voxford website v1

Decided in a grilling session with Josip on 2026-11-10 (KB session in `~/projects/business/voxford`). Everything below is pre-approved; a decision not covered here is a gate (STANDARDS G1–G5). Tickets are in `docs/tickets.md` (published as GitHub issues once the repo is on GitHub).

## Goal

One place that shows the essence of Voxford — a Croatian a cappella group of five singers (since 2021, viral as @voxford.official) — and turns visitors into booking inquiries. It must win search and, above all, AI answer engines (ChatGPT, Perplexity, Google AI Overviews/AI Mode, Claude, Gemini) for "music / entertainment for conferences and corporate events", primarily in Zagreb, also Croatia and the region. A visitor from anywhere (e.g. Brazil) must be able to discover the group, watch the videos and get hooked. The bar is world class: no template look, no bugs.

Research behind these decisions: `docs/research/seo-geo.md` (SEO/GEO evidence, competitors, crawler facts), `docs/research/mobbin-inspiration.md` (patterns, avoid list), `docs/research/domain-options.md`.

## Sources of truth

Voxford's private KB at `~/projects/business/voxford` (read-only from this repo; never copy contracts, OIB or IBAN here). The site's copy is **derived** from it; each copy file notes its KB source. Key KB files:

| Topic | KB file |
|---|---|
| Glossary (use these terms in copy) | `CONTEXT.md` |
| Brand: logo, palette, fonts | `brand/brand.md`, assets in `brand/assets/` (logos, fonts, photos) |
| Design philosophy "Stage Light Varsity" | `brand/dizajn-filozofija.md` |
| Bio (HR short, EN long), stages | `brand/biografija.md` |
| Press, profiles, public gigs, AI-answer gaps | `brand/u-medijima.md` |
| Media inventory (Drive photos/videos, IDs) | `brand/mediji-inventar.md`, `brand/media-kit.md`, `brand/assets/fotke.md`, `drive.md` |
| References (logo wall) | `posao/klijenti/reference.md` |
| Packages (no prices on site) | `posao/ponuda/ponuda.md`, `posao/ponuda/cjenik.md` (only durations/lineups) |
| Riders (stage, sound facts for FAQ) | `posao/rideri/rideri.md` |
| Crew and voice parts | `ljudi-i-procesi/ekipa.md` |
| Canonical numbers | `ljudi-i-procesi/drustvene-mreze.md` |
| Repertoire | `repertoar/repertoar.md` |
| Tone of voice | `posao/komunikacija/mail-primjeri.md` |

Canonical numbers (Josip, 2026-11-10): **800K+ followers** across networks, **300M+ views**, *Carol of the Bells* **86M+ views**. One `site-facts` data file holds them with a "checked on" date; nothing else hard-codes a number.

## Decisions

### Audience, action, language
- **One action everywhere:** send an inquiry. Label EN "Send an inquiry", HR "Pošalji upit". Form fields: event type (chips), date (or "flexible"), city/venue, guest count (chips), name, email, phone (optional), message (optional). Date-first entry: a small "date + city → check availability" widget in the hero/nav opens the form prefilled.
- **Prefill contract** (lets pages and the form be built in parallel): `/{lang}/inquiry?type=conference|wedding|advent|concert|private|other&date=YYYY-MM-DD&city=<text>&package=pop-up|classic|gold`.
- **Every submission goes to `voxford.official@gmail.com`.** The site shows Jelena Đukanović (WAM Management) as the group's manager; the contact email shown is `voxford.official@gmail.com`. Jelena's phone on the site is an open question (needs her consent) — default: no phone.
- No automatic hand-off to Sufler (a future generic issue in `jivancevic/sufler`).
- **Languages:** EN canonical, HR full parallel. Routes `/en/…` and `/hr/…`; `/` redirects by `Accept-Language` (HR → `/hr/`, else `/en/`); `x-default` = EN; reciprocal self-referencing hreflang; no redirects on language pages themselves. Both languages are written natively, HR addresses the reader with capitalised "Vi". Localised slugs allowed (e.g. `/hr/konferencije/`).
- **No prices on the site.** Packages POP-UP (up to 15 min, ceremonial), CLASSIC (45–60 min a cappella concert), GOLD (90–120 min, the five + piano + cajon) with duration, lineup and when each fits; "price on request, depends on date and location; travel costs are separate".

### Information architecture
- **Home**: the scroll experience (scroll-craft), the essence of Voxford.
- **Conferences & corporate events** — the primary SEO/GEO page, deepest content (why a cappella works at conferences: no stage build, fits openings/gala/awards/breaks, needs, timings, references, FAQ).
- **Weddings** · **Advent & concerts** (for cities and tourist boards) · **Private celebrations**.
- **About** (the five with voice parts, story, stages: Kursalon Hübner Vienna, Križanke Ljubljana, Arena Zagreb, Tvornica kulture, Lisinski) · **Packages** · **FAQ** · **Videos** (top videos, each with its own watch page + `VideoObject`; latest reels feed) · **Inquiry**.
- **Upcoming concerts** section/page: public concerts only (Advent, summer concerts, festivals; never corporate or private), `Event` schema, a content collection updated by hand from Sufler in KB sessions; hidden when empty. Known entry: Musiksommer Bad Schallerbach, 2027-09-11 (see `brand/u-medijima.md`).
- **No doorway pages** (no "music in Split/Rijeka/…" clones). Region is covered by copy ("we perform across Croatia and the region; travel costs separate") and `areaServed`.
- No impressum/privacy page (Josip: not needed). One line under the form says the data is used only to reply to the inquiry.

### SEO / GEO
- All text and JSON-LD in **static HTML** (AI crawlers do not run JS). Scroll effects only enhance content already in the DOM; nothing appears only after scroll/click for crawlers.
- JSON-LD: `MusicGroup` (sameAs: Instagram, TikTok, Facebook, YouTube, Spotify; `member` with roles; `foundingDate` 2021; `areaServed`; `genre`; location Zagreb), one `Service` per selling page with an `Offer` per package (no price; `src/lib/jsonld.ts` › `pageServiceJsonLd` says why), `VideoObject` on watch pages, `Event` for public concerts, `FAQPage`, `BreadcrumbList`. Entity disambiguation in copy: always "Voxford, a cappella group from Zagreb, Croatia" (confusion with vOx Chamber Choir Oxford is real).
- `robots.txt` allows search and AI crawlers, including OAI-SearchBot, ChatGPT-User, GPTBot, Claude-SearchBot, Claude-User, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended. Cloudflare's default AI-crawler block must be off for the zone (Josip, dashboard).
- `llms.txt` as a cheap extra, built from the same site-facts as the JSON-LD (no proven effect; not a pillar).
- Sitemap with `lastmod` and hreflang alternates; IndexNow ping on deploy; Google Search Console + Bing Webmaster Tools verified by Josip.
- Answer-shaped copy: pages answer the literal questions people ask ("How long is the performance?", "Do you need a sound system?", "How much stage space?", "Do you travel outside Zagreb?"), with numbers and named references.
- `*.workers.dev` / preview hosts are `noindex` until the production domain is live.
- **Off-site GEO checklist** (a KB doc for Josip/Jelena, written in ticket F): Google Business Profile (service-area, Zagreb, no address), Wikidata item, Bing Places, Apple Business Connect, marketplaces (FixTheMusic, GigHeaven, Cueup, Entertainers Worldwide — the a cappella HR category is empty), site link in every profile bio, the same numbers everywhere.

### Design
- **"Stage Light Varsity"** (`brand/dizajn-filozofija.md`): photography carries the page; colours behave as light (gradient pink `#F66386` → purple `#8345A0` → blue `#1026B8`, thin lines, glow), never as flat full-page fills; base near-black or white; one forte per screen; minimal text; crest used as a seal.
- Fonts: **Staubach** only for Latin-only words and numbers (it lacks Č Ć Ž Đ and €; Š renders as S) — the wordmark, package names, big numbers; **Instrument Sans** for text; **Jura** for small uppercase labels. A display face with full Croatian coverage for headlines that need diacritics (chosen in ticket A with better-typography).
- Josip's hard UI rule: **no stretched buttons** — content-width pills, ~28px side padding, ≥48px tall, aspect ≤ ~3:1, never `width:100%` across a column (single action at the bottom of a sheet may span, ≥52px).
- Mobbin ideas to use: light from the stage edge that shifts hue on scroll; sound is opt-in, never autoplay; date-first booking widget; chip form numbered like a concert programme (01, 02, 03); three packages without prices lit by gradient from the top of the card, "Inquire" on a package prefills the form; a big number is never alone (pair with a quote or a video); location labels on photos ("CORPORATE GALA · ZAGREB · 2026"); a calm end screen (crest, one gradient line, one pill). Avoid list in `docs/research/mobbin-inspiration.md`.
- **Signature move (home):** the five voices build a chord. The five members stand in stage order (left→right: Josip baritone/beatbox · Dora soprano · Ante bass · Vita mezzo-soprano · David tenor), all dim, with one large round play button centred on them. Pressing it plays *Carol of the Bells*, and **each singer lights the moment their voice enters**. Each voice stays lit, and RGB light grows with the chord until all five are lit and the resolve line comes up (Josip, #32; this replaced the first build's scroll-lit voices and per-voice taps). The entry times live in one cue table, `VOICE_ENTRIES` in `src/lib/chord.ts`, in seconds from the start of the clip. Josip gave them in WAV time (Dora from the start, Vita 7.25, David 11.80, Josip 16.10, Ante 20.50 s), so each sits 3.0 s earlier in the table. The audio is Drive file "Carol new mix.wav" (`1YLhkYxnOD0DOaJsp1cAtDfVkZCc7wzE8`, 43.07 s, 44.1 kHz stereo); use the span **3.0 s → 41.07 s** (Josip: the piece starts ~3 s in and ends ~2 s before the end). There are **no stems**, so the voices are visual: the light follows the recording's clock. Audio plays only on a press, never autoplay. Transport, kept as recommended in #34 (2026-11-11; it stands unless Josip changes it):
  - The one button plays, pauses and resumes; there is no separate stop. At the end it offers "Listen again", which starts over.
  - Scrolling out of the act fades the music and pauses it, and coming back stays paused until a press.
  - The act pins for about 2.4 viewport-heights; the scroll only breathes the stage glow.
  - With no JS, under reduced motion, or with the audio blocked, all five are lit and the resolve line shows.
  - Details are in `docs/home/BRIEF.md`.
- **Hero:** layered photo with real depth (scroll-craft `hero-depth.md`), from the Unisport Westin 2026 or HAK Esplanade 2026 sets (blue/purple LED). No horizontal LED performance video exists.
- **Skills:** scroll-craft for Home (read `~/.claude/skills/scroll-craft/SKILL.md` and follow it; it is user-invoked only, so sessions read the file; brief is self-authored under explicit creative delegation, marked as such); better-typography + better-colors for the token system (ticket A); impeccable for subpages and the audit, with the `impeccable-finish-reviewer` agent as an independent critic; design-taste-frontend as pre-flight before `/ship`.

### Media
- Photos from the Drive media kit and `Photo` folders (prefer newest, Josip 2026-10), pipeline to AVIF/WebP with responsive sizes. Three sets Dora picked (KB `brand/media-kit.md` › Setovi): **Gavella** (2024 Journal.hr shoot by Marko Lopac, folder `1SpwjuQm9DtAS_jkCf3m8DrbjKQ4trnar`) has each member photographed alone → **the individual portraits**; **Lav** (Mirta Cindrić 2025, the offer photoshoot, `1_PjcVFjx17rfat7VPUWhA4SZqWFcSpoc`); **Westin sport** (Unisport Stars gala 2026, blue/purple LED, `1Dv99EcckqpEDgKtaHYDy0NEBcMi942-C`) → hero and corporate. Gaps: no wedding photos (use the Lav shoot and the church frame), no client testimonials (do not invent any).
- Videos: the **5 most-watched reels** are originals in `~/Downloads/voxford-top-videos/` (vertical HEVC, 19–38 s, 1080×1920 and 2160×3840, file names carry no song title — identify each from frames/audio). Encode to web formats, host on R2 (not git), and copy the originals to Drive per the KB's binary rule. Self-hosted muted loops; full playback with sound on demand. Fallbacks: HEP 2023 multicam, the vertical 4K Advent clip, Kedžo (`brand/mediji-inventar.md`).
- **Latest reels, automatic:** a Cloudflare cron Worker runs daily, pulls the latest 6 reels via the Instagram API (video, thumbnail, permalink, caption; Unified login with a system-user token, since Meta no longer offers new apps Instagram Login: ADR 0004), stores them in R2, and triggers a rebuild, so the page stays static HTML. Josip creates the Meta app and long-lived token (G3) via a `/wizard` the ticket provides. TikTok Display API is out of scope for v1.
- **References:** logo wall of organisations Voxford performed for (Josip: logos are fine to use), from `posao/klijenti/reference.md`, only rows marked confirmed; monochrome treatment; private clients never.

### Stack and platform
- **Astro** (latest stable) + TypeScript strict, content collections for copy, Astro i18n routing; vanilla scroll-craft engine for motion; no framework runtime shipped unless a component needs it.
- **Cloudflare Workers** with static assets; a Worker handles `/api/inquiry`, `/healthz`, the `/` language redirect and the reels cron; R2 for reels; Turnstile (invisible) + honeypot on the form; Cloudflare Web Analytics (cookieless, no banner).
- Inquiry email: Cloudflare Email Sending (or Email Routing `send_email`) once the domain is on Cloudflare; until then the form degrades to a prefilled `mailto:` and the Worker path is covered by tests with a fake transport.
- **Tier A** (static marketing site) per `/kickstart`, with tests on the two dynamic paths (inquiry, reels sync) and a message/copy parity test across EN/HR.
- **Repo:** this public repo, `jivancevic/voxford-web`, scaffolded with `/kickstart` (SCAFFOLD; read `~/.claude/skills/kickstart/SKILL.md`, `TIERS.md`, `TEMPLATES.md`): CONTEXT.md, CLAUDE.md, AGENTS.md bound to `~/.agents/STANDARDS.md`, README, ADRs, `.claude/settings.json` with worktree isolation, CI (`ci` job), `healthz`, `smoke.yml`, runbook `docs/deploy-cloudflare.md` with `wrangler rollback`, branch protection with required checks `ci` + the Cloudflare Workers Builds check, `allow_auto_merge`, the human-added allow entry `Bash(gh pr merge --auto --squash)`.
- ADRs to write in ticket A: (1) Astro on Cloudflare Workers instead of kickstart's Next.js on Vercel — Vercel Hobby forbids commercial use, Astro ships static HTML with no JS by default, which AI crawlers need; (2) separate public repo instead of `web/` in the private KB — free CI, real branch protection and auto-merge, physical separation from contracts; cost: a fact change needs a follow-up PR here; (3) reels ingestion stays Tier A — one cron path with tests rather than a Tier B suite.
- **Domain:** undecided (the team is choosing; recommendation `voxfordofficial.com`, mirrors @voxford.official like Pentatonix's ptxofficial.com; `.hr` rejected — expensive and too local). Build and preview on `*.workers.dev`; ticket G connects the domain when chosen.

## Acceptance (v1 done)
- [ ] Every page above exists in EN and HR, with reciprocal hreflang, valid JSON-LD (Rich Results Test / Schema validator clean), in the sitemap.
- [ ] All text readable with JS disabled; no content only behind scroll or click.
- [ ] Lighthouse mobile ≥ 95 in all four categories on Home and the Conferences page; field-ready CWV budgets: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms on a mid-range phone profile.
- [ ] WCAG 2.2 AA: contrast measured on composited frames, keyboard order, focus states, `prefers-reduced-motion` honoured, captions/labels on media.
- [ ] Inquiry: valid submission emails `voxford.official@gmail.com` (or `mailto` fallback before the domain), spam blocked, prefill contract works from every CTA, success and error states designed.
- [ ] Signature chord: the play button works by touch and keyboard, the voices light at their cues as the music plays, and reduced motion, no JS and blocked audio show all five lit.
- [ ] Reels sync: cron + R2 + rebuild covered by tests; the page renders without the feed when the API is down.
- [ ] No console errors; no stretched buttons; no invented numbers, quotes or clients.
- [ ] `impeccable-finish-reviewer` and design-taste-frontend pre-flight report no material issues; Josip checks on a real phone.
- [ ] Off-site GEO checklist written in the KB.

## Out of scope (v1)
Prices; Sufler integration; DE/SL; blog; impressum/privacy page; TikTok API; testimonials until real ones exist; a horizontal LED hero video until one is shot.

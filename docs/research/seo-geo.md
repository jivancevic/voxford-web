# Voxford web: SEO + GEO research (2026-11-10)

Read-only research. Evidence is marked **[primary]** (vendor/standard docs) or **[secondary]** (studies, SEO press). Caveat: the WebSearch tool is a US-index engine, so Croatian-language SERPs are under-represented; a manual check of google.hr is still worth doing.

## 1. Domains and existing web presence

Checked with `whois` against each registry and `dig` (2026-11-10):

| Domain | Status | Notes |
|---|---|---|
| voxford.hr | **Free** | whois.dns.hr: "No entries found"; no NS. voxford.com.hr also free. |
| voxford.com | **Taken** (since 2007-07-03, GoDaddy, Domains By Proxy, expires 2027-07-03) | Serves a frameset to `voxford.blogspot.com` = "John Kelly's Voxford", a blog last posted 2008. Unrelated third party. GoDaddy mail MX present. |
| voxford.eu | **Free** | EURid: `Status: AVAILABLE` |
| voxford.band | **Free** | RDAP (Identity Digital) 404 |
| voxford.music | **Free** | Registry: "available for registration" (.music has eligibility rules for music-community members) |
| voxford.at | Free | nic.at "nothing found" |
| voxford.si / .rs | Free | registries: no entries / "not registered" |
| voxford.ba | not determined | |

Existing presence (no website anywhere):
- Linktree https://linktr.ee/voxford : title "VOXFORD TikTok", description "Acapella group from Croatia"; links to facebook.com/voxford.official, instagram.com/voxford.official, tiktok.com/@voxford.official, YouTube channel UC6q6MkvWEJBrDIi7jgHeWww (@voxford.official), mailto voxford.official@gmail.com. This is the de-facto "website" and is weak (generic description, no services, no location).
- Facebook page claims "250K+ followers, +100M views on TikTok"; TikTok 13.2M likes (per search snippet). Numbers are inconsistent with the 300M+/500K+ the band uses: one canonical set of numbers should be chosen and repeated everywhere.
- Third-party mentions found: Austrian tourism listing "Musiksommer Voxford" (oberoesterreich.at, Bad Schallerbach; describes 5 members Dora, Vita, Ante, David, Josip, klapa + modern a cappella, "über 250 Millionen Views"); a YouTube TV segment "TikTok a capella zbor Voxford: 'Prepoznala nas je i Jelena Rozga'".
- **Not found**: Wikidata item (API search empty), hr/en Wikipedia article, any booking-portal profile (FixTheMusic, GigHeaven, Cueup, Entertainers Worldwide, Scarlett), any Croatian press article in the index.
- Entity confusion risk: plain "Voxford" queries return vOx Chamber Choir Oxford, "Vox" choirs, voxford.blogspot. The name needs disambiguating context everywhere ("Voxford, a cappella group from Zagreb, Croatia").

## 2. Competitive landscape (who gets ranked/cited)

Queries run: glazba za konferencije Zagreb; bend za korporativne evente Zagreb; bend za firmu Zagreb; a cappella grupa za vjenčanje Zagreb; klapa za vjenčanje Zagreb; live music for corporate events Zagreb; entertainment for conference Croatia; best a cappella group hire Croatia; plus Vienna and Ljubljana equivalents.

**Key finding: the niche is nearly empty.** For corporate/conference music in Zagreb, search (and the AI summariser over it) returned no dedicated local provider page. Answers were assembled from international marketplaces. For "a cappella Croatia" the engine returned US/South African groups from directories, and Akvarel (Osijek) from a hr.hr list. Nobody owns "a cappella za evente / konferencije Zagreb".

Repeatedly cited sources (= LLM citation pool):

| Source | What appears | Page anatomy |
|---|---|---|
| **fixthemusic.com** (dominant, every English query) | /corporate-bands/croatia ("Solid Gold"), /wedding-bands/croatia, profiles (Magic Touch, After Hours, Slick Sonics Zagreb), blog listicles "6 Best Wedding Bands in Croatia (2026)", "Hiring a Wedding Band in Croatia - A Short Guide (2026)" | Category page ~1,770 words, 11 VideoObject + 12 Organization JSON-LD, FAQ text. Profile page: LocalBusiness + AggregateRating + 4 Review + VideoObject + ProfilePage. Shows "average booking price €2,957 (Dec 2025)". Dated listicles with year in title. |
| **gigheaven.com** | /search/cover-bands/croatia, Zagreb wedding/jazz pages | FAQPage (10 Q&A), AggregateOffer price ranges, AggregateRating, BreadcrumbList |
| **cueup.io** | /wedding/zagreb/book-musician, /zagreb/book-dj | LocalBusiness, Review, Service, FAQ Q&A, "average ~€100/hour" |
| **scarlettentertainment.com** | Gypsy Jazz Band Croatia, Party Band Croatia, a-cappella quintet (Austria) | Thin schema (Breadcrumb only), heavy page; client lists |
| **entertainersworldwide.com** | /a-cappella-groups/hr (no Croatian profiles!) | directory |
| inyourpocket.com, croatiaweek.com, total-croatia-news.com, timeout.com/croatia | klapa / Advent context | editorial |
| hr.hr (www.hr/wwwhr/arts/music/ensembles) | old Croatian ensemble list (Akvarel, Milka Trnina) | legacy list, still cited |
| LinkedIn posts | Art Events Croatia / Music Art Events (Vanja Ileković, corporate live music, 5-13 piece bands, ~100 artists) | LinkedIn posts get cited directly |
| clutch.co | event agencies Zagreb | agency directory |
| cvent.com, kongres-magazine.eu, Zagreb Convention Bureau | venue/MICE context for "conference" queries | MICE portals |

Local competitors named: Magic Touch, Slick Sonics, After Hours (DJ+band; cites Ericsson, VISA), Daddy Cool band (webnode site), Solid Gold, Viša sila (show band), klapa groups (Punti, Bošket, Stine) for weddings, Art Events Croatia (agency). Region: Perpetuum Jazzile (SLO, vip-booking.com), Jazzva (SLO), Voice Mania festival acts in Vienna (Safer Six, Die Echten), Scarlett's a cappella listings for Austria.

What the winners do: one page per (service x city/country); prices or price ranges shown; video embedded with VideoObject; reviews with AggregateRating; FAQ blocks; year-stamped listicles; client logos/brands. Croatian-language wedding portals did not surface in this index (check manually on google.hr).

Implication: getting listed on FixTheMusic/GigHeaven/Cueup/Entertainers Worldwide (a cappella/hr is empty) and Clutch/Cvent-adjacent MICE pages is probably the fastest route into AI answers, alongside the own site.

## 3. GEO: what actually drives AI citations (evidence vs hype)

### Google AI Overviews / AI Mode [primary]
- https://developers.google.com/search/docs/appearance/ai-features : "There are no additional technical requirements"; page must be indexed and snippet-eligible; "no special schema.org structured data that you need to add"; structured data must match visible text; keep important content in text form; support with images/video; "keep Merchant Center and Business Profile information up to date".
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide (announced 2026-05-15, https://developers.google.com/search/blog/2026/05/a-new-resource-for-optimizing): AI features use the same index and ranking systems ("optimizing for generative AI search is optimizing for the search experience"); query fan-out; original first-hand content; scaled per-query-variation pages violate the scaled-content-abuse policy; "You don't need to create new machine readable files" (llms.txt); "no requirement to break your content into tiny pieces"; structured data not required for AI features but keep it for rich results; Google Business Profile can make services visible in AI responses; a Generative AI performance report exists in Search Console; the guide also says a site "must be included in Search generative AI features in Search Console" (check this setting at launch). Google "is able to process content within JavaScript".

### llms.txt
- Google: does not use it (guide above; Gary Illyes July 2025). **No major engine documents using third-party llms.txt for citation.** SE Ranking (~300k domains) found no correlation with AI citations; Ahrefs reported 97% of llms.txt files got zero requests (May 2026) [secondary: https://www.webyes.com/blogs/does-llms-txt-improve-rankings/]. Verdict: cheap, harmless, not a lever.

### Crawlers and access [primary]
- OpenAI https://developers.openai.com/api/docs/bots : **OAI-SearchBot** must be allowed for ChatGPT search inclusion (separate from GPTBot training; can block GPTBot and allow OAI-SearchBot). ChatGPT-User = user-triggered fetches.
- Anthropic https://support.claude.com/en/articles/8896518 : ClaudeBot (training), **Claude-SearchBot** (search indexing), **Claude-User** (user fetch). Claude's web search is widely reported to be Brave Search results (TechCrunch 2025-03-21, Simon Willison test) [secondary], so being in Brave's index matters.
- Perplexity https://docs.perplexity.ai/guides/perplexitybot : allow **PerplexityBot**; Perplexity-User generally ignores robots.txt.
- **Cloudflare blocks known AI crawlers by default on new domains since 2025-07-01** (opt-in at setup) [secondary: https://searchengineland.com/cloudflare-to-block-ai-crawlers-by-default-with-new-pay-per-crawl-initiative-457708]. If hosting on Cloudflare, explicitly allow OAI-SearchBot, Claude-SearchBot, PerplexityBot, Bingbot, Googlebot.

### Server-rendered HTML [secondary, strong]
- Vercel/MERJ "The rise of the AI crawler" (https://vercel.com/blog/the-rise-of-the-ai-crawler): none of the major AI crawlers (GPTBot, ClaudeBot, etc.) execute JavaScript; they fetch JS files but do not run them. Google renders JS; AI crawlers see only initial HTML. => all text, links, JSON-LD must be in the static HTML.

### Brand/entity signals [secondary, correlational]
- Ahrefs, 75k brands, Dec 2025 (https://ahrefs.com/blog/ai-brand-visibility-correlations): YouTube mentions had the strongest correlation with AI visibility (~0.737); branded web mentions ~0.66-0.71; backlinks far weaker (~0.22). Correlation, not causation, but it fits Voxford's strength (YouTube/TikTok). Video titles/descriptions should name "Voxford" + "a cappella" + "Zagreb/Croatia" + event types.
- Google's guide warns that chasing "inauthentic mentions" is not as helpful as it seems: earn real mentions (press, venue/agency pages, client case pages).

### Content tactics [primary research, lab conditions]
- Aggarwal et al., "GEO: Generative Engine Optimization", KDD 2024 (https://arxiv.org/abs/2311.09735): adding citations, quotations and statistics raised source visibility by >40% in generated answers; keyword stuffing did not help. Lab metric (position-adjusted word count), not real-world clicks. Practical: concrete facts (founded 2021, 5 singers, views/followers, number of gigs, set length, tech needs, cities served), named client quotes.

### Structured data
- Google rich-result features still supported (search gallery): Event, Local business, Organization, Review snippet, Video, Breadcrumb, Profile page, Q&A... **FAQ rich results removed** (stopped showing 2026-05-07, docs/reporting dropped June 2026) [secondary: https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/]. FAQPage remains valid schema.org and harmless; value now only as machine-readable Q&A for other engines (unproven).
- Bing: Fabrice Canel (SMX Munich, March 2025) said schema helps Microsoft's LLMs understand content; also recommends IndexNow for freshness [secondary: https://searchengineland.com/microsoft-bing-copilot-use-schema-for-its-llms-453455].
- schema.org hierarchy: Thing > Organization > **PerformingGroup > MusicGroup** (https://schema.org/MusicGroup). MusicGroup inherits areaServed, sameAs, foundingDate, member, review, aggregateRating, makesOffer, logo, address. Recommended graph: `MusicGroup` (+ `@id`, name, alternateName "Voxford a cappella", foundingDate 2021, foundingLocation Zagreb, member Person x5, genre, sameAs [TikTok, Instagram, Facebook, YouTube, Spotify, Wikidata once created], areaServed [Zagreb, HR, SI, BA, RS, AT], logo, image), `Service`/`Offer` per use case (corporate events, conferences, weddings, Advent) with provider -> MusicGroup, `VideoObject` on video pages, `Event` only for real public concerts (Advent, concerts) with location/startDate/offers, `BreadcrumbList`, `WebSite`. Note: Google does not show stars for self-serving reviews on Organization/LocalBusiness, so review markup is for understanding, not stars.

### Google Business Profile [primary]
- https://support.google.com/business/answer/3038177 : a business that travels to customers gets one service-area profile, must hide its home address; name = real-world name only ("Voxford", no "a cappella Zagreb" keyword stuffing); categories as few and specific as possible.
- https://support.google.com/business/answer/9157481 : up to 20 service areas (cities/postal codes/regions), boundary "about 2 hours of driving time" from base, so Zagreb-centred (Zagreb, Zagrebačka, Varaždin, Karlovac, Ljubljana is ~1h45). Google's AI guide explicitly says Business Profile feeds AI responses. Reviews on GBP are the visible review layer.
- ChatGPT local data: not documented by OpenAI. Vendor studies name Foursquare, Bing (Places/index) and Yelp (licensed 2026) as sources; GBP not used directly by ChatGPT [secondary, low confidence: Local Falcon, Whitespark]. Cheap hedge: claim Bing Places + Apple Business Connect + Foursquare with identical NAP.

### Wikidata / Wikipedia
- Wikidata notability (https://www.wikidata.org/wiki/Wikidata:Notability): item allowed if it is a "clearly identifiable ... entity" with "serious and publicly available references" (criterion 2), no Wikipedia needed. Voxford qualifies once there are independent references (the TV segment, Austrian tourism listing, press). Wikipedia needs significant independent coverage (WP:BAND), not self-published; do not self-write.

### Freshness
- Canel (Bing): generative systems value fresh content; IndexNow for Bing/Yandex (Google does not support IndexNow). Google guide gives no separate freshness rule. Practical: dated "upcoming/recent gigs" and dated listicle-style guides; `dateModified`.

### Hype to ignore (per Google's guide)
llms.txt as a ranking factor; chunking content for AI; rewriting for "AI phrasing"; buying mentions; mass city x service doorway pages.

## 4. Technical SEO for a static hr + en site

- **hreflang** (https://developers.google.com/search/docs/specialty/international/localized-versions): HTML `<link rel="alternate">`, HTTP header or sitemap (pick one); every version lists itself and all others ("If two pages don't both point to each other, the tags will be ignored"); add `x-default`; codes ISO 639-1 (+ optional ISO 3166-1), e.g. `hr`, `en`; no region alone. Google does not use `lang`/hreflang to detect language, so each page must actually be in its language; still set `<html lang>` for accessibility. Use separate URLs (`/` hr and `/en/`), no IP/Accept-Language auto-redirect.
- **Sitemap**: XML sitemap with all hr/en URLs (can carry hreflang via `xhtml:link`), `lastmod` accurate; reference in robots.txt; submit in Google Search Console and Bing Webmaster Tools; IndexNow ping for Bing.
- **Core Web Vitals** (web.dev/articles/vitals, unchanged in 2026 per majority of sources): LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 at the 75th percentile, mobile and desktop separately. A claim of tightened thresholds (March 2026) is from one blog only and is unverified.
- **Video** (https://developers.google.com/search/docs/appearance/video): only a page whose main purpose is one video is a "watch page" eligible for video results; give key videos their own pages with unique title/description + `VideoObject` (name, description, thumbnailUrl stable URL, uploadDate, embedUrl/contentUrl, duration); YouTube embeds are fine, Google may index both; video sitemap optional; video must load without click/scroll. Background hero loops: add `poster`, keep them out of LCP path, mute/no autoplay audio.
- **Images**: real `<img>` with `src`, alt text, width/height (CLS), AVIF/WebP, descriptive filenames; image sitemap optional.
- **Scroll-animated pages** (https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading): "Google Search does not interact with your page"; content revealed only on scroll/click may not be indexed. Use IntersectionObserver/native lazy-loading, never gate text behind scroll events. All copy must be real DOM text in the initial HTML (AI crawlers do not run JS); canvas/WebGL only as decoration with the same text in HTML; respect `prefers-reduced-motion`; avoid scroll-jacking that hurts INP; long single-page scroll still needs separate URLs per service/language for ranking.
- **Crawl access**: robots.txt allows Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, Claude-User, PerplexityBot (decide GPTBot/ClaudeBot/Google-Extended separately, they are training only); check CDN/WAF bot rules (Cloudflare default block).
- **Basics**: unique `<title>`/meta description per page per language, canonical self-reference, Open Graph, semantic headings, HTTPS, one H1, internal links between service pages.

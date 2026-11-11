# CODING_STANDARDS.md

CSS, layout, voice and typography rules for `voxford-web`. Read before writing or reviewing a style, a component or copy. The `code-review` skill reads this file as its standards source. Each rule names the incident behind it.

## CSS and layout

- **Anchor `:global` to the parent's scope.** A class passed as `<VideoRail class="x" />` lands on the child's root element, which the parent's scoped selector `.x` never matches. Write `.proof :global(.x)`, not a bare `:global(.x)`, which applies site-wide. Ticket F found two silent spacing bugs from this.
- **Keep a custom property holding `%` on one axis.** It resolves where it is used, not where it is set: `--w: calc(100% - 2rem)` is a share of the width in `inline-size` but a share of the height in `inset-block-end` or `block-size`. Use such vars only in properties on the same axis (#69: the hero box was off by tens of pixels until review round 1).
- **Give a box that must hold its content a viewport-unit height only as `min-block-size`.** Chrome on an iPhone once reported `100svh` as about the phone's width (#77): the chord's sticky stage (`.chord__stage` in `HomeView.astro`) had a fixed `block-size` from `svh`, so its portraits spilled over the caption and the section stayed empty. The chord now sets `min-block-size` only while it pins and otherwise takes its content's height. A clamped photo size (`clamp(11rem, 40svh, 22rem)`) is fine: a wrong `svh` only resizes the photo. The hero stage (`.hero__stage { block-size: var(--stage-h) }`) still has the fixed height (#74). Test a pinned stage by forcing `--stage-h` small (`358px`), not only by resizing.
- **Make small standalone links 44px to tap on phones** (#80). An email, a back link, a card title, "Open on YouTube" gets `class="tap-target"` from `global.css`: an invisible touch-only `::after` that grows the hit area to 44px without moving anything. A link that already uses `::after` needs its own.
- **Write the touch rule after the base rule.** Stacked lists use `min-block-size: 2.75rem` under `@media (pointer: coarse)`, placed after the base rule: a media query adds no specificity, so a block before a same-specificity base rule silently loses (#81: review caught one).
- **Put all text in static HTML.** Motion only enhances what is already in the DOM.

## Buttons and links

- **Use `Pill` or `InquiryCTA` for buttons**: content-width, at least 48px tall, about 28px side padding, aspect at most 3:1. `width: 100%` on a button stays out (a wide low button reads as bad UX).
- **One pill per block, arrow links for the rest** (#40). The block's primary action is a `Pill`/`InquiryCTA`; a secondary link ("All questions", "Compare the packages", Map) is `.arrow-link` from `global.css` (`--out` for another site), not a second pill or a default underlined link. Links inside running prose stay plain.

## Voice and typography

- **Voxford speaks as "we"** (Josip, #35). In FAQ answers, page copy and UI strings (`src/content/`, `src/i18n/`) Voxford is "we", "our", "the five of us" / "mi", "nas petero"; no sentence about us has "the group", "skupina" or "petorka" as its subject, and none says "they" or "it". Questions from the client's side ("How do we book Voxford?") stay. Noun labels are fine (headings, lineup labels, alt text, the footer tagline). Entity statements keep Voxford as the subject: the `{disambiguation}` lead openers, page titles, meta and default descriptions (the default one is also the `MusicGroup` JSON-LD description), `llms.txt`, `VideoObject` descriptions, the "Who is Voxford?" opening line.
- **Staubach (`.display`, `.numeral`) only for Latin-only words and numbers.** It has no Č Ć Ž Đ, and Š renders as S. Headlines that may carry Croatian letters use the headline face (h1-h3 default).

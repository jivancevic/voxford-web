# Home: scroll-craft brief, journey and score

**Self-authored under explicit creative delegation.** Josip delegated the home page's creative
direction to the agent in the website spec (`docs/spec.md` › Design › Skills: "brief is
self-authored under explicit creative delegation, marked as such") and in ticket B
(jivancevic/voxford-web#3). Nothing below quotes Josip unless it says so; decisions the spec
already made are marked **(spec)**, the rest are **(authored)**.

The page is `src/views/HomeView.astro`; its motion is `src/scripts/home-stage.ts`. This file is
for whoever changes the home page next: change the curve here first, then the page.

## The eight topics

1. **Vibe.** (authored) *A gala hall the second before the downbeat.* Stage light on black,
   people in focus, colour that behaves as light (spec: "Stage Light Varsity"). References:
   a concert lighting cue sheet; the cover of a live album shot from the pit; the silence of a
   hall when the house lights go down.
2. **Journey, section by section.** (spec + authored) Layered photo hero from a real gala → the
   five voices build a chord → proof (views, videos) → the rooms Voxford is booked for, with the
   names who booked them → a calm end screen with one action (spec: "crest, one gradient line,
   one pill").
3. **Energy curve.** (authored) Low and warm at the top, one hush, the loudest point in the
   middle (the chord), then daylight and information, then quiet. Nothing loud after the chord.
4. **Feeling and the one moment.** See the curve and the peak below.
5. **The one thing no other site does.** (spec) "The five voices build a chord": the five
   singers light up one by one under the visitor's scroll or tap, the light grows with the
   chord, and with sound on the recording swells as the chord completes.
6. **Distance from premium-minimal.** (authored) Dark and restrained, but not minimal: one
   saturated peak in brand RGB. Family: *premium-minimal with a single maximalist act*. The
   gradient is light, never a fill (spec), and appears at full strength only at the peak.
7. **One world or distinct scenes.** (authored) Distinct scenes, cut like lighting cues. There
   is no continuous camera: the hall is one photograph, the chord is five portraits.
8. **Assets.** (spec) Real photography only, nothing generated: the Unisport Stars gala 2026
   set (Westin, blue LED; frame `R1JC7247`) for the hero, the 2024 Journal.hr portraits by
   Marko Lopac (each member alone) for the chord, the HAK Esplanade frame for the conference
   room, *Carol of the Bells* ("Carol new mix.wav", 3.0 → 41.07 s) for sound.

## Who it is for, and what they do

- **Who:** event planners and corporate clients choosing music for a conference or gala in
  Zagreb and the region; second, a fan from anywhere who found a reel.
- **Believe by the end:** *five people with microphones are a whole show.*
- **Next action:** send an inquiry. One label everywhere: "Send an inquiry" / "Pošalji upit" (spec).

## Journey

| # | Beat | What changes for the visitor |
|---|---|---|
| 1 | Recognition | A real gala, five singers at microphones: "this is the kind of event I am planning" |
| 2 | Hush | The stage goes dark; one line |
| 3 | The chord | They make the sound themselves, one voice at a time |
| 4 | Proof | Millions already listened; here are the videos |
| 5 | Fit | Their own event is on the list (conferences first) and named clients booked it |
| 6 | Commitment | One calm screen, one action |

## Grammar: "Lighting cue sheet" (new, authored)

Each act is a lighting cue on the same stage, and the page's job is to move the light, not the
camera.

- **What a section is:** a lighting state: house lights down, blackout, five spots one by one,
  full wash, house lights up, a single spot.
- **Navigation:** the shared site header from ticket A, unchanged (a seam). No in-page index,
  no progress readout, no section numbers.
- **Sequence:** dark → one peak of colour → daylight (the white `.surface-light` hall: the
  practical part) → dark. Light is the only thing that drifts.
- **Ending:** a single spot: crest, one gradient line, one sentence, one pill. It holds still.
- **Bans:** scrub video (none exists, and the spec rules out a horizontal LED video until one is
  shot); character-split kinetic type; pointer spotlight and magnetic CTA; scroll-driven card
  rails; more than one pinned act besides the hero; centred copy in every act; any copy that
  only appears after scroll for a reader without JavaScript.

Why the eight defined grammars lost: **filmic one-shot** hides cuts, and this page is about
cuts of light; **chaptered editorial** forbids the photographic hero the spec asks for;
**live surface** is for software; **continuous world** needs footage of a journey that does not
exist; **typographic poster** throws away the photography that "carries the page" (spec);
**gallery** would make five people a catalogue; **split stage** has no two sides to argue;
**rhythmic cutlist** bans the pin and the dwell the chord needs.

## Signature move: the chord

Five portraits in stage order (Josip, Dora, Ante, Vita, David; KB `ljudi-i-procesi/ekipa.md`)
stand in near-darkness. Scrolling through the pinned act lights them one at a time, each with
its own colour of light from above, stepping pink → purple → blue along the brand gradient;
when all five are lit the gradient line under them completes and the whole stage glows. Each
portrait is also a button: a tap or Enter lights that voice directly, in any order. "Listen" is
an opt-in toggle (never autoplay): with sound on, *Carol of the Bells* plays and its volume
follows the chord: audible but low before the first voice (so Listen always answers), rising
with each voice, full with five. There are no stems, so voices are
visual and the recording swells (spec).

- **No JavaScript:** all five portraits lit, names and voice parts visible, no Listen button.
- **Reduced motion:** no pin; all five start lit; taps still toggle voices; Listen still works;
  the hint says "tap" instead of "scroll or tap".
- **Short windows** (under 40rem tall for the hero, 34rem for the chord: a scaled laptop, a phone
  on its side) do not pin; the acts scroll and the chord lights on flow progress.
- **Phones:** the hero does not pin; the planes still part as it scrolls by, and the date widget
  (ticket D) sits on plain ground under the photo.
- **Muted:** the light carries the whole move; sound is a bonus.

## Fingerprint gate

Registry: `~/.agents/scrollcraft/FINGERPRINTS.md`. It was empty when this build was planned
(this is the first scroll-craft build on this machine), so the gate passes against zero rows.
The row for this build is appended after merge.

## Feeling curve

```
1  Curiosity   the hall from the pit: the five sharp, the room soft, the front row
               sliding past as you push in (layered parallax, sticky)
2  Hush        blackout; one line, nothing moving (authored silence, flow)
3  Awe         five spots come on one by one; the chord turns the stage RGB
               (pinned, the longest act on the page)
4  Pride       house lights still down, the number arrives under a sweep of light,
               the videos beside it (reveal)
5  Recognition the house lights come up: white hall, "music for conferences and corporate
               events", their own kind of event on the list, who booked them (flow + parallax media)
6  Calm        one spot: crest, one line, one pill; it holds (still)
```

No two adjacent acts share a feeling. The act before the peak is the quietest on the page.

**Authored silence:** act 2 is deliberately almost empty (one line on black). The verification
pass should not report it as dead scroll.

## The peak

> "The stage went dark and then the five of them lit up one by one as I scrolled, until the whole
> thing was glowing, and when I hit Listen it was Carol of the Bells."

It lives in act 3, gets the most scroll room (about 3.4 viewport-heights against ≤1.8 for any
other act), the best asset (five portraits) and the only sound.

**It's the site where you light up five singers one by one and hear the chord build.**

## Score

| # | Beat | Device | Span | Why this one |
|---|---|---|---|---|
| 1 | Recognition | `parallax` on a sticky stage: far (defocused hall), subject (the five), front (audience heads), haze | ~1.7 vh | Depth from a real photograph: rack focus, front row sliding past |
| 2 | Hush | `flow` + `in` | ~0.9 vh | One line on black; the cut is the content |
| 3 | The chord | `pin` + bespoke chord | ~3.4 vh | The visitor plays it; the longest hold |
| 4 | Proof | `reveal` (a wipe of light across the numeral) | ~1.2 vh | A number lit like a sign, paired with videos (never alone, spec) |
| 5 | Fit | `flow` + `parallax` inside the media column | ~1.8 vh | Information, compressed; the white hall is the change of state |
| 6 | Commitment | still | ~1 vh | The page stops moving |

Four device families (parallax, flow, pin, reveal) plus the still close; never the same twice in
a row; no scrub; one peak with the largest span; total ≈ 10 viewport-heights before the footer.

## Engine note

The page does not vendor `scrollcraft.js`. Its CSS hides every `[data-sc-cue]` until the script
runs, which fails the spec's "all text readable with JS disabled", and the 62 kB runtime would
spend the Lighthouse budget on devices the page does not use. `src/scripts/home-stage.ts`
implements the subset this page needs with the same contract (`data-sc-act`, `--sc-p`,
`data-sc-in`, `html.sc-ready`), so the harness reads it, and every hidden state exists only
under `html.sc-ready`.

## Verification log (2026-11-10, local build)

- **Harness** (`shoot.mjs`, desktop 1440×900, mobile 390×844, reduced motion): no dead scroll in
  any mode. The page publishes `data-sc-verify-state` while a pinned act is on screen and marks
  the full chord as an authored hold (`data-sc-verify-hold`), because the harness does not sample
  CSS-driven planes.
- **Contrast over media:** desktop clean (≥4.5:1 at the worst frame). The harness hides sticky
  elements for its bare shot and samples text even while it sits under the sticky header, so it
  flags the hero headline and lead in the frames where they scroll under the header (worst
  1.9–2.9:1). Measured directly on the composited page with only the text hidden, clear of the
  header, both are 14.8–16.6:1. The one real finding (the chord hint over the voice beams,
  4.05:1) is fixed: the hint now uses the full text colour.
- **Contact sheet:** the chord is the largest visual change and holds the most scroll; the act
  before it is the quietest; the end screen stands still with content on it.
- **Feel check (cold, one word per act):** gala · hush · glow · scale · practical · calm.
  Against the curve: 1 curiosity ✓, 2 hush ✓, 3 awe ✓ (it reads as warmth as much as awe),
  4 pride ✓, 5 recognition ✓ (reads as practical, which is the job), 6 calm ✓.
  Changed after the check: the hero headline no longer crosses Josip's face (the scene sits
  lower), the portraits fill their frames, and the end screen pulls the footer up so the
  close does not trail into a black band.
- **Interaction:** taps and Enter toggle each voice; Listen toggles and requests the audio only
  on press; under reduced motion all five start lit; with JavaScript off all five are lit, the
  resolve line shows and Listen is hidden.
- **Lighthouse mobile** behind a local brotli server (as Cloudflare serves it), with ticket D's
  date widget in the hero: EN 99 / 100 / 100, HR 97 / 100 / 100 (performance / accessibility /
  best practices); LCP 2.2 s EN, 2.6 s HR; CLS 0 / 0.001; TBT 0 ms. HR is slower by two latin-ext
  font files from the layout. SEO 69 only because the pre-domain build is `noindex` (ticket G).
- **Not verified:** a real phone (iOS audio and the silent switch, touch scrolling through the
  pinned chord), audible playback by ear, and the numbers on the deployed build.

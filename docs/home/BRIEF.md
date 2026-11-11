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
5. **The one thing no other site does.** (spec, revised by Josip in #32) "The five voices build
   a chord": one press plays *Carol of the Bells*, and each singer lights up the moment their
   voice enters, so the light grows with the music until the chord is complete.
6. **Distance from premium-minimal.** (authored) Dark and restrained, but not minimal: one
   saturated peak in brand RGB. Family: *premium-minimal with a single maximalist act*. The
   gradient is light, never a fill (spec), and appears at full strength only at the peak.
7. **One world or distinct scenes.** (authored) Distinct scenes, cut like lighting cues. There
   is no continuous camera: the hall is one photograph, the chord is five portraits.
8. **Assets.** (spec) Real photography only, nothing generated: the Unisport Stars gala 2026
   set (Westin, blue LED; frame `R1JC7655`, all five singing, since #31; it was `R1JC7247`)
   for the hero, the 2024 Journal.hr portraits by
   Marko Lopac (each member alone) for the chord, the HAK Esplanade frame for the conference
   room, *Carol of the Bells* ("Carol new mix.wav", 3.0 → 41.07 s) for sound.

## Who it is for, and what they do

- **Who:** event planners and corporate clients choosing music for a conference or gala in
  Zagreb and the region; second, a fan from anywhere who found a reel.
- **Believe by the end:** *five people with microphones are a whole show.*
- **Next action:** send an inquiry. One label everywhere: "Send an inquiry" / "Pošalji upit" (spec);
  the hero's date widget says "Enquire" / "Pošalji upit" (Josip, #31).

## Journey

| # | Beat | What changes for the visitor |
|---|---|---|
| 1 | Recognition | A real gala, five singers at microphones: "this is the kind of event I am planning" |
| 2 | Hush | The stage goes dark; one line |
| 3 | The chord | They press play and watch the chord build, one voice at a time |
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

Revised on 2026-11-10 from Josip's review of the live page (jivancevic/voxford-web#32): the
first build lit the voices from the scroll and let a tap toggle each one, with an opt-in
Listen; Josip asked for one big play button instead, with the singers lit by the music.
On 2026-11-11 the transport choices below were kept as recommended in PR #34: a pause that
holds when the visitor scrolls back, a pin of 2.4 viewport-heights, and one button with no
separate stop. They stand unless Josip changes them; `docs/spec.md` records the same.

Five portraits in stage order (Josip, Dora, Ante, Vita, David; KB `ljudi-i-procesi/ekipa.md`)
stand in near-darkness, all five dim, with one play pill under the heading (#77). Pressing
it plays *Carol of the Bells* (the 3.0 → 41.07 s span) and **each singer lights the moment
their voice enters**, each with its own colour of light from above, stepping pink → purple →
blue along the brand gradient; the gradient line under them grows with every voice and, with
all five lit, completes and the whole stage glows. The entry times are one cue table,
`VOICE_ENTRIES` in `src/lib/chord.ts` (seconds from the start of the clip, per member). Josip
gave them on 2026-11-10: Dora from the start, Vita 4.25 s, David 8.80 s, Josip 13.10 s, Ante
17.50 s. He gave them in WAV time, 3.0 s later; the clip's loudness confirms the shift. The
voices enter in that order, not in stage order, and each stays lit to the end. The voices follow the audio clock, not the scroll: the scroll only breathes
the stage glow a little (`--sc-p`) and holds the stage pinned while the music plays.

- **Before play:** all five dim; under the heading the hint ("Press play and each singer
  lights up…") and the play pill ("Listen" / "Poslušajte"), primary. It sat centred on the
  portraits until #77, which put it on Ante's face; it now stays off every portrait.
- **Playing:** the pill steps back to the ghost pill and shows pause; the caption under the
  line (phones) names the voice that just came in.
- **Paused** (the button, or leaving the act): the lights hold where the music stopped, the
  button offers Resume. Leaving the act fades the music out and pauses it; coming back stays
  paused until a press (a transport, not a mode: nothing plays without a press).
- **End:** all five lit, the line complete, the resolve line in full text colour, the button
  offers "Listen again", which starts over from Dora alone.
- **No JavaScript:** all five portraits lit, names and voice parts visible, no button.
- **Audio blocked** (no source the browser can play, or `play()` refused): all five lit, the
  resolve line up; with no playable source the button and hint stay hidden.
- **Reduced motion:** no pin; all five lit from the start and they stay lit; the button still
  plays the music, and the hint says only "Press play to hear all five."
- **Short windows** (under 40rem tall for the hero, 46rem for the chord: most laptops, a phone
  on its side) do not pin; the act scrolls by. The chord also pins only from 64rem wide.
- **Pinned stage height** is a minimum (`100svh` minus the header), never a fixed height: when
  `svh` comes out too small (iOS Chrome once gave the phone's width, #77), the stage grows
  instead of the portraits spilling over the foot. Only the pinned stage reads `svh`; a chord
  stage that scrolls by is as tall as its content.
- **Phones and tablets held upright (chord, under 64rem):** three over two, as we stand in our
  videos: the stage order folded, so Josip, Ante, David at the back and Dora, Vita in front,
  each between two of the back row. No card covers another; the act does not pin. A phone on
  its side keeps the single row.
- **Phones and screens held upright (hero):** the hero does not pin, so all five stay in frame
  on a portrait tablet. Its scroll progress starts at 0 at the page top, where the planes line
  up into the photo (#74), and they part as it scrolls by. The date widget (ticket D) sits on
  plain ground under the photo.
- **Muted or silent switch:** iOS plays through the "playback" audio session where Safari has
  one; audio only ever starts on a press.

## Hero planes

The hero headline is "Five voices. One harmony." / "Pet glasova. Jedan sklad." (Josip, #31); the
H1 also carries the group's disambiguation line, visually hidden, so it still says who Voxford
is. The four planes are cut from Drive `Photo › 2026 Hrvatski Akademski Sportski Savez ›
Unisport_stars_R1JC7655_JC.jpg` by `scripts/hero-planes/build.sh` (on the machine that made
them, macOS 26 with the same ImageMagick and cwebp, a rerun reproduces the committed files byte
for byte; Vision and the encoders may differ elsewhere). The caption credits "Jozo Cabraja /
kolektiff", the file's mandatory credit, confirmed for #31:

- **Crop:** 1800×1200 at (360, 268) of the 2400×1600 frame, so the five stand between 22% and
  97% of the width (the phone composition starts the frame at 18.5%) and the headline clears
  the first singer's cap at 1440×900. The sponsor banners stay behind the singers; they only
  show, defocused, in `far`.
- **subject:** an Apple Vision person matte (`VNGeneratePersonSegmentationRequest`, accurate)
  run on one tile per singer, kept to that singer's column and faded out where the audience
  covers them; on the whole frame Vision misses the singer in the dark on the left. Singers 2–4
  get a second, tighter tile (#67). A round close per singer takes in the stands, a steep ramp
  makes faint values solid, enclosed holes are filled, and everything inside a 10 px close of
  the outline is solid (no grey ghost inside a body). Drawn fixes drop banner letters,
  the gold logo and audience bits; each box they cut is recorded for the rim. The fourth
  singer's white drape is added by luminance (Vision leaves it out).
- **rim:** a soft white back-light under the singers (#67, #74), moving with them. It is
  drawn from a smoothed silhouette (the filled matte opened by a radius-8 octagon, blurred and
  re-thresholded), never from the raw matte, because a bright rim shows every stair-step,
  stand and cut. It stays off every straight edge that is not a singer's outline (the hand
  cuts, column bounds, frame edges, the top of singer 4's tile), out of narrow gaps (within
  60 px of two singers, or filled by a 24 px close: lit from both sides they read as a tunnel)
  and fades out above each singer's cut line. Edge rule: the rim may never outline a jagged or straight-cut edge, a
  banner or audience fragment, a stand ending in mid-air, or the frame edge.
- **front:** the audience: Vision's matte where it finds the lit heads, plus a band below the
  stage line, minus the singers. Below each singer's cut line the band takes over at once,
  so the defocused far plane never shows between the singers and the audience (#74); left of
  the first singer, where there is only audience, it takes over from the same height.
- **far:** the whole crop at 1600 px with the singers inpainted out (no ghost halo), blurred,
  dimmed to 78% and desaturated by a quarter.
- **Composition:** one 3:2 frame covers the stage, bottom-anchored 12% below it. Wherever that
  would put singers 1 and 2's heads (0.33 of the frame) behind the headline, which is any
  short wide window, the frame drops until they clear it. The headline is at most 12svh, and
  on a landscape window under 46rem the lead is 56ch wide, so it starts below their chins. No
  text crosses a face (#74). Phones and upright screens use the flow layout, so all five are
  in frame on a portrait tablet.

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

> "The stage went dark, I hit play, and the five of them lit up one by one as their voices came
> in, until the whole thing was glowing: Carol of the Bells."

It lives in act 3, gets the most scroll room (about 2.4 viewport-heights against ≤1.8 for any
other act; 3.4 while the scroll lit the voices, before #32), the best asset (five portraits) and
the only sound.

**It's the site where you press play and watch five singers light up as the chord builds.**

## Score

| # | Beat | Device | Span | Why this one |
|---|---|---|---|---|
| 1 | Recognition | `parallax` on a sticky stage: far (defocused hall), subject (the five), front (audience heads), haze | ~1.7 vh | Depth from a real photograph: rack focus, front row sliding past |
| 2 | Hush | `flow` + `in` | ~0.9 vh | One line on black; the cut is the content |
| 3 | The chord | `pin` + bespoke chord | ~2.4 vh | The visitor presses play; the music lights it; the longest hold |
| 4 | Proof | `reveal` (a wipe of light across the numeral) | ~1.2 vh | A number lit like a sign, paired with videos (never alone, spec) |
| 5 | Fit | `flow` + `parallax` inside the media column | ~1.8 vh | Information, compressed; the white hall is the change of state |
| 6 | Commitment | still | ~1 vh | The page stops moving |

Four device families (parallax, flow, pin, reveal) plus the still close; never the same twice in
a row; no scrub; one peak with the largest span; total ≈ 9 viewport-heights before the footer.

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
- **Interaction** (before #32, superseded below): taps and Enter toggle each voice; Listen toggles and requests the audio only
  on press; under reduced motion all five start lit; with JavaScript off all five are lit, the
  resolve line shows and Listen is hidden.
- **Lighthouse mobile** behind a local brotli server (as Cloudflare serves it), with ticket D's
  date widget in the hero: EN 99 / 100 / 100, HR 97 / 100 / 100 (performance / accessibility /
  best practices); LCP 2.2 s EN, 2.6 s HR; CLS 0 / 0.001; TBT 0 ms. HR is slower by two latin-ext
  font files from the layout. SEO 69 only because the pre-domain build is `noindex` (ticket G).
- **Not verified:** a real phone (iOS audio and the silent switch, touch scrolling through the
  pinned chord), audible playback by ear, and the numbers on the deployed build.

## Verification log: the play button (#32, 2026-11-10, local build)

Headless Chrome (Playwright) against the built site, desktop 1440×900 and mobile 390×844, EN
and HR, first with placeholder cues, then with Josip's (Dora 0, Vita 4.25, David 8.80, Josip
13.10, Ante 17.50 s):

- Press play: every voice lit within ~15 ms of its cue (read from the audio clock), in entry
  order, each staying lit; full chord after the last cue; label Pause.
- Pause: the audio stops, the clock and the lights hold; Resume continues from there.
- Leaving the act pauses the music; coming back stays paused until a press.
- End: all five lit, label "Listen again"; a replay starts over with only Dora lit.
- No playable source: all five lit, no button. `play()` refused: all five lit, the button
  offers play again. Reduced motion: all five lit before and during play. JavaScript off: all
  five lit, resolve visible, no button.
- The play disc is ≥ 48 px in every state (51 px at its smallest, on a phone while playing).
- **Not verified:** a real phone (iOS silent switch, touch while pinned) and audible playback
  by ear. The entry times were checked against the clip's loudness, not by ear.

// The `sizes` of a poster in a sideways rail (VideoRail, YouTubeRail), derived
// from the rail's columns so the browser fetches the poster the card shows:
// `grid-auto-columns: minmax(11rem, 15rem)` with a `--space-5` gap, inside a
// `.container` of `min(100% - 2 * --gutter, --content-max)`. A row that
// overflows keeps every card at 11rem; once all cards fit, they share the row
// up to 15rem each. Change these numbers with the CSS they mirror.

const CARD_MIN = 11; // rem, the rails' minmax() minimum
const CARD_MAX = 15; // rem, the rails' minmax() maximum
const GAP = 1.5; // rem, --space-5
const CONTENT_MAX = 76; // rem, --content-max
const GUTTER = 'clamp(1rem, 0.5rem + 2.5vw, 2.5rem)'; // --gutter

/** Viewport width (rem) at which a container first reaches `width` rem. */
function viewportFor(width: number): number {
  // Below 80rem the gutter is 0.5rem + 2.5vw: width = V - 1 - 0.05V.
  const fluid = (width + 1) / 0.95;
  return fluid <= 80 ? fluid : width + 5;
}

export function railCardSizes(count: number): string {
  const row = count * CARD_MIN + (count - 1) * GAP;
  if (count < 1 || row > CONTENT_MAX) return `${CARD_MIN}rem`;
  const from = Math.ceil(viewportFor(row) * 10) / 10;
  const shared = `(min(100vw - 2 * ${GUTTER}, ${CONTENT_MAX}rem) - ${(count - 1) * GAP}rem) / ${count}`;
  return `(min-width: ${from}rem) min(${CARD_MAX}rem, ${shared}), ${CARD_MIN}rem`;
}

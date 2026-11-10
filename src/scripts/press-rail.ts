// Previous/next buttons for the press rail (src/components/content/PressRail.astro).
// The rail is a native scroll-snap row that works without this script; here
// the buttons appear (CSS shows them only on wide pointer screens), scroll by
// about one view of cards, and grey out at either end.

function enhance(rail: HTMLElement) {
  const track = rail.querySelector<HTMLElement>('[data-press-track]');
  const arrows = rail.querySelector<HTMLElement>('[data-press-arrows]');
  const prev = rail.querySelector<HTMLButtonElement>('[data-press-prev]');
  const next = rail.querySelector<HTMLButtonElement>('[data-press-next]');
  if (!track || !arrows || !prev || !next || rail.dataset.enhanced) return;
  rail.dataset.enhanced = 'true';

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    arrows.hidden = max <= 1;
    // Scroll position is negative in right-to-left layouts; compare magnitudes.
    const at = Math.abs(track.scrollLeft);
    prev.disabled = at <= 1;
    next.disabled = at >= max - 1;
  };

  const step = (direction: 1 | -1) => {
    const card = track.querySelector('li');
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const cardWidth = card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    const perView = Math.max(1, Math.floor((track.clientWidth + gap) / cardWidth));
    track.scrollBy({ left: direction * perView * cardWidth });
  };

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  track.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(track);
  update();
}

document.querySelectorAll<HTMLElement>('[data-press-rail]').forEach(enhance);

export {}; // a module, so its names stay out of the other scripts' global scope

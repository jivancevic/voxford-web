// Play in place for video cards with `play="inline"` (src/components/VideoCard.astro,
// the home rail). The server renders the poster as a link to the watch page and
// a hidden button over the frame; this script reveals the button and, on a
// press, swaps the poster (and any muted loop) for the whole video with sound
// and native controls. Nothing of the full video downloads before the press.
// If no source can play, the card goes back to its poster, now a plain link to
// the watch page.
// Starting one video pauses any other the visitor started, reels included.

interface Source {
  src: string;
  type: string;
}

function fullSourcesOf(frame: HTMLElement): Source[] {
  try {
    const parsed = JSON.parse(frame.dataset.full ?? '[]') as unknown;
    return Array.isArray(parsed) ? (parsed as Source[]) : [];
  } catch {
    return [];
  }
}

/** One voice at a time: a video with controls starting pauses every other one (reels too). */
document.addEventListener(
  'play',
  (event) => {
    const current = event.target;
    if (!(current instanceof HTMLVideoElement) || !current.controls) return;
    document.querySelectorAll<HTMLVideoElement>('video[controls]').forEach((v) => {
      if (v !== current && !v.paused) v.pause();
    });
  },
  true, // media events do not bubble
);

function playInline(frame: HTMLElement, button: HTMLButtonElement) {
  const sources = fullSourcesOf(frame);
  if (!sources.length) return;
  frame.querySelector('video')?.remove(); // the muted loop, if it was running
  const video = document.createElement('video');
  video.controls = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-label', frame.dataset.label ?? button.getAttribute('aria-label') ?? '');
  let last: HTMLSourceElement | undefined;
  for (const s of sources) {
    last = document.createElement('source');
    last.src = s.src;
    last.type = s.type;
    video.append(last);
  }
  // The last source failing means none could play: back to the poster.
  last?.addEventListener('error', () => restorePoster(frame, video), { once: true });
  const poster = frame.querySelector('img');
  if (poster?.currentSrc) video.poster = poster.currentSrc;
  frame.classList.remove('is-playing'); // the loop's fade-in starts over if it ever comes back
  frame.classList.add('is-full');
  frame.querySelector('.video-card__poster')?.setAttribute('hidden', '');
  button.remove();
  frame.append(video);
  video.tabIndex = 0; // Safari does not focus <video controls> by default
  video.focus();
  video.play().catch(() => {
    /* the visitor can press play on the controls */
  });
}

function restorePoster(frame: HTMLElement, video: HTMLVideoElement) {
  video.remove();
  frame.classList.remove('is-full');
  const poster = frame.querySelector<HTMLAnchorElement>('.video-card__poster');
  if (!poster) return;
  poster.hidden = false;
  poster.removeAttribute('tabindex');
  poster.removeAttribute('aria-hidden');
  poster.setAttribute('aria-label', frame.dataset.label ?? '');
  poster.focus();
}

function enhanceInline(frame: HTMLElement) {
  const button = frame.querySelector<HTMLButtonElement>('.video-card__button');
  if (!button || frame.dataset.inlineReady) return;
  frame.dataset.inlineReady = 'true';
  button.hidden = false;
  button.addEventListener('click', () => playInline(frame, button), { once: true });
}

document.querySelectorAll<HTMLElement>('[data-full]').forEach(enhanceInline);

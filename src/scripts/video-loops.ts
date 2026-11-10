// Muted loops for video cards (src/components/VideoCard.astro). A card's frame
// carries its loop sources in `data-loop`; while at least 60% of the frame is
// in view, a muted, looping <video> fades in over the poster, and it pauses
// when the card scrolls away. Nothing loads before the page is idle, nothing
// plays under prefers-reduced-motion or Save-Data, and the poster is the
// fallback for everything. The video is decoration: the card's link and text
// carry the meaning, so it is aria-hidden and never takes focus.

interface Source {
  src: string;
  type: string;
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
const started = new WeakSet<Element>();

function videoFor(frame: HTMLElement): HTMLVideoElement | undefined {
  const existing = frame.querySelector('video');
  if (existing) return existing;
  if (frame.dataset.loopFailed) return undefined;
  let sources: Source[];
  try {
    sources = JSON.parse(frame.dataset.loop ?? '[]') as Source[];
  } catch {
    return undefined;
  }
  if (!sources.length) return undefined;
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  video.tabIndex = -1;
  let last: HTMLSourceElement | undefined;
  for (const s of sources) {
    last = document.createElement('source');
    last.src = s.src;
    last.type = s.type;
    video.append(last);
  }
  video.addEventListener('playing', () => frame.classList.add('is-playing'), { once: true });
  // The last source failing means none could play (e.g. media not uploaded
  // yet): drop the video and keep the poster. Earlier sources may fail alone.
  last?.addEventListener(
    'error',
    () => {
      frame.dataset.loopFailed = 'true'; // never retried on the next scroll-in
      video.remove();
    },
    { once: true },
  );
  frame.append(video);
  return video;
}

function play(frame: HTMLElement) {
  if (reducedMotion.matches) return;
  started.add(frame);
  videoFor(frame)
    ?.play()
    .catch(() => {
      /* autoplay refused: the poster stays */
    });
}

function pause(frame: HTMLElement) {
  frame.querySelector('video')?.pause();
}

function init() {
  const frames = document.querySelectorAll<HTMLElement>('[data-loop]');
  if (!frames.length || saveData || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const frame = entry.target as HTMLElement;
        if (entry.isIntersecting) play(frame);
        else if (started.has(frame)) pause(frame);
      }
    },
    { threshold: 0.6 },
  );
  frames.forEach((f) => observer.observe(f));
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) frames.forEach(pause);
  });
}

// Safari has no requestIdleCallback: fall back to shortly after load.
const idle: (cb: () => void) => void =
  typeof window.requestIdleCallback === 'function'
    ? (cb) => window.requestIdleCallback(cb, { timeout: 2500 })
    : (cb) => addEventListener('load', () => setTimeout(cb, 200), { once: true });
idle(init);

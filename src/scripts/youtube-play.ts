// Play in place for YouTube cards (src/components/YouTubeCard.astro). The
// server renders the thumbnail as a link to YouTube and a hidden button over
// the frame; this script reveals the button and, on a press, swaps the
// thumbnail for the youtube-nocookie player, autoplaying (the press is the
// gesture). Nothing from YouTube but the thumbnail loads before the press.
// One voice at a time: starting a player pauses the other players and any
// <video controls> on the page (top videos, reels), and those starting pauses
// the players (through the embed's postMessage API, enablejsapi=1).

const ORIGIN = 'https://www.youtube-nocookie.com';

function pausePlayers(except?: HTMLIFrameElement) {
  document.querySelectorAll<HTMLIFrameElement>('iframe[data-youtube-player]').forEach((frame) => {
    if (frame === except) return;
    frame.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), ORIGIN);
  });
}

function play(frame: HTMLElement, button: HTMLButtonElement) {
  const id = frame.dataset.youtube;
  if (!id) return;
  const params = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0', enablejsapi: '1', origin: location.origin });
  const iframe = document.createElement('iframe');
  iframe.src = `${ORIGIN}/embed/${encodeURIComponent(id)}?${params}`;
  iframe.title = frame.dataset.label ?? button.getAttribute('aria-label') ?? '';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.dataset.youtubePlayer = '';
  document.querySelectorAll<HTMLVideoElement>('video[controls]').forEach((v) => v.pause());
  pausePlayers();
  frame.querySelector('.yt__thumb')?.remove();
  button.remove();
  frame.classList.add('is-playing');
  frame.append(iframe);
  iframe.focus();
}

/** A Short's vertical thumbnail (oar2) is not documented: fall back to hqdefault, which always exists. */
function guardThumbnail(frame: HTMLElement) {
  const img = frame.querySelector('img');
  const fallback = frame.dataset.fallback;
  if (!img || !fallback) return;
  const swap = () => {
    if (img.src !== fallback) img.src = fallback;
  };
  if (img.complete && img.naturalWidth === 0) swap();
  else img.addEventListener('error', swap, { once: true });
}

function enhance(frame: HTMLElement) {
  const button = frame.querySelector<HTMLButtonElement>('.yt__play');
  if (!button || frame.dataset.enhanced) return;
  frame.dataset.enhanced = 'true';
  guardThumbnail(frame);
  button.hidden = false;
  button.addEventListener('click', () => play(frame, button), { once: true });
}

document.addEventListener(
  'play',
  (event) => {
    if (event.target instanceof HTMLVideoElement && event.target.controls) pausePlayers();
  },
  true, // media events do not bubble
);

document.querySelectorAll<HTMLElement>('[data-youtube]').forEach(enhance);

export {}; // a module, so its names stay out of the other scripts' global scope

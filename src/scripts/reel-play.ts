// Tap-to-play for synced reels (src/components/ReelCard.astro). The server
// renders the thumbnail as a link to Instagram and a hidden play button; this
// script reveals the button and, on a tap, replaces the thumbnail with the
// reel from R2, playing with sound and native controls. Nothing downloads
// before the tap.

function enhance(frame: HTMLElement) {
  const button = frame.querySelector<HTMLButtonElement>('.reel__play');
  const src = frame.dataset.reel;
  if (!button || !src || frame.dataset.enhanced) return;
  frame.dataset.enhanced = 'true';
  button.hidden = false;
  button.addEventListener('click', () => {
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.src = src;
    video.setAttribute('aria-label', button.getAttribute('aria-label') ?? '');
    frame.querySelector('.reel__thumb')?.remove();
    button.remove();
    frame.append(video);
    video.focus();
    video.play().catch(() => {
      /* the visitor can press play on the controls */
    });
  });
}

document.querySelectorAll<HTMLElement>('[data-reel]').forEach(enhance);

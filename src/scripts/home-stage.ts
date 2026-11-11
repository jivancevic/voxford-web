// Motion for the home page (docs/home/BRIEF.md). It speaks the subset of the
// scroll-craft contract the page uses, so the scroll-craft harness can read it:
//   data-sc-act="pin|flow"   an act; its progress (0..1) is published as --sc-p
//   style="--span: 1.7"      viewport-heights a pinned act owns (CSS applies it)
//   data-sc-in               revealed once when it enters the viewport (.is-in)
//   html.sc-ready            the script ran; html.sc-motion also means motion is allowed
// Every hidden or dimmed state in the CSS is scoped under those classes, so the
// page reads complete with no JavaScript (spec › SEO/GEO).
//
// The chord (the signature move) lives here too: one press of the play button
// plays the Carol span, and each voice lights the moment it enters, read from
// the audio clock against the cue table in src/lib/chord.ts.

import { type ChordState, chordView, voiceEntries } from '@/lib/chord';

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

interface Act {
  el: HTMLElement;
  pinned: boolean;
  /** A pinned act whose stage is sticky right now (not under reduced motion or on a phone hero). */
  sticky: boolean;
  top: number;
  height: number;
  /** Pinned acts: the sticky stage's `top` offset and its height, so p runs exactly over the pinned travel. */
  stickTop: number;
  stageHeight: number;
  p: number;
}

const acts: Act[] = [...document.querySelectorAll<HTMLElement>('[data-sc-act]')].map((el) => ({
  el,
  pinned: el.dataset.scAct === 'pin',
  sticky: false,
  top: 0,
  height: 0,
  stickTop: 0,
  stageHeight: 0,
  p: Number.NaN,
}));

function motionAllowed(): boolean {
  return !reducedMotion.matches;
}

function applyMotionClass(): void {
  root.classList.toggle('sc-motion', motionAllowed());
}

function measure(): void {
  for (const act of acts) {
    act.top = act.el.getBoundingClientRect().top + scrollY;
    act.height = act.el.offsetHeight;
    const stage = act.el.querySelector<HTMLElement>('[data-sc-stage]');
    const style = stage ? getComputedStyle(stage) : undefined;
    act.sticky = act.pinned && style?.position === 'sticky';
    act.stickTop = style ? parseFloat(style.top) || 0 : 0;
    act.stageHeight = stage?.offsetHeight ?? innerHeight;
  }
}

function frame(): void {
  scheduled = false;
  const y = scrollY;
  const vh = innerHeight;
  for (const act of acts) {
    // Pinned: the stage sticks when its top reaches `stickTop` and lets go when
    // it meets the section's bottom, a travel of (section height - stage height).
    // Otherwise p runs from the act entering the viewport to it leaving. An act
    // already on screen at load (the phone hero) starts at 0 at the page top:
    // the hero's planes line up into the photo at p = 0, and at p = 0.35 the
    // front row hung lower than the singers it was cut around (#74).
    const enter = Math.max(0, act.top - vh);
    const raw = act.sticky
      ? (y + act.stickTop - act.top) / Math.max(1, act.height - act.stageHeight)
      : (y - enter) / Math.max(1, act.top + act.height - enter);
    const p = Math.min(1, Math.max(0, raw));
    if (act.pinned) publishVerifyState(act, y, vh, p);
    if (Math.abs(p - act.p) < 0.0005) continue;
    act.p = p;
    act.el.style.setProperty('--sc-p', p.toFixed(4));
  }
}

/**
 * For the scroll-craft harness: a pinned act moves layers the harness does not
 * sample (planes driven by --sc-p, the chord), so while it is on screen it
 * publishes its visual state, rounded to what a reader could see change.
 */
function publishVerifyState(act: Act, y: number, vh: number, p: number): void {
  const onScreen = act.top < y + vh && act.top + act.height > y;
  const extra = act.el.dataset.scVerifyExtra ?? '';
  const next = onScreen ? `${act.el.id || 'act'}:${Math.round(p * 50) / 50}${extra}` : null;
  if (act.el.getAttribute('data-sc-verify-state') === next) return;
  if (next === null) act.el.removeAttribute('data-sc-verify-state');
  else act.el.setAttribute('data-sc-verify-state', next);
}

let scheduled = false;
function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(frame);
}

function remeasure(): void {
  measure();
  for (const act of acts) act.p = Number.NaN;
  schedule();
}

// ---- Reveals: once, on entry. Content that hides again on scroll-up is a defect.

function watchReveals(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-sc-in]');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  targets.forEach((el) => io.observe(el));
}

// ---- The chord

/** Fade time constants (seconds) for the gain: in on play, out on pause, longer when the act scrolls away. */
const FADE_IN = 0.08;
const FADE_OUT = 0.1;
const FADE_AWAY = 0.35;
/** A gain ramp is inaudible after about three time constants; the audio pauses then. */
const FADE_SPANS = 3;

function mountChord(section: HTMLElement): void {
  const voices = [...section.querySelectorAll<HTMLElement>('[data-voice]')];
  const button = section.querySelector<HTMLButtonElement>('[data-chord-play]');
  const label = button?.querySelector<HTMLElement>('[data-chord-play-label]');
  const caption = section.querySelector<HTMLElement>('[data-chord-caption]');
  const total = voices.length;
  if (total === 0) return;

  const cues = voiceEntries(voices.map((v) => v.dataset.voice ?? ''));
  const sources = [...section.querySelectorAll<HTMLElement>('[data-chord-src]')].map((el) => ({
    src: el.dataset.chordSrc ?? '',
    type: el.dataset.chordType ?? '',
  }));
  const probe = document.createElement('audio');
  const source = sources.find((s) => s.src && probe.canPlayType(s.type) !== '');

  let state: ChordState = source && button ? 'idle' : 'blocked';
  /** The audio clock as the lights last showed it; a pause rewinds the audio here, so resume picks up where they froze. */
  let clock = 0;
  let audio: HTMLAudioElement | undefined;
  let ctx: AudioContext | undefined;
  let gain: GainNode | undefined;
  let raf = 0;
  let pauseTimer = 0;
  let lastRenderKey = '';

  function render(): void {
    const view = chordView({ state, time: clock, motion: motionAllowed(), cues });
    const key = `${state}|${view.lit.join()}|${view.last}`;
    if (key === lastRenderKey) return;
    lastRenderKey = key;
    const count = view.lit.filter(Boolean).length;
    view.lit.forEach((on, i) => voices[i]!.setAttribute('data-lit', String(on)));
    section.dataset.chordState = state;
    section.toggleAttribute('data-full', view.full);
    section.style.setProperty('--chord-count', String(count));
    section.dataset.scVerifyExtra = `:${state}:lit${count}`;
    // The full chord is an authored hold: every voice lit, the line complete, nothing else to do.
    if (view.full) section.setAttribute('data-sc-verify-hold', 'true');
    else section.removeAttribute('data-sc-verify-hold');
    if (caption) caption.textContent = view.last >= 0 ? (voices[view.last]!.dataset.caption ?? '') : '';
    if (button && label) label.textContent = button.getAttribute(`data-label-${view.action}`) ?? '';
  }

  function stopTicking(): void {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function tick(): void {
    raf = 0;
    if (state !== 'playing' || !audio) return;
    clock = audio.currentTime;
    render();
    raf = requestAnimationFrame(tick);
  }

  function fade(target: number, tau: number): void {
    if (!audio) return;
    if (gain && ctx) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setTargetAtTime(target, ctx.currentTime, tau);
    } else {
      audio.volume = target;
    }
  }

  function ensureAudio(): HTMLAudioElement | undefined {
    if (audio || !source) return audio;
    // iOS mutes Web Audio under the silent switch unless the session is "playback" (Safari 17+).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
    audio = new Audio(source.src);
    audio.preload = 'auto';
    audio.addEventListener('ended', () => {
      stopTicking();
      clock = audio?.duration ?? clock;
      state = 'ended';
      render();
    });
    audio.addEventListener('error', () => block());
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      ctx = new Ctx();
      gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
    } else {
      audio.volume = 0;
    }
    return audio;
  }

  /** The browser refused the audio: show the whole chord, so nothing is left dark. */
  function block(): void {
    stopTicking();
    window.clearTimeout(pauseTimer);
    state = 'blocked';
    render();
  }

  function play(): void {
    const el = ensureAudio();
    if (!el) return block();
    window.clearTimeout(pauseTimer);
    if (state === 'ended' || el.ended) el.currentTime = 0;
    clock = el.currentTime;
    state = 'playing';
    render();
    void ctx?.resume();
    fade(1, FADE_IN);
    // An AbortError only means a pause overtook this play; anything else is the browser saying no.
    el.play().then(
      () => {
        if (state === 'playing' && !raf) raf = requestAnimationFrame(tick);
      },
      (error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) block();
      },
    );
    raf ||= requestAnimationFrame(tick);
  }

  function pause(tau: number): void {
    if (state !== 'playing' || !audio) return;
    stopTicking();
    clock = audio.currentTime;
    state = 'paused';
    render();
    fade(0, tau);
    const held = clock;
    pauseTimer = window.setTimeout(() => {
      if (state === 'playing' || !audio) return;
      audio.pause();
      audio.currentTime = held;
    }, tau * FADE_SPANS * 1000);
  }

  if (button && source) {
    button.hidden = false;
    section.classList.add('has-sound');
    button.addEventListener('click', () => (state === 'playing' ? pause(FADE_OUT) : play()));
    // Leaving the act fades the music out and pauses it; it waits for a press to come back.
    new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) pause(FADE_AWAY);
    }).observe(section);
  }

  // Reduced motion lights all five whatever the music does; with motion back on, the voices follow it again.
  reducedMotion.addEventListener('change', () => {
    lastRenderKey = '';
    render();
  });

  section.classList.add('is-armed');
  render();
}

// ---- Boot

applyMotionClass();
reducedMotion.addEventListener('change', () => {
  applyMotionClass();
  remeasure();
});
measure();
document.querySelectorAll<HTMLElement>('[data-chord]').forEach(mountChord);
watchReveals();
addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', remeasure);
new ResizeObserver(remeasure).observe(document.body);
void document.fonts?.ready.then(remeasure);
root.classList.add('sc-ready');
schedule();

// Motion for the home page (docs/home/BRIEF.md). It speaks the subset of the
// scroll-craft contract the page uses, so the scroll-craft harness can read it:
//   data-sc-act="pin|flow"   an act; its progress (0..1) is published as --sc-p
//   data-sc-span="1.7"       viewport-heights a pinned act owns (CSS applies it)
//   data-sc-in               revealed once when it enters the viewport (.is-in)
//   html.sc-ready            the script ran; html.sc-motion also means motion is allowed
// Every hidden or dimmed state in the CSS is scoped under those classes, so the
// page reads complete with no JavaScript (spec › SEO/GEO).
//
// The chord (the signature move) lives here too: the scroll lights the five
// voices in stage order, taps override it, and Listen plays the Carol span
// with a gain that follows the chord (src/lib/chord.ts).

import { chordGain, litVoices, voicesLitAt, VOICE_COUNT } from '@/lib/chord';

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

interface Act {
  el: HTMLElement;
  pinned: boolean;
  top: number;
  height: number;
  p: number;
}

const acts: Act[] = [...document.querySelectorAll<HTMLElement>('[data-sc-act]')].map((el) => ({
  el,
  pinned: el.dataset.scAct === 'pin',
  top: 0,
  height: 0,
  p: Number.NaN,
}));

const progressListeners = new Map<HTMLElement, (p: number) => void>();

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
  }
}

function frame(): void {
  scheduled = false;
  const y = scrollY;
  const vh = innerHeight;
  for (const act of acts) {
    const raw = act.pinned
      ? (y - act.top) / Math.max(1, act.height - vh)
      : (y + vh - act.top) / Math.max(1, act.height + vh);
    const p = Math.min(1, Math.max(0, raw));
    if (act.pinned) publishVerifyState(act, y, vh, p);
    if (Math.abs(p - act.p) < 0.0005) continue;
    act.p = p;
    act.el.style.setProperty('--sc-p', p.toFixed(4));
    progressListeners.get(act.el)?.(p);
  }
}

/**
 * For the scroll-craft harness: a pinned act moves layers the harness does not
 * sample (planes driven by --sc-p, the chord), so while it is on screen it
 * publishes its visual state, rounded to what a reader could see change.
 */
function publishVerifyState(act: Act, y: number, vh: number, p: number): void {
  const onScreen = act.top < y + vh && act.top + act.height > y;
  if (!onScreen) {
    act.el.removeAttribute('data-sc-verify-state');
    return;
  }
  const extra = act.el.dataset.scVerifyExtra ?? '';
  act.el.setAttribute('data-sc-verify-state', `${act.el.id || 'act'}:${Math.round(p * 50) / 50}${extra}`);
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

function mountChord(section: HTMLElement): void {
  const voices = [...section.querySelectorAll<HTMLButtonElement>('[data-voice]')];
  const listen = section.querySelector<HTMLButtonElement>('[data-chord-listen]');
  const caption = section.querySelector<HTMLElement>('[data-chord-caption]');
  if (voices.length !== VOICE_COUNT) return;

  const overrides: (boolean | undefined)[] = [];
  let scrollCount = motionAllowed() ? 0 : VOICE_COUNT;
  let lastLit = -1;
  let count = 0;

  function render(): void {
    const lit = litVoices(scrollCount, overrides);
    count = lit.filter(Boolean).length;
    lit.forEach((on, i) => {
      const voice = voices[i]!;
      const was = voice.getAttribute('aria-pressed') === 'true';
      voice.setAttribute('aria-pressed', String(on));
      if (on && !was) lastLit = i;
    });
    if (lastLit >= 0 && !lit[lastLit]) lastLit = lit.lastIndexOf(true);
    section.toggleAttribute('data-full', count === VOICE_COUNT);
    section.style.setProperty('--chord-count', String(count));
    section.dataset.scVerifyExtra = `:lit${count}`;
    // The full chord is an authored hold: five lit, the line complete, nothing else to do.
    if (count === VOICE_COUNT) section.setAttribute('data-sc-verify-hold', 'true');
    else section.removeAttribute('data-sc-verify-hold');
    if (caption) caption.textContent = lastLit >= 0 ? (voices[lastLit]!.dataset.caption ?? '') : '';
    sound.follow(count);
  }

  voices.forEach((voice, i) => {
    voice.addEventListener('click', () => {
      const lit = litVoices(scrollCount, overrides);
      overrides[i] = !lit[i];
      render();
    });
  });

  progressListeners.set(section, (p) => {
    if (!motionAllowed()) return;
    const next = voicesLitAt(p);
    if (next === scrollCount) return;
    scrollCount = next;
    render();
  });

  reducedMotion.addEventListener('change', () => {
    const p = acts.find((a) => a.el === section)?.p ?? 0;
    scrollCount = motionAllowed() ? voicesLitAt(p) : VOICE_COUNT;
    render();
  });

  const sound = createSound(section, listen);
  section.classList.add('is-armed');
  render();
}

interface Sound {
  follow(count: number): void;
}

/** Opt-in playback of the Carol span; never starts without a press of Listen. */
function createSound(section: HTMLElement, button: HTMLButtonElement | null): Sound {
  const sources = button
    ? [...section.querySelectorAll<HTMLElement>('[data-chord-src]')].map((el) => ({
        src: el.dataset.chordSrc ?? '',
        type: el.dataset.chordType ?? '',
      }))
    : [];
  let audio: HTMLAudioElement | undefined;
  let gain: GainNode | undefined;
  let ctx: AudioContext | undefined;
  let on = false;
  let inView = false;
  let count = 0;

  function level(): number {
    return on && inView ? chordGain(count) : 0;
  }

  function ramp(): void {
    if (!audio) return;
    const target = level();
    if (gain && ctx) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setTargetAtTime(target, ctx.currentTime, 0.35);
    } else {
      audio.volume = target;
    }
    if (target > 0 && audio.paused && !audio.ended) void audio.play().catch(() => setOn(false));
    if (target === 0 && !audio.paused) {
      window.setTimeout(() => {
        if (level() === 0) audio?.pause();
      }, 900);
    }
  }

  function ensureAudio(): HTMLAudioElement | undefined {
    if (audio) return audio;
    const probe = document.createElement('audio');
    const pick = sources.find((s) => s.src && probe.canPlayType(s.type) !== '');
    if (!pick) return undefined;
    audio = new Audio(pick.src);
    audio.preload = 'auto';
    audio.addEventListener('ended', () => setOn(false));
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

  function setOn(next: boolean): void {
    on = next;
    button?.setAttribute('aria-pressed', String(on));
    section.toggleAttribute('data-sound', on);
    if (on) {
      const el = ensureAudio();
      if (!el) {
        on = false;
        button?.setAttribute('aria-pressed', 'false');
        return;
      }
      if (el.ended) el.currentTime = 0;
      void ctx?.resume();
    }
    ramp();
  }

  if (button && sources.length) {
    button.hidden = false;
    button.addEventListener('click', () => setOn(!on));
    const io = new IntersectionObserver((entries) => {
      inView = entries.some((e) => e.isIntersecting);
      ramp();
    });
    io.observe(section);
  }

  return {
    follow(next: number) {
      count = next;
      ramp();
    },
  };
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

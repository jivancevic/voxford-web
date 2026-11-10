// The home page's signature move, as pure state: how many voices the scroll
// has lit, which voices are lit once taps override the scroll, and how loud
// the recording plays for a given chord. The number of voices is the number of
// members (src/data/site-facts.ts), never a constant here; src/scripts/home-stage.ts
// passes it in from the rendered voices. docs/home/BRIEF.md says why the chord
// works this way.

/** Act progress at which the first voice comes on, and at which the last does; the rest of the act holds the full chord. */
const FIRST_CUE = 0.1;
const LAST_CUE = 0.66;

/** Act progress (0..1) at which each of `total` voices comes on, in stage order, evenly spaced. */
export function voiceCues(total: number): number[] {
  if (total <= 1) return total === 1 ? [FIRST_CUE] : [];
  const step = (LAST_CUE - FIRST_CUE) / (total - 1);
  return Array.from({ length: total }, (_, i) => FIRST_CUE + i * step);
}

/** How many of `total` voices the scroll has lit at act progress `p`. */
export function voicesLitAt(p: number, total: number): number {
  if (Number.isNaN(p)) return 0;
  const clamped = Math.min(1, Math.max(0, p));
  // The epsilon keeps a cue that floating-point spacing lands a hair above its nominal value reachable.
  return voiceCues(total).filter((cue) => clamped >= cue - 1e-9).length;
}

/**
 * Lit state per voice: the first `scrollCount` voices are lit by the scroll,
 * and a tap (`overrides[i]` true or false) wins over the scroll for that voice.
 */
export function litVoices(scrollCount: number, overrides: readonly (boolean | undefined)[], total: number): boolean[] {
  return Array.from({ length: total }, (_, i) => overrides[i] ?? i < scrollCount);
}

/** Playback gain for `count` of `total` lit voices: audible from the first press of Listen, full with all of them. */
export function chordGain(count: number, total: number): number {
  if (total <= 0) return 1;
  const share = Math.min(total, Math.max(0, count)) / total;
  return 0.2 + 0.8 * share ** 1.3;
}

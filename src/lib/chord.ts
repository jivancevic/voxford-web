// The home page's signature move, as pure state: how many of the five voices
// the scroll has lit, which voices are lit once taps override the scroll, and
// how loud the recording plays for a given chord. src/scripts/home-stage.ts
// wires these to the DOM; docs/home/BRIEF.md says why the chord works this way.

export const VOICE_COUNT = 5;

/** Act progress (0..1) at which each voice comes on, in stage order. The last 0.34 holds the full chord. */
export const VOICE_CUES = [0.1, 0.24, 0.38, 0.52, 0.66] as const;

/** How many voices the scroll has lit at act progress `p`. */
export function voicesLitAt(p: number): number {
  if (Number.isNaN(p)) return 0;
  const clamped = Math.min(1, Math.max(0, p));
  return VOICE_CUES.filter((cue) => clamped >= cue).length;
}

/**
 * Lit state per voice: the first `scrollCount` voices are lit by the scroll,
 * and a tap (`overrides[i]` true or false) wins over the scroll for that voice.
 */
export function litVoices(scrollCount: number, overrides: readonly (boolean | undefined)[]): boolean[] {
  return Array.from({ length: VOICE_COUNT }, (_, i) => overrides[i] ?? i < scrollCount);
}

/** Playback gain for `count` lit voices: audible from the first tap of Listen, full with all five. */
export function chordGain(count: number): number {
  const share = Math.min(VOICE_COUNT, Math.max(0, count)) / VOICE_COUNT;
  return 0.2 + 0.8 * share ** 1.3;
}

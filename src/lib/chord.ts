// The home page's signature move, as pure state: one press plays Carol of the
// Bells and each singer lights the moment their voice enters (jivancevic/voxford-web#32).
// The cue table below is the only place the entry times live; src/scripts/home-stage.ts
// reads the clock from the audio element and asks chordView() what to show.
// docs/home/BRIEF.md says why the chord works this way.

import type { MemberKey } from '@/data/site-facts';

/** Length of the clip in seconds: "Carol new mix.wav", 3.0 → 41.07 s (src/assets/audio/carol-chord.*). */
export const CLIP_SECONDS = 38.07;

/**
 * When each voice enters, in seconds from the start of the clip (not of the
 * original WAV), keyed by member. Stage order is the render order; entry order
 * is the arrangement's: Dora from the start, then Vita, David, Josip, Ante, and
 * every voice sings on to the end.
 *
 * Josip, 2026-11-10 (#32): "početak Dora, 00:07:25 Vita, 00:11:80 David,
 * 00:16:10 Josip, 00:20:50 Ante", read as seconds.hundredths in the WAV. The clip
 * starts 3.0 s into the WAV, so each is 3.0 s earlier here. The clip's own
 * loudness agrees: at each of these times it rises (+4 to +7 dB, 1 s after
 * against 1 s before, below 120 Hz or in 180–500 Hz), while at the clip-time
 * reading it stays flat or falls. To be confirmed by ear (PR #34).
 */
export const VOICE_ENTRIES: Readonly<Record<MemberKey, number>> = {
  josip: 13.1,
  dora: 0,
  ante: 17.5,
  vita: 4.25,
  david: 8.8,
};

/** Entry times for the voices as rendered; a key the table does not know never enters. */
export function voiceEntries(keys: readonly string[]): number[] {
  const table: Readonly<Record<string, number>> = VOICE_ENTRIES;
  return keys.map((key) => table[key] ?? Number.POSITIVE_INFINITY);
}

/** Which voices have entered by `time` seconds into the clip. */
export function litAt(time: number, cues: readonly number[]): boolean[] {
  return cues.map((cue) => !Number.isNaN(time) && time >= cue);
}

/** Index of the voice that entered most recently by `time`, -1 before the first; a tie goes to the voice further right. */
export function lastEntered(time: number, cues: readonly number[]): number {
  let last = -1;
  cues.forEach((cue, i) => {
    if (time >= cue && (last < 0 || cue >= cues[last]!)) last = i;
  });
  return last;
}

/**
 * Where the music is: before the first press, playing, paused (by the button or
 * by leaving the viewport), finished, or refused by the browser.
 */
export type ChordState = 'idle' | 'playing' | 'paused' | 'ended' | 'blocked';

/** What the play button does next. */
export type ChordAction = 'play' | 'pause' | 'resume' | 'replay';

export interface ChordView {
  lit: boolean[];
  /** All voices lit: the line is complete and the resolve line is up. */
  full: boolean;
  /** The voice to name in the caption, -1 for none. */
  last: number;
  action: ChordAction;
}

const ACTIONS: Record<ChordState, ChordAction> = {
  idle: 'play',
  playing: 'pause',
  paused: 'resume',
  ended: 'replay',
  blocked: 'play',
};

/**
 * What the act shows. Voices follow the audio clock only while there is music
 * to follow and motion is allowed; before the first press they are dim, and
 * at the end, with the audio blocked or under reduced motion, all are lit.
 */
export function chordView({ state, time, motion, cues }: { state: ChordState; time: number; motion: boolean; cues: readonly number[] }): ChordView {
  const following = motion && (state === 'playing' || state === 'paused');
  const allLit = !motion || state === 'ended' || state === 'blocked';
  const lit = following ? litAt(time, cues) : cues.map(() => allLit);
  const last = following ? lastEntered(time, cues) : allLit ? lastEntered(Number.POSITIVE_INFINITY, cues) : -1;
  return { lit, full: lit.length > 0 && lit.every(Boolean), last, action: ACTIONS[state] };
}

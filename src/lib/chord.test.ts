import { describe, expect, it } from 'vitest';
import { MEMBERS } from '@/data/site-facts';
import { CLIP_SECONDS, chordView, lastEntered, litAt, VOICE_ENTRIES, voiceEntries } from './chord';

const keys = MEMBERS.map((m) => m.key);

describe('VOICE_ENTRIES', () => {
  it('has an entry time for every member, and nothing else', () => {
    expect(Object.keys(VOICE_ENTRIES).sort()).toEqual([...keys].sort());
  });

  it('puts every entry inside the clip, so the chord is complete before the music ends', () => {
    for (const key of keys) {
      expect(VOICE_ENTRIES[key]).toBeGreaterThanOrEqual(0);
      expect(VOICE_ENTRIES[key]).toBeLessThan(CLIP_SECONDS);
    }
  });

  it('brings the voices in as the arrangement does: Dora first, then Vita, David, Josip, Ante (Josip, #32)', () => {
    const order = [...keys].sort((a, b) => VOICE_ENTRIES[a] - VOICE_ENTRIES[b]);
    expect(order).toEqual(['dora', 'vita', 'david', 'josip', 'ante']);
    expect(VOICE_ENTRIES.dora).toBe(0);
  });

  it('matches the length of the Carol span (3.0 → 41.07 s of "Carol new mix.wav")', () => {
    expect(CLIP_SECONDS).toBeCloseTo(41.07 - 3.0, 2);
  });
});

describe('voiceEntries', () => {
  it('reads the cue table in the order the voices are rendered (stage order)', () => {
    expect(voiceEntries(keys)).toEqual(keys.map((k) => VOICE_ENTRIES[k]));
  });

  it('gives a voice the table does not know no entry, so it waits for the end of the clip', () => {
    expect(voiceEntries(['josip', 'nobody'])).toEqual([VOICE_ENTRIES.josip, Number.POSITIVE_INFINITY]);
  });
});

describe('litAt', () => {
  const cues = [4, 0.5, 12, 8, 2];

  it('lights nothing before the first entry', () => {
    expect(litAt(0, cues)).toEqual([false, false, false, false, false]);
  });

  it('lights a voice the moment its entry time is reached, in any order', () => {
    expect(litAt(0.5, cues)).toEqual([false, true, false, false, false]);
    expect(litAt(2, cues)).toEqual([false, true, false, false, true]);
    expect(litAt(4.01, cues)).toEqual([true, true, false, false, true]);
  });

  it('holds every voice once all have entered', () => {
    expect(litAt(12, cues)).toEqual([true, true, true, true, true]);
    expect(litAt(99, cues)).toEqual([true, true, true, true, true]);
  });

  it('lights nothing for a time it cannot read', () => {
    expect(litAt(Number.NaN, cues)).toEqual([false, false, false, false, false]);
  });
});

describe('lastEntered', () => {
  it('is the voice that came in most recently', () => {
    expect(lastEntered(5, [4, 0.5, 12, 8, 2])).toBe(0);
    expect(lastEntered(10, [4, 0.5, 12, 8, 2])).toBe(3);
  });

  it('is -1 before anyone has entered', () => {
    expect(lastEntered(0.1, [4, 0.5])).toBe(-1);
  });

  it('picks the voice further right when two enter together', () => {
    expect(lastEntered(3, [1, 1])).toBe(1);
  });
});

describe('chordView', () => {
  const cues = [0.5, 3, 6, 9, 12];
  const all = [true, true, true, true, true];

  it('shows all five dim before the first press', () => {
    const v = chordView({ state: 'idle', time: 0, motion: true, cues });
    expect(v.lit).toEqual([false, false, false, false, false]);
    expect(v.full).toBe(false);
    expect(v.action).toBe('play');
  });

  it('lights the voices that have entered while playing, and offers pause', () => {
    const v = chordView({ state: 'playing', time: 3.2, motion: true, cues });
    expect(v.lit).toEqual([true, true, false, false, false]);
    expect(v.last).toBe(1);
    expect(v.action).toBe('pause');
  });

  it('holds the chord where it was on pause, and offers resume', () => {
    const v = chordView({ state: 'paused', time: 6.5, motion: true, cues });
    expect(v.lit).toEqual([true, true, true, false, false]);
    expect(v.action).toBe('resume');
  });

  it('ends on the full chord and offers to play again', () => {
    const v = chordView({ state: 'ended', time: 38, motion: true, cues });
    expect(v.lit).toEqual(all);
    expect(v.full).toBe(true);
    expect(v.action).toBe('replay');
  });

  it('is complete as soon as the last voice enters, before the music ends', () => {
    expect(chordView({ state: 'playing', time: 12, motion: true, cues }).full).toBe(true);
  });

  it('shows the full chord when the audio is blocked, so nothing is left dark', () => {
    const v = chordView({ state: 'blocked', time: 0, motion: true, cues });
    expect(v.lit).toEqual(all);
    expect(v.full).toBe(true);
    expect(v.action).toBe('play');
  });

  it('shows the full chord under reduced motion, whatever the music is doing', () => {
    for (const state of ['idle', 'playing', 'paused'] as const) {
      const v = chordView({ state, time: 1, motion: false, cues });
      expect(v.lit).toEqual(all);
      expect(v.full).toBe(true);
    }
    expect(chordView({ state: 'playing', time: 1, motion: false, cues }).action).toBe('pause');
  });
});

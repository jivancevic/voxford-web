import { describe, expect, it } from 'vitest';
import { chordGain, litVoices, VOICE_COUNT, voicesLitAt } from './chord';

describe('voicesLitAt', () => {
  it('lights nothing before the first cue', () => {
    expect(voicesLitAt(0)).toBe(0);
    expect(voicesLitAt(0.05)).toBe(0);
  });

  it('lights one more voice at each cue, in stage order', () => {
    const counts = [0.1, 0.24, 0.38, 0.52, 0.66].map((p) => voicesLitAt(p));
    expect(counts).toEqual([1, 2, 3, 4, 5]);
  });

  it('holds the full chord to the end of the act', () => {
    expect(voicesLitAt(0.9)).toBe(VOICE_COUNT);
    expect(voicesLitAt(1)).toBe(VOICE_COUNT);
  });

  it('clamps progress outside 0..1', () => {
    expect(voicesLitAt(-3)).toBe(0);
    expect(voicesLitAt(7)).toBe(VOICE_COUNT);
    expect(voicesLitAt(Number.NaN)).toBe(0);
  });
});

describe('litVoices', () => {
  it('follows the scroll when nobody tapped', () => {
    expect(litVoices(2, [])).toEqual([true, true, false, false, false]);
  });

  it('lets a tap light a voice the scroll has not reached', () => {
    expect(litVoices(1, [undefined, undefined, undefined, true])).toEqual([true, false, false, true, false]);
  });

  it('lets a tap put out a voice the scroll lit', () => {
    expect(litVoices(5, [false])).toEqual([false, true, true, true, true]);
  });
});

describe('chordGain', () => {
  it('is quiet but audible with no voice lit, so Listen always answers', () => {
    expect(chordGain(0)).toBeGreaterThan(0);
    expect(chordGain(0)).toBeLessThan(0.3);
  });

  it('swells with every voice and is full with five', () => {
    const gains = [0, 1, 2, 3, 4, 5].map(chordGain);
    for (let i = 1; i < gains.length; i++) expect(gains[i]).toBeGreaterThan(gains[i - 1]!);
    expect(chordGain(5)).toBe(1);
  });

  it('clamps counts outside 0..5', () => {
    expect(chordGain(9)).toBe(1);
    expect(chordGain(-2)).toBe(chordGain(0));
  });
});

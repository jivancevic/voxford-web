import { describe, expect, it } from 'vitest';
import { chordGain, litVoices, voiceCues, voicesLitAt } from './chord';

describe('voiceCues', () => {
  it('spaces five voices from 0.1 to 0.66, leaving the rest of the act for the full chord', () => {
    expect(voiceCues(5).map((c) => Number(c.toFixed(2)))).toEqual([0.1, 0.24, 0.38, 0.52, 0.66]);
  });

  it('follows the number of members, so a sixth voice gets its own cue', () => {
    const cues = voiceCues(6);
    expect(cues).toHaveLength(6);
    expect(cues[0]).toBeCloseTo(0.1);
    expect(cues[5]).toBeCloseTo(0.66);
  });

  it('gives a single voice the first cue', () => {
    expect(voiceCues(1)).toEqual([0.1]);
  });
});

describe('voicesLitAt', () => {
  it('lights nothing before the first cue', () => {
    expect(voicesLitAt(0, 5)).toBe(0);
    expect(voicesLitAt(0.05, 5)).toBe(0);
  });

  it('lights one more voice at each cue, in stage order', () => {
    const counts = [0.1, 0.24, 0.38, 0.52, 0.66].map((p) => voicesLitAt(p, 5));
    expect(counts).toEqual([1, 2, 3, 4, 5]);
  });

  it('holds the full chord to the end of the act', () => {
    expect(voicesLitAt(0.9, 5)).toBe(5);
    expect(voicesLitAt(1, 5)).toBe(5);
  });

  it('clamps progress outside 0..1', () => {
    expect(voicesLitAt(-3, 5)).toBe(0);
    expect(voicesLitAt(7, 5)).toBe(5);
    expect(voicesLitAt(Number.NaN, 5)).toBe(0);
  });

  it('lights every member when there are more than five', () => {
    expect(voicesLitAt(1, 6)).toBe(6);
  });
});

describe('litVoices', () => {
  it('follows the scroll when nobody tapped', () => {
    expect(litVoices(2, [], 5)).toEqual([true, true, false, false, false]);
  });

  it('lets a tap light a voice the scroll has not reached', () => {
    expect(litVoices(1, [undefined, undefined, undefined, true], 5)).toEqual([true, false, false, true, false]);
  });

  it('lets a tap put out a voice the scroll lit', () => {
    expect(litVoices(5, [false], 5)).toEqual([false, true, true, true, true]);
  });
});

describe('chordGain', () => {
  it('is quiet but audible with no voice lit, so Listen always answers', () => {
    expect(chordGain(0, 5)).toBeGreaterThan(0);
    expect(chordGain(0, 5)).toBeLessThan(0.3);
  });

  it('swells with every voice and is full with all of them', () => {
    const gains = [0, 1, 2, 3, 4, 5].map((n) => chordGain(n, 5));
    for (let i = 1; i < gains.length; i++) expect(gains[i]).toBeGreaterThan(gains[i - 1]!);
    expect(chordGain(5, 5)).toBe(1);
    expect(chordGain(6, 6)).toBe(1);
  });

  it('clamps counts outside 0..total', () => {
    expect(chordGain(9, 5)).toBe(1);
    expect(chordGain(-2, 5)).toBe(chordGain(0, 5));
  });
});

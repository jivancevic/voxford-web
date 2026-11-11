import { describe, expect, it } from 'vitest';
import { getStrings } from '@/i18n';
import { captionPath, captionVtt } from './captions';

describe('captions', () => {
  it('is a valid one-cue WebVTT file', () => {
    expect(captionVtt('[A cappella]')).toBe('WEBVTT\n\n00:00:00.000 --> 01:00:00.000\n[A cappella]\n');
  });

  it('escapes the characters WebVTT cue text reserves', () => {
    expect(captionVtt('Rock & <roll>')).toContain('\nRock &amp; &lt;roll>\n');
  });

  it('carries Josip\'s line (#84, option b) in both languages, on a path per language', () => {
    expect(getStrings('en').videos.watch.captionLine).toBe('[A cappella performance, five voices, no instruments]');
    expect(getStrings('hr').videos.watch.captionLine).toBe('[A cappella izvedba, pet glasova, bez instrumenata]');
    expect(captionPath('en')).toBe('/captions/en.vtt');
    expect(captionPath('hr')).toBe('/captions/hr.vtt');
  });
});

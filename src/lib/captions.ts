// The caption track every curated top video carries (#84, Josip chose a single
// line): the videos are sung a cappella with no spoken words or lyrics on
// screen, so one cue for the whole clip tells a viewer who cannot hear it what
// the sound is. Served as WebVTT by src/pages/captions/[lang].vtt.ts and
// attached to the watch page's player and the home's inline player.
import type { Locale } from '@/i18n';

export function captionPath(lang: Locale): string {
  return `/captions/${lang}.vtt`;
}

/** One cue from the start to past the end of any clip (the longest is under a minute). */
export function captionVtt(line: string): string {
  return `WEBVTT\n\n00:00:00.000 --> 01:00:00.000\n${line}\n`;
}

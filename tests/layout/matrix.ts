// What the layout sweep visits (issue #102): every page in both languages, a
// watch page and the 404, at the viewports that bit us in review.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES } from '../../src/i18n/locales';
import { PAGE_KEYS, pathFor, videoPathFor } from '../../src/i18n/routes';
import type { StageSpec } from './probe';

export interface Viewport {
  width: number;
  height: number;
  /** Touch screen: pointer coarse, and the 44px tap rule applies. */
  touch: boolean;
  /** Phone: mobile viewport meta and a touch screen. */
  mobile: boolean;
}

export interface Case {
  name: string;
  viewport: Viewport;
  reducedMotion: 'reduce' | 'no-preference';
  /** Force the pinned stages' --stage-h (AGENTS.md: test a pinned stage by forcing it small). */
  stageH?: string;
  /** Only these routes (the forced stage is a home case). */
  only?: string[];
}

export interface Route {
  name: string;
  path: string;
  status: number;
}

const phone = (width: number, height: number): Viewport => ({ width, height, touch: true, mobile: true });

export const VIEWPORTS: Viewport[] = [
  phone(360, 780),
  phone(390, 844),
  phone(430, 932),
  // Small phones on their side (#79) and a big one (#69).
  phone(667, 375),
  phone(740, 360),
  phone(844, 390),
  { width: 768, height: 1024, touch: true, mobile: false },
  { width: 1024, height: 768, touch: true, mobile: false },
  { width: 1440, height: 900, touch: false, mobile: false },
];

const size = (v: Viewport) => `${v.width}x${v.height}`;
const viewportOf = (w: number, h: number) => VIEWPORTS.find((v) => v.width === w && v.height === h)!;

/** The watch page: the first video built in both languages. */
function watchSlug(dist: string): string {
  const slugs = (lang: string, dir: string) =>
    readdirSync(join(dist, lang, dir), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  const hr = new Set(slugs('hr', pathFor('videos', 'hr').split('/')[2]!));
  const slug = slugs('en', pathFor('videos', 'en').split('/')[2]!).find((s) => hr.has(s));
  if (!slug) throw new Error('no watch page built in both languages');
  return slug;
}

export function routes(dist: string): Route[] {
  const list: Route[] = [];
  const watch = watchSlug(dist);
  for (const lang of LOCALES) {
    for (const page of PAGE_KEYS) list.push({ name: `${lang}-${page}`, path: pathFor(page, lang), status: 200 });
    list.push({ name: `${lang}-watch`, path: videoPathFor(watch, lang), status: 200 });
    list.push({ name: `${lang}-404`, path: `/${lang}/no-such-page/`, status: 404 });
  }
  return list;
}

export const CASES: Case[] = [
  ...VIEWPORTS.map((viewport): Case => ({ name: `${size(viewport)}-reduce`, viewport, reducedMotion: 'reduce' })),
  ...[viewportOf(390, 844), viewportOf(1440, 900)].flatMap((viewport): Case[] => [
    { name: `${size(viewport)}-motion`, viewport, reducedMotion: 'no-preference' },
    ...(['reduce', 'no-preference'] as const).map(
      (reducedMotion): Case => ({
        name: `${size(viewport)}-${reducedMotion === 'reduce' ? 'reduce' : 'motion'}-stage358`,
        viewport,
        reducedMotion,
        stageH: '358px',
        only: ['en-home', 'hr-home'],
      }),
    ),
  ]),
];

/** The pinned acts on the home page (HomeView.astro). */
export const STAGES: StageSpec[] = [
  { act: '.hero', stage: '.hero__stage', parts: ['.hero__title', '.hero__lead', '.hero__availability'] },
  // The five portraits light up with the music: all of them in view at once,
  // also where the act does not pin (a phone on its side keeps one row, #79).
  { act: '.chord', stage: '.chord__stage', parts: ['.chord__head', '.chord__voices', '.chord__foot'], fit: ['.chord__voices'] },
];

/** Scroll positions through a pin, as a share of its travel. */
export const PIN_POSITIONS = [0, 0.25, 0.5, 0.75];

/**
 * Real failures on main that are declared, each with its issue: the sweep
 * prints them but does not fail on them. Remove the entry with the fix.
 */
export interface KnownFailure {
  route: string;
  case: string;
  rule: string;
  /** A substring of the failing element's tag.class path. */
  el: string;
  issue: number;
}

export const KNOWN: KnownFailure[] = [];

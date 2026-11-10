// UI strings, one JSON file per namespace and language. Each namespace has one
// owning ticket (CONTEXT.md › Seams), so parallel branches never edit the same
// file. EN is canonical: the `Strings` type is inferred from it, and assigning
// the HR tree to that type makes a key missing in HR a type error. The parity
// test (parity.test.ts) also catches empty strings and shape drift.

import type { Locale } from './locales';

import enCommon from './en/common.json';
import enContent from './en/content.json';
import enHome from './en/home.json';
import enInquiry from './en/inquiry.json';
import enVideos from './en/videos.json';
import hrCommon from './hr/common.json';
import hrContent from './hr/content.json';
import hrHome from './hr/home.json';
import hrInquiry from './hr/inquiry.json';
import hrVideos from './hr/videos.json';

const en = {
  common: enCommon, // ticket A: shell, nav, footer, 404
  home: enHome, // ticket B
  content: enContent, // ticket C
  inquiry: enInquiry, // ticket D
  videos: enVideos, // ticket E: videos, reels, references
};

export type Strings = typeof en;
export type Namespace = keyof Strings;

const hr: Strings = {
  common: hrCommon,
  home: hrHome,
  content: hrContent,
  inquiry: hrInquiry,
  videos: hrVideos,
};

const STRINGS: Record<Locale, Strings> = { en, hr };

/** All UI strings for one language: `const t = getStrings(lang); t.common.cta.inquiry`. */
export function getStrings(lang: Locale): Strings {
  return STRINGS[lang];
}

/** Fill `{name}` placeholders: `format(t.common.meta.titleTemplate, { title })`. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** A value that is the same in every language, or one per language: the one for `lang`. */
export function inLang(value: string | Readonly<Record<Locale, string>>, lang: Locale): string {
  return typeof value === 'string' ? value : value[lang];
}

export { LOCALES, DEFAULT_LOCALE, isLocale, LOCALE_META, type Locale } from './locales';

// The two site languages. EN is canonical (written first, x-default); HR is a
// full native parallel. Pure TS with no Astro imports, so the Worker can use it.

export const LOCALES = ['en', 'hr'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** BCP 47 tags for `<html lang>`, hreflang and `og:locale`. */
export const LOCALE_META: Record<Locale, { htmlLang: string; ogLocale: string; label: string; short: string }> = {
  en: { htmlLang: 'en', ogLocale: 'en_US', label: 'English', short: 'EN' },
  hr: { htmlLang: 'hr', ogLocale: 'hr_HR', label: 'Hrvatski', short: 'HR' },
};

// Facts inside copy (ticket C). Page copy and FAQ answers are written in
// Markdown and JSON, but every number, the manager and the bookings email come
// from site-facts: copy writes `{followers}` or `{goldMax}` and fillFacts()
// puts the current value in at build time. An unknown token throws, so a typo
// fails the build instead of shipping "{folowers}" to visitors.

import { GROUP, NUMBERS, PACKAGES, RIDER, type Package } from '@/data/site-facts';
import { format, getStrings } from '@/i18n';
import type { Locale } from '@/i18n/locales';

/** Package key to token prefix: 'pop-up' → 'popUp', so copy writes {popUpMax}. */
const tokenKey = (key: string) => key.replace(/-(\w)/g, (_m, c: string) => c.toUpperCase());

/** Every token copy may use, with its value in one language. */
export function factTokens(lang: Locale): Record<string, string> {
  const tokens: Record<string, string> = {
    group: GROUP.name,
    handle: GROUP.handle,
    disambiguation: GROUP.disambiguation[lang],
    foundingYear: String(GROUP.foundingYear),
    city: GROUP.city,
    email: GROUP.email,
    managerName: GROUP.manager.name,
    managerCompany: GROUP.manager.company,
    followers: NUMBERS.followers.display,
    views: NUMBERS.views.display,
    carolViews: NUMBERS.carolViews.display,
  };
  for (const p of PACKAGES) {
    const k = tokenKey(p.key);
    tokens[`${k}Name`] = p.name;
    tokens[`${k}Max`] = String(p.minutes.max);
    if (p.minutes.min !== undefined) tokens[`${k}Min`] = String(p.minutes.min);
    tokens[`${k}Lineup`] = p.lineup[lang];
  }
  // Rider: {paReadyHours}, {classicSoundcheck}, {goldMixerChannels}, {classicMonitors}, {parkingSpaces} …
  tokens.paReadyHours = String(RIDER.paReadyHoursBefore);
  tokens.parkingSpaces = String(RIDER.parkingSpaces);
  const perPackage = [
    ['Soundcheck', RIDER.soundcheckMinutes],
    ['MixerChannels', RIDER.mixerChannels],
    ['Monitors', RIDER.floorMonitors],
  ] as const;
  for (const [suffix, values] of perPackage) {
    for (const [key, value] of Object.entries(values)) tokens[`${tokenKey(key)}${suffix}`] = String(value);
  }
  return tokens;
}

const TOKEN = /\{(\w+)\}/g;

/** Replace `{token}` with its site-facts value; throws on an unknown token. */
export function fillFacts(text: string, lang: Locale): string {
  const tokens = factTokens(lang);
  return text.replace(TOKEN, (_match, key: string) => {
    const value = tokens[key];
    if (value === undefined) throw new Error(`Unknown fact token {${key}} in copy (src/lib/copy.ts › factTokens)`);
    return value;
  });
}

/** A package's length in words, e.g. "up to 15 min" / "45 to 60 min" (strings: content.packages.duration). */
export function packageDuration(pkg: Package, lang: Locale): string {
  const { min, max } = pkg.minutes;
  const d = getStrings(lang).content.packages.duration;
  return min === undefined ? format(d.upTo, { max }) : format(d.range, { min, max });
}

/**
 * fillFacts for HTML rendered from Markdown: a token inside a link target
 * (`[{email}](mailto:{email})`) comes out of the Markdown renderer
 * percent-encoded, so decode `%7Btoken%7D` back to `{token}` first.
 */
export function fillFactsHtml(html: string, lang: Locale): string {
  return fillFacts(html.replace(/%7B(\w+)%7D/g, '{$1}'), lang);
}

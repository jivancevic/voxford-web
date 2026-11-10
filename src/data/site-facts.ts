// site-facts: every fact about Voxford the site states, in one typed file.
// Copy, JSON-LD and llms.txt read from here; nothing else hard-codes a number,
// a profile URL or a member name. Source of truth is the private KB at
// ~/projects/business/voxford (path noted per block); a fact change there is a
// follow-up PR here. Never add prices, OIB, IBAN, contracts, phone numbers or
// private clients: this repo is public.

import type { Locale } from '@/i18n/locales';

type Localized = Record<Locale, string>;

/** When the numbers below were last checked against the KB (YYYY-MM-DD). */
export const FACTS_CHECKED_ON = '2026-11-10';

export const GROUP = {
  name: 'Voxford',
  handle: '@voxford.official',
  /** Entity disambiguation (vOx Chamber Choir Oxford exists): use in copy and JSON-LD. */
  disambiguation: {
    en: 'Voxford, a cappella group from Zagreb, Croatia',
    hr: 'Voxford, a cappella skupina iz Zagreba',
  } satisfies Localized,
  /** KB CONTEXT.md › Voxford; brand/biografija.md */
  foundingYear: 2021,
  city: 'Zagreb',
  country: 'Croatia',
  countryCode: 'HR',
  /** KB CONTEXT.md: Voxford borrows the klapa sound but is not a klapa, so no "Klapa" genre. */
  genres: ['A cappella'],
  /** KB CONTEXT.md, spec › Audience: every inquiry goes here. */
  email: 'voxford.official@gmail.com',
  /** KB ljudi-i-procesi/ekipa.md. No phone on the site (spec: needs consent). */
  manager: { name: 'Jelena Đukanović', company: 'WAM Management' },
} as const;

/**
 * Canonical social-proof numbers (KB ljudi-i-procesi/drustvene-mreze.md, Josip
 * 2026-11-10). `display` is what copy shows; `value` is the floor it rounds.
 */
export const NUMBERS = {
  followers: { value: 800_000, display: '800K+', label: { en: 'followers across networks', hr: 'pratitelja na mrežama' } },
  views: { value: 300_000_000, display: '300M+', label: { en: 'views', hr: 'pregleda' } },
  carolViews: {
    value: 86_000_000,
    display: '86M+',
    label: { en: 'views of Carol of the Bells', hr: 'pregleda za Carol of the Bells' },
  },
} as const satisfies Record<string, { value: number; display: string; label: Localized }>;

/** Official profiles, all @voxford.official (KB brand/u-medijima.md). JSON-LD sameAs. */
export const PROFILES = {
  instagram: 'https://www.instagram.com/voxford.official/',
  tiktok: 'https://www.tiktok.com/@voxford.official',
  facebook: 'https://www.facebook.com/voxford.official/',
  youtube: 'https://www.youtube.com/@voxford.official',
  spotify: 'https://open.spotify.com/artist/0Dt77VATBKwGUPu15Ee858',
} as const;

export type ProfileKey = keyof typeof PROFILES;

export const PROFILE_LABELS: Record<ProfileKey, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  spotify: 'Spotify',
};

/** The most-watched video (KB brand/biografija.md). */
export const SIGNATURE_VIDEO = {
  title: 'Carol of the Bells',
  url: 'https://www.instagram.com/p/C0lvoOFM_F2/',
} as const;

export type MemberKey = 'josip' | 'dora' | 'ante' | 'vita' | 'david';

export interface Member {
  key: MemberKey;
  name: string;
  givenName: string;
  voice: Localized;
}

/** The five, in stage order from the audience, left to right (KB ljudi-i-procesi/ekipa.md). */
export const MEMBERS: readonly Member[] = [
  { key: 'josip', name: 'Josip Ivančević', givenName: 'Josip', voice: { en: 'baritone, beatbox', hr: 'bariton, beatbox' } },
  { key: 'dora', name: 'Dora Ćutić', givenName: 'Dora', voice: { en: 'soprano', hr: 'sopran' } },
  { key: 'ante', name: 'Ante Nobilo', givenName: 'Ante', voice: { en: 'bass', hr: 'bas' } },
  { key: 'vita', name: 'Vita Jozić', givenName: 'Vita', voice: { en: 'mezzo-soprano', hr: 'mezzosopran' } },
  { key: 'david', name: 'David Ropac', givenName: 'David', voice: { en: 'tenor', hr: 'tenor' } },
];

export type PackageKey = 'pop-up' | 'classic' | 'gold';

export interface Package {
  key: PackageKey;
  /** Written in capitals, English, in both languages (KB CONTEXT.md › Paket). */
  name: string;
  minutes: { min?: number; max: number };
  lineup: Localized;
  summary: Localized;
}

/** The three packages. No prices on the site, ever (spec › Decisions). */
export const PACKAGES: readonly Package[] = [
  {
    key: 'pop-up',
    name: 'POP-UP',
    minutes: { max: 15 },
    lineup: { en: 'the five singers', hr: 'petorka' },
    summary: { en: 'A ceremonial moment of up to 15 minutes.', hr: 'Ceremonijalni nastup do 15 minuta.' },
  },
  {
    key: 'classic',
    name: 'CLASSIC',
    minutes: { min: 45, max: 60 },
    lineup: { en: 'the five singers', hr: 'petorka' },
    summary: { en: 'A 45–60 minute a cappella concert.', hr: 'A cappella koncert od 45 do 60 minuta.' },
  },
  {
    key: 'gold',
    name: 'GOLD',
    minutes: { min: 90, max: 120 },
    lineup: { en: 'the five singers with piano and cajón', hr: 'petorka uz klavir i cajon' },
    summary: {
      en: 'A 90–120 minute show with piano and cajón.',
      hr: 'Nastup od 90 do 120 minuta uz klavir i cajon.',
    },
  },
];

/** Pricing line used instead of prices (spec › Decisions). */
export const PRICE_ON_REQUEST: Localized = {
  en: 'Price on request; it depends on the date and location. Travel costs are separate.',
  hr: 'Cijena na upit, ovisi o datumu i mjestu. Putni troškovi su zasebni.',
};

/**
 * What an event planner's sound engineer and venue need (KB posao/rideri/rideri.md
 * › Technical rider: spec; parking from › Hospitality rider: spec). The FAQ
 * states these through {tokens} (src/lib/copy.ts › factTokens).
 */
export const RIDER = {
  /** The PA is ready at least this many hours before the performance. */
  paReadyHoursBefore: 2,
  /** Soundcheck length per package, finished before the audience arrives. */
  soundcheckMinutes: { 'pop-up': 20, classic: 30, gold: 45 },
  /** Minimum digital mixer channels when the organiser's engineer mixes. */
  mixerChannels: { classic: 8, gold: 12 },
  /** Floor monitors, each on its own line (POP-UP: two preferred, depends on the event). */
  floorMonitors: { classic: 2, gold: 3 },
  /** Parking spaces close to the stage. */
  parkingSpaces: 2,
} as const satisfies {
  paReadyHoursBefore: number;
  soundcheckMinutes: Record<PackageKey, number>;
  mixerChannels: Partial<Record<PackageKey, number>>;
  floorMonitors: Partial<Record<PackageKey, number>>;
  parkingSpaces: number;
};

/** Notable stages (KB brand/biografija.md; Lisinski per spec › Information architecture). */
export const STAGES = [
  { name: 'Kursalon Hübner', city: { en: 'Vienna', hr: 'Beč' } },
  { name: 'Križanke', city: { en: 'Ljubljana', hr: 'Ljubljana' } },
  { name: 'Arena Zagreb', city: { en: 'Zagreb', hr: 'Zagreb' } },
  { name: 'Tvornica kulture', city: { en: 'Zagreb', hr: 'Zagreb' } },
  { name: 'Lisinski', city: { en: 'Zagreb', hr: 'Zagreb' } },
] as const;

/** Where they perform: Croatia and the region (spec: no doorway pages, covered by areaServed). */
export const AREA_SERVED = ['Croatia', 'Slovenia', 'Austria'] as const;

export type EventType = 'conference' | 'wedding' | 'advent' | 'concert' | 'private' | 'other';
export const EVENT_TYPES: readonly EventType[] = ['conference', 'wedding', 'advent', 'concert', 'private', 'other'];
export const PACKAGE_KEYS: readonly PackageKey[] = PACKAGES.map((p) => p.key);

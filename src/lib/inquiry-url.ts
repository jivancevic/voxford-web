// The inquiry prefill contract (docs/spec.md › Audience, action, language):
//   /{lang}/inquiry/?type=conference|wedding|advent|concert|private|other
//                   &date=YYYY-MM-DD&city=<text>&package=pop-up|classic|gold
// Pages build links with inquiryUrl(); the form (ticket D) reads them back with
// parseInquiryPrefill(). Both sides go through this file, so they cannot drift.

import { EVENT_TYPES, PACKAGE_KEYS, type EventType, type PackageKey } from '@/data/site-facts';
import type { Locale } from '@/i18n/locales';
import { pathFor } from '@/i18n/routes';

export interface InquiryPrefill {
  type?: EventType;
  /** ISO date, YYYY-MM-DD. */
  date?: string;
  city?: string;
  package?: PackageKey;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CITY_LENGTH = 80;

const isEventType = (v: string): v is EventType => (EVENT_TYPES as readonly string[]).includes(v);
const isPackageKey = (v: string): v is PackageKey => (PACKAGE_KEYS as readonly string[]).includes(v);

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Root-relative inquiry URL with only the valid prefill fields, in contract order. */
export function inquiryUrl(lang: Locale, prefill: InquiryPrefill = {}): string {
  const params = new URLSearchParams();
  if (prefill.type && isEventType(prefill.type)) params.set('type', prefill.type);
  if (prefill.date && isValidIsoDate(prefill.date)) params.set('date', prefill.date);
  const city = prefill.city?.trim().slice(0, MAX_CITY_LENGTH);
  if (city) params.set('city', city);
  if (prefill.package && isPackageKey(prefill.package)) params.set('package', prefill.package);
  const query = params.toString();
  return query ? `${pathFor('inquiry', lang)}?${query}` : pathFor('inquiry', lang);
}

/** Read a prefill back from a URL's search params, dropping anything off-contract. */
export function parseInquiryPrefill(search: URLSearchParams | string): InquiryPrefill {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const out: InquiryPrefill = {};
  const type = params.get('type');
  if (type && isEventType(type)) out.type = type;
  const date = params.get('date');
  if (date && isValidIsoDate(date)) out.date = date;
  const city = params.get('city')?.trim().slice(0, MAX_CITY_LENGTH);
  if (city) out.city = city;
  const pkg = params.get('package');
  if (pkg && isPackageKey(pkg)) out.package = pkg;
  return out;
}

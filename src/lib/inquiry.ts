// The inquiry form's fields and rules, shared by the page (client-side checks
// before sending) and the Worker (the checks that count). No UI strings here:
// errors are codes, and the page shows the message for each field from the
// `inquiry` namespace. Keep this file free of i18n imports so the client
// bundle stays small. The mail itself is composed in ./inquiry-mail.ts.

import { EVENT_TYPES, PACKAGE_KEYS, type EventType, type PackageKey } from '@/data/site-facts';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locales';

export const GUEST_RANGES = ['under-50', '50-150', '150-400', 'over-400', 'unsure'] as const;
export type GuestRange = (typeof GUEST_RANGES)[number];

/** Form field names as posted. `website` is the honeypot; people never see it. */
export const FIELD = {
  lang: 'lang',
  type: 'type',
  date: 'date',
  flexible: 'flexible',
  city: 'city',
  guests: 'guests',
  package: 'package',
  name: 'name',
  email: 'email',
  phone: 'phone',
  message: 'message',
  honeypot: 'website',
  turnstile: 'cf-turnstile-response',
} as const;

/** Longest accepted value per text field (city matches the prefill contract's cap). */
export const LIMITS = { city: 80, name: 100, email: 254, phone: 40, message: 2000 } as const;

export interface Inquiry {
  lang: Locale;
  type: EventType;
  /** ISO date, YYYY-MM-DD; absent only when the date is flexible. */
  date?: string;
  flexible: boolean;
  city: string;
  guests: GuestRange;
  package?: PackageKey;
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

/** Fields that can carry an error, in the order the form shows them. */
export const VALIDATED_FIELDS = ['date', 'city', 'type', 'guests', 'package', 'name', 'email', 'phone', 'message'] as const;
export type InquiryField = (typeof VALIDATED_FIELDS)[number];
export type FieldError = 'required' | 'invalid' | 'too_long' | 'past';
export type FieldErrors = Partial<Record<InquiryField, FieldError>>;

export type InquiryValidation = { ok: true; inquiry: Inquiry } | { ok: false; errors: FieldErrors; partial: Partial<Inquiry> & { lang: Locale } };

/** Anything with FormData's `get`: FormData, URLSearchParams. */
export interface FieldSource {
  get(name: string): unknown;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE = /^\+?[\d\s().\/-]{6,}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** A single-line value: trimmed, control characters (CR, LF, tab…) folded to one space. */
function line(source: FieldSource, name: string): string {
  const raw = source.get(name);
  return typeof raw === 'string' ? raw.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

/** Multi-line text: keeps line breaks, drops other control characters, normalises CRLF. */
function text(source: FieldSource, name: string): string {
  const raw = source.get(name);
  return typeof raw === 'string'
    ? raw
        .replace(/\r\n?/g, '\n')
        .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
        .trim()
    : '';
}

const oneOf = <T extends string>(list: readonly T[], value: string): value is T => (list as readonly string[]).includes(value);

/**
 * Check a submitted form. `today` is the earliest acceptable date (YYYY-MM-DD):
 * the page passes the visitor's local date, the Worker passes yesterday in UTC
 * so a visitor east of Greenwich is never told their today is in the past.
 */
export function validateInquiry(source: FieldSource, today: string): InquiryValidation {
  const errors: FieldErrors = {};
  const langValue = line(source, FIELD.lang);
  const lang: Locale = isLocale(langValue) ? langValue : DEFAULT_LOCALE;

  const type = line(source, FIELD.type);
  if (!type) errors.type = 'required';
  else if (!oneOf(EVENT_TYPES, type)) errors.type = 'invalid';

  const flexible = ['1', 'on', 'true'].includes(line(source, FIELD.flexible));
  const date = line(source, FIELD.date);
  if (!date) {
    if (!flexible) errors.date = 'required';
  } else if (!isValidIsoDate(date)) errors.date = 'invalid';
  else if (date < today) errors.date = 'past';

  const city = line(source, FIELD.city);
  if (!city) errors.city = 'required';
  else if (city.length > LIMITS.city) errors.city = 'too_long';

  const guests = line(source, FIELD.guests);
  if (!guests) errors.guests = 'required';
  else if (!oneOf(GUEST_RANGES, guests)) errors.guests = 'invalid';

  const pkg = line(source, FIELD.package);
  if (pkg && !oneOf(PACKAGE_KEYS, pkg)) errors.package = 'invalid';

  const name = line(source, FIELD.name);
  if (!name) errors.name = 'required';
  else if (name.length > LIMITS.name) errors.name = 'too_long';

  const email = line(source, FIELD.email);
  if (!email) errors.email = 'required';
  else if (email.length > LIMITS.email) errors.email = 'too_long';
  else if (!EMAIL.test(email)) errors.email = 'invalid';

  const phone = line(source, FIELD.phone);
  if (phone.length > LIMITS.phone) errors.phone = 'too_long';
  else if (phone && !PHONE.test(phone)) errors.phone = 'invalid';

  const message = text(source, FIELD.message);
  if (message.length > LIMITS.message) errors.message = 'too_long';

  const partial: Partial<Inquiry> & { lang: Locale } = {
    lang,
    flexible,
    ...(oneOf(EVENT_TYPES, type) && { type }),
    ...(date && { date }),
    ...(city && { city: city.slice(0, LIMITS.city) }),
    ...(oneOf(GUEST_RANGES, guests) && { guests }),
    ...(oneOf(PACKAGE_KEYS, pkg) && { package: pkg }),
    ...(name && { name: name.slice(0, LIMITS.name) }),
    ...(email && { email: email.slice(0, LIMITS.email) }),
    ...(phone && { phone: phone.slice(0, LIMITS.phone) }),
    ...(message && { message: message.slice(0, LIMITS.message) }),
  };

  if (Object.keys(errors).length > 0) return { ok: false, errors, partial };
  return { ok: true, inquiry: partial as Inquiry };
}

/** YYYY-MM-DD of a Date in UTC. */
export function isoDayUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

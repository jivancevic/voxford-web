// "Add to calendar" for a public concert: one iCalendar (RFC 5545) event per
// concert, served as a static .ics file next to the concerts page
// (src/pages/{en,hr}/<concerts slug>/[id].ics.ts, through concerts.ts ›
// icsRoute), plus a map search link.
// A concert with only a date is an all-day event; a timed one gets its start
// in UTC and no end, because no source gives one (never guess).
import { inLang, type Locale } from '@/i18n';
import { LOCALE_META } from '@/i18n/locales';

export interface IcsConcert {
  /** Globally unique and stable: the collection id at the site's host. */
  uid: string;
  name: string;
  /** ISO 8601 date or date-time with an offset, as in the `concerts` collection. */
  startDate: string;
  /** Venue (when known), city, country: the LOCATION line. */
  place: readonly string[];
  description?: string | undefined;
  url?: string | undefined;
}

const CRLF = '\r\n';

/** RFC 5545 TEXT escaping. */
const text = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

/** Fold a content line at 75 octets (RFC 5545 § 3.1), never inside a UTF-8 character. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + n > limit) {
      out.push(cur);
      cur = '';
      size = 0;
    }
    cur += ch;
    size += n;
  }
  out.push(cur);
  return out.join(`${CRLF} `);
}

export function concertIcs(c: IcsConcert, now: Date): string {
  const timed = c.startDate.length > 10;
  const start = timed ? new Date(c.startDate) : new Date(`${c.startDate.slice(0, 10)}T00:00:00Z`);
  const when = timed
    ? [`DTSTART:${utc(start)}`]
    : [`DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(new Date(start.getTime() + 86_400_000))}`];
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Voxford//Upcoming concerts//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${c.uid}`,
    `DTSTAMP:${utc(now)}`,
    ...when,
    `SUMMARY:${text(c.name)}`,
    `LOCATION:${text(c.place.join(', '))}`,
    ...(c.description ? [`DESCRIPTION:${text(c.description)}`] : []),
    ...(c.url ? [`URL:${c.url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join(CRLF) + CRLF;
}

/** A Google Maps search for the place: works on every phone, no API key. */
export function mapUrl(place: readonly string[]): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.join(', '))}`;
}

/** Venue (when known), city and country of a concert, in `lang`. */
export function concertPlace(
  c: { venue?: string | undefined; city: Readonly<Record<Locale, string>>; countryCode: string },
  lang: Locale,
): string[] {
  const country = new Intl.DisplayNames([LOCALE_META[lang].htmlLang], { type: 'region' }).of(c.countryCode);
  return [c.venue, inLang(c.city, lang), country].filter((s): s is string => Boolean(s));
}

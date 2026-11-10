// The inquiry as an email: the same subject and text for the Worker's Email
// Sending transport and for the mailto: fallback, in the visitor's language.
// Every inquiry goes to the group's address (spec › Audience, action, language).
// Imports only the `inquiry` strings (not the whole i18n tree): the page's
// script uses this too, to write the mailto: when the Worker cannot be reached.

import { GROUP, PACKAGES } from '@/data/site-facts';
import { format } from '@/i18n';
import enInquiry from '@/i18n/en/inquiry.json';
import hrInquiry from '@/i18n/hr/inquiry.json';
import type { Inquiry } from './inquiry';

const STRINGS: Record<Inquiry['lang'], typeof enInquiry> = { en: enInquiry, hr: hrInquiry };

/** Where every inquiry goes. */
export const INQUIRY_TO = GROUP.email;

export interface ComposedMail {
  subject: string;
  text: string;
}

/** An inquiry that may be incomplete: a mailto: from a half-filled no-JS form lacks some fields. */
export type DraftInquiry = Partial<Inquiry> & Pick<Inquiry, 'lang'>;

const DATE_LOCALE = { en: 'en-GB', hr: 'hr-HR' } as const;

/** "Sunday 14 March 2027" / "nedjelja, 14. ožujka 2027." (UTC, so the day never shifts). */
export function formatEventDate(iso: string, lang: Inquiry['lang']): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[lang], { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

function dateText(inquiry: DraftInquiry): string {
  const t = STRINGS[inquiry.lang].mail;
  if (!inquiry.date) return inquiry.flexible ? t.flexibleDate : '';
  const date = formatEventDate(inquiry.date, inquiry.lang);
  return inquiry.flexible ? format(t.dateFlexible, { date }) : date;
}

export function composeInquiryMail(inquiry: DraftInquiry, options: { site?: string } = {}): ComposedMail {
  const s = STRINGS[inquiry.lang];
  const t = s.mail;
  const type = inquiry.type ? s.types[inquiry.type] : '';
  const date = dateText(inquiry);

  const details = [type, date, inquiry.city].filter(Boolean).join(' · ');
  const subject = format(t.subject, { details }).trim();

  const rows: [string, string | undefined][] = [
    [t.labels.type, type],
    [t.labels.date, date],
    [t.labels.city, inquiry.city],
    [t.labels.guests, inquiry.guests && s.guests[inquiry.guests]],
    [t.labels.package, inquiry.package && PACKAGES.find((p) => p.key === inquiry.package)?.name],
    [t.labels.name, inquiry.name],
    [t.labels.email, inquiry.email],
    [t.labels.phone, inquiry.phone],
  ];

  const lines = [t.greeting, '', t.intro, '', ...rows.filter(([, v]) => v).map(([label, v]) => `${label}: ${v}`)];
  if (inquiry.message) lines.push('', `${t.message}:`, inquiry.message);
  if (options.site) lines.push('', '—', format(t.footer, { site: options.site, name: inquiry.name ?? '' }));

  return { subject, text: lines.join('\n') };
}

/** The sender's display name on mail from the Worker ("Voxford website"). */
export function senderName(lang: Inquiry['lang']): string {
  return format(STRINGS[lang].mail.senderName, { name: GROUP.name });
}

/**
 * A mailto: link to the group with the inquiry written out. Encoded with
 * encodeURIComponent (spaces as %20): mail apps show a `+` literally.
 */
export function inquiryMailto(inquiry: DraftInquiry): string {
  const { subject, text } = composeInquiryMail(inquiry);
  const body = text.replace(/\n/g, '\r\n');
  return `mailto:${INQUIRY_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

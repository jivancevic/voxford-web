// The inquiry as an email: the same subject and text for the Worker's Email
// Sending transport and for the mailto: fallback, in the visitor's language.
// Every inquiry goes to the group's address (spec › Audience, action, language).

import { GROUP, PACKAGES } from '@/data/site-facts';
import { format, getStrings } from '@/i18n';
import type { Inquiry } from './inquiry';

/** Where every inquiry goes. */
export const INQUIRY_TO = GROUP.email;

export interface InquiryMail {
  subject: string;
  text: string;
}

/** What a mail needs; a mailto: built from a half-filled no-JS form may lack some fields. */
export type MailInquiry = Partial<Inquiry> & Pick<Inquiry, 'lang'>;

const DATE_LOCALE = { en: 'en-GB', hr: 'hr-HR' } as const;

/** "Sunday 14 March 2027" / "nedjelja, 14. ožujka 2027." (UTC, so the day never shifts). */
export function formatEventDate(iso: string, lang: Inquiry['lang']): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[lang], { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

function dateText(inquiry: MailInquiry): string {
  const t = getStrings(inquiry.lang).inquiry.mail;
  if (!inquiry.date) return inquiry.flexible ? t.flexibleDate : '';
  const date = formatEventDate(inquiry.date, inquiry.lang);
  return inquiry.flexible ? format(t.dateFlexible, { date }) : date;
}

export function composeInquiryMail(inquiry: MailInquiry, options: { site?: string } = {}): InquiryMail {
  const s = getStrings(inquiry.lang).inquiry;
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

/**
 * A mailto: link to the group with the inquiry written out. Encoded with
 * encodeURIComponent (spaces as %20): mail apps show a `+` literally.
 */
export function inquiryMailto(inquiry: MailInquiry): string {
  const { subject, text } = composeInquiryMail(inquiry);
  const body = text.replace(/\n/g, '\r\n');
  return `mailto:${INQUIRY_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

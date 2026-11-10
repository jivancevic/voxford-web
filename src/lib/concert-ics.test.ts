import { describe, expect, it } from 'vitest';
import { concertIcs, mapUrl, type IcsConcert } from './concert-ics';

const now = new Date('2026-11-11T09:30:00Z');
const base: IcsConcert = {
  uid: '2026-12-05-advent-novalja@voxford.example',
  name: 'Voxford at Advent in Novalja',
  startDate: '2026-12-05',
  place: ['Novalja', 'Croatia'],
};

const lines = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n');

describe('concertIcs', () => {
  it('writes one VEVENT in a VCALENDAR with CRLF line ends', () => {
    const ics = concertIcs(base, now);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/);
  });

  it('makes a date-only concert an all-day event', () => {
    const l = lines(concertIcs(base, now));
    expect(l).toContain('DTSTART;VALUE=DATE:20261205');
    expect(l).toContain('DTEND;VALUE=DATE:20261206');
    expect(l).toContain('DTSTAMP:20261111T093000Z');
    expect(l).toContain(`UID:${base.uid}`);
  });

  it('rolls an all-day end over the month and year', () => {
    expect(lines(concertIcs({ ...base, startDate: '2026-12-31' }, now))).toContain('DTEND;VALUE=DATE:20270101');
  });

  it('turns a timed concert into UTC and never guesses an end', () => {
    const l = lines(concertIcs({ ...base, startDate: '2027-09-11T19:00:00+02:00' }, now));
    expect(l).toContain('DTSTART:20270911T170000Z');
    expect(l.some((x) => x.startsWith('DTEND'))).toBe(false);
  });

  it('escapes text values and joins the place into LOCATION', () => {
    const l = lines(
      concertIcs({ ...base, name: 'A; B, C\\D', place: ['Atrium Europasaal', 'Bad Schallerbach', 'Austria'], description: 'Line one\nline two' }, now),
    );
    expect(l).toContain('SUMMARY:A\\; B\\, C\\\\D');
    expect(l).toContain('LOCATION:Atrium Europasaal\\, Bad Schallerbach\\, Austria');
    expect(l).toContain('DESCRIPTION:Line one\\nline two');
  });

  it('adds the event page as URL only when there is one', () => {
    expect(concertIcs(base, now)).not.toContain('URL:');
    expect(lines(concertIcs({ ...base, url: 'https://example.org/e' }, now))).toContain('URL:https://example.org/e');
  });

  it('folds lines longer than 75 octets without splitting a character', () => {
    const long = 'Voxford na Adventu pod lanternom: šetnja s nažigačem lampiona kroz Gornji grad i Tkalčićevu';
    const ics = concertIcs({ ...base, name: long }, now);
    for (const raw of ics.split('\r\n')) expect(new TextEncoder().encode(raw).length).toBeLessThanOrEqual(75);
    expect(lines(ics)).toContain(`SUMMARY:${long}`);
  });
});

describe('mapUrl', () => {
  it('searches the place on Google Maps', () => {
    expect(mapUrl(['Ulica minglanje', 'Samobor', 'Croatia'])).toBe(
      'https://www.google.com/maps/search/?api=1&query=Ulica%20minglanje%2C%20Samobor%2C%20Croatia',
    );
  });
});

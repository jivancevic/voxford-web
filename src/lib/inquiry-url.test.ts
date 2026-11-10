import { describe, expect, it } from 'vitest';
import { inquiryUrl, parseInquiryPrefill } from './inquiry-url';

describe('inquiryUrl (prefill contract)', () => {
  it('links to the bare inquiry page without a prefill', () => {
    expect(inquiryUrl('en')).toBe('/en/inquiry/');
    expect(inquiryUrl('hr')).toBe('/hr/inquiry/');
  });

  it('writes every contract field in order', () => {
    expect(
      inquiryUrl('en', { type: 'conference', date: '2027-03-14', city: 'Zagreb', package: 'gold' }),
    ).toBe('/en/inquiry/?type=conference&date=2027-03-14&city=Zagreb&package=gold');
  });

  it('encodes the city, including Croatian letters', () => {
    expect(inquiryUrl('hr', { city: 'Đakovo, Šibenik' })).toBe(
      '/hr/inquiry/?city=%C4%90akovo%2C+%C5%A0ibenik',
    );
  });

  it('drops values outside the contract', () => {
    expect(
      inquiryUrl('en', {
        // @ts-expect-error not a contract event type
        type: 'party',
        date: '2027-02-30',
        city: '   ',
        // @ts-expect-error not a package
        package: 'platinum',
      }),
    ).toBe('/en/inquiry/');
  });
});

describe('parseInquiryPrefill', () => {
  it('round-trips what inquiryUrl writes', () => {
    const prefill = { type: 'wedding', date: '2027-06-05', city: 'Split', package: 'classic' } as const;
    const url = new URL(inquiryUrl('hr', prefill), 'https://example.test');
    expect(parseInquiryPrefill(url.searchParams)).toEqual(prefill);
  });

  it('ignores unknown and malformed params', () => {
    expect(parseInquiryPrefill('type=gig&date=14.03.2027&package=gold&utm_source=x')).toEqual({
      package: 'gold',
    });
  });

  it('caps the city length', () => {
    expect(parseInquiryPrefill(`city=${'a'.repeat(200)}`).city).toHaveLength(80);
  });
});

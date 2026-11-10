import { describe, expect, it } from 'vitest';
import { GROUP, NUMBERS, PACKAGES, RIDER } from '@/data/site-facts';
import { factTokens, fillFacts, fillFactsHtml, packageDuration } from './copy';

describe('fillFacts', () => {
  it('fills canonical numbers and package durations from site-facts', () => {
    const out = fillFacts('{followers} followers, CLASSIC {classicMin} to {classicMax} min', 'en');
    expect(out).toBe(`${NUMBERS.followers.display} followers, CLASSIC 45 to 60 min`);
  });

  it('fills the manager and the bookings email', () => {
    expect(fillFacts('{managerName}, {managerCompany}: {email}', 'hr')).toBe(
      `${GROUP.manager.name}, ${GROUP.manager.company}: ${GROUP.email}`,
    );
  });

  it('throws on a token site-facts does not know, so a typo fails the build', () => {
    expect(() => fillFacts('{folowers}', 'en')).toThrow(/folowers/);
  });

  it('leaves text without tokens alone', () => {
    expect(fillFacts('Five voices.', 'en')).toBe('Five voices.');
  });

  it('has a min and max token for every package with a range', () => {
    const tokens = factTokens('en');
    for (const p of PACKAGES) {
      const key = p.key.replace(/-(\w)/g, (_m, c: string) => c.toUpperCase());
      expect(tokens[`${key}Max`]).toBe(String(p.minutes.max));
      if (p.minutes.min) expect(tokens[`${key}Min`]).toBe(String(p.minutes.min));
    }
  });
});

describe('rider tokens', () => {
  it('fill the technical rider numbers from site-facts', () => {
    expect(
      fillFacts(
        '{paReadyHours} h; {popUpSoundcheck}/{classicSoundcheck}/{goldSoundcheck} min; {classicMixerChannels}/{goldMixerChannels} ch; {classicMonitors}/{goldMonitors} monitors; {parkingSpaces} spaces',
        'en',
      ),
    ).toBe(
      `${RIDER.paReadyHoursBefore} h; ${RIDER.soundcheckMinutes['pop-up']}/${RIDER.soundcheckMinutes.classic}/${RIDER.soundcheckMinutes.gold} min; ` +
        `${RIDER.mixerChannels.classic}/${RIDER.mixerChannels.gold} ch; ${RIDER.floorMonitors.classic}/${RIDER.floorMonitors.gold} monitors; ` +
        `${RIDER.parkingSpaces} spaces`,
    );
  });
});

describe('packageDuration', () => {
  it('reads "up to" for a package with only a maximum', () => {
    expect(packageDuration(PACKAGES[0]!, 'en')).toBe('up to 15 min');
    expect(packageDuration(PACKAGES[0]!, 'hr')).toBe('do 15 min');
  });

  it('reads a range without dashes', () => {
    expect(packageDuration(PACKAGES[2]!, 'en')).toBe('90 to 120 min');
    expect(packageDuration(PACKAGES[2]!, 'hr')).toBe('90 do 120 min');
  });
});

describe('fillFactsHtml', () => {
  it('fills tokens the Markdown renderer percent-encoded inside a link', () => {
    expect(fillFactsHtml('<a href="mailto:%7Bemail%7D">{email}</a>', 'en')).toBe(
      `<a href="mailto:${GROUP.email}">${GROUP.email}</a>`,
    );
  });
});

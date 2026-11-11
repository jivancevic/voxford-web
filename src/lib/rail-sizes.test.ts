import { describe, expect, it } from 'vitest';
import { railCardSizes } from './rail-sizes';

describe('railCardSizes', () => {
  it('keeps 11rem for a row that never fits the 76rem container', () => {
    expect(railCardSizes(8)).toBe('11rem');
    expect(railCardSizes(7)).toBe('11rem');
  });

  it('switches to shared columns once five cards fit (from ~65.3rem)', () => {
    expect(railCardSizes(5)).toBe(
      '(min-width: 65.3rem) min(15rem, (min(100vw - 2 * clamp(1rem, 0.5rem + 2.5vw, 2.5rem), 76rem) - 6rem) / 5), 11rem',
    );
  });

  it('switches earlier for four cards (from ~52.2rem)', () => {
    expect(railCardSizes(4)).toMatch(/^\(min-width: 52\.2rem\) min\(15rem, .* - 4\.5rem\) \/ 4\), 11rem$/);
  });
});

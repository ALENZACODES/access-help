import { describe, expect, it } from 'vitest';
import { NBSP, colon, daysBetween, fill, formatDistance, formatMinutes, formatShare, isIsoDay, pick, plural, slug } from './day-text';

describe('pick and fill', () => {
  it('picks by language', () => {
    expect(pick('en', 'a', 'b')).toBe('a');
    expect(pick('fr', 'a', 'b')).toBe('b');
  });
  it('fills named values and leaves a missing one visible', () => {
    expect(fill('{n} of {m}', { n: 1, m: 'x' })).toBe('1 of x');
    expect(fill('{n} of {m}', { n: 1 })).toBe('1 of {m}');
  });
  it('fills a value that is zero', () => {
    expect(fill('{n}', { n: 0 })).toBe('0');
  });
});

describe('plural', () => {
  it('uses singular only for 1 in English', () => {
    expect([0, 1, 2].map((n) => plural('en', n, 'record', 'records'))).toEqual(['records', 'record', 'records']);
  });
  it('uses singular for 0 and 1 in French', () => {
    expect([0, 1, 2].map((n) => plural('fr', n, 'fiche', 'fiches'))).toEqual(['fiche', 'fiche', 'fiches']);
  });
});

describe('formatting', () => {
  it('writes a colon with the French space', () => {
    expect(colon('en')).toBe(': ');
    expect(colon('fr')).toBe(`${NBSP}: `);
  });
  it('rounds a share and handles none', () => {
    expect(formatShare(0.456, 'en')).toBe('46%');
    expect(formatShare(0.456, 'fr')).toBe(`46${NBSP}%`);
    expect(formatShare(null, 'en')).toBe('—');
    expect(formatShare(Number.NaN, 'fr')).toBe('—');
    expect(formatShare(2, 'en')).toBe('100%');
    expect(formatShare(-1, 'en')).toBe('0%');
  });
  it('writes metres and kilometres, with a decimal comma in French', () => {
    expect(formatDistance(849.6, 'en')).toBe('850 m');
    expect(formatDistance(1250, 'en')).toBe('1.3 km');
    expect(formatDistance(1250, 'fr')).toBe('1,3 km');
    expect(formatDistance(-5, 'en')).toBe('—');
  });
  it('writes minutes and hours', () => {
    expect(formatMinutes(44.6)).toBe('45 min');
    expect(formatMinutes(65)).toBe('1 h 05');
    expect(formatMinutes(Number.NaN)).toBe('—');
  });
});

describe('dates', () => {
  it('accepts real dates only', () => {
    expect(isIsoDay('2026-11-16')).toBe(true);
    expect(isIsoDay('2026-02-30')).toBe(false);
    expect(isIsoDay('2026-1-6')).toBe(false);
    expect(isIsoDay('16/11/2026')).toBe(false);
  });
  it('counts days and refuses bad dates', () => {
    expect(daysBetween('2026-11-10', '2026-11-16')).toBe(6);
    expect(daysBetween('2026-11-16', '2026-11-10')).toBe(-6);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('nope', '2026-11-10')).toBeNull();
  });
});

describe('slug', () => {
  it('makes a short ASCII name', () => {
    expect(slug('Rue Saint-Émile & Fils')).toBe('rue-saint-emile-fils');
    expect(slug('  ***  ')).toBe('untitled');
    expect(slug('a'.repeat(100))).toHaveLength(40);
  });
});

import { describe, expect, it } from 'vitest';
import { NBSP, clip, colon, daysBetween, fill, formatDecimal, formatMetres, isIsoDay, joinList, pick, plural } from './text.js';

describe('pick, fill, plural', () => {
  it('picks by language', () => {
    expect(pick('en', 'a', 'b')).toBe('a');
    expect(pick('fr', 'a', 'b')).toBe('b');
  });
  it('fills placeholders and leaves a missing one visible', () => {
    expect(fill('{n} of {m}', { n: 1, m: 'two' })).toBe('1 of two');
    expect(fill('{n} of {m}', { n: 1 })).toBe('1 of {m}');
  });
  it('treats 0 and 1 as singular in French and only 1 in English', () => {
    expect(plural('en', 0, 'one', 'many')).toBe('many');
    expect(plural('en', 1, 'one', 'many')).toBe('one');
    expect(plural('fr', 0, 'un', 'des')).toBe('un');
    expect(plural('fr', 1, 'un', 'des')).toBe('un');
    expect(plural('fr', 2, 'un', 'des')).toBe('des');
  });
});

describe('colon and decimals', () => {
  it('puts a no-break space before the French colon', () => {
    expect(colon('en')).toBe(': ');
    expect(colon('fr')).toBe(`${NBSP}: `);
  });
  it('uses a comma in French and a dot in English', () => {
    expect(formatDecimal(1.25, 1, 'en')).toBe('1.3');
    expect(formatDecimal(1.5, 1, 'fr')).toBe('1,5');
    expect(formatDecimal(Number.NaN, 1, 'en')).toBe('—');
  });
  it('formats metres and kilometres', () => {
    expect(formatMetres(84.6, 'en')).toBe('85 m');
    expect(formatMetres(1234, 'en')).toBe('1.2 km');
    expect(formatMetres(1234, 'fr')).toBe(`1,2${NBSP}km`);
    expect(formatMetres(-1, 'en')).toBe('—');
  });
});

describe('dates', () => {
  it('accepts only real calendar days', () => {
    expect(isIsoDay('2026-02-28')).toBe(true);
    expect(isIsoDay('2026-02-30')).toBe(false);
    expect(isIsoDay('2026-2-3')).toBe(false);
    expect(isIsoDay('')).toBe(false);
  });
  it('counts whole days, including across a leap day', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetween('2026-11-16', '2026-11-16')).toBe(0);
    expect(daysBetween('2026-11-17', '2026-11-16')).toBe(-1);
    expect(daysBetween('x', '2026-11-16')).toBeNull();
  });
});

describe('lists and clipping', () => {
  it('joins items in each language', () => {
    expect(joinList([], 'en')).toBe('');
    expect(joinList(['a'], 'en')).toBe('a');
    expect(joinList(['a', 'b', 'c'], 'en')).toBe('a, b and c');
    expect(joinList(['a', 'b'], 'fr')).toBe('a et b');
  });
  it('clips by characters and adds an ellipsis only when it cut', () => {
    expect(clip('short', 10)).toBe('short');
    expect(clip('abcdefghij', 5)).toBe('abcd…');
    expect(Array.from(clip('😀'.repeat(10), 4))).toHaveLength(4);
  });
});

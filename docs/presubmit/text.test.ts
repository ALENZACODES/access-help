import { describe, expect, it } from 'vitest';
import { clip, colon, daysBetween, formatDecimal, formatMetres, fill, isIsoDay, joinList, plural } from './text.js';

describe('text helpers', () => {
  it('fills placeholders and leaves a missing one visible', () => {
    expect(fill('a {x} b {y}', { x: 1 })).toBe('a 1 b {y}');
  });
  it('treats 0 and 1 as singular in French only', () => {
    expect(plural('fr', 0, 'a', 'b')).toBe('a');
    expect(plural('en', 0, 'a', 'b')).toBe('b');
    expect(plural('en', 1, 'a', 'b')).toBe('a');
    expect(plural('fr', 2, 'a', 'b')).toBe('b');
  });
  it('writes the colon with the French spacing', () => {
    expect(colon('en')).toBe(': ');
    expect(colon('fr')).toBe(' : ');
  });
  it('formats decimals with a comma in French', () => {
    expect(formatDecimal(1.25, 1, 'fr')).toBe('1,3');
    expect(formatDecimal(1.25, 2, 'en')).toBe('1.25');
    expect(formatDecimal(Number.NaN, 1, 'en')).toBe('—');
  });
  it('formats metres and kilometres', () => {
    expect(formatMetres(85.4, 'en')).toBe('85 m');
    expect(formatMetres(1200, 'fr')).toBe('1,2 km');
    expect(formatMetres(-1, 'en')).toBe('—');
  });
  it('knows real days', () => {
    expect(isIsoDay('2026-02-28')).toBe(true);
    expect(isIsoDay('2026-02-30')).toBe(false);
    expect(isIsoDay('26-02-01')).toBe(false);
  });
  it('counts days between', () => {
    expect(daysBetween('2026-11-01', '2026-11-16')).toBe(15);
    expect(daysBetween('2026-11-16', '2026-11-01')).toBe(-15);
    expect(daysBetween('x', '2026-11-01')).toBeNull();
  });
  it('joins lists', () => {
    expect(joinList([], 'en')).toBe('');
    expect(joinList(['a'], 'en')).toBe('a');
    expect(joinList(['a', 'b', 'c'], 'fr')).toBe('a, b et c');
  });
  it('clips by code points', () => {
    expect(clip('abcdef', 4)).toBe('abc…');
    expect(clip('abc', 4)).toBe('abc');
    expect(Array.from(clip('😀😀😀😀', 3))).toHaveLength(3);
  });
});

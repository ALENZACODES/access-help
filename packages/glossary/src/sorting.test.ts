import { describe, expect, it } from 'vitest';
import { firstPage, isRecent, matchPlace, newestDate, sortMatches, type FeatureClaim, type Place } from './index';

const prov = (date: string) => ({ source: 'Example source', licence: 'CC0-1.0', date }) as const;
const claim = (date: string, status: FeatureClaim['status'] = 'present'): FeatureClaim => ({
  termId: 'ramp',
  status,
  provenance: prov(date),
});
const place = (id: string, name: string, claims: FeatureClaim[] = []): Place => ({ id, name, claims });
const matches = (ps: Place[]) => ps.map((p) => matchPlace(p, ['ramp']));
const ids = (ms: readonly { place: Place }[]) => ms.map((m) => m.place.id);

describe('newestDate', () => {
  it('uses the newest sourced present or absent claim', () => {
    expect(newestDate(place('a', 'A', [claim('2025-01-01'), claim('2026-03-04', 'absent')]))).toBe('2026-03-04');
  });

  it('ignores unknown claims and claims without valid provenance', () => {
    const noSource: FeatureClaim = { termId: 'ramp', status: 'present' };
    const badDate: FeatureClaim = { termId: 'ramp', status: 'present', provenance: prov('2026-13-40') };
    expect(newestDate(place('a', 'A', [noSource, badDate, claim('2027-01-01', 'unknown')]))).toBeNull();
  });

  it('is null for a place with no claims', () => {
    expect(newestDate(place('a', 'A'))).toBeNull();
  });
});

describe('isRecent', () => {
  const today = '2026-11-15';
  it('accepts information from the last year, including exactly one year', () => {
    expect(isRecent(place('a', 'A', [claim('2026-01-01')]), today)).toBe(true);
    expect(isRecent(place('a', 'A', [claim('2025-11-15')]), today)).toBe(true);
  });

  it('rejects older information', () => {
    expect(isRecent(place('a', 'A', [claim('2025-11-14')]), today)).toBe(false);
  });

  it('rejects dates in the future and places with no dated claims', () => {
    expect(isRecent(place('a', 'A', [claim('2026-12-01')]), today)).toBe(false);
    expect(isRecent(place('a', 'A'), today)).toBe(false);
  });

  it('accepts a different window', () => {
    expect(isRecent(place('a', 'A', [claim('2026-10-01')]), today, 30)).toBe(false);
    expect(isRecent(place('a', 'A', [claim('2026-11-01')]), today, 30)).toBe(true);
  });
});

describe('sortMatches', () => {
  const ps = [
    place('c', 'Cafe', [claim('2025-02-01')]),
    place('a', 'Arena', []),
    place('b', 'Bank', [claim('2026-06-01')]),
  ];

  it('keeps the given order for "best" and does not mutate its input', () => {
    const input = matches(ps);
    expect(ids(sortMatches(input, 'best', 'en'))).toEqual(['c', 'a', 'b']);
    sortMatches(input, 'name', 'en');
    expect(ids(input)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by name', () => {
    expect(ids(sortMatches(matches(ps), 'name', 'en'))).toEqual(['a', 'b', 'c']);
  });

  it('sorts by newest information with undated places last', () => {
    expect(ids(sortMatches(matches(ps), 'newest', 'en'))).toEqual(['b', 'c', 'a']);
  });

  it('breaks ties by name, then id', () => {
    const tie = [place('2', 'Same', [claim('2026-01-01')]), place('1', 'Same', [claim('2026-01-01')]), place('0', 'Alpha', [claim('2026-01-01')])];
    expect(ids(sortMatches(matches(tie), 'newest', 'en'))).toEqual(['0', '1', '2']);
  });

  it('sorts French names with accents sensibly', () => {
    const fr = [place('1', 'Zèbre'), place('2', 'Étoile'), place('3', 'Ami')];
    expect(ids(sortMatches(matches(fr), 'name', 'fr'))).toEqual(['3', '2', '1']);
  });
});

describe('firstPage', () => {
  const items = [1, 2, 3, 4, 5];
  it('returns the first items and what is left', () => {
    expect(firstPage(items, 2)).toEqual({ items: [1, 2], shown: 2, total: 5, remaining: 3 });
  });

  it('shows everything when the limit is larger', () => {
    expect(firstPage(items, 50)).toEqual({ items, shown: 5, total: 5, remaining: 0 });
  });

  it('treats negative as zero and infinite as everything', () => {
    expect(firstPage(items, -3).shown).toBe(0);
    expect(firstPage(items, Infinity).shown).toBe(5);
    expect(firstPage(items, Number.NaN).shown).toBe(5);
  });

  it('floors fractions', () => {
    expect(firstPage(items, 2.9).shown).toBe(2);
  });
});

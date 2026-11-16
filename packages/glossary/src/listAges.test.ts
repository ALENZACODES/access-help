import { describe, expect, it } from 'vitest';
import {
  AGES_UI,
  agesText,
  bestFreshness,
  countAges,
  frenchIssues,
  lintClaims,
  lintCopy,
  summariseAges,
  type FeatureClaim,
  type Lang,
  type Place,
} from './index';

const today = '2026-11-15';
const claim = (date: string | null, termId = 'ramp'): FeatureClaim =>
  date === null ? { termId, status: 'unknown' } : { termId, status: 'present', provenance: { source: 'City open data', licence: 'CC0-1.0', date } };
const place = (id: string, ...claims: FeatureClaim[]): Place => ({ id, name: id, claims });

const fresh = place('fresh', claim('2026-06-01'));
const old = place('old', claim('2025-01-01'));
const ancient = place('ancient', claim('2020-01-01'));
const none = place('none');
const unknownOnly = place('unknown', claim(null));
const future = place('future', claim('2027-01-01'));

describe('bestFreshness', () => {
  it('takes the freshest source behind any claim', () => {
    expect(bestFreshness(place('p', claim('2020-01-01'), claim('2026-06-01', 'elevator')), today)).toBe('current');
  });
  it('is undated with no claims, an unknown claim, or a future date', () => {
    for (const p of [none, unknownOnly, future]) expect(bestFreshness(p, today), p.id).toBe('undated');
  });
  it('tells aging from old', () => {
    expect(bestFreshness(old, today)).toBe('aging');
    expect(bestFreshness(ancient, today)).toBe('old');
  });
});

describe('countAges', () => {
  it('counts each place once', () => {
    expect(countAges([fresh, old, ancient, none, unknownOnly], today)).toEqual({ total: 5, recent: 1, older: 2, none: 2 });
  });
  it('is zero for no places', () => {
    expect(countAges([], today)).toEqual({ total: 0, recent: 0, older: 0, none: 0 });
  });
  it('adds up to the total', () => {
    const c = countAges([fresh, fresh, old, none, future], today);
    expect(c.recent + c.older + c.none).toBe(c.total);
  });
});

describe('agesText', () => {
  it('is empty for no places', () => {
    expect(agesText({ total: 0, recent: 0, older: 0, none: 0 }, 'en')).toBe('');
  });
  it('leaves out kinds with a count of zero', () => {
    expect(agesText({ total: 2, recent: 2, older: 0, none: 0 }, 'en')).toBe('Of 2 places: 2 with information from the last year.');
  });
  it('joins two with "and" and three with a comma and "and"', () => {
    expect(agesText({ total: 3, recent: 1, older: 0, none: 2 }, 'en')).toBe('Of 3 places: 1 with information from the last year and 2 with no dated information.');
    expect(agesText({ total: 3, recent: 1, older: 1, none: 1 }, 'en')).toBe(
      'Of 3 places: 1 with information from the last year, 1 with older information and 1 with no dated information.',
    );
  });
  it('says "1 place" for one', () => {
    expect(agesText({ total: 1, recent: 0, older: 1, none: 0 }, 'en')).toBe('Of 1 place: 1 with older information.');
  });
  it('uses French words and spacing', () => {
    const text = agesText({ total: 3, recent: 1, older: 1, none: 1 }, 'fr');
    expect(text).toContain(' et ');
    expect(text).toMatch(/Sur 3 lieux[  ]:/);
    expect(frenchIssues(text)).toEqual([]);
  });
  it.each(['en', 'fr'] as Lang[])('never says anything about whether a place is accessible, in %s', (lang) => {
    const text = agesText({ total: 9, recent: 3, older: 3, none: 3 }, lang);
    expect(lintCopy(text)).toEqual([]);
    expect(lintClaims(text)).toEqual([]);
  });
});

describe('summariseAges', () => {
  it('joins counting and wording', () => {
    expect(summariseAges([fresh, none], today, 'en')).toBe('Of 2 places: 1 with information from the last year and 1 with no dated information.');
  });
  it('has the same keys in both languages', () => {
    expect(Object.keys(AGES_UI.en).sort()).toEqual(Object.keys(AGES_UI.fr).sort());
  });
});

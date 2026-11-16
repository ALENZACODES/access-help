import { describe, expect, it } from 'vitest';
import { MAX_COMMENT, changesetComment, changesetLines, changesetTags, observedRange, withAccessTag } from './changeset.js';

const rec = (observedOn: string, wheelchair: 'yes' | 'limited' | 'no' | 'UNKNOWN' = 'yes') => ({ observedOn, wheelchair });

describe('observedRange', () => {
  it('finds the earliest and latest real date', () => {
    expect(observedRange([rec('2026-05-02'), rec('2026-01-09'), rec('2026-03-01')])).toEqual({ from: '2026-01-09', to: '2026-05-02' });
  });
  it('ignores dates that are not real and returns null when none are', () => {
    expect(observedRange([rec('2026-02-30'), rec('x')])).toBeNull();
    expect(observedRange([rec('2026-02-30'), rec('2026-02-03')])).toEqual({ from: '2026-02-03', to: '2026-02-03' });
    expect(observedRange([])).toBeNull();
  });
});

describe('withAccessTag', () => {
  it('counts only records with a recorded status', () => {
    expect(withAccessTag([rec('2026-01-01', 'UNKNOWN'), rec('2026-01-01', 'no'), rec('2026-01-01', 'limited')])).toBe(2);
  });
});

describe('changesetComment', () => {
  it('is empty with no records', () => {
    expect(changesetComment([], 'en')).toBe('');
    expect(changesetTags([], 'en')).toBeNull();
  });
  it('says one place and one day', () => {
    expect(changesetComment([rec('2026-11-01')], 'en')).toBe('Add wheelchair access notes for 1 place from my own visits on 2026-11-01');
  });
  it('says many places and a range', () => {
    expect(changesetComment([rec('2026-11-01'), rec('2026-11-09')], 'en')).toBe(
      'Add wheelchair access notes for 2 places from my own visits between 2026-11-01 and 2026-11-09',
    );
  });
  it('is written in French with French plural rules', () => {
    expect(changesetComment([rec('2026-11-01')], 'fr')).toContain('pour 1 lieu,');
    expect(changesetComment([rec('2026-11-01'), rec('2026-11-02')], 'fr')).toContain('pour 2 lieux,');
    expect(changesetComment([rec('2026-11-01'), rec('2026-11-02')], 'fr')).toContain('entre le 2026-11-01 et le 2026-11-02');
  });
  it('leaves the date out when no date is real', () => {
    expect(changesetComment([rec('x')], 'en')).toBe('Add wheelchair access notes for 1 place from my own visits');
  });
  it('stays within the 255-character limit', () => {
    const many = Array.from({ length: 500 }, () => rec('2026-11-01'));
    expect(Array.from(changesetComment(many, 'fr')).length).toBeLessThanOrEqual(MAX_COMMENT);
  });
  it('does not claim anyone else checked the data', () => {
    expect(changesetComment([rec('2026-11-01')], 'en')).not.toMatch(/checked|confirmed|approved/i);
  });
});

describe('changesetTags', () => {
  it('sets the source to survey and writes lines', () => {
    const tags = changesetTags([rec('2026-11-01')], 'en');
    expect(tags?.source).toBe('survey');
    expect(changesetLines(tags as NonNullable<typeof tags>)).toEqual([`comment=${tags?.comment}`, 'source=survey']);
  });
});

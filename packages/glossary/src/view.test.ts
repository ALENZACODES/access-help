import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, isDefaultView, normaliseView, parseView, serialiseView, SORT_KEYS } from './index';

describe('finder view', () => {
  it('defaults to best match with no filters', () => {
    expect(DEFAULT_VIEW).toEqual({ sort: 'best', recentOnly: false, savedOnly: false });
    expect(isDefaultView(DEFAULT_VIEW)).toBe(true);
  });

  it('knows exactly three sort orders', () => {
    expect([...SORT_KEYS]).toEqual(['best', 'name', 'newest']);
  });

  it('keeps valid fields and replaces invalid ones one by one', () => {
    expect(normaliseView({ sort: 'name', recentOnly: true, savedOnly: 'yes' })).toEqual({
      sort: 'name',
      recentOnly: true,
      savedOnly: false,
    });
    expect(normaliseView({ sort: 'cheapest' }).sort).toBe('best');
  });

  it.each([null, undefined, 5, 'x', [], [1]])('falls back to the default for %j', (v) => {
    expect(normaliseView(v)).toEqual(DEFAULT_VIEW);
  });

  it('round-trips through JSON', () => {
    const v = { sort: 'newest', recentOnly: true, savedOnly: true } as const;
    expect(parseView(serialiseView(v))).toEqual(v);
    expect(isDefaultView(v)).toBe(false);
  });

  it('returns null for text that is not a JSON object', () => {
    expect(parseView('not json')).toBeNull();
    expect(parseView('[1]')).toBeNull();
    expect(parseView('7')).toBeNull();
  });
});

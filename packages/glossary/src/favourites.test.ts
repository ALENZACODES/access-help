import { describe, expect, it } from 'vitest';
import { MAX_SAVED, parseSaved, pruneSaved, serialiseSaved, toggleSaved, type Place } from './index';

describe('saved places', () => {
  it('adds and removes an id', () => {
    const one = toggleSaved([], 'a');
    expect(one).toEqual(['a']);
    expect(toggleSaved(one, 'a')).toEqual([]);
  });

  it('keeps the order saved', () => {
    expect(toggleSaved(toggleSaved([], 'b'), 'a')).toEqual(['b', 'a']);
  });

  it('drops the oldest when over the cap', () => {
    const full = Array.from({ length: MAX_SAVED }, (_, i) => `p${i}`);
    const next = toggleSaved(full, 'new');
    expect(next).toHaveLength(MAX_SAVED);
    expect(next[0]).toBe('p1');
    expect(next.at(-1)).toBe('new');
  });

  it('prunes ids that are not in the current places', () => {
    const places: Place[] = [{ id: 'a', name: 'A', claims: [] }];
    expect(pruneSaved(['a', 'gone'], places)).toEqual(['a']);
  });

  it('round-trips and removes duplicates', () => {
    expect(parseSaved(serialiseSaved(['a', 'b']))).toEqual(['a', 'b']);
    expect(parseSaved('["a","a","b"]')).toEqual(['a', 'b']);
  });

  it('caps a long stored list', () => {
    const long = JSON.stringify(Array.from({ length: MAX_SAVED + 20 }, (_, i) => `p${i}`));
    expect(parseSaved(long)).toHaveLength(MAX_SAVED);
  });

  it.each(['nope', '{"a":1}', '[1,2]', '["a",2]', 'null'])('rejects %s', (text) => {
    expect(parseSaved(text)).toBeNull();
  });
});

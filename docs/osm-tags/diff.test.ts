import { describe, expect, it } from 'vitest';
import { compareTags, nothingToType } from './diff.js';
import { MAP_TEXT, obs } from './fixtures.js';
import { parseTagText } from './parse.js';
import { tagsFor } from './tags.js';

const mine = tagsFor(obs());
const onMap = parseTagText(MAP_TEXT).tags;

describe('tags beside the map', () => {
  it('adds everything when the map object has no tags', () => {
    const c = compareTags(mine, []);
    expect(c.rows.every((r) => r.kind === 'add')).toBe(true);
    expect(c.counts).toEqual({ add: 4, same: 0, differs: 0, 'only-on-map': 0 });
    expect(c.cautions).toEqual([]);
  });
  it('sorts each key into add, same, differs or only on the map', () => {
    const c = compareTags(mine, onMap);
    expect(c.rows.map((r) => [r.key, r.kind])).toEqual([
      ['name', 'differs'],
      ['wheelchair', 'differs'],
      ['check_date:wheelchair', 'differs'],
      ['source', 'add'],
      ['amenity', 'only-on-map'],
      ['toilets:wheelchair', 'only-on-map'],
    ]);
    expect(c.counts).toEqual({ add: 1, same: 0, differs: 3, 'only-on-map': 2 });
  });
  it('keeps both values on a row that differs', () => {
    const row = compareTags(mine, onMap).rows.find((r) => r.key === 'wheelchair');
    expect(row).toEqual({ key: 'wheelchair', kind: 'differs', mine: 'yes', onMap: 'limited' });
  });
  it('warns when the map was checked after the observation', () => {
    expect(compareTags(mine, onMap).cautions).toEqual(['map-date-newer', 'status-differs', 'name-differs', 'map-has-detail']);
  });
  it('says when the check dates are the same day', () => {
    expect(compareTags(mine, [{ key: 'check_date:wheelchair', value: '2026-11-10' }]).cautions).toEqual(['map-date-same']);
  });
  it('gives no date caution when the map date is older or not a day', () => {
    expect(compareTags(mine, [{ key: 'check_date:wheelchair', value: '2025-01-01' }]).cautions).toEqual([]);
    expect(compareTags(mine, [{ key: 'check_date:wheelchair', value: 'spring 2027' }]).cautions).toEqual([]);
  });
  it('treats values that differ only by outer spaces as the same', () => {
    expect(compareTags([{ key: 'name', value: 'A' }], [{ key: 'name', value: ' A ' }]).rows[0]?.kind).toBe('same');
  });
  it('treats a different letter case as a difference, since the map keeps case', () => {
    expect(compareTags([{ key: 'name', value: 'Sample library' }], [{ key: 'name', value: 'Sample Library' }]).rows[0]?.kind).toBe('differs');
  });
  it('knows when typing would change nothing', () => {
    expect(nothingToType(compareTags(mine, [...mine, { key: 'amenity', value: 'library' }]))).toBe(true);
    expect(nothingToType(compareTags(mine, onMap))).toBe(false);
    expect(nothingToType(compareTags(mine, []))).toBe(false);
  });
  it('lists the tags on the map only when the observation has none', () => {
    const c = compareTags([], onMap);
    expect(c.rows.every((r) => r.kind === 'only-on-map' && r.mine === null)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { obs, unknownObs } from './fixtures.js';
import { MAX_TAG_LENGTH, coordText, hasStatus, heldBack, tagLength, tagLine, tagProblems, tagText, tagsFor } from './tags.js';

describe('tags for an observation', () => {
  it('writes name, wheelchair, check date and source, in that order', () => {
    expect(tagsFor(obs())).toEqual([
      { key: 'name', value: 'Sample Library' },
      { key: 'wheelchair', value: 'yes' },
      { key: 'check_date:wheelchair', value: '2026-11-10' },
      { key: 'source', value: 'own visit' },
    ]);
  });
  it('writes no wheelchair tag and no check date for UNKNOWN', () => {
    expect(tagsFor(unknownObs())).toEqual([{ key: 'source', value: 'own visit' }]);
  });
  it('knows the three statuses and nothing else', () => {
    expect(hasStatus({ wheelchair: 'limited' })).toBe(true);
    expect(hasStatus({ wheelchair: 'UNKNOWN' })).toBe(false);
    expect(hasStatus({ wheelchair: 'Yes' })).toBe(false);
  });
  it('tidies spaces in a name and a source', () => {
    const tags = tagsFor(obs({ name: '  Sample   Library ', source: ' own\tvisit ' }));
    expect(tags[0]).toEqual({ key: 'name', value: 'Sample Library' });
    expect(tags[3]).toEqual({ key: 'source', value: 'own visit' });
  });
  it('leaves out a blank name and a blank source', () => {
    expect(tagsFor(obs({ name: '  ', source: '' })).map((t) => t.key)).toEqual(['wheelchair', 'check_date:wheelchair']);
  });
  it('says what was held back', () => {
    expect(heldBack(obs())).toEqual([]);
    expect(heldBack(unknownObs())).toEqual(['status-unknown', 'no-name']);
    expect(heldBack(obs({ source: ' ' }))).toEqual(['no-source']);
  });
  it('finds no problem in ordinary tags', () => {
    expect(tagProblems(tagsFor(obs()))).toEqual([]);
  });
  it('flags a value longer than OpenStreetMap keeps', () => {
    expect(tagProblems([{ key: 'name', value: 'x'.repeat(MAX_TAG_LENGTH) }])).toEqual([]);
    expect(tagProblems([{ key: 'name', value: 'x'.repeat(MAX_TAG_LENGTH + 1) }])).toEqual([{ kind: 'too-long', key: 'name' }]);
  });
  it('flags an empty value, a repeated key and a line break', () => {
    expect(tagProblems([{ key: 'a', value: '' }])).toEqual([{ kind: 'empty-value', key: 'a' }]);
    expect(tagProblems([{ key: 'a', value: '1' }, { key: 'a', value: '2' }])).toEqual([{ kind: 'repeated-key', key: 'a' }]);
    expect(tagProblems([{ key: 'a', value: 'one\ntwo' }])).toEqual([{ kind: 'control-character', key: 'a' }]);
  });
  it('flags a check date that is not a real day', () => {
    expect(tagProblems(tagsFor(obs({ observedOn: '2026-02-30' })))).toEqual([{ kind: 'bad-date', key: 'check_date:wheelchair' }]);
    expect(tagProblems(tagsFor(obs({ observedOn: '2028-02-29' })))).toEqual([]);
    expect(tagProblems(tagsFor(obs({ observedOn: 'last week' })))).toEqual([{ kind: 'bad-date', key: 'check_date:wheelchair' }]);
  });
  it('counts length as a reader sees it', () => {
    expect(tagLength('café')).toBe(4);
    expect(tagLength('a😀')).toBe(2);
  });
  it('writes tags as key=value lines', () => {
    expect(tagLine({ key: 'wheelchair', value: 'no' })).toBe('wheelchair=no');
    expect(tagText(tagsFor(obs()))).toBe('name=Sample Library\nwheelchair=yes\ncheck_date:wheelchair=2026-11-10\nsource=own visit');
    expect(tagText([])).toBe('');
  });
  it('writes the spot with five decimals', () => {
    expect(coordText({ lat: 43.85, lon: -79.43 })).toBe('43.85000, -79.43000');
    expect(coordText({ lat: 43.1234567, lon: -79.9876543 })).toBe('43.12346, -79.98765');
  });
});

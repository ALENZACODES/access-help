import { describe, expect, it } from 'vitest';
import { rec } from './fixtures.js';
import { changesetComment, changesetSource, osmTagsFor, tagBlock, tagLines } from './tags.js';

describe('osmTagsFor', () => {
  it('lists the name and the status', () => {
    expect(tagLines(osmTagsFor(rec()))).toEqual(['name=Sample Library', 'wheelchair=yes']);
  });
  it('leaves UNKNOWN out entirely', () => {
    expect(tagLines(osmTagsFor(rec({ wheelchair: 'UNKNOWN' })))).toEqual(['name=Sample Library']);
  });
  it('leaves an unrecognised status out too', () => {
    expect(tagLines(osmTagsFor(rec({ wheelchair: 'maybe' })))).toEqual(['name=Sample Library']);
  });
  it('leaves a missing name out', () => {
    for (const name of [null, '', '  ']) expect(tagLines(osmTagsFor(rec({ name })))).toEqual(['wheelchair=yes']);
  });
  it('tidies spaces in the name', () => {
    expect(osmTagsFor(rec({ name: '  Sample   Library ' }))[0]?.value).toBe('Sample Library');
  });
  it('cuts a very long name at 255 characters', () => {
    expect(Array.from(osmTagsFor(rec({ name: 'é'.repeat(300) }))[0]?.value ?? '')).toHaveLength(255);
  });
  it('writes nothing when there is nothing to add', () => {
    expect(osmTagsFor(rec({ name: null, wheelchair: 'UNKNOWN' }))).toEqual([]);
    expect(tagBlock(rec({ name: null, wheelchair: 'UNKNOWN' }))).toBe('');
  });
  it('writes a block of lines', () => expect(tagBlock(rec({ wheelchair: 'limited' }))).toBe('name=Sample Library\nwheelchair=limited'));
});

describe('changesetComment', () => {
  const two = [rec({ observedOn: '2026-11-03' }), rec({ id: 'r2', observedOn: '2026-11-01' })];
  it('is empty with no records', () => expect(changesetComment([], 'en')).toBe(''));
  it('names one day when all match', () => {
    expect(changesetComment([rec()], 'en')).toBe('Add wheelchair access and names seen on foot for 1 place, observed 2026-11-01');
  });
  it('names the span, oldest first', () => expect(changesetComment(two, 'en')).toContain('observed 2026-11-01 to 2026-11-03'));
  it('is in French when asked, with the right apostrophe', () => {
    const text = changesetComment(two, 'fr');
    expect(text).toContain('l’accès');
    expect(text).toContain('2026-11-01 au 2026-11-03');
    expect(text).toContain('2 lieux');
  });
  it('stays within 255 characters', () => expect(changesetComment(Array.from({ length: 500 }, (_, i) => rec({ id: `r${i}` })), 'fr').length).toBeLessThanOrEqual(255));
  it('ignores a bad date when it picks the span', () => {
    expect(changesetComment([rec({ observedOn: 'nope' }), rec({ id: 'r2' })], 'en')).toContain('2026-11-01');
  });
});

describe('changesetSource', () => {
  it('joins distinct sources once each', () => {
    const list = [rec({ source: 'own visit' }), rec({ id: 'r2', source: 'own  visit' }), rec({ id: 'r3', source: 'field notes' })];
    expect(changesetSource(list, 'en')).toBe('own visit and field notes');
    expect(changesetSource(list, 'fr')).toBe('own visit et field notes');
  });
  it('skips blank sources and is empty when there are none', () => {
    expect(changesetSource([rec({ source: ' ' })], 'en')).toBe('');
    expect(changesetSource([], 'en')).toBe('');
  });
});

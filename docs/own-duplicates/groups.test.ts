import { describe, expect, it } from 'vitest';
import { near, own } from './fixtures.js';
import { groupNotes, linkFor, linksAmong } from './groups.js';

describe('linkFor', () => {
  it('links two notes close together with similar names', () => {
    expect(linkFor(own(), near(), 25)).toMatchObject({ a: 'a', b: 'b', reason: 'same-name-close' });
  });
  it('links two notes close together when a name is missing', () => {
    expect(linkFor(own({ name: null }), near(), 25)?.reason).toBe('no-name-close');
    expect(linkFor(own(), near({ name: null }), 25)?.reason).toBe('no-name-close');
  });
  it('does not link different names, however close', () => {
    expect(linkFor(own(), near({ name: 'City Arena', lat: 43.85001 }), 25)).toBeNull();
  });
  it('does not link notes further apart than the distance', () => {
    expect(linkFor(own(), near(), 10)).toBeNull();
    expect(linkFor(own(), near({ lat: 43.9 }), 50)).toBeNull();
  });
  it('does not link a note with a coordinate that is not a number', () => {
    expect(linkFor(own(), near({ lon: Number.NaN }), 25)).toBeNull();
  });
  it('reports the distance in metres', () => {
    const metres = linkFor(own(), near(), 25)?.metres ?? 0;
    expect(metres).toBeGreaterThan(10);
    expect(metres).toBeLessThan(12);
  });
});

describe('linksAmong', () => {
  it('finds each pair once', () => {
    expect(linksAmong([own(), near(), near({ id: 'c', lat: 43.85005 })], 25)).toHaveLength(3);
  });
  it('is empty for none or one', () => {
    expect(linksAmong([], 25)).toEqual([]);
    expect(linksAmong([own()], 25)).toEqual([]);
  });
});

describe('groupNotes', () => {
  it('leaves out notes with no link', () => {
    expect(groupNotes([own(), near({ lat: 44 })])).toEqual([]);
  });
  it('groups a pair, newest first, with a stable key', () => {
    const [group] = groupNotes([own(), near()]);
    expect(group?.notes.map((n) => n.id)).toEqual(['b', 'a']);
    expect(group?.key).toBe('a|b');
    expect(group?.links).toHaveLength(1);
  });
  it('joins notes linked through another note', () => {
    // a-b are 11 m apart, b-c are 11 m apart, a-c are 22 m apart: one group at 15 m.
    const notes = [own(), near(), near({ id: 'c', lat: 43.8502 })];
    const groups = groupNotes(notes, 15);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.notes).toHaveLength(3);
    expect(groups[0]?.links).toHaveLength(2);
  });
  it('keeps separate places in separate groups, largest first', () => {
    const notes = [own(), near(), own({ id: 'x', lat: 44 }), near({ id: 'y', lat: 44.0001 }), near({ id: 'z', lat: 44.00005 })];
    const groups = groupNotes(notes);
    expect(groups.map((g) => g.notes.length)).toEqual([3, 2]);
  });
  it('gives the same key whatever order the notes come in', () => {
    expect(groupNotes([near(), own()])[0]?.key).toBe(groupNotes([own(), near()])[0]?.key);
  });
  it('records the widest link in the group', () => {
    const span = groupNotes([own(), near()])[0]?.spanMetres ?? 0;
    expect(span).toBeGreaterThan(10);
  });
  it('widens with the distance', () => {
    const notes = [own(), near({ lat: 43.8503 })];
    expect(groupNotes(notes, 25)).toEqual([]);
    expect(groupNotes(notes, 50)).toHaveLength(1);
  });
  it('does not change its input', () => {
    const notes = [own(), near()];
    const copy = JSON.parse(JSON.stringify(notes));
    groupNotes(notes);
    expect(notes).toEqual(copy);
  });
});

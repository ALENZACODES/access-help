import { describe, expect, it } from 'vitest';
import { changesObservation, noteChanges, sameNote } from './change.js';
import { note } from './fixtures.js';

describe('noteChanges', () => {
  it('is empty for the same note', () => expect(noteChanges(note(), note())).toEqual([]));
  it('lists each changed field with before and after as text', () => {
    expect(noteChanges(note(), note({ wheelchair: 'no', lat: 43.9 }))).toEqual([
      { field: 'wheelchair', before: 'yes', after: 'no' },
      { field: 'lat', before: '43.85', after: '43.9' },
    ]);
  });
  it('shows a missing name as empty text', () => {
    expect(noteChanges(note({ name: null }), note())).toEqual([{ field: 'name', before: '', after: 'Sample Library' }]);
    expect(noteChanges(note(), note({ name: null }))).toEqual([{ field: 'name', before: 'Sample Library', after: '' }]);
  });
  it('ignores the id', () => expect(noteChanges(note(), note({ id: 'other' }))).toEqual([]));
});

describe('sameNote', () => {
  it('needs the same id and the same fields', () => {
    expect(sameNote(note(), note())).toBe(true);
    expect(sameNote(note(), note({ id: 'other' }))).toBe(false);
    expect(sameNote(note(), note({ source: 'x' }))).toBe(false);
  });
});

describe('changesObservation', () => {
  it('is true for status, date and position', () => {
    for (const over of [{ wheelchair: 'no' }, { observedOn: '2026-11-11' }, { lat: 1 }, { lon: 1 }]) {
      expect(changesObservation(noteChanges(note(), note(over)))).toBe(true);
    }
  });
  it('is false for name, source and licence', () => {
    expect(changesObservation(noteChanges(note(), note({ name: 'New', source: 's', licence: 'ODbL-1.0' })))).toBe(false);
    expect(changesObservation([])).toBe(false);
  });
});

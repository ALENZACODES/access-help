import { describe, expect, it } from 'vitest';
import { cleanDayNotes, cleanNoteText, dayNoteFor, MAX_DAY_NOTE, MAX_DAY_NOTES, noteLength, setDayNote } from './notes.js';

describe('cleanNoteText', () => {
  it('trims, keeps line breaks and removes control characters', () => {
    expect(cleanNoteText('  windy\r\nand cold\u0007 ')).toBe('windy\nand cold');
  });
  it('cuts at the limit by characters, not bytes', () => {
    expect(Array.from(cleanNoteText('é'.repeat(MAX_DAY_NOTE + 20)))).toHaveLength(MAX_DAY_NOTE);
  });
  it('is empty for anything that is not text', () => {
    for (const v of [null, undefined, 3, {}, []]) expect(cleanNoteText(v)).toBe('');
  });
});

describe('cleanDayNotes', () => {
  it('keeps real days with text and drops the rest', () => {
    expect(cleanDayNotes({ '2026-11-10': ' sunny ', '2026-02-30': 'x', 'not a day': 'y', '2026-11-11': '   ', '2026-11-12': 7 })).toEqual({ '2026-11-10': 'sunny' });
  });
  it('is empty for anything that is not a plain map', () => {
    for (const v of [null, 'x', 3, [], undefined]) expect(cleanDayNotes(v)).toEqual({});
  });
  it('keeps the newest days when there are too many', () => {
    const many: Record<string, string> = {};
    for (let i = 0; i < MAX_DAY_NOTES + 10; i += 1) {
      const d = new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10);
      many[d] = 'n';
    }
    const out = cleanDayNotes(many);
    expect(Object.keys(out)).toHaveLength(MAX_DAY_NOTES);
    expect(out['2024-01-01']).toBeUndefined();
  });
});

describe('setDayNote', () => {
  it('sets a note on a new map', () => {
    const before = {};
    const out = setDayNote(before, '2026-11-10', ' windy ');
    expect(out).toEqual({ ok: true, notes: { '2026-11-10': 'windy' } });
    expect(before).toEqual({});
  });
  it('replaces a note for the same day', () => {
    const out = setDayNote({ '2026-11-10': 'a' }, '2026-11-10', 'b');
    expect(out.ok && out.notes).toEqual({ '2026-11-10': 'b' });
  });
  it('removes the note when the text is empty', () => {
    const out = setDayNote({ '2026-11-10': 'a', '2026-11-11': 'b' }, '2026-11-10', '  ');
    expect(out.ok && out.notes).toEqual({ '2026-11-11': 'b' });
  });
  it('refuses a key that is not a day', () => expect(setDayNote({}, '2026-13-01', 'x')).toEqual({ ok: false, reason: 'not-a-day' }));
  it('refuses a new day when the list is full, but still lets an existing day change', () => {
    const full: Record<string, string> = {};
    for (let i = 0; i < MAX_DAY_NOTES; i += 1) full[new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10)] = 'n';
    expect(setDayNote(full, '2026-11-10', 'x')).toEqual({ ok: false, reason: 'too-many' });
    expect(setDayNote(full, '2025-01-01', 'changed').ok).toBe(true);
  });
});

describe('dayNoteFor and noteLength', () => {
  it('returns the note or empty text', () => {
    expect(dayNoteFor({ '2026-11-10': 'a' }, '2026-11-10')).toBe('a');
    expect(dayNoteFor({}, '2026-11-10')).toBe('');
  });
  it('counts characters after cleaning', () => {
    expect(noteLength('  héllo ')).toBe(5);
    expect(noteLength('😀😀')).toBe(2);
  });
});

import { describe, expect, it } from 'vitest';
import {
  MAX_NOTES,
  MAX_NOTE_LENGTH,
  NOTE_UI,
  cleanNote,
  frenchIssues,
  getNote,
  lintCopy,
  parseNotes,
  pruneNotes,
  serialiseNotes,
  setNote,
} from './index';

describe('cleanNote', () => {
  it('trims and normalises line endings', () => {
    expect(cleanNote('  a\r\nb\rc  ')).toBe('a\nb\nc');
  });

  it('removes control characters but keeps new lines and tabs out of the way', () => {
    expect(cleanNote('a\u0000b\u0007c\u007fd')).toBe('abcd');
    expect(cleanNote('a\nb')).toBe('a\nb');
  });

  it('cuts to the limit by characters, not by code units', () => {
    const emoji = '🙂'.repeat(MAX_NOTE_LENGTH + 20);
    expect(Array.from(cleanNote(emoji))).toHaveLength(MAX_NOTE_LENGTH);
  });
});

describe('setNote / getNote', () => {
  it('stores a note and reads it back', () => {
    const n = setNote({}, 'a', '  Ask about the side door  ');
    expect(getNote(n, 'a')).toBe('Ask about the side door');
  });

  it('replaces a note and does not change the input', () => {
    const first = setNote({}, 'a', 'one');
    const second = setNote(first, 'a', 'two');
    expect(getNote(first, 'a')).toBe('one');
    expect(getNote(second, 'a')).toBe('two');
  });

  it('removes the entry when the note is empty', () => {
    expect(setNote({ a: 'x' }, 'a', '   ')).toEqual({});
  });

  it('returns an empty string for missing notes, including names on the prototype', () => {
    expect(getNote({}, 'a')).toBe('');
    expect(getNote({}, 'constructor')).toBe('');
    expect(getNote({}, '__proto__')).toBe('');
  });

  it('keeps the newest notes when over the cap', () => {
    let n = {};
    for (let i = 0; i < MAX_NOTES + 5; i += 1) n = setNote(n, `p${i}`, 'x');
    expect(Object.keys(n)).toHaveLength(MAX_NOTES);
    expect(getNote(n, 'p0')).toBe('');
    expect(getNote(n, `p${MAX_NOTES + 4}`)).toBe('x');
  });

  it('moves an edited note to the newest position', () => {
    let n = setNote({}, 'a', '1');
    n = setNote(n, 'b', '2');
    n = setNote(n, 'a', '3');
    expect(Object.keys(n)).toEqual(['b', 'a']);
  });
});

describe('pruneNotes, serialise and parse', () => {
  it('keeps only notes for known places', () => {
    expect(pruneNotes({ a: '1', b: '2' }, ['a'])).toEqual({ a: '1' });
  });

  it('round-trips', () => {
    const n = { a: 'one', b: 'two\nlines' };
    expect(parseNotes(serialiseNotes(n))).toEqual(n);
  });

  it('drops entries that are not text and cleans the rest', () => {
    expect(parseNotes('{"a":"  ok ","b":5,"c":null,"d":"   "}')).toEqual({ a: 'ok' });
  });

  it.each(['nope', '[]', '"x"', '7', 'null'])('rejects %s', (text) => {
    expect(parseNotes(text)).toBeNull();
  });
});

describe('note wording', () => {
  it('says the note stays on this device and does not change what is reported', () => {
    expect(NOTE_UI.en.label('Hall')).toContain('kept on this device');
    expect(NOTE_UI.en.hint).toContain('does not change what is reported');
    expect(NOTE_UI.fr.hint).toContain('ne change pas ce qui est signalé');
  });

  it('passes the copy and French checks', () => {
    for (const lang of ['en', 'fr'] as const) {
      const ui = NOTE_UI[lang];
      for (const s of [ui.label('Hall'), ui.hint, ui.copy('Hall'), ui.copyShort, ui.yourNote]) {
        expect(lintCopy(s)).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(s)).toEqual([]);
      }
    }
  });
});

import { describe, expect, it } from 'vitest';
import { emptyCriteria } from './criteria.js';
import { simple, strict } from './fixtures.js';
import { MAX_SETS, MAX_SET_NAME, cleanSetName, emptySetBook, findSet, mergeSetBooks, readSetBook, removeSet, saveSet, type SetBook } from './sets.js';

function bookOf(...names: string[]): SetBook {
  let book = emptySetBook();
  for (const name of names) {
    const result = saveSet(book, name, simple());
    if (result.ok) book = result.book;
  }
  return book;
}

describe('named sets of numbers', () => {
  it('start empty', () => {
    expect(emptySetBook()).toEqual({ version: 1, sets: [] });
  });
  it('save a set under a tidy name with an id', () => {
    const result = saveSet(emptySetBook(), '  Manual   chair ', simple());
    expect(result.ok && result.set).toEqual({ id: 'set-1', name: 'Manual chair', criteria: simple() });
  });
  it('replace a set with the same name, whatever its letter case, and keep its id', () => {
    const result = saveSet(bookOf('Manual chair', 'Power chair'), 'manual CHAIR', strict());
    expect(result.ok && result.book.sets.map((s) => [s.id, s.name])).toEqual([
      ['set-1', 'manual CHAIR'],
      ['set-2', 'Power chair'],
    ]);
    expect(result.ok && result.set.criteria).toEqual(strict());
  });
  it('refuse a set with no name or with nothing set', () => {
    expect(saveSet(emptySetBook(), '   ', simple())).toEqual({ ok: false, issue: 'name-empty' });
    expect(saveSet(emptySetBook(), 'Empty', emptyCriteria())).toEqual({ ok: false, issue: 'nothing-set' });
  });
  it('keep only so many sets, but still let one be replaced', () => {
    const book = bookOf(...Array.from({ length: MAX_SETS }, (_, i) => `Set ${i}`));
    expect(saveSet(book, 'One more', simple())).toEqual({ ok: false, issue: 'too-many' });
    expect(saveSet(book, 'set 0', strict()).ok).toBe(true);
  });
  it('reuse the id of a removed set', () => {
    const book = removeSet(bookOf('A', 'B', 'C'), 'set-2');
    const result = saveSet(book, 'D', simple());
    expect(result.ok && result.set.id).toBe('set-2');
  });
  it('remove and find sets', () => {
    const book = bookOf('A', 'B');
    expect(removeSet(book, 'set-1').sets.map((s) => s.name)).toEqual(['B']);
    expect(removeSet(book, 'nope')).toBe(book);
    expect(findSet(book, 'set-2')?.name).toBe('B');
    expect(findSet(book, 'nope')).toBeNull();
  });
  it('tidy a name: one line, no control characters, a fixed length', () => {
    expect(cleanSetName('a\nb\tc')).toBe('a b c');
    expect(cleanSetName('x\u0000y\u007fz')).toBe('xyz');
    expect([...cleanSetName('é'.repeat(80))]).toHaveLength(MAX_SET_NAME);
    expect(cleanSetName(42)).toBe('');
  });
  it('do not change the book they were given', () => {
    const book = bookOf('A');
    const copy = JSON.stringify(book);
    saveSet(book, 'B', simple());
    removeSet(book, 'set-1');
    expect(JSON.stringify(book)).toBe(copy);
  });
});

describe('reading stored sets', () => {
  it('reads back what was stored', () => {
    const book = bookOf('A', 'B');
    expect(readSetBook(JSON.parse(JSON.stringify(book)))).toEqual({ book, dropped: 0 });
  });
  it('reads anything else as no sets', () => {
    for (const bad of [null, 'x', [], {}, { version: 2, sets: [] }, { version: 1, sets: 'no' }]) expect(readSetBook(bad)).toEqual({ book: emptySetBook(), dropped: 0 });
  });
  it('drops a set with a bad id, no name, nothing set, or a repeated id or name', () => {
    const good = { id: 'set-1', name: 'A', criteria: simple() };
    const read = readSetBook({ version: 1, sets: [good, { ...good, id: 'x' }, { ...good, id: 'set-2', name: ' ' }, { ...good, id: 'set-3', name: 'B', criteria: {} }, { ...good, name: 'C' }, { ...good, id: 'set-4', name: 'a' }, 'junk'] });
    expect(read.book.sets).toEqual([good]);
    expect(read.dropped).toBe(6);
  });
  it('cleans the numbers inside a stored set', () => {
    const read = readSetBook({ version: 1, sets: [{ id: 'set-1', name: 'A', criteria: { ...simple(), minDoorWidthCm: 99999 } }] });
    expect(read.book.sets[0]?.criteria).toMatchObject({ maxSteps: 0, minDoorWidthCm: null });
  });
  it('holds no more than the App keeps', () => {
    const sets = Array.from({ length: MAX_SETS + 2 }, (_, i) => ({ id: `set-${i + 1}`, name: `S${i}`, criteria: simple() }));
    const read = readSetBook({ version: 1, sets });
    expect(read.book.sets).toHaveLength(MAX_SETS);
    expect(read.dropped).toBe(2);
  });
});

describe('adding sets from a backup', () => {
  it('adds sets whose name is not on the device', () => {
    const merged = mergeSetBooks(bookOf('A'), bookOf('B', 'C'));
    expect(merged.book.sets.map((s) => s.name)).toEqual(['A', 'B', 'C']);
    expect(merged).toMatchObject({ added: 2, skipped: 0 });
    expect(new Set(merged.book.sets.map((s) => s.id)).size).toBe(3);
  });
  it('leaves a set with the same name as it is on the device', () => {
    const current = saveSet(emptySetBook(), 'A', strict());
    const merged = mergeSetBooks(current.ok ? current.book : emptySetBook(), bookOf('a'));
    expect(merged).toMatchObject({ added: 0, skipped: 1 });
    expect(merged.book.sets[0]?.criteria).toEqual(strict());
  });
  it('skips what does not fit', () => {
    const full = bookOf(...Array.from({ length: MAX_SETS }, (_, i) => `Set ${i}`));
    expect(mergeSetBooks(full, bookOf('New'))).toMatchObject({ added: 0, skipped: 1 });
  });
});

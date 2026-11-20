import { describe, expect, it } from 'vitest';
import { MAX_MEASURED, emptyBook, measuresFor, mergeBooks, pruneBook, putMeasures, readBook, removeMeasures, type MeasureBook } from './book.js';
import { full, sparse } from './fixtures.js';

function bookOf(...ids: string[]): MeasureBook {
  let book = emptyBook();
  for (const id of ids) {
    const result = putMeasures(book, full({ recordId: id }));
    if (result.ok) book = result.book;
  }
  return book;
}

describe('measure book', () => {
  it('starts empty', () => {
    expect(emptyBook()).toEqual({ version: 1, entries: [] });
    expect(measuresFor(emptyBook(), 'a1')).toBeNull();
  });
  it('saves measures and finds them by observation', () => {
    const book = bookOf('a1');
    expect(measuresFor(book, 'a1')).toEqual(full());
    expect(measuresFor(book, 'a2')).toBeNull();
  });
  it('replaces the measures of an observation instead of adding a second entry', () => {
    const result = putMeasures(bookOf('a1'), sparse());
    expect(result.ok && result.book.entries).toEqual([sparse()]);
  });
  it('keeps entries sorted by observation id', () => {
    expect(bookOf('c', 'a', 'b').entries.map((e) => e.recordId)).toEqual(['a', 'b', 'c']);
  });
  it('refuses a new entry when the book is full, but still lets one be replaced', () => {
    const ids = Array.from({ length: MAX_MEASURED }, (_, i) => `m${String(i).padStart(3, '0')}`);
    const book = bookOf(...ids);
    expect(putMeasures(book, full({ recordId: 'new' }))).toEqual({ ok: false, reason: 'book-full' });
    expect(putMeasures(book, sparse({ recordId: 'm000' })).ok).toBe(true);
  });
  it('removes measures and leaves the book alone when there were none', () => {
    const book = bookOf('a1', 'a2');
    expect(removeMeasures(book, 'a1').entries.map((e) => e.recordId)).toEqual(['a2']);
    expect(removeMeasures(book, 'zz')).toBe(book);
  });
  it('drops measures for observations that are no longer saved', () => {
    const book = bookOf('a1', 'a2', 'a3');
    expect(pruneBook(book, ['a2']).entries.map((e) => e.recordId)).toEqual(['a2']);
    expect(pruneBook(book, ['a1', 'a2', 'a3', 'a4'])).toBe(book);
  });
  it('does not change the book it was given', () => {
    const book = bookOf('a1');
    const copy = JSON.stringify(book);
    putMeasures(book, sparse({ recordId: 'a2' }));
    removeMeasures(book, 'a1');
    expect(JSON.stringify(book)).toBe(copy);
  });
});

describe('reading a stored book', () => {
  it('reads back what was stored', () => {
    const book = bookOf('a1', 'a2');
    expect(readBook(JSON.parse(JSON.stringify(book)))).toEqual({ book, dropped: 0 });
  });
  it('reads anything else as an empty book', () => {
    for (const bad of [null, 'x', [], {}, { version: 2, entries: [] }, { version: 1, entries: 'no' }]) expect(readBook(bad)).toEqual({ book: emptyBook(), dropped: 0 });
  });
  it('drops entries it cannot use and counts them', () => {
    const read = readBook({ version: 1, entries: [full(), { recordId: 'bad' }, 'junk', full({ recordId: 'a2' })] });
    expect(read.book.entries.map((e) => e.recordId)).toEqual(['a1', 'a2']);
    expect(read.dropped).toBe(2);
  });
  it('keeps the first entry for an observation and drops a second', () => {
    const read = readBook({ version: 1, entries: [full(), sparse()] });
    expect(read.book.entries).toEqual([full()]);
    expect(read.dropped).toBe(1);
  });
  it('holds no more than the book keeps', () => {
    const entries = Array.from({ length: MAX_MEASURED + 3 }, (_, i) => full({ recordId: `m${i}` }));
    const read = readBook({ version: 1, entries });
    expect(read.book.entries).toHaveLength(MAX_MEASURED);
    expect(read.dropped).toBe(3);
  });
});

describe('adding measures from a backup', () => {
  it('adds measures for saved observations that have none', () => {
    const merged = mergeBooks(bookOf('a1'), bookOf('a2', 'a3'), ['a1', 'a2', 'a3']);
    expect(merged.book.entries.map((e) => e.recordId)).toEqual(['a1', 'a2', 'a3']);
    expect(merged).toMatchObject({ added: 2, skipped: 0 });
  });
  it('never replaces measures already on the device', () => {
    const current = putMeasures(emptyBook(), sparse());
    const merged = mergeBooks(current.ok ? current.book : emptyBook(), bookOf('a1'), ['a1']);
    expect(merged.book.entries).toEqual([sparse()]);
    expect(merged).toMatchObject({ added: 0, skipped: 1 });
  });
  it('leaves out measures for an observation that is not saved', () => {
    const merged = mergeBooks(emptyBook(), bookOf('a1', 'gone'), ['a1']);
    expect(merged.book.entries.map((e) => e.recordId)).toEqual(['a1']);
    expect(merged).toMatchObject({ added: 1, skipped: 1 });
  });
  it('changes nothing for an empty backup', () => {
    const book = bookOf('a1');
    expect(mergeBooks(book, emptyBook(), ['a1'])).toEqual({ book, added: 0, skipped: 0 });
  });
});

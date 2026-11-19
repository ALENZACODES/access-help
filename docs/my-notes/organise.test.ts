import { describe, expect, it } from 'vitest';
import { note, notes } from './fixtures.js';
import { cleanSort, fold, searchNotes, sortNotes, summariseNotes } from './organise.js';

const ids = (list: readonly { id: string }[]) => list.map((n) => n.id);

describe('fold and cleanSort', () => {
  it('folds case and accents', () => expect(fold('  Café ')).toBe('cafe'));
  it('keeps a known sort and falls back to newest', () => {
    expect(cleanSort('name')).toBe('name');
    expect(cleanSort('sideways')).toBe('newest');
  });
});

describe('searchNotes', () => {
  it('returns everything for empty text, as a copy', () => {
    const list = notes();
    expect(searchNotes(list, '  ')).toEqual(list);
    expect(searchNotes(list, '')).not.toBe(list);
  });
  it('matches the name without accents or case', () => expect(ids(searchNotes(notes(), 'cafe'))).toEqual(['n2']));
  it('matches the source, the id, the status, the licence and the date', () => {
    expect(ids(searchNotes(notes(), 'field'))).toEqual(['n2']);
    expect(ids(searchNotes(notes(), 'n3'))).toEqual(['n3']);
    expect(ids(searchNotes(notes(), 'unknown'))).toEqual(['n3']);
    expect(ids(searchNotes(notes(), 'odbl'))).toEqual(['n3']);
    expect(ids(searchNotes(notes(), '2025-12'))).toEqual(['n4']);
  });
  it('needs every word typed', () => {
    expect(ids(searchNotes(notes(), 'sample own'))).toEqual(['n1']);
    expect(searchNotes(notes(), 'sample field')).toEqual([]);
  });
  it('finds nothing for text that is not there', () => expect(searchNotes(notes(), 'zzz')).toEqual([]));
});

describe('sortNotes', () => {
  it('sorts newest and oldest by the date seen', () => {
    expect(ids(sortNotes(notes(), 'newest'))).toEqual(['n3', 'n1', 'n2', 'n4']);
    expect(ids(sortNotes(notes(), 'oldest'))).toEqual(['n4', 'n2', 'n1', 'n3']);
  });
  it('sorts by name without accents, with unnamed places last', () => {
    expect(ids(sortNotes(notes(), 'name'))).toEqual(['n4', 'n2', 'n1', 'n3']);
  });
  it('sorts by status with UNKNOWN first', () => {
    expect(sortNotes(notes(), 'status').map((n) => n.wheelchair)).toEqual(['UNKNOWN', 'no', 'limited', 'yes']);
  });
  it('treats an unrecognised status like UNKNOWN', () => {
    expect(sortNotes([note(), note({ id: 'x', wheelchair: 'maybe' })], 'status')[0]?.id).toBe('x');
  });
  it('does not change its input', () => {
    const list = notes();
    const before = ids(list);
    sortNotes(list, 'name');
    expect(ids(list)).toEqual(before);
  });
});

describe('summariseNotes', () => {
  const s = summariseNotes(notes());
  it('counts by status, known statuses first', () => {
    expect(s.total).toBe(4);
    expect(s.byStatus).toEqual([{ key: 'yes', count: 1 }, { key: 'limited', count: 1 }, { key: 'no', count: 1 }, { key: 'UNKNOWN', count: 1 }]);
  });
  it('counts by licence and by month, newest month first', () => {
    expect(s.byLicence).toEqual([{ key: 'CC0-1.0', count: 3 }, { key: 'ODbL-1.0', count: 1 }]);
    expect(s.byMonth).toEqual([{ key: '2026-11', count: 2 }, { key: '2026-10', count: 1 }, { key: '2025-12', count: 1 }]);
  });
  it('gives the span and the unnamed count', () => expect(s).toMatchObject({ oldest: '2025-12-30', newest: '2026-11-12', unnamed: 1 }));
  it('is empty and calm with no notes', () => {
    expect(summariseNotes([])).toEqual({ total: 0, byStatus: [], byLicence: [], byMonth: [], unnamed: 0, oldest: null, newest: null });
  });
});

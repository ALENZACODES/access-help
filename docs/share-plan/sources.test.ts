import { describe, expect, it } from 'vitest';
import { awkward, mixed, rec } from './fixtures.js';
import { SOURCE_COLUMNS, countStatus, csvCell, emptyStatusCounts, sourceRows, sourcesCsv, sourcesCsvFilename, statusCountsOf, tidySource } from './sources.js';

describe('source rows', () => {
  it('gives one row per source and licence, ignoring case and extra spaces', () => {
    const rows = sourceRows(mixed());
    expect(rows.map((r) => [r.source, r.licence, r.count])).toEqual([
      ['Sample open pack', 'ODbL-1.0', 2],
      ['own visit', 'CC0-1.0', 2],
    ]);
  });
  it('keeps the earliest and latest dates as written', () => {
    const [pack, own] = sourceRows(mixed());
    expect([pack?.from, pack?.to]).toEqual(['2026-09-15', '2026-09-20']);
    expect([own?.from, own?.to]).toEqual(['2026-10-01', '2026-11-10']);
  });
  it('counts statuses and keeps anything else as unknown', () => {
    const [pack, own] = sourceRows(mixed());
    expect(pack?.statuses).toEqual({ yes: 0, limited: 1, no: 1, unknown: 0 });
    expect(own?.statuses).toEqual({ yes: 1, limited: 0, no: 0, unknown: 1 });
    expect(statusCountsOf([rec({ wheelchair: 'maybe' }), rec({ wheelchair: '' }), rec({ wheelchair: 'YES' })])).toEqual({ yes: 0, limited: 0, no: 0, unknown: 3 });
  });
  it('marks credit as asked only for ODbL-1.0', () => {
    expect(sourceRows(mixed()).map((r) => r.creditAsked)).toEqual([true, false]);
  });
  it('keeps a licence the App does not take, marked as such', () => {
    const row = sourceRows(awkward()).find((r) => r.licence === 'CC-BY-4.0');
    expect(row).toMatchObject({ accepted: false, creditAsked: false, count: 1 });
  });
  it('keeps a record with no source in a row of its own', () => {
    const row = sourceRows(awkward()).find((r) => r.source === '');
    expect(row).toMatchObject({ count: 1, licence: 'CC0-1.0', statuses: { unknown: 1 } });
  });
  it('puts rows that ask for credit first, then the larger rows', () => {
    const rows = sourceRows([rec({ id: 'a' }), rec({ id: 'b' }), rec({ id: 'c', source: 'z pack', licence: 'ODbL-1.0' }), rec({ id: 'd', source: 'other', licence: 'CC-BY-4.0' })]);
    expect(rows.map((r) => r.licence)).toEqual(['ODbL-1.0', 'CC0-1.0', 'CC-BY-4.0']);
  });
  it('returns nothing for no records and does not change its input', () => {
    expect(sourceRows([])).toEqual([]);
    const input = mixed();
    const copy = JSON.stringify(input);
    sourceRows(input);
    expect(JSON.stringify(input)).toBe(copy);
  });
  it('tidies a source and counts one status at a time', () => {
    expect(tidySource('  a   b\t c ')).toBe('a b c');
    const counts = emptyStatusCounts();
    countStatus(counts, 'limited');
    countStatus(counts, 'UNKNOWN');
    expect(counts).toEqual({ yes: 0, limited: 1, no: 0, unknown: 1 });
  });
});

describe('sources CSV', () => {
  it('has a header and one line per row, ending each line with CRLF', () => {
    const csv = sourcesCsv(sourceRows(mixed()));
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(SOURCE_COLUMNS.join(','));
    expect(lines[1]).toBe('Sample open pack,ODbL-1.0,yes,yes,2,2026-09-15,2026-09-20,0,1,1,0');
    expect(lines[2]).toBe('own visit,CC0-1.0,yes,no,2,2026-10-01,2026-11-10,1,0,0,1');
    expect(lines[3]).toBe('');
  });
  it('quotes commas and quotes, and defuses a formula', () => {
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell(12)).toBe('12');
  });
  it('writes only the header when there are no rows', () => {
    expect(sourcesCsv([])).toBe(`${SOURCE_COLUMNS.join(',')}\r\n`);
  });
  it('names the file by the day it was made', () => {
    expect(sourcesCsvFilename('2026-11-19')).toBe('sources-2026-11-19.csv');
  });
});

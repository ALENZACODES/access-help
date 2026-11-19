import { describe, expect, it } from 'vitest';
import { cells, headerMap, rec, TODAY } from './fixtures.js';
import { madeId, parseRow, parseRows, readCoordinate, readLicence, readStatus, unguard, type RowIssueCode } from './row.js';

const map = headerMap();
const parse = (over: Parameters<typeof cells>[0] = {}, line = 2) => parseRow({ line, cells: cells(over) }, map, TODAY);
const codes = (over: Parameters<typeof cells>[0]): RowIssueCode[] => {
  const out = parse(over);
  return out.ok ? [] : out.issues.map((i) => i.code);
};

describe('readStatus', () => {
  it('reads the plain words in English and French', () => {
    expect(readStatus('yes').status).toBe('yes');
    expect(readStatus('Oui').status).toBe('yes');
    expect(readStatus('LIMITED').status).toBe('limited');
    expect(readStatus('limité').status).toBe('limited');
    expect(readStatus('no').status).toBe('no');
    expect(readStatus('Non').status).toBe('no');
    expect(readStatus('unknown')).toEqual({ status: 'UNKNOWN', note: null });
    expect(readStatus('Inconnu')).toEqual({ status: 'UNKNOWN', note: null });
  });
  it('keeps an empty status as UNKNOWN and says so', () => {
    expect(readStatus('')).toEqual({ status: 'UNKNOWN', note: { code: 'status-empty' } });
  });
  it('never guesses from an unrecognised word', () => {
    for (const word of ['maybe', 'ok', 'accessible', 'y', '1', 'true', 'ramp']) {
      expect(readStatus(word)).toEqual({ status: 'UNKNOWN', note: { code: 'status-unrecognised', value: word } });
    }
  });
});

describe('readCoordinate', () => {
  it('reads points and decimal commas', () => {
    expect(readCoordinate('43.85', 90)).toBe(43.85);
    expect(readCoordinate('43,85', 90)).toBe(43.85);
    expect(readCoordinate('-79.4', 180)).toBe(-79.4);
    expect(readCoordinate("'-79.4", 180)).toBe(-79.4);
    expect(readCoordinate('+12', 90)).toBe(12);
  });
  it('rejects text, blanks and out-of-range numbers', () => {
    for (const v of ['', 'north', '43.8.5', '1e2', '43 N', '--4']) expect(readCoordinate(v, 90)).toBeNull();
    expect(readCoordinate('90.1', 90)).toBeNull();
    expect(readCoordinate('-180.5', 180)).toBeNull();
  });
});

describe('readLicence', () => {
  it('accepts the two open licences in any letter case', () => {
    expect(readLicence('cc0-1.0')).toBe('CC0-1.0');
    expect(readLicence(' ODBL-1.0 ')).toBe('ODbL-1.0');
  });
  it('rejects everything else', () => {
    for (const v of ['', 'CC-BY-4.0', 'CC0', 'public domain', 'MIT']) expect(readLicence(v)).toBeNull();
  });
});

describe('unguard', () => {
  it('removes the apostrophe before a formula start only', () => {
    expect(unguard("'=SUM(A1)")).toBe('=SUM(A1)');
    expect(unguard("'-79.4")).toBe('-79.4');
    expect(unguard("'Hello")).toBe("'Hello");
    expect(unguard('plain')).toBe('plain');
  });
});

describe('parseRow', () => {
  it('builds a record from a good line', () => {
    expect(parse()).toEqual({ ok: true, line: 2, notes: [], record: rec() });
  });
  it('keeps the source, licence and date exactly', () => {
    const out = parse({ source: 'field  notes ', licence: 'odbl-1.0', observed_on: '2026-10-05' });
    expect(out.ok && out.record).toMatchObject({ source: 'field notes', licence: 'ODbL-1.0', observedOn: '2026-10-05' });
  });
  it('turns an empty name into null', () => {
    const out = parse({ name: '' });
    expect(out.ok && out.record.name).toBeNull();
  });
  it('makes an id from the day and line when the sheet has none', () => {
    const out = parse({ id: '' }, 7);
    expect(out.ok && out.record.id).toBe(madeId(TODAY, 7));
    expect(out.ok && out.notes).toEqual([{ code: 'id-made' }]);
  });
  it('keeps an unrecognised status as UNKNOWN with a note, and still accepts the line', () => {
    const out = parse({ status: 'maybe' });
    expect(out.ok && out.record.wheelchair).toBe('UNKNOWN');
    expect(out.ok && out.notes).toEqual([{ code: 'status-unrecognised', value: 'maybe' }]);
  });
  it('reports each missing required cell', () => {
    expect(codes({ latitude: '', longitude: '', source: '', licence: '', observed_on: '' })).toEqual(['lat-missing', 'lon-missing', 'source-missing', 'licence-missing', 'date-missing']);
  });
  it('reports invalid cells', () => {
    expect(codes({ latitude: 'north' })).toEqual(['lat-invalid']);
    expect(codes({ longitude: '200' })).toEqual(['lon-invalid']);
    expect(codes({ licence: 'CC-BY-4.0' })).toEqual(['licence-not-open']);
    expect(codes({ observed_on: '2026-02-30' })).toEqual(['date-invalid']);
    expect(codes({ observed_on: '2026-11-19' })).toEqual(['date-future']);
    expect(codes({ name: 'x'.repeat(256) })).toEqual(['name-too-long']);
    expect(codes({ source: 'x'.repeat(256) })).toEqual(['source-too-long']);
    expect(codes({ id: 'has space' })).toEqual(['id-invalid']);
    expect(codes({ id: 'x'.repeat(65) })).toEqual(['id-invalid']);
  });
  it('accepts today as the date', () => expect(parse({ observed_on: TODAY }).ok).toBe(true));
  it('names the field each issue belongs to', () => {
    const out = parse({ latitude: 'x', licence: 'nope' });
    expect(!out.ok && out.issues.map((i) => i.field)).toEqual(['latitude', 'licence']);
  });
  it('keeps the name on a rejected line so the screen can show it', () => {
    const out = parse({ source: '' });
    expect(!out.ok && out.name).toBe('Sample Library');
  });
  it('reads a line shorter than the header as empty cells', () => {
    const out = parseRow({ line: 2, cells: ['a1', 'Cafe'] }, map, TODAY);
    expect(out.ok).toBe(false);
  });
  it('removes the spreadsheet guard from a name', () => {
    const out = parse({ name: "'=Cafe" });
    expect(out.ok && out.record.name).toBe('=Cafe');
  });
});

describe('parseRows', () => {
  it('rejects a later line that repeats an id', () => {
    const out = parseRows([{ line: 2, cells: cells() }, { line: 3, cells: cells({ name: 'Other' }) }], map, TODAY);
    expect(out[0]?.ok).toBe(true);
    expect(out[1]).toMatchObject({ ok: false, line: 3, issues: [{ field: 'id', code: 'id-repeated' }], name: 'Other' });
  });
  it('does not count a rejected line as having used its id', () => {
    const out = parseRows([{ line: 2, cells: cells({ source: '' }) }, { line: 3, cells: cells() }], map, TODAY);
    expect(out.map((r) => r.ok)).toEqual([false, true]);
  });
  it('gives lines without ids different made ids', () => {
    const out = parseRows([{ line: 2, cells: cells({ id: '' }) }, { line: 3, cells: cells({ id: '' }) }], map, TODAY);
    expect(out.every((r) => r.ok)).toBe(true);
  });
  it('is empty for no rows', () => expect(parseRows([], map, TODAY)).toEqual([]));
});

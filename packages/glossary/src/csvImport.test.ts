import { describe, expect, it } from 'vitest';
import { DEFAULT_VALUE_MAP, importClaims, parseCsv, type ImportOptions, type Provenance } from './index';

const prov: Provenance = {
  source: 'City open data, entrance survey',
  licence: 'OGL-Canada-2.0',
  date: '2026-10-01',
  url: 'https://example.org/data',
};

const options: ImportOptions = {
  idColumn: 'id',
  nameColumn: 'name',
  featureColumns: { ramp: 'ramp', elevator: 'lift' },
  provenance: prov,
  today: '2026-11-15',
};

describe('parseCsv', () => {
  it('splits simple rows', () => {
    expect(parseCsv('a,b\n1,2\n').rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles quotes, commas, doubled quotes and newlines inside quotes', () => {
    expect(parseCsv('"a,b","say ""hi""","x\ny"').rows).toEqual([['a,b', 'say "hi"', 'x\ny']]);
  });

  it('handles CRLF and a BOM, and drops blank lines', () => {
    expect(parseCsv('﻿a,b\r\n\r\n1,2\r\n').rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps empty fields and a last row without a newline', () => {
    expect(parseCsv('a,,c\n,,').rows).toEqual([
      ['a', '', 'c'],
      ['', '', ''],
    ]);
  });

  it('flags an unterminated quote', () => {
    expect(parseCsv('a,"b').unterminatedQuote).toBe(true);
    expect(parseCsv('a,"b"').unterminatedQuote).toBe(false);
  });

  it('returns no rows for empty input', () => {
    expect(parseCsv('').rows).toEqual([]);
    expect(parseCsv('\n\n').rows).toEqual([]);
  });
});

describe('importClaims', () => {
  const csv = ['id,name,ramp,lift', 'p1,Library,Present,absent', 'p2,"Cafe, Main",yes,'].join('\n');

  it('builds places with sourced claims', () => {
    const r = importClaims(csv, options);
    expect(r.problems).toEqual([]);
    expect(r.rejected).toEqual([]);
    expect(r.places.map((p) => p.name)).toEqual(['Library', 'Cafe, Main']);
    expect(r.places[0]?.claims).toEqual([
      { termId: 'ramp', status: 'present', provenance: prov },
      { termId: 'elevator', status: 'absent', provenance: prov },
    ]);
  });

  it('turns unmapped cells into unknown, without provenance', () => {
    const r = importClaims(csv, options);
    expect(r.places[1]?.claims).toEqual([
      { termId: 'ramp', status: 'unknown' },
      { termId: 'elevator', status: 'unknown' },
    ]);
  });

  it('accepts a custom value map (for example French cells)', () => {
    const r = importClaims('id,name,ramp,lift\na,A,Oui,NON', {
      ...options,
      valueMap: { oui: 'present', non: 'absent' },
    });
    expect(r.places[0]?.claims.map((c) => c.status)).toEqual(['present', 'absent']);
  });

  it('matches column names ignoring case and spaces around them', () => {
    const r = importClaims(' ID , Name ,RAMP,Lift\na,A,present,present', options);
    expect(r.problems).toEqual([]);
    expect(r.places).toHaveLength(1);
  });

  it('rejects bad rows and keeps the good ones', () => {
    const rows = [
      'id,name,ramp,lift',
      'a,Alpha,present,present',
      'b,Beta,present',
      ',NoId,present,present',
      'c,,present,present',
      'a,Again,absent,absent',
      'd,Delta,absent,absent',
    ].join('\n');
    const r = importClaims(rows, options);
    expect(r.places.map((p) => p.id)).toEqual(['a', 'd']);
    expect(r.rejected).toEqual([
      { line: 3, reason: 'wrong-column-count' },
      { line: 4, reason: 'missing-id' },
      { line: 5, reason: 'missing-name' },
      { line: 6, reason: 'duplicate-id' },
    ]);
  });

  it('imports nothing without valid provenance', () => {
    const bad = importClaims(csv, { ...options, provenance: { ...prov, licence: 'Proprietary' } });
    expect(bad.problems).toContain('provenance-invalid');
    expect(bad.places).toEqual([]);
    const future = importClaims(csv, { ...options, provenance: { ...prov, date: '2027-01-01' } });
    expect(future.problems).toContain('provenance-invalid');
  });

  it('reports missing columns and unknown terms', () => {
    const r = importClaims('id,name,ramp\na,A,present', options);
    expect(r.problems).toEqual(['missing-column:lift']);
    expect(r.places).toEqual([]);
    const t = importClaims(csv, { ...options, featureColumns: { nope: 'ramp' } });
    expect(t.problems).toEqual(['unknown-term:nope']);
  });

  it('reports an empty file and an unterminated quote', () => {
    expect(importClaims('', options).problems).toContain('empty-file');
    expect(importClaims('id,name,ramp,lift\na,"A,present,present', options).problems).toContain('unterminated-quote');
  });

  it('exports a default value map that never guesses', () => {
    expect(DEFAULT_VALUE_MAP['yes']).toBeUndefined();
    expect(DEFAULT_VALUE_MAP['present']).toBe('present');
  });
});

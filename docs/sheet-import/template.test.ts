import { describe, expect, it } from 'vitest';
import { rec, TODAY } from './fixtures.js';
import { readSheet } from './read.js';
import { recordsSheet, sheetCell, templateColumns, templateFilename, templateSheet } from './template.js';

describe('sheetCell', () => {
  it('quotes separators, quotes and line breaks', () => {
    expect(sheetCell('a,b')).toBe('"a,b"');
    expect(sheetCell('a;b')).toBe('"a;b"');
    expect(sheetCell('say "hi"')).toBe('"say ""hi"""');
  });
  it('guards a formula start', () => {
    for (const v of ['=1', '+1', '-1', '@a']) expect(sheetCell(v).startsWith("'")).toBe(true);
  });
  it('leaves plain text alone', () => expect(sheetCell('Cafe')).toBe('Cafe'));
});

describe('templateSheet', () => {
  for (const lang of ['en', 'fr'] as const) {
    it(`reads back with every column recognised (${lang})`, () => {
      const out = readSheet(templateSheet(lang, TODAY), TODAY);
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.headers.unkept).toEqual([]);
      expect(out.headers.missing).toEqual([]);
      expect(out.rows).toHaveLength(1);
      expect(out.rows[0]?.ok).toBe(true);
    });
    it(`has an example line that says it is an example and keeps UNKNOWN (${lang})`, () => {
      const out = readSheet(templateSheet(lang, TODAY), TODAY);
      const row = out.ok ? out.rows[0] : undefined;
      expect(row?.ok && row.record.wheelchair).toBe('UNKNOWN');
      expect(row?.ok && row.record.source).toMatch(/exemple|example/);
    });
  }
  it('starts with a byte order mark so accents open correctly', () => expect(templateSheet('fr', TODAY).charCodeAt(0)).toBe(0xfeff));
  it('has eight columns in both languages', () => {
    expect(templateColumns('en')).toHaveLength(8);
    expect(templateColumns('fr')).toHaveLength(8);
  });
  it('names the file in each language', () => {
    expect(templateFilename('en')).toBe('my-observations-template.csv');
    expect(templateFilename('fr')).toBe('mes-observations-modele.csv');
  });
});

describe('recordsSheet', () => {
  const records = [rec(), rec({ id: 'a2', name: null, wheelchair: 'UNKNOWN', licence: 'ODbL-1.0' }), rec({ id: 'a3', name: '=Odd, "name"', source: 'notes; page 2' })];
  for (const lang of ['en', 'fr'] as const) {
    it(`round-trips saved observations through a sheet (${lang})`, () => {
      const out = readSheet(recordsSheet(records, lang), TODAY);
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.rows.map((r) => (r.ok ? r.record : null))).toEqual(records);
    });
  }
  it('writes UNKNOWN as UNKNOWN', () => expect(recordsSheet(records, 'en')).toContain(',UNKNOWN,'));
  it('is a header only for no records', () => expect(recordsSheet([], 'en').trim().split('\r\n')).toHaveLength(1));
});

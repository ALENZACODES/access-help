import { describe, expect, it } from 'vitest';
import { cells, sheetText, TODAY } from './fixtures.js';
import { readSheet } from './read.js';

describe('readSheet', () => {
  it('reads a good sheet', () => {
    const out = readSheet(sheetText([cells(), cells({ id: 'a2', status: '' })]), TODAY);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.delimiter).toBe(',');
    expect(out.rows.map((r) => r.ok)).toEqual([true, true]);
  });
  it('reads a semicolon sheet with decimal commas and French column names', () => {
    const text = 'nom;etat;latitude;longitude;source;licence;vu_le\nCafé Exemple;oui;43,85123;-79,43456;visite;CC0-1.0;2026-11-01';
    const out = readSheet(text, TODAY);
    expect(out.ok && out.delimiter).toBe(';');
    const row = out.ok ? out.rows[0] : undefined;
    expect(row?.ok && row.record).toMatchObject({ name: 'Café Exemple', wheelchair: 'yes', lat: 43.85123, lon: -79.43456 });
  });
  it('reports a file problem', () => {
    expect(readSheet('', TODAY)).toEqual({ ok: false, reason: 'file', code: 'empty' });
  });
  it('reports missing columns before reading any row', () => {
    const out = readSheet('name,lat,lon\nCafe,43.8,-79.4', TODAY);
    expect(out).toMatchObject({ ok: false, reason: 'headers' });
    expect(!out.ok && out.reason === 'headers' && out.headers.missing).toEqual(['source', 'licence', 'observedOn']);
  });
  it('keeps good lines when others have problems', () => {
    const out = readSheet(sheetText([cells(), cells({ id: 'a2', licence: 'nope' }), cells({ id: 'a3' })]), TODAY);
    expect(out.ok && out.rows.map((r) => r.ok)).toEqual([true, false, true]);
  });
  it('reports the line a problem is on, counting the header as line 1', () => {
    const out = readSheet(sheetText([cells(), cells({ id: 'a2', source: '' })]), TODAY);
    expect(out.ok && out.rows[1]?.line).toBe(3);
  });
  it('counts blank lines', () => {
    const out = readSheet(`${sheetText([cells()])}\r\n\r\n`, TODAY);
    expect(out.ok && out.blankLines).toBe(1);
    const mid = readSheet(sheetText([cells(), ['', '', '', '', '', '', '', ''], cells({ id: 'a2' })]), TODAY);
    expect(mid.ok && mid.blankLines).toBe(1);
  });
});

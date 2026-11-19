import { describe, expect, it } from 'vitest';
import { compareAll } from './compare.js';
import { mine, pack, TODAY } from './fixtures.js';
import { COMPARE_COLUMNS, compareCell, compareCsv, compareFilename, compareText } from './report.js';

const report = compareAll([mine(), mine({ id: 'm2', lat: 44.5, name: null, wheelchair: 'UNKNOWN' }), mine({ id: 'm3', lat: 43.9, name: '=Odd, "name"' })], [pack(), pack({ id: 'p2', lat: 43.9001, name: null, wheelchair: 'no' })]);

describe('compareCell', () => {
  it('quotes and guards', () => {
    expect(compareCell('a,b')).toBe('"a,b"');
    expect(compareCell('=1').startsWith("'")).toBe(true);
    expect(compareCell('plain')).toBe('plain');
  });
});

describe('compareCsv', () => {
  const csv = compareCsv(report, 'en');
  const lines = csv.replace(/^﻿/, '').trimEnd().split('\r\n');
  it('starts with a byte order mark and the fixed header', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0]).toBe(COMPARE_COLUMNS.join(','));
  });
  it('has one line per observation', () => expect(lines).toHaveLength(4));
  it('keeps source, licence and date for both sides and UNKNOWN as the tier', () => {
    const row = lines.find((l) => l.startsWith('m1,'));
    expect(row).toContain('own visit,CC0-1.0,2026-11-10');
    expect(row).toContain('sample pack,ODbL-1.0,2026-10-01,UNKNOWN');
  });
  it('leaves the pack columns empty with no match and still writes the tier', () => {
    expect(lines.find((l) => l.startsWith('m2,'))).toMatch(/,none,,,,,,,,UNKNOWN$/);
  });
  it('guards a name that starts like a formula', () => expect(csv).toContain(`"'=Odd, ""name"""`));
  it('writes the outcome in the asked language', () => expect(compareCsv(report, 'fr')).toContain('Votre note et le paquet diffèrent'));
});

describe('compareText', () => {
  const text = compareText(report, TODAY, 'en');
  it('starts with the day and the summary', () => {
    expect(text.split('\n')[0]).toBe('My notes beside the packs, 2026-11-18');
    expect(text).toContain('Observations compared: 3.');
  });
  it('sets my record beside the pack record', () => {
    expect(text).toContain('Mine - Status: yes. Source: own visit.');
    expect(text).toContain('Pack - Sample Library (p1) - Status: yes. Source: sample pack.');
  });
  it('names an unnamed place plainly and gives advice for each', () => {
    expect(text).toContain('Place without a name (m2)');
    expect(text).toContain('may still be on the map');
  });
  it('is in French when asked', () => expect(compareText(report, TODAY, 'fr')).toContain('Mes notes à côté des paquets, 2026-11-18'));
});

describe('compareFilename', () => {
  it('names the file by day', () => expect(compareFilename('txt', TODAY)).toBe('my-notes-beside-packs-2026-11-18.txt'));
});

import { describe, expect, it } from 'vitest';
import { buildDayLog } from './days.js';
import { log, sample, TODAY } from './fixtures.js';
import { dayReportFilename, dayReportText, DAYS_COLUMNS, daysCsv, daysCsvFilename, logCell } from './report.js';

const dayLog = buildDayLog(sample());

describe('logCell', () => {
  it('quotes and guards', () => {
    expect(logCell('a,b')).toBe('"a,b"');
    expect(logCell('=1').startsWith("'")).toBe(true);
    expect(logCell('plain')).toBe('plain');
  });
});

describe('dayReportText', () => {
  const text = dayReportText(dayLog.days[1]!, '', 'en');
  it('starts with the day written out', () => expect(text.split('\n')[0]).toBe('Tuesday, 10 November 2026 (2026-11-10)'));
  it('lists each note with its record line', () => {
    expect(text).toContain('Sample Library (n1)');
    expect(text).toContain('  Status: yes. Source: own visit. Licence: CC0-1.0. Seen on 2026-11-10. Tier: UNKNOWN.');
    expect(text).toContain('Place without a name (n2)');
  });
  it('leaves the day note out unless one is given', () => {
    expect(text).not.toContain('My note for the day');
    expect(dayReportText(dayLog.days[1]!, ' windy ', 'en')).toContain('My note for the day\nwindy\n');
  });
  it('is in French when asked', () => expect(dayReportText(dayLog.days[1]!, 'vent', 'fr')).toContain('Ma note pour la journée\nvent'));
  it('ends with one line break', () => expect(text.endsWith('\n') && !text.endsWith('\n\n')).toBe(true));
});

describe('daysCsv', () => {
  const csv = daysCsv(dayLog);
  const lines = csv.replace(/^﻿/, '').trimEnd().split('\r\n');
  it('starts with a byte order mark and the fixed header', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0]).toBe(DAYS_COLUMNS.join(','));
  });
  it('has one line per day, oldest first, and no line for a bad date', () => {
    expect(lines.slice(1).map((l) => l.split(',')[0])).toEqual(['2026-10-30', '2026-11-10', '2026-11-12']);
  });
  it('writes every status count, UNKNOWN included', () => {
    expect(lines[2]).toBe('2026-11-10,2,1,0,0,1,1,CC0-1.0 1 | ODbL-1.0 1,field notes | own visit,1112');
  });
  it('guards a source that starts like a formula', () => {
    expect(daysCsv(buildDayLog([log({ source: '=cmd' })]))).toContain("'=cmd");
  });
  it('is a header only for no days', () => expect(daysCsv(buildDayLog([])).trim().split('\r\n')).toHaveLength(1));
});

describe('filenames', () => {
  it('names the files', () => {
    expect(dayReportFilename('2026-11-10')).toBe('my-day-2026-11-10.txt');
    expect(daysCsvFilename(TODAY)).toBe('my-days-2026-11-19.csv');
  });
});

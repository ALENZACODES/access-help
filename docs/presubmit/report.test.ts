import { describe, expect, it } from 'vitest';
import { checkAll } from './batch.js';
import { rec, TODAY } from './fixtures.js';
import { csvCell, REPORT_COLUMNS, reportCsv, reportFilename, reportText } from './report.js';

const report = checkAll([rec({ id: 'a' }), rec({ id: 'b', lat: 43.9, name: null, wheelchair: 'UNKNOWN', source: '' })], TODAY);

describe('csvCell', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });
  it('neutralises formulas', () => {
    for (const v of ['=1+1', '+1', '-1', '@x', '\tx']) expect(csvCell(v).startsWith("'")).toBe(true);
  });
  it('leaves plain text alone', () => expect(csvCell('Sample')).toBe('Sample'));
});

describe('reportCsv', () => {
  const csv = reportCsv(report, 'en');
  const lines = csv.split('\r\n');
  it('starts with the fixed header', () => expect(lines[0]).toBe(REPORT_COLUMNS.join(',')));
  it('ends with a line break', () => expect(csv.endsWith('\r\n')).toBe(true));
  it('has a row for a clear record and one per finding otherwise', () => {
    const findings = report.items.reduce((n, i) => n + Math.max(1, i.findings.length), 0);
    expect(lines.length).toBe(findings + 2);
  });
  it('lists the tags and leaves UNKNOWN out of them', () => {
    expect(csv).toContain('name=Sample Library | wheelchair=yes');
    expect(csv).not.toContain('wheelchair=UNKNOWN');
  });
  it('is in French when asked', () => expect(reportCsv(report, 'fr')).toContain('À corriger avant de copier'));
});

describe('reportText', () => {
  const text = reportText(report, TODAY, 'en');
  it('names the day and gives the summary', () => {
    expect(text.split('\n')[0]).toBe('Check before you submit, 2026-11-16');
    expect(text).toContain('These checks look for slips only.');
  });
  it('lists licences, places and tags', () => {
    expect(text).toContain('CC0-1.0: 2 places');
    expect(text).toContain('Sample Library (a)');
    expect(text).toContain('  wheelchair=yes');
  });
  it('calls an unnamed place by a plain label', () => expect(text).toContain('Place without a name (b)'));
  it('writes the French spacing before a colon', () => expect(reportText(report, TODAY, 'fr')).toContain('CC0-1.0 : 2 lieux'));
  it('is empty-safe', () => expect(reportText(checkAll([], TODAY), TODAY, 'en')).toContain('You have no saved observations to check.'));
});

describe('reportFilename', () => {
  it('names the file by day', () => expect(reportFilename('csv', TODAY)).toBe('check-before-submit-2026-11-16.csv'));
});

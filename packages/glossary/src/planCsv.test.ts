import { describe, expect, it } from 'vitest';
import {
  BOM,
  CSV_MIME,
  CSV_UI,
  buildPlan,
  csvCell,
  csvFilename,
  csvRow,
  frenchIssues,
  lintCopy,
  parseCsv,
  planToCsv,
  type FeatureClaim,
  type Lang,
  type Place,
} from './index';

const today = '2026-11-15';
const prov = { source: 'City open data', licence: 'CC0-1.0', date: '2026-06-01' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const plan = (lang: Lang, names: string[], asked: Record<string, string[]> = {}) => {
  const places: Place[] = names.map((name, i) => ({ id: `p${i}`, name, claims: i === 0 ? [yes('ramp')] : [] }));
  return buildPlan(places, places.map((p) => p.id), ['ramp', 'elevator'], today, lang, asked);
};

describe('csvCell', () => {
  it('leaves plain text alone', () => {
    expect(csvCell('Library')).toBe('Library');
    expect(csvCell('')).toBe('');
  });
  it('quotes a cell with a comma, quote or line break, doubling quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('one\ntwo')).toBe('"one\ntwo"');
    expect(csvCell('one\r\ntwo')).toBe('"one\r\ntwo"');
  });
  it.each(['=1+1', '+SUM(A1)', '-2', '@cmd', '\tx', '\rx'])('makes %j harmless in a spreadsheet', (value) => {
    expect(csvCell(value).replace(/^"/, '').startsWith("'")).toBe(true);
  });
  it('does not touch a dash or equals sign that is not first', () => {
    expect(csvCell('step-free')).toBe('step-free');
    expect(csvCell('a=b')).toBe('a=b');
  });
  it('keeps a formula start harmless even when it also needs quotes', () => {
    expect(csvCell('=HYPERLINK("x","y")')).toBe('"\'=HYPERLINK(""x"",""y"")"');
  });
});

describe('csvRow', () => {
  it('joins cells with commas', () => {
    expect(csvRow(['a', 'b,c', ''])).toBe('a,"b,c",');
  });
});

describe('planToCsv', () => {
  it('starts with a byte-order mark and the header, and ends with a line end', () => {
    const csv = planToCsv(plan('en', ['Library']), 'en');
    expect(csv.startsWith(`${BOM}Place,Question to ask,Status,Why we ask\r\n`)).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
  });
  it('is the header alone for an empty plan', () => {
    expect(planToCsv([], 'en')).toBe(`${BOM}Place,Question to ask,Status,Why we ask\r\n`);
  });
  it('has one row per question', () => {
    const csv = planToCsv(plan('en', ['Library', 'Café']), 'en');
    expect(csv.split('\r\n').filter((l) => l !== '').length).toBe(1 + 3);
  });
  it('says asked or to ask', () => {
    const csv = planToCsv(plan('en', ['Library'], { p0: ['elevator'] }), 'en');
    expect(csv).toContain(CSV_UI.en.asked);
    expect(csv).not.toContain(CSV_UI.en.toAsk);
    expect(planToCsv(plan('en', ['Library']), 'en')).toContain(CSV_UI.en.toAsk);
  });
  it('can be read back by the importer, line for line', () => {
    const csv = planToCsv(plan('en', ['Café, "Nord"', 'Gym']), 'en');
    const result = parseCsv(csv);
    expect(result.unterminatedQuote).toBe(false);
    const parsed = result.rows;
    expect(parsed[0]).toEqual([...CSV_UI.en.columns]);
    expect(parsed.slice(1).map((r) => r[0])).toContain('Café, "Nord"');
    expect(parsed.every((r) => r.length === 4)).toBe(true);
  });
  it('makes a place name that starts like a formula harmless', () => {
    const csv = planToCsv(plan('en', ['=cmd|calc']), 'en');
    expect(csv).toContain("'=cmd|calc");
    expect(csv).not.toMatch(/\r\n=cmd/);
  });
  it('uses French headings and words', () => {
    const csv = planToCsv(plan('fr', ['Bibliothèque']), 'fr');
    expect(csv).toContain('Lieu,Question à poser,État,Pourquoi nous demandons');
    expect(csv).toContain('Bibliothèque');
    for (const w of [CSV_UI.fr.asked, CSV_UI.fr.toAsk, CSV_UI.fr.exportCsv]) expect(frenchIssues(w)).toEqual([]);
  });
  it('has wording that passes the rules', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      expect(lintCopy(planToCsv(plan(lang, ['Library']), lang))).toEqual([]);
    }
  });
});

describe('file details', () => {
  it('is CSV in UTF-8', () => {
    expect(CSV_MIME).toBe('text/csv;charset=utf-8');
    expect(csvFilename('fr')).toBe('visit-plan-fr.csv');
  });
  it('has four columns in both languages', () => {
    expect(CSV_UI.en.columns.length).toBe(4);
    expect(CSV_UI.fr.columns.length).toBe(4);
  });
});

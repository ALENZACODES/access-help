import { describe, expect, it } from 'vitest';
import {
  YEARS_EXPORT_ID,
  YEARS_UI,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  readabilityIssues,
  recordAgeCounts,
  recordYears,
  renderYears,
  yearRowText,
  yearsFilename,
  yearsText,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const today = '2026-11-19';
const at = (date: string, source = 'City open data'): Provenance => ({ source, licence: 'CC0-1.0', date, tier: 'tier-1' });
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', at('2026-10-01')), c('elevator', 'absent', at('2026-01-15', 'Transit agency')), c('grab-bar', 'present', at('2024-06-30'))] },
  { id: 'cafe', name: 'Café', claims: [c('ramp', 'absent', at('2024-02-02', 'Transit agency')), c('elevator', 'present'), c('grab-bar', 'unknown', at('2019-01-01'))] },
  { id: 'pool', name: 'Pool', claims: [] },
  { id: 'hall', name: 'Hall', claims: [c('ramp', 'present', at('2026-03-03')), c('elevator', 'present', { ...at('2021-01-01'), licence: 'Proprietary' }), c('not-a-term', 'present', at('2018-01-01')), c('automatic-door', 'present', at('2024-12-31'))] },
];

describe('recordYears', () => {
  const totals = recordYears(places);
  it('has one row for each year with a usable record, newest first', () => {
    expect(totals.rows.map((r) => r.year)).toEqual(['2026', '2024']);
  });
  it('counts records, what they report, places and sources', () => {
    expect(totals.rows[0]).toEqual({ year: '2026', records: 3, present: 2, absent: 1, places: 2, sources: 2 });
    expect(totals.rows[1]).toEqual({ year: '2024', records: 3, present: 2, absent: 1, places: 3, sources: 2 });
  });
  it('gives the total and the oldest and newest dates', () => {
    expect(totals.records).toBe(6);
    expect(totals.oldest).toBe('2024-02-02');
    expect(totals.newest).toBe('2026-10-01');
  });
  it('leaves out records that cannot be reported, unknown records and unknown features', () => {
    expect(totals.rows.some((r) => ['2021', '2019', '2018'].includes(r.year))).toBe(false);
  });
  it('adds up to the count used by the older-records panel', () => {
    expect(totals.rows.reduce((n, r) => n + r.records, 0)).toBe(recordAgeCounts(places, today).total);
    for (const r of totals.rows) expect(r.present + r.absent).toBe(r.records);
  });
  it('is empty for no places', () => {
    expect(recordYears([])).toEqual({ rows: [], records: 0, oldest: '', newest: '' });
  });
  it('does not change the places', () => {
    const before = JSON.stringify(places);
    recordYears(places);
    expect(JSON.stringify(places)).toBe(before);
  });
});

describe('texts', () => {
  const totals = recordYears(places);
  it('writes a year as one line', () => {
    expect(yearRowText(totals.rows[0] as (typeof totals.rows)[number], 'en')).toBe('2026: records 3. Reported as available: 2. Reported as not available: 1.');
  });
  it('is French with French spacing', () => {
    const text = yearRowText(totals.rows[1] as (typeof totals.rows)[number], 'fr');
    expect(text).toBe('2024\u00a0: fiches 3. Signalé comme disponible\u00a0: 2. Signalé comme non disponible\u00a0: 1.');
    expect(frenchIssues(text)).toEqual([]);
  });
  it('gives the table as text', () => {
    expect(yearsText(places, 'en', today)).toBe(
      'Records by year\nMade on 2026-11-19.\n\nThis counts the records that can be reported, by the year of their source.\nThe dates run from 2024-02-02 to 2026-10-01.\n\n' +
        '- 2026: records 3. Reported as available: 2. Reported as not available: 1.\n- 2024: records 3. Reported as available: 2. Reported as not available: 1.\n',
    );
  });
  it('says so when every record has the same date, and when there are none', () => {
    expect(yearsText([{ id: 'a', name: 'A', claims: [c('ramp', 'present', at('2026-10-01'))] }], 'fr', today)).toContain('Chaque fiche date du 2026-10-01.');
    expect(yearsText([], 'en', today)).toBe('Records by year\nMade on 2026-11-19.\n\nThere are no records that can be reported.\n');
  });
  it('names the file by language', () => {
    expect(yearsFilename('en')).toBe('records-by-year-en.txt');
    expect(yearsFilename('fr')).toBe('records-by-year-fr.txt');
  });
});

describe('renderYears', () => {
  it('says so when no record can be reported', () => {
    expect(renderYears([places[2] as Place], 'en', true)).toBe('<p class="gl-note">There are no records that can be reported.</p>');
  });
  it('has the span of dates and a captioned table with a row for each year', () => {
    const html = renderYears(places, 'en', false);
    expect(html).toContain('<p role="status">The dates run from 2024-02-02 to 2026-10-01.</p>');
    expect(html).toContain('<caption>How many records there are for each year</caption>');
    expect(html).toContain('<tr><th scope="row">2026</th><td>3</td><td>2</td><td>1</td><td>2</td><td>2</td></tr><tr><th scope="row">2024</th>');
    expect(html.match(/<th scope="col">/g)).toHaveLength(6);
    expect(html).not.toContain(YEARS_EXPORT_ID);
  });
  it('has the save button when the host takes files', () => {
    expect(renderYears(places, 'fr', true)).toContain(`id="${YEARS_EXPORT_ID}">Enregistrer ce tableau en texte</button>`);
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><details><summary>${YEARS_UI[lang].heading}</summary>${renderYears(places, lang, true)}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('YEARS_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = YEARS_UI[lang];
    return [
      ui.heading, ui.intro, ui.none, ui.span('2026-10-01', '2026-10-01'), ui.span('2024-02-02', '2026-10-01'), ui.caption, ui.year, ui.records, ui.present, ui.absent, ui.places, ui.sources,
      ui.exportList, ui.title, ui.made(today), ui.line('2026', 3), ui.detail(2, 1),
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(YEARS_UI.fr)).toEqual(Object.keys(YEARS_UI.en));
  });
  it('passes the copy rules in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of samples(lang)) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(plainLanguageIssues(text), text).toEqual([]);
        expect(readabilityIssues(text, lang), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
});

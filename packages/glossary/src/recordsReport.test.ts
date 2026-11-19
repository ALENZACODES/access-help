import { describe, expect, it } from 'vitest';
import {
  PLAIN_TERMS,
  REPORT_EXPORT_ID,
  REPORT_KEYS,
  REPORT_UI,
  auditHtml,
  disagreementRows,
  frenchIssues,
  glance,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  problemRows,
  readabilityIssues,
  recordAgeCounts,
  recordsReport,
  renderReport,
  reportFilename,
  reportLines,
  reportText,
  reportValue,
  sourceNames,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const N = PLAIN_TERMS.length;

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit)] },
  { id: 'cafe', name: 'Café', claims: [c('ramp', 'present', { ...city, licence: 'Proprietary' }), c('elevator', 'present'), c('grab-bar', 'unknown', city)] },
  { id: 'pool', name: 'Pool', claims: [] },
  { id: 'hall', name: 'Hall', claims: [c('ramp', 'present', city), c('ramp', 'absent', transit), c('not-a-term', 'present', city)] },
];

describe('recordsReport', () => {
  const report = recordsReport(places, today);
  it('counts the places and the records', () => {
    expect(report.places).toBe(4);
    expect(report.held).toBe(6);
    expect(report.usable).toBe(4);
    expect(report.notUsable).toBe(2);
  });
  it('counts what needs a look', () => {
    expect(report.disagreements).toBe(1);
    expect(report.older).toBe(2);
    expect(report.problems).toBe(problemRows(places, 'en', today).length);
    expect(report.problems).toBeGreaterThanOrEqual(2);
  });
  it('counts sources and the open licences in use', () => {
    expect(report.sources).toBe(2);
    expect(report.licences).toBe(2);
  });
  it('counts what is unknown', () => {
    expect(report.unknownPairs).toBe(4 * N - 2);
    expect(report.unknownPercent).toBe(Math.round(((4 * N - 2) / (4 * N)) * 100));
  });
  it('agrees with the panels it is built from', () => {
    const ages = recordAgeCounts(places, today);
    const g = glance(places);
    expect(report.usable).toBe(ages.total);
    expect(report.usable).toBe(g.records);
    expect(report.older).toBe(ages.aging + ages.old);
    expect(report.disagreements).toBe(disagreementRows(places, 'fr').length);
    expect(report.sources).toBe(sourceNames(places).length);
    expect(report.unknownPairs).toBe(g.unknownPairs);
    expect(report.held).toBe(report.usable + report.notUsable);
  });
  it('is all zero for no places', () => {
    const empty = recordsReport([], today);
    for (const key of REPORT_KEYS) expect(empty[key], key).toBe(0);
  });
  it('never counts an unknown as something reported', () => {
    const only: Place[] = [{ id: 'a', name: 'A', claims: [c('ramp', 'unknown', city), c('elevator', 'present')] }];
    const r = recordsReport(only, today);
    expect(r.usable).toBe(0);
    expect(r.unknownPairs).toBe(N);
    expect(r.unknownPercent).toBe(100);
  });
  it('does not change the places', () => {
    const before = JSON.stringify(places);
    recordsReport(places, today);
    expect(JSON.stringify(places)).toBe(before);
  });
});

describe('texts', () => {
  const report = recordsReport(places, today);
  it('writes each count as a value', () => {
    expect(reportValue(report, 'places', 'en')).toBe('4');
    expect(reportValue(report, 'unknownPercent', 'en')).toBe(`${report.unknownPercent} percent`);
    expect(reportValue(report, 'unknownPercent', 'fr')).toBe(`${report.unknownPercent} pour cent`);
  });
  it('has one line for each count, in a fixed order', () => {
    const lines = reportLines(report, 'en');
    expect(lines).toHaveLength(REPORT_KEYS.length);
    expect(lines[0]).toBe('Places: 4');
    expect(lines[1]).toBe('Records held: 6');
    expect(lines[2]).toBe('Records that can be reported: 4');
    expect(lines[5]).toBe('Features where sources disagree: 1');
  });
  it('is French with French spacing and the token', () => {
    const lines = reportLines(report, 'fr');
    expect(lines[0]).toBe('Lieux\u00a0: 4');
    expect(lines[10]).toBe(`Part des caractéristiques qui sont UNKNOWN\u00a0: ${report.unknownPercent} pour cent`);
    for (const line of lines) {
      expect(frenchIssues(line), line).toEqual([]);
      expect(line).not.toMatch(/inconnues?(?![a-zà-ÿ])/i);
    }
  });
  it('gives the summary as text', () => {
    const text = reportText(places, 'en', today);
    expect(text.startsWith('Summary of the records\nMade on 2026-11-19.\n\nThese are counts of the records held on this device. They do not rate any place.\n\n- Places: 4\n- Records held: 6\n')).toBe(true);
    expect(text.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(REPORT_KEYS.length);
    expect(text.endsWith('percent\n')).toBe(true);
  });
  it('names the file by language', () => {
    expect(reportFilename('en')).toBe('records-summary-en.txt');
    expect(reportFilename('fr')).toBe('records-summary-fr.txt');
  });
});

describe('renderReport', () => {
  it('has a captioned table with a row header for each count', () => {
    const html = renderReport(places, 'en', today, false);
    expect(html).toContain('<caption>The records held, in numbers</caption>');
    expect(html).toContain('<th scope="col">What is counted</th><th scope="col">Count</th>');
    expect(html).toContain('<tr data-count="places"><th scope="row">Places</th><td>4</td></tr>');
    expect(html).toContain('<tr data-count="usable"><th scope="row">Records that can be reported</th><td>4</td></tr>');
    expect(html.match(/<tr data-count=/g)).toHaveLength(REPORT_KEYS.length);
    expect(html).not.toContain(REPORT_EXPORT_ID);
  });
  it('shows zeros for no places', () => {
    const html = renderReport([], 'fr', today, false);
    expect(html).toContain('<tr data-count="places"><th scope="row">Lieux</th><td>0</td></tr>');
    expect(html).toContain('<td>0 pour cent</td>');
  });
  it('has the save button when the host takes files', () => {
    expect(renderReport(places, 'fr', today, true)).toContain(`id="${REPORT_EXPORT_ID}">Enregistrer ce résumé en texte</button>`);
  });
  it('says the counts do not rate a place', () => {
    expect(renderReport(places, 'en', today, false)).toContain('They do not rate any place.');
    expect(renderReport(places, 'fr', today, false)).toContain('Ils ne notent aucun lieu.');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><details><summary>${REPORT_UI[lang].heading}</summary>${renderReport(places, lang, today, true)}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('REPORT_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = REPORT_UI[lang];
    return [ui.heading, ui.intro, ui.caption, ui.what, ui.count, ...REPORT_KEYS.map((k) => ui.labels[k]), ui.percent(94), ui.exportList, ui.title, ui.made(today), ui.line('Places', '4')];
  };
  it('has the same keys in both languages, and a label for every count', () => {
    expect(Object.keys(REPORT_UI.fr)).toEqual(Object.keys(REPORT_UI.en));
    expect(Object.keys(REPORT_UI.en.labels)).toEqual([...REPORT_KEYS]);
    expect(Object.keys(REPORT_UI.fr.labels)).toEqual([...REPORT_KEYS]);
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

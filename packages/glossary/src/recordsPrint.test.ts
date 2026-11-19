import { describe, expect, it } from 'vitest';
import {
  LICENCE_UI,
  PRINT_MIME,
  RECORDSPRINT_UI,
  RECORDS_PRINT_ID,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  readabilityIssues,
  recordsPrintFile,
  recordsPrintFilename,
  renderRecordsPrintButton,
  renderRecordsPrintPage,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit), c('grab-bar', 'present')] },
  { id: 'cafe', name: 'Café <Nord>', claims: [] },
];
const opts = (lang: Lang) => ({ lang, today: '2026-11-19' });
const main = (html: string): string => html.replace(/^[\s\S]*<main>/, '<main>').replace(/<\/main>[\s\S]*$/, '</main>');

describe('renderRecordsPrintPage', () => {
  const html = renderRecordsPrintPage(places, opts('en'));
  it('is a whole page with a title, the date and the counts', () => {
    expect(html.startsWith('<!doctype html><html lang="en-CA">')).toBe(true);
    expect(html).toContain('<title>Records for every place</title>');
    expect(html).toContain('Printed on 2026-11-19.');
    expect(html).toContain('2 places, 3 records.');
  });
  it('has a table for each place with source, licence, date and tier on every row', () => {
    expect(html).toContain('<caption>Every record we hold for Library</caption>');
    expect(html).toContain('<tr><th scope="row">Ramp</th><td>reported as available</td><td>City open data</td><td>CC0-1.0</td><td>2026-10-01</td><td>Tier 1</td></tr>');
    expect(html).toContain('<td>Transit agency</td><td>OGL-Canada-2.0</td><td>2025-03-04</td><td>Tier unknown</td>');
  });
  it('shows a record with no source as unknown, with Unknown in every empty cell', () => {
    expect(html).toContain('<tr><th scope="row">Grab bar</th><td>unknown</td><td>Unknown</td><td>Unknown</td><td>Unknown</td><td>Tier unknown</td></tr>');
  });
  it('says so for a place with no records', () => {
    expect(html).toContain('We hold no records for this place. Every feature is unknown.');
  });
  it('ends with the credits, what the licences ask and the note about tiers', () => {
    expect(html).toContain('<h2>Where the information comes from</h2>');
    expect(html).toContain('Contains information from City open data, dated 2026-10-01. Licence: CC0-1.0 (Creative Commons Zero 1.0).');
    expect(html).toContain('<li>Say where the data came from.</li>');
    expect(html).toContain(LICENCE_UI.en.note);
    expect(html).toContain('A tier is a label');
    expect(html.indexOf('Where the information comes from')).toBeGreaterThan(html.indexOf('Every record we hold for Library'));
  });
  it('credits the source of the place list when there is one', () => {
    const withList = renderRecordsPrintPage(places, { ...opts('en'), listSource: { source: 'Region list', licence: 'CC-BY-4.0', date: '2026-09-09' } });
    expect(withList).toContain('Contains information from Region list, dated 2026-09-09.');
  });
  it('has no script, image, link or handler, and escapes names', () => {
    for (const bad of ['<script', '<img', '<a ', 'onclick', 'href=']) expect(html).not.toContain(bad);
    expect(html).not.toContain('<Nord>');
    expect(html).toContain('Café &lt;Nord&gt;');
  });
  it('never says a place is accessible, and says what the page is', () => {
    expect(html).not.toMatch(/accessible/i);
    expect(html).toContain(RECORDSPRINT_UI.en.note);
  });
  it('says so with no places, and has no credits then', () => {
    const empty = renderRecordsPrintPage([], opts('en'));
    expect(empty).toContain(RECORDSPRINT_UI.en.none);
    expect(empty).not.toContain('Where the information comes from');
  });
  it('is French, with the UNKNOWN token and spaced colons', () => {
    const fr = renderRecordsPrintPage(places, opts('fr'));
    expect(fr).toContain('lang="fr-CA"');
    expect(fr).toContain('Imprimé le 2026-11-19.');
    expect(fr).toContain('Chaque caractéristique est UNKNOWN.');
    expect(fr).toContain('Licence\u00a0: CC0-1.0');
  });
  it.each(['en', 'fr'] as Lang[])('passes the markup audit in %s', (lang) => {
    expect(auditHtml(`<div lang="${lang}">${main(renderRecordsPrintPage(places, opts(lang)))}</div>`, 'print')).toEqual([]);
  });
});

describe('file and button', () => {
  it('makes an html file named by language', () => {
    const f = recordsPrintFile(places, opts('fr'));
    expect(f.mime).toBe(PRINT_MIME);
    expect(f.filename).toBe('records-to-print-fr.html');
    expect(f.text).toContain('<h1>Fiches de tous les lieux</h1>');
    expect(recordsPrintFilename('en')).toBe('records-to-print-en.html');
  });
  it.each(['en', 'fr'] as Lang[])('has a valid button in %s', (lang) => {
    const html = renderRecordsPrintButton(lang);
    expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'btn')).toEqual([]);
    expect(html).toContain(`id="${RECORDS_PRINT_ID}"`);
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = RECORDSPRINT_UI[lang];
    for (const text of [ui.title, ui.date('2026-11-19'), ui.note, ui.counts(2, 5), ui.none, ui.credits, ui.exportPrint]) {
      expect(lintCopy(text), text).toEqual([]);
      expect(lintClaims(text), text).toEqual([]);
      expect(plainLanguageIssues(text), text).toEqual([]);
      expect(readabilityIssues(text, lang), text).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
    }
  });
});

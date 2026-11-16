import { describe, expect, it } from 'vitest';
import {
  LISTPRINT_UI,
  PRINT_MIME,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  listPrintFile,
  listPrintFilename,
  parsePrintListId,
  plainLanguageIssues,
  printListButton,
  printListId,
  readabilityIssues,
  renderListPrintPage,
  type FeatureClaim,
  type Lang,
  type Place,
  type PlaceList,
  type Provenance,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' };
const c = (termId: string, status: FeatureClaim['status']): FeatureClaim => ({ termId, status, provenance: prov });
const places: Place[] = [
  { id: 'a', name: 'Library', claims: [c('ramp', 'present'), c('elevator', 'absent')] },
  { id: 'b', name: 'Pool', claims: [] },
];
const list: PlaceList = { name: 'Saturday', ids: ['a', 'b', 'gone'] };
const opts = (lang: Lang, termIds: string[] = ['ramp', 'elevator']) => ({ lang, today: '2026-11-15', termIds, provenance: prov });

describe('renderListPrintPage', () => {
  it('is a whole page with the list name as title and heading', () => {
    const html = renderListPrintPage(list, places, opts('en'));
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>Saturday</title>');
    expect(html).toContain('<h1>Saturday</h1>');
    expect(html).toContain('Printed on 2026-11-15');
  });
  it('shows each place with the status of each chosen feature, and Unknown where the sources say nothing', () => {
    const html = renderListPrintPage(list, places, opts('en'));
    expect(html).toContain('<h2>Library</h2>');
    expect(html).toContain('<li>Ramp: reported as available</li>');
    expect(html).toContain('<li>Elevator: reported as not available</li>');
    expect(html).toContain('<h2>Pool</h2>');
    expect(html).toContain('<li>Ramp: unknown</li>');
  });
  it('skips places that are not loaded', () => {
    expect(renderListPrintPage(list, places, opts('en'))).not.toContain('gone');
  });
  it('says so for an empty list', () => {
    expect(renderListPrintPage({ name: 'X', ids: [] }, places, opts('en'))).toContain(LISTPRINT_UI.en.empty);
  });
  it('lists only the names when no feature is chosen, and says so', () => {
    const html = renderListPrintPage(list, places, opts('en', []));
    expect(html).toContain(LISTPRINT_UI.en.noFeatures);
    expect(html).not.toContain('<li>');
  });
  it('has the data source when given and not otherwise', () => {
    expect(renderListPrintPage(list, places, opts('en'))).toContain('Source: City open data.');
    expect(renderListPrintPage(list, places, { lang: 'en', today: '2026-11-15', termIds: [] })).not.toContain('Source:');
  });
  it('has no script, image or link', () => {
    const html = renderListPrintPage(list, places, opts('en'));
    for (const bad of ['<script', '<img', '<a ', 'onclick']) expect(html).not.toContain(bad);
  });
  it('escapes names', () => {
    const html = renderListPrintPage({ name: '<b>x</b>', ids: ['a'] }, places, opts('en'));
    expect(html).not.toContain('<b>x');
  });
  it('is French with its own spacing', () => {
    const html = renderListPrintPage(list, places, opts('fr'));
    expect(html).toContain('lang="fr-CA"');
    expect(html).toContain('Imprimé le 2026-11-15');
    expect(html).toContain('Rampe\u00a0:');
  });
  it.each(['en', 'fr'] as Lang[])('passes the markup audit in %s', (lang) => {
    const body = renderListPrintPage(list, places, opts(lang)).replace(/^[\s\S]*<main>/, '<main>').replace(/<\/main>[\s\S]*$/, '</main>');
    expect(auditHtml(`<div lang="${lang}">${body}</div>`, 'print')).toEqual([]);
  });
});

describe('files and ids', () => {
  it('names the file by list', () => {
    expect(listPrintFilename({ name: 'Dentist visit', ids: [] }, 'en')).toBe('list-dentist-visit-en.html');
    expect(listPrintFilename({ name: 'Été', ids: [] }, 'fr')).toBe('list-ete-fr.html');
    expect(listPrintFilename({ name: '***', ids: [] }, 'en')).toBe('list-list-en.html');
  });
  it('makes an html file', () => {
    const f = listPrintFile(list, places, opts('en'));
    expect(f.mime).toBe(PRINT_MIME);
    expect(f.filename).toBe('list-saturday-en.html');
    expect(f.text).toContain('<h1>Saturday</h1>');
  });
  it('round-trips the button id', () => {
    expect(parsePrintListId(printListId(3))).toBe(3);
    for (const id of ['', 'gl-lprint-', 'gl-lprint-x', 'gl-lexp-1']) expect(parsePrintListId(id)).toBeNull();
  });
  it.each(['en', 'fr'] as Lang[])('has a valid, named button in %s', (lang) => {
    const html = printListButton(1, 'Samedi <1>', lang);
    expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'btn')).toEqual([]);
    expect(html).not.toContain('<1>');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = LISTPRINT_UI[lang];
    for (const t of [ui.date('2026-11-15'), ui.note, ui.empty, ui.noFeatures, ui.exportPrint, ui.exportLabel('Saturday')]) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      expect(readabilityIssues(t, lang), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});

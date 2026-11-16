import { describe, expect, it } from 'vitest';
import {
  LOG_EXPORT_ID,
  LOG_UI,
  auditHtml,
  entryText,
  frenchIssues,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  readabilityIssues,
  renderLogExport,
  renderVisitLog,
  visitLog,
  visitLogFilename,
  visitLogToText,
  type Lang,
  type Place,
} from './index';

const places: Place[] = [
  { id: 'a', name: 'Library', claims: [] },
  { id: 'b', name: 'Café Nord', claims: [] },
  { id: 'c', name: 'Pool', claims: [] },
  { id: 'd', name: 'Annex', claims: [] },
];

describe('visitLog', () => {
  it('is empty with no marks', () => {
    expect(visitLog({}, places, 'en')).toEqual([]);
  });
  it('lists newest first', () => {
    const log = visitLog({ a: '2026-10-01', b: '2026-11-10', c: '2026-09-15' }, places, 'en');
    expect(log.map((e) => e.name)).toEqual(['Café Nord', 'Library', 'Pool']);
  });
  it('puts places marked on the same day in name order', () => {
    const log = visitLog({ a: '2026-10-01', d: '2026-10-01', c: '2026-10-01' }, places, 'en');
    expect(log.map((e) => e.name)).toEqual(['Annex', 'Library', 'Pool']);
  });
  it('leaves out marks for places that are not loaded', () => {
    expect(visitLog({ a: '2026-10-01', gone: '2026-10-02' }, places, 'en').map((e) => e.placeId)).toEqual(['a']);
  });
  it('is safe with prototype keys', () => {
    expect(visitLog({}, [{ id: 'constructor', name: 'X', claims: [] }], 'en')).toEqual([]);
    expect(visitLog({}, [{ id: '__proto__', name: 'X', claims: [] }], 'en')).toEqual([]);
  });
  it('does not change its input', () => {
    const visits = { a: '2026-10-01', b: '2026-11-10' };
    const copy = JSON.stringify(visits);
    visitLog(visits, places, 'en');
    expect(JSON.stringify(visits)).toBe(copy);
  });
});

describe('texts', () => {
  it('says when each place was marked', () => {
    expect(entryText({ placeId: 'a', name: 'Library', date: '2026-10-01' }, 'en')).toBe('Library, marked on 2026-10-01');
  });
  it('is clean French', () => {
    expect(entryText({ placeId: 'a', name: 'Bibliothèque', date: '2026-10-01' }, 'fr')).toBe('Bibliothèque, marqué le 2026-10-01');
  });
  it('writes a text file with a count', () => {
    const log = visitLog({ a: '2026-10-01', b: '2026-11-10' }, places, 'en');
    expect(visitLogToText(log, 'en')).toBe('Places visited (2)\n\n- Café Nord, marked on 2026-11-10\n- Library, marked on 2026-10-01\n');
    expect(visitLogToText([], 'en')).toBe('Places visited (0)\n\n');
  });
  it('names the file by language', () => {
    expect(visitLogFilename('en')).toBe('visited-places-en.txt');
    expect(visitLogFilename('fr')).toBe('visited-places-fr.txt');
  });
});

describe('markup', () => {
  const log = visitLog({ a: '2026-10-01', b: '2026-11-10' }, places, 'en');
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const html of [renderVisitLog(log, lang), renderVisitLog([], lang), renderLogExport(log, lang)]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'log')).toEqual([]);
    }
  });
  it('is a numbered list with a count', () => {
    const html = renderVisitLog(log, 'en');
    expect(html).toContain('2 places');
    expect(html).toContain('<ol><li>Café Nord, marked on 2026-11-10</li>');
  });
  it('says so when nothing is marked', () => {
    expect(renderVisitLog([], 'en')).toContain(LOG_UI.en.none);
    expect(renderLogExport([], 'en')).toBe('');
  });
  it('has an export button only when there is something to export', () => {
    expect(renderLogExport(log, 'en')).toContain(`id="${LOG_EXPORT_ID}"`);
  });
  it('escapes names', () => {
    expect(renderVisitLog([{ placeId: 'x', name: '<b>x</b>', date: '2026-10-01' }], 'en')).not.toContain('<b>x');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = LOG_UI[lang];
    for (const t of [ui.heading, ui.none, ui.on('Library', '2026-10-01'), ui.count(1), ui.count(3), ui.exportLog, ui.title]) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      expect(readabilityIssues(t, lang), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});

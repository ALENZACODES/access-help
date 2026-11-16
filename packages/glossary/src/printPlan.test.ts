import { describe, expect, it } from 'vitest';
import {
  PRINT_CSS,
  PRINT_MIME,
  PRINT_UI,
  auditCss,
  auditHtml,
  buildPlan,
  frenchIssues,
  lintClaims,
  lintCopy,
  printFilename,
  renderPrintPage,
  scanMarkup,
  visibleText,
  type FeatureClaim,
  type Lang,
  type Place,
} from './index';

const today = '2026-11-15';
const prov = { source: 'City open data', licence: 'CC0-1.0', date: '2026-06-01' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const places: Place[] = [
  { id: 'a', name: 'Library', claims: [yes('ramp')] },
  { id: 'b', name: 'Café <Nord> & Fils', claims: [] },
];
const entries = (lang: Lang, asked: Record<string, string[]> = {}) => buildPlan(places, ['a', 'b'], ['ramp', 'elevator'], today, lang, asked);

describe('renderPrintPage', () => {
  it.each(['en', 'fr'] as Lang[])('is one complete document in %s', (lang) => {
    const html = renderPrintPage(entries(lang), { lang, today });
    expect(html.startsWith('<!doctype html><html lang="')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain(`<title>${PRINT_UI[lang].title}</title>`);
    expect(html.endsWith('</html>')).toBe(true);
    expect(html.match(/<h1>/g)?.length).toBe(1);
  });
  it('has no scripts, images or links', () => {
    const html = renderPrintPage(entries('en'), { lang: 'en', today });
    expect(html).not.toMatch(/<script|<img|<a |<link|<iframe|onclick/i);
  });
  it('lists each place with its questions', () => {
    const html = renderPrintPage(entries('en'), { lang: 'en', today });
    expect(html.match(/<h2>/g)?.length).toBe(2);
    expect(html).toContain('Is there a ramp?');
  });
  it('escapes place names', () => {
    const html = renderPrintPage(entries('en'), { lang: 'en', today });
    expect(html).not.toContain('<Nord>');
    expect(html).toContain('&lt;Nord&gt;');
    expect(html).toContain('&amp; Fils');
  });
  it('shows a ticked box for what was asked and an empty one for what was not', () => {
    const html = renderPrintPage(entries('en', { a: ['elevator'] }), { lang: 'en', today });
    expect(html).toContain('☑');
    expect(html).toContain('☐');
    expect(html).toContain(`${PRINT_UI.en.asked}: `);
    expect(html).toContain(`${PRINT_UI.en.toAsk}: `);
  });
  it('hides the box glyphs from a screen reader but keeps the words', () => {
    expect(renderPrintPage(entries('en'), { lang: 'en', today })).toContain('<span aria-hidden="true">');
  });
  it('says how many questions were asked', () => {
    const html = renderPrintPage(entries('en', { a: ['elevator'] }), { lang: 'en', today });
    expect(visibleText(html)).toContain(PRINT_UI.en.progress(1, 3));
  });
  it('has a clear message for an empty plan, and no progress line', () => {
    const html = renderPrintPage([], { lang: 'en', today });
    expect(visibleText(html)).toContain(PRINT_UI.en.empty);
    expect(html).not.toContain('questions asked');
  });
  it('states the date and that it says nothing about the places', () => {
    const html = renderPrintPage(entries('en'), { lang: 'en', today });
    expect(visibleText(html)).toContain(`Printed on ${today}`);
    expect(visibleText(html)).toContain(PRINT_UI.en.note);
  });
  it.each(['en', 'fr'] as Lang[])('passes the markup, wording and hidden-text audits in %s', (lang) => {
    for (const plan of [entries(lang), entries(lang, { a: ['ramp', 'elevator'] }), []]) {
      const html = renderPrintPage(plan, { lang, today });
      expect(auditHtml(html, 'print')).toEqual([]);
      expect(lintCopy(visibleText(html))).toEqual([]);
      expect(lintClaims(visibleText(html))).toEqual([]);
      expect(scanMarkup(html)).toEqual([]);
    }
  });
  it('is clean French', () => {
    expect(frenchIssues(visibleText(renderPrintPage(entries('fr'), { lang: 'fr', today })))).toEqual([]);
  });
});

describe('PRINT_CSS', () => {
  it('passes the style audit', () => {
    expect(auditCss(PRINT_CSS, 'print')).toEqual([]);
  });
  it('is black on white and sized in points', () => {
    expect(PRINT_CSS).toContain('color: #000000');
    expect(PRINT_CSS).toContain('background: #ffffff');
    expect(PRINT_CSS).toMatch(/font: 14pt/);
  });
  it('has print rules and keeps questions together', () => {
    expect(PRINT_CSS).toContain('@media print');
    expect(PRINT_CSS).toContain('break-inside: avoid');
  });
});

describe('file details', () => {
  it('names the file by language', () => {
    expect(printFilename('en')).toBe('visit-plan-en.html');
    expect(printFilename('fr')).toBe('visit-plan-fr.html');
  });
  it('is HTML in UTF-8', () => {
    expect(PRINT_MIME).toBe('text/html;charset=utf-8');
  });
  it('has the same keys in both languages', () => {
    expect(Object.keys(PRINT_UI.en).sort()).toEqual(Object.keys(PRINT_UI.fr).sort());
  });
});

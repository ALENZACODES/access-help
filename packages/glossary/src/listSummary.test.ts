import { describe, expect, it } from 'vitest';
import {
  LISTSUM_UI,
  auditHtml,
  exportListButton,
  exportListId,
  frenchIssues,
  lintClaims,
  lintCopy,
  listFilename,
  listToFile,
  listToText,
  parseExportListId,
  plainLanguageIssues,
  readabilityIssues,
  renderListSummary,
  rowText,
  summariseList,
  tallyText,
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
  { id: 'b', name: 'Café Nord', claims: [c('ramp', 'present')] },
  { id: 'c', name: 'Pool', claims: [] },
  { id: 'd', name: 'Hall', claims: [c('ramp', 'present'), c('ramp', 'absent')] },
];
const list = (ids: string[], name = 'Saturday'): PlaceList => ({ name, ids });

describe('summariseList', () => {
  it('counts each chosen feature over the places on the list', () => {
    const s = summariseList(list(['a', 'b', 'c']), places, ['ramp', 'elevator']);
    expect(s.places).toBe(3);
    expect(s.rows).toEqual([
      { termId: 'ramp', present: 2, absent: 0, unknown: 1 },
      { termId: 'elevator', present: 0, absent: 1, unknown: 2 },
    ]);
  });
  it('counts disagreeing sources as unknown', () => {
    expect(summariseList(list(['d']), places, ['ramp']).rows[0]).toEqual({ termId: 'ramp', present: 0, absent: 0, unknown: 1 });
  });
  it('skips places that are not loaded', () => {
    const s = summariseList(list(['a', 'gone']), places, ['ramp']);
    expect(s.places).toBe(1);
    expect(s.rows[0]?.present).toBe(1);
  });
  it('has a row for each chosen feature even for an empty list', () => {
    const s = summariseList(list([]), places, ['ramp']);
    expect(s).toEqual({ places: 0, rows: [{ termId: 'ramp', present: 0, absent: 0, unknown: 0 }] });
  });
  it('has no rows when no feature is chosen', () => {
    expect(summariseList(list(['a']), places, []).rows).toEqual([]);
  });
  it('always adds up to the number of places', () => {
    const s = summariseList(list(['a', 'b', 'c', 'd']), places, ['ramp', 'elevator', 'parking']);
    for (const r of s.rows) expect(r.present + r.absent + r.unknown).toBe(s.places);
  });
});

describe('texts', () => {
  it('leaves out counts of zero and says what the sources report', () => {
    expect(tallyText({ termId: 'ramp', present: 2, absent: 0, unknown: 1 }, 'en')).toBe('2 reported as available, 1 unknown');
    expect(tallyText({ termId: 'ramp', present: 0, absent: 0, unknown: 3 }, 'en')).toBe('3 unknown');
  });
  it('names the feature', () => {
    expect(rowText({ termId: 'ramp', present: 1, absent: 0, unknown: 0 }, 'en')).toBe('Ramp: 1 reported as available');
  });
  it('is clean French', () => {
    const text = rowText({ termId: 'ramp', present: 2, absent: 1, unknown: 0 }, 'fr');
    expect(frenchIssues(text)).toEqual([]);
    expect(text).toContain('Rampe\u00a0:');
  });
});

describe('renderListSummary', () => {
  it.each(['en', 'fr'] as Lang[])('is valid markup in %s in every state', (lang) => {
    for (const s of [summariseList(list(['a', 'b']), places, ['ramp']), summariseList(list([]), places, ['ramp']), summariseList(list(['a']), places, [])]) {
      expect(auditHtml(`<div lang="${lang}">${renderListSummary(s, lang)}</div>`, 'listsum')).toEqual([]);
    }
  });
  it('shows a line per feature', () => {
    const html = renderListSummary(summariseList(list(['a', 'b']), places, ['ramp', 'elevator']), 'en');
    expect(html).toContain('<li>Ramp: 2 reported as available</li>');
    expect(html).toContain('<li>Elevator: 1 reported as not available, 1 unknown</li>');
  });
  it('says what to do when there is nothing to show', () => {
    expect(renderListSummary(summariseList(list([]), places, ['ramp']), 'en')).toContain(LISTSUM_UI.en.empty);
    expect(renderListSummary(summariseList(list(['a']), places, []), 'en')).toContain(LISTSUM_UI.en.none);
  });
});

describe('listToText', () => {
  it('has the name, count, places, tally and data source', () => {
    const text = listToText(list(['a', 'c']), places, ['ramp'], 'en', prov);
    expect(text).toBe(
      'Saturday (2)\n\n- Library\n- Pool\n\nWhat the sources report for this list\nRamp: 1 reported as available, 1 unknown\n\nSource: City open data. Licence: CC0-1.0. Date: 2026-10-01.\n',
    );
  });
  it('has no tally when no feature is chosen or the list is empty', () => {
    expect(listToText(list(['a']), places, [], 'en')).toBe('Saturday (1)\n\n- Library\n');
    expect(listToText(list([]), places, ['ramp'], 'en')).toBe('Saturday (0)\n\n');
  });
  it('skips places that are not loaded in names and in the count', () => {
    expect(listToText(list(['a', 'gone']), places, [], 'en')).toBe('Saturday (1)\n\n- Library\n');
  });
  it('is clean French', () => {
    const text = listToText(list(['a', 'b'], 'Samedi'), places, ['ramp'], 'fr', prov);
    for (const line of text.split('\n')) expect(frenchIssues(line), line).toEqual([]);
  });
  it('never claims a place is accessible', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const text = listToText(list(['a', 'b', 'c']), places, ['ramp', 'elevator'], lang, prov);
      const fixed = text.split('\n').filter((l) => !l.startsWith('- ') && !l.startsWith('Saturday')).join('\n');
      expect(lintClaims(fixed), fixed).toEqual([]);
    }
  });
});

describe('files and ids', () => {
  it('names the file by list, ignoring accents and symbols', () => {
    expect(listFilename(list([], 'Dentist visit!'), 'en')).toBe('list-dentist-visit-en.txt');
    expect(listFilename(list([], 'Été'), 'fr')).toBe('list-ete-fr.txt');
    expect(listFilename(list([], '***'), 'en')).toBe('list-list-en.txt');
  });
  it('makes a text file', () => {
    const f = listToFile(list(['a']), places, [], 'en');
    expect(f.mime).toBe('text/plain;charset=utf-8');
    expect(f.filename).toBe('list-saturday-en.txt');
    expect(f.text).toContain('- Library');
  });
  it('round-trips the button id', () => {
    expect(parseExportListId(exportListId(5))).toBe(5);
    for (const id of ['', 'gl-lexp-', 'gl-lexp-x', 'gl-ldel-1']) expect(parseExportListId(id)).toBeNull();
  });
  it.each(['en', 'fr'] as Lang[])('has a valid, named button in %s', (lang) => {
    const html = exportListButton(2, 'Samedi <1>', lang);
    expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'btn')).toEqual([]);
    expect(html).not.toContain('<1>');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = LISTSUM_UI[lang];
    for (const t of [ui.summary, ui.none, ui.empty, ui.exportList, ui.exportLabel('Saturday'), ui.count(2, 'unknown'), ui.titleOf('Saturday', 2)]) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      expect(readabilityIssues(t, lang), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});

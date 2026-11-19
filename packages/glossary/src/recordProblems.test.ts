import { describe, expect, it } from 'vitest';
import {
  MAX_PROBLEMS_SHOWN,
  PROBLEMS_EXPORT_ID,
  PROBLEMS_UI,
  REASON_ORDER,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  parseProblemShowId,
  plainLanguageIssues,
  problemRows,
  problemText,
  problemTotals,
  problemsFilename,
  problemsToText,
  readabilityIssues,
  renderProblems,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const good: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const today = '2026-11-19';

const places: Place[] = [
  { id: 'ok', name: 'Fine Place', claims: [c('ramp', 'present', good), c('elevator', 'unknown')] },
  {
    id: 'lib',
    name: 'Library',
    claims: [
      c('ramp', 'present'),
      c('elevator', 'absent', { ...good, licence: 'Proprietary' }),
      c('grab-bar', 'present', { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' }),
    ],
  },
  { id: 'hall', name: 'Hall', claims: [c('ramp', 'present', { ...good, date: '2027-01-01', tier: 'tier-3' }), c('elevator', 'present', { source: ' ', licence: 'CC0-1.0', date: '2026-02-30', url: 'http://x.example', tier: 'gold' })] },
];

describe('problemRows', () => {
  const rows = problemRows(places, 'en', today);
  it('has a row for each record with a problem, in the order of the places', () => {
    expect(rows.map((r) => `${r.placeId}:${r.termId}`)).toEqual(['lib:ramp', 'lib:elevator', 'lib:grab-bar', 'hall:ramp', 'hall:elevator']);
  });
  it('has no row for a record with nothing wrong, or one that says unknown', () => {
    expect(rows.some((r) => r.placeId === 'ok')).toBe(false);
  });
  it('gives the reasons in a fixed order', () => {
    expect(rows[0]?.reasons).toEqual(['no-source']);
    expect(rows[1]?.reasons).toEqual(['licence-not-open']);
    expect(rows[2]?.reasons).toEqual(['tier-missing']);
    expect(rows[3]?.reasons).toEqual(['date-in-future', 'tier-needs-evidence']);
    expect(rows[4]?.reasons).toEqual(['source-missing', 'date-invalid', 'url-invalid', 'tier-not-known']);
  });
  it('says which records cannot be used at all', () => {
    expect(rows.map((r) => r.usable)).toEqual([false, false, true, true, false]);
  });
  it('keeps the index of the place and names the feature in the language asked for', () => {
    expect(rows[0]).toMatchObject({ index: 1, name: 'Library', feature: 'Ramp' });
    expect(problemRows(places, 'fr', today)[0]?.feature).toBe('Rampe');
  });
  it('skips records about features that are not in the glossary', () => {
    expect(problemRows([{ id: 'x', name: 'X', claims: [c('teleporter', 'present')] }], 'en', today)).toEqual([]);
  });
  it('only flags a future date against the day given', () => {
    expect(problemRows(places, 'en', '2027-06-01')[3]?.reasons).toEqual(['tier-needs-evidence']);
  });
  it('is empty with no places and does not change its input', () => {
    expect(problemRows([], 'en', today)).toEqual([]);
    const copy = JSON.stringify(places);
    problemRows(places, 'en', today);
    expect(JSON.stringify(places)).toBe(copy);
  });
});

describe('totals', () => {
  const totals = problemTotals(problemRows(places, 'en', today));
  it('counts rows, records that cannot be used, and places', () => {
    expect(totals).toMatchObject({ rows: 5, notUsable: 3, places: 2 });
  });
  it('counts each reason', () => {
    expect(totals.byReason['no-source']).toBe(1);
    expect(totals.byReason['tier-missing']).toBe(1);
    expect(totals.byReason['date-in-future']).toBe(1);
    expect(Object.keys(totals.byReason).sort()).toEqual([...REASON_ORDER].sort());
  });
  it('is all zero with no rows', () => {
    const none = problemTotals([]);
    expect(none.rows).toBe(0);
    expect(Object.values(none.byReason).every((n) => n === 0)).toBe(true);
  });
});

describe('texts', () => {
  const rows = problemRows(places, 'en', today);
  it('names the place and the feature, then the reasons', () => {
    expect(problemText(rows[0] as never, 'en')).toBe('Library, Ramp: No source is given.');
    expect(problemText(rows[3] as never, 'en')).toBe('Hall, Ramp: The date is in the future. The tier needs evidence that this version does not hold.');
  });
  it('is French with its spacing', () => {
    expect(problemText(problemRows(places, 'fr', today)[0] as never, 'fr')).toBe('Library, Rampe\u00a0: Aucune provenance n’est donnée.');
  });
  it('has a sentence for every reason in both languages', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      for (const r of REASON_ORDER) expect(PROBLEMS_UI[lang].reasons[r].endsWith('.'), `${lang} ${r}`).toBe(true);
      expect(new Set(Object.values(PROBLEMS_UI[lang].reasons)).size).toBe(REASON_ORDER.length);
    }
  });
  it('never says anything about the place itself', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      for (const row of problemRows(places, lang, today)) expect(problemText(row, lang)).not.toMatch(/accessible/i);
    }
  });
  it('writes the whole list as text', () => {
    const text = problemsToText(rows, 'en', today);
    expect(text.startsWith('Records to look at\nMade on 2026-11-19.\n\n5 records have a problem. 3 of them cannot be used. They are shown as unknown.\n\n- Library, Ramp: No source is given.\n')).toBe(true);
    expect(text.match(/^- /gm)).toHaveLength(5);
  });
  it('says so in the file when there are no problems', () => {
    expect(problemsToText([], 'en', today)).toBe(`Records to look at\nMade on 2026-11-19.\n\n${PROBLEMS_UI.en.none}\n`);
  });
  it('names the file by language', () => {
    expect(problemsFilename('en')).toBe('records-to-look-at-en.txt');
    expect(problemsFilename('fr')).toBe('records-to-look-at-fr.txt');
  });
});

describe('markup', () => {
  const rows = problemRows(places, 'en', today);
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    const r = problemRows(places, lang, today);
    for (const html of [renderProblems(r, lang, true), renderProblems(r, lang, false, 2), renderProblems([], lang, true)]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'problems')).toEqual([]);
    }
  });
  it('gives the counts in a status line', () => {
    expect(renderProblems(rows, 'en', false)).toContain('<p role="status">5 records have a problem. 3 of them cannot be used. They are shown as unknown.</p>');
  });
  it('lists each record and marks the ones that cannot be used', () => {
    const html = renderProblems(rows, 'en', false);
    expect(html.match(/<li data-usable=/g)).toHaveLength(5);
    expect(html).toContain('<li data-usable="no">Library, Ramp: No source is given.');
    expect(html).toContain('<li data-usable="yes">Library, Grab bar: No tier is given.</li>');
  });
  it('has one Show button for each place, so no id is used twice', () => {
    const html = renderProblems(rows, 'en', false);
    expect(html.match(/id="gl-pshow-1"/g)).toHaveLength(1);
    expect(html.match(/id="gl-pshow-2"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Show Library in the list"');
  });
  it('cuts a long list and says how many more there are', () => {
    const html = renderProblems(rows, 'en', false, 2);
    expect(html.match(/<li data-usable=/g)).toHaveLength(2);
    expect(html).toContain('And 3 more.');
    expect(renderProblems(rows, 'en', false, 4)).toContain('And 1 more.');
    expect(MAX_PROBLEMS_SHOWN).toBe(30);
  });
  it('has the save button only with a host that takes files', () => {
    expect(renderProblems(rows, 'en', true)).toContain(`id="${PROBLEMS_EXPORT_ID}"`);
    expect(renderProblems(rows, 'en', false)).not.toContain(PROBLEMS_EXPORT_ID);
  });
  it('says so with no problems, and has no button then', () => {
    const html = renderProblems([], 'en', true);
    expect(html).toContain(PROBLEMS_UI.en.none);
    expect(html).not.toContain(PROBLEMS_EXPORT_ID);
  });
  it('escapes names', () => {
    const html = renderProblems(problemRows([{ id: 'x', name: '<b>x</b>', claims: [c('ramp', 'present')] }], 'en', today), 'en', false);
    expect(html).not.toContain('<b>x');
  });
  it('reads its Show ids', () => {
    expect(parseProblemShowId('gl-pshow-12')).toBe(12);
    for (const id of ['', 'gl-pshow-', 'gl-pshow-x', 'gl-tshow-1']) expect(parseProblemShowId(id), id).toBeNull();
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = PROBLEMS_UI[lang];
    const texts = [
      ui.heading, ui.intro, ui.none, ui.count(1), ui.count(4), ui.notUsable(1), ui.notUsable(3), ui.more(1), ui.more(6), ui.show, ui.showLabel('Library'),
      ui.exportProblems, ui.title, ui.made('2026-11-19'), ...Object.values(ui.reasons),
    ];
    for (const text of texts) {
      expect(lintCopy(text), text).toEqual([]);
      expect(lintClaims(text), text).toEqual([]);
      expect(plainLanguageIssues(text), text).toEqual([]);
      expect(readabilityIssues(text, lang), text).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
    }
  });
});

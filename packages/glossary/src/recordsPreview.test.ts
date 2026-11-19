import { describe, expect, it } from 'vitest';
import {
  MAX_REJECTS_SHOWN,
  PREVIEW_CHECK_ID,
  PREVIEW_UI,
  RECORD_COLUMNS,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  previewLines,
  previewLoad,
  readabilityIssues,
  rejectText,
  renderCheckButton,
  renderPreview,
  wouldChange,
  type Lang,
  type Place,
} from './index';

const HEAD = RECORD_COLUMNS.join(',');
const held: Place[] = [
  { id: 'lib', name: 'Library', claims: [{ termId: 'ramp', status: 'present', provenance: { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' } }] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
];
const GOOD = `${HEAD}\nlib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,\nnew,New,ramp,present,Town list,CC-BY-4.0,2026-11-01,,\n`;
const MIXED = `${GOOD}x,X,teleporter,present,,,,,\n,Y,ramp,present,,,,,\nz,Z,ramp,present,,,,,\n`;

describe('previewLoad', () => {
  it('reads the table as loading would and changes nothing', () => {
    const copy = JSON.stringify(held);
    const p = previewLoad(GOOD, held, 'replace');
    expect(p.result.places.map((x) => x.id)).toEqual(['lib', 'new']);
    expect(p.merge).toBeNull();
    expect(p.held).toBe(2);
    expect(JSON.stringify(held)).toBe(copy);
  });
  it('works out what adding would do', () => {
    const p = previewLoad(GOOD, held, 'add');
    expect(p.merge).toMatchObject({ addedPlaces: 1, addedRecords: 1, sameRecords: 1 });
  });
  it('has no merge for a table that cannot be read', () => {
    expect(previewLoad('nope', held, 'add').merge).toBeNull();
  });
  it('knows whether loading would change anything', () => {
    expect(wouldChange(previewLoad(GOOD, held, 'replace'))).toBe(true);
    expect(wouldChange(previewLoad(GOOD, held, 'add'))).toBe(true);
    expect(wouldChange(previewLoad(`${HEAD}\nlib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,\n`, held, 'add'))).toBe(false);
    expect(wouldChange(previewLoad('', held, 'replace'))).toBe(false);
    expect(wouldChange(previewLoad(`${HEAD}\n`, held, 'replace'))).toBe(false);
  });
});

describe('previewLines', () => {
  it('says what replacing would do', () => {
    expect(previewLines(previewLoad(GOOD, held, 'replace'), 'en')).toEqual([
      'The table has 2 records for 2 places.',
      'Loading it replaces the 2 places you have.',
      PREVIEW_UI.en.unchanged,
    ]);
  });
  it('does not talk about replacing when nothing is held', () => {
    expect(previewLines(previewLoad(GOOD, [], 'replace'), 'en')).toEqual(['The table has 2 records for 2 places.', PREVIEW_UI.en.unchanged]);
  });
  it('says what adding would do, or that nothing is new', () => {
    expect(previewLines(previewLoad(GOOD, held, 'add'), 'en')[1]).toBe('Loading it adds 1 records and 1 new places.');
    const same = `${HEAD}\nlib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,\n`;
    expect(previewLines(previewLoad(same, held, 'add'), 'en')[1]).toBe(PREVIEW_UI.en.nothingNew);
  });
  it('counts rows left out and records with no usable source', () => {
    const lines = previewLines(previewLoad(MIXED, held, 'replace'), 'en');
    expect(lines).toContain('2 rows were left out.');
    expect(lines).toContain('1 record has no usable source. It is shown as Unknown.');
    expect(lines.at(-1)).toBe(PREVIEW_UI.en.unchanged);
  });
  it('says why a table cannot be read, and nothing else', () => {
    expect(previewLines(previewLoad('', held, 'replace'), 'en')).toEqual(['The table could not be read. Nothing was changed. The table is empty.']);
    expect(previewLines(previewLoad('a,b\n1,2\n', held, 'add'), 'fr')).toEqual(['Le tableau n’a pas pu être lu. Rien n’a été changé. Il manque une colonne.']);
  });
  it('says so for a table with only a header', () => {
    expect(previewLines(previewLoad(`${HEAD}\n`, held, 'replace'), 'en')).toEqual([PREVIEW_UI.en.empty, PREVIEW_UI.en.unchanged]);
  });
  it('is French', () => {
    expect(previewLines(previewLoad(GOOD, held, 'replace'), 'fr')).toEqual([
      'Le tableau a 2 fiches pour 2 lieux.',
      'Le charger remplace les 2 lieux que vous avez.',
      PREVIEW_UI.fr.unchanged,
    ]);
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const html of [renderCheckButton(lang), renderPreview(previewLoad(MIXED, held, 'add'), lang), renderPreview(previewLoad(GOOD, held, 'replace'), lang), renderPreview(previewLoad('', held, 'replace'), lang)]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'preview')).toEqual([]);
    }
  });
  it('has a check button', () => {
    expect(renderCheckButton('en')).toContain(`id="${PREVIEW_CHECK_ID}">Check the table first</button>`);
  });
  it('lists each row that would be left out with its line and the reason', () => {
    const html = renderPreview(previewLoad(MIXED, held, 'replace'), 'en');
    expect(html).toContain('<strong>Rows that would be left out</strong>');
    expect(html).toContain('<li>Line 4: The feature is not one we know.</li><li>Line 5: The place has no id.</li>');
  });
  it('has no list of rows when none would be left out', () => {
    expect(renderPreview(previewLoad(GOOD, held, 'replace'), 'en')).not.toContain(PREVIEW_UI.en.rowsLeftOut);
  });
  it('cuts a long list of rows and says how many more there are', () => {
    const rows = Array.from({ length: MAX_REJECTS_SHOWN + 3 }, (_, i) => `p${i},P${i},teleporter,present,,,,,`).join('\n');
    const html = renderPreview(previewLoad(`${HEAD}\n${rows}\n`, [], 'replace'), 'en');
    expect(html.match(/<li>Line /g)).toHaveLength(MAX_REJECTS_SHOWN);
    expect(html).toContain('And 3 more rows.');
  });
  it('escapes what it shows', () => {
    expect(renderPreview(previewLoad(`${HEAD}\n<b>,<i>x</i>,ramp,present,,,,,\n`, [], 'replace'), 'en')).not.toContain('<b>');
  });
  it('has a reason for every kind of row that is left out, in both languages', () => {
    const kinds = ['wrong-column-count', 'missing-id', 'missing-name', 'name-conflict', 'unknown-feature', 'status-not-known'] as const;
    for (const lang of ['en', 'fr'] as Lang[]) {
      expect(new Set(kinds.map((k) => rejectText(k, lang))).size).toBe(kinds.length);
      expect(Object.keys(PREVIEW_UI[lang].reasons).sort()).toEqual([...kinds].sort());
    }
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = PREVIEW_UI[lang];
    const texts = [
      ui.check, ui.unchanged, ui.has(2, 5), ui.empty, ui.wouldReplace(1), ui.wouldReplace(3), ui.wouldAdd(2, 1), ui.nothingNew, ui.rowsLeftOut, ui.line(4, 'x.'), ui.more(1), ui.more(3),
      ...Object.values(ui.reasons),
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

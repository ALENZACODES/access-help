import { describe, expect, it } from 'vitest';
import {
  MAX_PREVIEW_DIFFS_SHOWN,
  PREVIEWDETAIL_EXPORT_ID,
  PREVIEWDETAIL_UI,
  RECORD_COLUMNS,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  previewDetailFilename,
  previewDiffRows,
  previewDiffText,
  previewLoad,
  previewResult,
  readabilityIssues,
  renderPreviewDetail,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const HEAD = RECORD_COLUMNS.join(',');
const held: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city)] },
  { id: 'pool', name: 'Pool', claims: [] },
];
const TABLE = [HEAD, 'lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,', 'lib,Library,elevator,absent,Transit agency,OGL-Canada-2.0,2025-03-04,,', 'depot,Depot <b>,,,,,,,'].join('\n');
const kinds = (mode: 'replace' | 'add', csv = TABLE): string[] => previewDiffRows(previewLoad(csv, held, mode), held, 'en').map((r) => `${r.kind}:${r.placeId}`);

describe('previewResult', () => {
  it('is the table itself when it would replace the records', () => {
    expect(previewResult(previewLoad(TABLE, held, 'replace'))?.map((p) => p.id)).toEqual(['lib', 'depot']);
  });
  it('is the records held with the table added when it would be added', () => {
    expect(previewResult(previewLoad(TABLE, held, 'add'))?.map((p) => p.id)).toEqual(['lib', 'pool', 'depot']);
  });
  it('is null when the table cannot be read or holds no place', () => {
    expect(previewResult(previewLoad('', held, 'replace'))).toBeNull();
    expect(previewResult(previewLoad('a,b\n1,2', held, 'add'))).toBeNull();
    expect(previewResult(previewLoad(HEAD, held, 'replace'))).toBeNull();
  });
});

describe('previewDiffRows', () => {
  it('lists what replacing would add and remove', () => {
    expect(kinds('replace')).toEqual(['place-removed:pool', 'record-added:lib', 'place-added:depot']);
  });
  it('removes nothing when the table is added', () => {
    expect(kinds('add')).toEqual(['record-added:lib', 'place-added:depot']);
  });
  it('is empty when the table holds exactly the records held', () => {
    const same = [HEAD, 'lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,', 'pool,Pool,,,,,,,'].join('\n');
    expect(kinds('replace', same)).toEqual([]);
    expect(kinds('add', same)).toEqual([]);
  });
  it('is empty when the table cannot be loaded', () => {
    expect(kinds('replace', 'nonsense')).toEqual([]);
  });
  it('does not change the records held', () => {
    const before = JSON.stringify(held);
    kinds('replace');
    kinds('add');
    expect(JSON.stringify(held)).toBe(before);
  });
});

describe('previewDiffText', () => {
  it('says how the table would be loaded, then the differences', () => {
    const text = previewDiffText(previewLoad(TABLE, held, 'replace'), held, 'en', today);
    expect(text.startsWith('What loading the table would change\nMade on 2026-11-19.\n\nThe table would replace the records held now.\n\n1 place added.\n1 place removed.\n1 record added.\n\n- Place removed: Pool.\n')).toBe(true);
    expect(previewDiffText(previewLoad(TABLE, held, 'add'), held, 'fr', today)).toContain('Le tableau serait ajouté aux fiches conservées.\n\n1 lieu ajouté.\n1 fiche ajoutée.');
  });
  it('is empty when the table cannot be loaded, and names the file by language', () => {
    expect(previewDiffText(previewLoad('x', held, 'replace'), held, 'en', today)).toBe('');
    expect(previewDetailFilename('en')).toBe('table-differences-en.txt');
    expect(previewDetailFilename('fr')).toBe('table-differences-fr.txt');
  });
});

describe('renderPreviewDetail', () => {
  it('is nothing when the table cannot be loaded', () => {
    expect(renderPreviewDetail(previewLoad('x', held, 'replace'), held, 'en', true)).toBe('');
  });
  it('is a closed block with each difference', () => {
    const html = renderPreviewDetail(previewLoad(TABLE, held, 'replace'), held, 'en', false);
    expect(html.startsWith('<details class="gl-preview-detail"><summary>See each difference</summary><p class="gl-note">This is what loading the table would change in the records held now. Nothing is changed yet.</p>')).toBe(true);
    expect(html).toContain('<li data-diff="place-removed">Place removed: Pool.</li>');
    expect(html).toContain('<li data-diff="record-added">Record added for Library. Elevator: reported as not available. Source: Transit agency.');
    expect(html).toContain('Place added: Depot &lt;b&gt;.');
    expect(html).not.toContain('<b>');
    expect(html).not.toContain(PREVIEWDETAIL_EXPORT_ID);
  });
  it('has the save button when the host takes files and something differs', () => {
    expect(renderPreviewDetail(previewLoad(TABLE, held, 'add'), held, 'fr', true)).toContain(`id="${PREVIEWDETAIL_EXPORT_ID}">Enregistrer les différences en texte</button>`);
    const same = [HEAD, 'lib,Library,ramp,present,City open data,CC0-1.0,2026-10-01,tier-1,', 'pool,Pool,,,,,,,'].join('\n');
    const html = renderPreviewDetail(previewLoad(same, held, 'replace'), held, 'en', true);
    expect(html).toContain('Nothing differs. The two sets of records are the same.');
    expect(html).not.toContain(PREVIEWDETAIL_EXPORT_ID);
  });
  it('shows at most the limit and counts the rest', () => {
    const rows = [HEAD, ...Array.from({ length: MAX_PREVIEW_DIFFS_SHOWN + 5 }, (_, i) => `p${i},Place ${i},,,,,,,`)].join('\n');
    const html = renderPreviewDetail(previewLoad(rows, held, 'add'), held, 'en', false);
    expect(html.match(/<li data-diff=/g)).toHaveLength(MAX_PREVIEW_DIFFS_SHOWN);
    expect(html).toContain('And 5 more differences.');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(auditHtml(`<div lang="${lang}">${renderPreviewDetail(previewLoad(TABLE, held, 'replace'), held, lang, true)}</div>`, 'detail')).toEqual([]);
    }
  });
});

describe('PREVIEWDETAIL_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = PREVIEWDETAIL_UI[lang];
    return [ui.summary, ui.intro, ui.exportList, ui.title, ui.made(today), ui.replace, ui.add];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(PREVIEWDETAIL_UI.fr)).toEqual(Object.keys(PREVIEWDETAIL_UI.en));
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

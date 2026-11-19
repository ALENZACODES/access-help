import { describe, expect, it } from 'vitest';
import {
  MATRIX_EXPORT_ID,
  MATRIX_UI,
  PLAIN_TERMS,
  auditHtml,
  frenchIssues,
  glance,
  lintClaims,
  lintCopy,
  matrixColumnCounts,
  matrixColumns,
  matrixCounts,
  matrixFilename,
  matrixRows,
  matrixScopeText,
  matrixToCsv,
  mergeClaims,
  plainLanguageIssues,
  readabilityIssues,
  renderMatrix,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const ALL = PLAIN_TERMS.map((t) => t.id);

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit)] },
  { id: 'cafe', name: 'Café, "Nord" <b>', claims: [c('ramp', 'present')] },
  { id: 'hall', name: '=Hall', claims: [c('ramp', 'present', city), c('ramp', 'absent', transit), c('elevator', 'present', city)] },
];
const two = ['elevator', 'ramp'];

describe('matrixColumns', () => {
  it('is every feature when none is chosen', () => {
    expect(matrixColumns([])).toEqual(ALL);
    expect(matrixColumns(['nope'])).toEqual(ALL);
  });
  it('is the chosen features in glossary order', () => {
    expect(matrixColumns(two)).toEqual(['ramp', 'elevator']);
  });
});

describe('matrixRows', () => {
  const rows = matrixRows(places, ['ramp', 'elevator']);
  it('has a row for each place and a cell for each column', () => {
    expect(rows.map((r) => r.placeId)).toEqual(['lib', 'cafe', 'hall']);
    for (const r of rows) expect(r.cells.map((x) => x.termId)).toEqual(['ramp', 'elevator']);
  });
  it('gives what is reported, unknown where nothing can be reported, and a conflict where sources disagree', () => {
    expect(rows[0]?.cells).toEqual([{ termId: 'ramp', status: 'present', conflict: false }, { termId: 'elevator', status: 'absent', conflict: false }]);
    expect(rows[1]?.cells.map((x) => x.status)).toEqual(['unknown', 'unknown']);
    expect(rows[2]?.cells[0]).toEqual({ termId: 'ramp', status: 'unknown', conflict: true });
  });
  it('agrees with the merge used everywhere else', () => {
    matrixRows(places, ALL).forEach((row, i) => {
      const merged = mergeClaims(ALL, (places[i] as Place).claims);
      expect(row.cells.map((x) => `${x.termId}:${x.status}:${x.conflict}`)).toEqual(merged.map((m) => `${m.termId}:${m.status}:${m.conflict}`));
    });
  });
  it('is empty for no places, and has no cells for no columns', () => {
    expect(matrixRows([], ALL)).toEqual([]);
    expect(matrixRows(places, [])[0]?.cells).toEqual([]);
  });
});

describe('matrixCounts', () => {
  it('counts the cells by what is reported', () => {
    expect(matrixCounts(matrixRows(places, ['ramp', 'elevator']))).toEqual({ present: 2, absent: 1, unknown: 3 });
  });
  it('agrees with the count of unknown pairs at a glance', () => {
    expect(matrixCounts(matrixRows(places, ALL)).unknown).toBe(glance(places).unknownPairs);
  });
});

describe('matrixColumnCounts', () => {
  const rows = matrixRows(places, ['ramp', 'elevator']);
  it('counts the places for each column, in glossary order', () => {
    expect(matrixColumnCounts(rows, ['elevator', 'ramp'])).toEqual([
      { termId: 'ramp', present: 1, absent: 0, unknown: 2 },
      { termId: 'elevator', present: 1, absent: 1, unknown: 1 },
    ]);
  });
  it('adds up to the number of places in every column, and to the counts of the whole table', () => {
    const all = matrixRows(places, ALL);
    const perColumn = matrixColumnCounts(all, ALL);
    for (const col of perColumn) expect(col.present + col.absent + col.unknown, col.termId).toBe(places.length);
    const whole = matrixCounts(all);
    expect(perColumn.reduce((n, col) => n + col.unknown, 0)).toBe(whole.unknown);
    expect(perColumn.reduce((n, col) => n + col.present, 0)).toBe(whole.present);
  });
  it('counts a column where sources disagree as unknown', () => {
    expect(matrixColumnCounts(matrixRows([places[2] as Place], ['ramp']), ['ramp'])).toEqual([{ termId: 'ramp', present: 0, absent: 0, unknown: 1 }]);
  });
  it('is all zero for no places', () => {
    expect(matrixColumnCounts([], ['ramp'])).toEqual([{ termId: 'ramp', present: 0, absent: 0, unknown: 0 }]);
  });
});

describe('matrixToCsv', () => {
  it('has a header row and one row for each place, ending in CRLF', () => {
    const csv = matrixToCsv(places, two, 'en');
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Place,Ramp,Elevator');
    expect(lines[1]).toBe('Library,reported as available,reported as not available');
    expect(lines).toHaveLength(8);
    expect(lines[4]).toBe('Places where it is reported as available,1,1');
    expect(lines[5]).toBe('Places where it is reported as not available,0,1');
    expect(lines[6]).toBe('Places where it is unknown,2,1');
    expect(lines[7]).toBe('');
  });
  it('quotes a name with a comma or a quote, and guards a name a spreadsheet could run', () => {
    const lines = matrixToCsv(places, two, 'en').split('\r\n');
    expect(lines[2]).toBe('"Café, ""Nord"" <b>",unknown,unknown');
    expect(lines[3]).toBe("'=Hall,sources disagree,reported as available");
  });
  it('is in French', () => {
    const lines = matrixToCsv(places, two, 'fr').split('\r\n');
    expect(lines[0]).toBe('Lieu,Rampe,Ascenseur');
    expect(lines[3]).toBe("'=Hall,les sources ne concordent pas,signalé comme disponible");
    expect(lines.join(' ')).not.toMatch(/inconnues?(?![a-zà-ÿ])/i);
  });
  it('has every feature when none is chosen, and only the header for no places', () => {
    expect(matrixToCsv(places, [], 'en').split('\r\n')[0]?.split(',')).toHaveLength(ALL.length + 1);
    expect(matrixToCsv([], two, 'en')).toBe('Place,Ramp,Elevator\r\n');
    expect(matrixToCsv(places, [], 'en').split('\r\n')).toHaveLength(places.length + 5);
  });
  it('names the file by language', () => {
    expect(matrixFilename('en')).toBe('places-and-features-en.csv');
    expect(matrixFilename('fr')).toBe('places-and-features-fr.csv');
  });
});

describe('renderMatrix', () => {
  it('says so for no places', () => {
    expect(renderMatrix([], [], 'en', true)).toBe('<p class="gl-note">There are no places in the list.</p>');
  });
  it('has the scope, the counts and a captioned table with row and column headers', () => {
    const html = renderMatrix(places, two, 'en', false);
    expect(html).toContain('<p class="gl-note">The table shows the 2 features you chose.</p>');
    expect(html).toContain('<p role="status">Cells where a feature is reported as available: 2. Reported as not available: 1. Where it is unknown: 3.</p>');
    expect(html).toContain('<caption>What is reported for each feature of each place</caption>');
    expect(html).toContain('<thead><tr><th scope="col">Place</th><th scope="col">Ramp</th><th scope="col">Elevator</th></tr></thead>');
    expect(html).toContain('<tr><th scope="row">Library</th><td data-status="present">reported as available</td><td data-status="absent">reported as not available</td></tr>');
    expect(html).toContain('<td data-status="conflict">sources disagree</td>');
    expect(html).not.toContain(MATRIX_EXPORT_ID);
  });
  it('ends with three rows of totals for each feature', () => {
    const html = renderMatrix(places, two, 'en', false);
    expect(html).toContain(
      '<tfoot><tr data-total="present"><th scope="row">Places where it is reported as available</th><td>1</td><td>1</td></tr>' +
        '<tr data-total="absent"><th scope="row">Places where it is reported as not available</th><td>0</td><td>1</td></tr>' +
        '<tr data-total="unknown"><th scope="row">Places where it is unknown</th><td>2</td><td>1</td></tr></tfoot>',
    );
    expect(renderMatrix(places, two, 'fr', false)).toContain('<th scope="row">Lieux où elle est UNKNOWN</th><td>2</td><td>1</td>');
  });
  it('shows every feature when none is chosen', () => {
    const html = renderMatrix(places, [], 'en', false);
    expect(html).toContain('The table shows every feature.');
    expect(html.match(/<th scope="col">/g)).toHaveLength(ALL.length + 1);
    expect(html.match(/<td data-status=/g)).toHaveLength(ALL.length * places.length);
  });
  it('escapes names', () => {
    const html = renderMatrix(places, two, 'en', false);
    expect(html).toContain('Café, &quot;Nord&quot; &lt;b&gt;');
    expect(html).not.toContain('<b>');
  });
  it('has the save button when the host takes files', () => {
    expect(renderMatrix(places, two, 'fr', true)).toContain(`id="${MATRIX_EXPORT_ID}">Enregistrer ce tableau pour un tableur</button>`);
  });
  it('never shows a cell as available without a usable record', () => {
    const html = renderMatrix([places[1] as Place], [], 'en', false);
    expect(html).not.toContain('data-status="present"');
    expect(html.match(/data-status="unknown"/g)).toHaveLength(ALL.length);
  });
  it('is in French with the token', () => {
    const html = renderMatrix(places, two, 'fr', false);
    expect(html).toContain('Où elle est UNKNOWN\u00a0: 3.');
    expect(html).toContain('Le tableau montre les 2 caractéristiques choisies.');
    expect(matrixScopeText(['ramp'], 'fr')).toBe('Le tableau montre 1 caractéristique, celle que vous avez choisie.');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><details><summary>${MATRIX_UI[lang].heading}</summary>${renderMatrix(places, [], lang, true)}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('MATRIX_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = MATRIX_UI[lang];
    return [ui.heading, ui.intro, ui.noPlaces, ui.caption, ui.place, ui.counts(2, 1, 3), ui.counts(0, 0, 24), ui.scopeAll, ui.scopeChosen(1), ui.scopeChosen(3), ui.exportTable, ui.totals.present, ui.totals.absent, ui.totals.unknown];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(MATRIX_UI.fr)).toEqual(Object.keys(MATRIX_UI.en));
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

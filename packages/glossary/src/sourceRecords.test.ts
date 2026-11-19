import { describe, expect, it } from 'vitest';
import {
  SOURCEVIEW_EXPORT_ID,
  SOURCEVIEW_SELECT_ID,
  SOURCEVIEW_UI,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  readabilityIssues,
  renderSourceTable,
  renderSourceView,
  sourceFromValue,
  sourceNames,
  sourceRecordRows,
  sourceRecordTotals,
  sourceRowText,
  sourceViewFilename,
  sourceViewText,
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

const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('elevator', 'absent', transit), c('ramp', 'present', city), c('grab-bar', 'present', { ...city, source: ' City open data ', date: '2024-02-02' })] },
  { id: 'cafe', name: 'Café <b>', claims: [c('ramp', 'absent', transit), c('elevator', 'present'), c('grab-bar', 'present', { ...city, licence: 'Proprietary' })] },
  { id: 'pool', name: 'Pool', claims: [] },
  { id: 'hall', name: 'Hall', claims: [c('ramp', 'present', city), c('ramp', 'unknown', city), c('not-a-term', 'present', city), c('elevator', 'present', { ...city, source: 'A & B <i>' })] },
];

describe('sourceRecordRows', () => {
  const rows = sourceRecordRows(places, 'City open data', 'en');
  it('lists the usable records of the source, places in order then features in glossary order', () => {
    expect(rows.map((r) => `${r.index}:${r.placeId}:${r.termId}`)).toEqual(['0:lib:ramp', '0:lib:grab-bar', '3:hall:ramp']);
  });
  it('gives the feature, report, licence, date and tier', () => {
    expect(rows[1]).toEqual({ placeId: 'lib', name: 'Library', index: 0, termId: 'grab-bar', feature: 'Grab bar', status: 'present', licence: 'CC0-1.0', date: '2024-02-02', tier: 'tier-1' });
    expect(sourceRecordRows(places, 'Transit agency', 'fr')[0]).toMatchObject({ feature: 'Ascenseur', status: 'absent', tier: null });
  });
  it('leaves out records that cannot be reported, also when they name the source', () => {
    expect(rows.some((r) => r.placeId === 'cafe')).toBe(false);
    expect(rows.filter((r) => r.placeId === 'hall')).toHaveLength(1);
  });
  it('matches the name exactly, apart from spaces around it', () => {
    expect(sourceRecordRows(places, '  City open data ', 'en')).toHaveLength(3);
    expect(sourceRecordRows(places, 'city open data', 'en')).toEqual([]);
    expect(sourceRecordRows(places, 'City', 'en')).toEqual([]);
  });
  it('is empty for no name, an unknown source and no places', () => {
    expect(sourceRecordRows(places, '', 'en')).toEqual([]);
    expect(sourceRecordRows(places, '   ', 'en')).toEqual([]);
    expect(sourceRecordRows(places, 'Nobody', 'en')).toEqual([]);
    expect(sourceRecordRows([], 'City open data', 'en')).toEqual([]);
  });
  it('covers every usable record once across the sources', () => {
    const total = sourceNames(places).reduce((n, name) => n + sourceRecordRows(places, name, 'en').length, 0);
    expect(total).toBe(6);
  });
  it('does not change the places', () => {
    const before = JSON.stringify(places);
    sourceRecordRows(places, 'Transit agency', 'fr');
    expect(JSON.stringify(places)).toBe(before);
  });
});

describe('sourceRecordTotals', () => {
  it('counts records and places and finds the oldest and newest dates', () => {
    expect(sourceRecordTotals(sourceRecordRows(places, 'City open data', 'en'))).toEqual({ records: 3, places: 2, oldest: '2024-02-02', newest: '2026-10-01' });
    expect(sourceRecordTotals([])).toEqual({ records: 0, places: 0, oldest: '', newest: '' });
  });
});

describe('sourceFromValue', () => {
  it('reads a position in the list of names', () => {
    expect(sourceNames(places)).toEqual(['A & B <i>', 'City open data', 'Transit agency']);
    expect(sourceFromValue(places, '0')).toBe('A & B <i>');
    expect(sourceFromValue(places, '2')).toBe('Transit agency');
  });
  it('is empty for anything else', () => {
    for (const v of ['', '3', '-1', '1.5', 'City open data', ' 1', '99999', '1e0']) expect(sourceFromValue(places, v), v).toBe('');
  });
});

describe('texts', () => {
  it('writes a record as one line', () => {
    const row = sourceRecordRows(places, 'Transit agency', 'en')[1];
    expect(row && sourceRowText(row, 'en')).toBe('Café <b>, Ramp: reported as not available. Licence: OGL-Canada-2.0. Dated: 2025-03-04. Tier unknown.');
  });
  it('is French with French spacing', () => {
    const row = sourceRecordRows(places, 'City open data', 'fr')[0];
    const text = row === undefined ? '' : sourceRowText(row, 'fr');
    expect(text).toBe('Library, Rampe\u00a0: signalé comme disponible. Licence\u00a0: CC0-1.0. Date\u00a0: 2026-10-01. Niveau 1.');
    expect(frenchIssues(text)).toEqual([]);
  });
  it('gives the whole source as text', () => {
    const text = sourceViewText(places, 'City open data', 'en', today);
    expect(text.startsWith('Every record from this source: City open data\nMade on 2026-11-19.\n\n3 records, in 2 places. Dated from 2024-02-02 to 2026-10-01.\n\n- Library, Ramp: reported as available.')).toBe(true);
    expect(text.endsWith('- Hall, Ramp: reported as available. Licence: CC0-1.0. Dated: 2026-10-01. Tier 1.\n')).toBe(true);
  });
  it('gives one date when every record has the same date', () => {
    expect(sourceViewText(places, 'Transit agency', 'fr', today)).toContain('2 fiches, dans 2 lieux. Date du 2025-03-04.');
    expect(sourceViewText(places, 'A & B <i>', 'en', today)).toContain('1 record, in 1 place. Dated 2026-10-01.');
  });
  it('is empty for a source with no usable record, and names the file by language', () => {
    expect(sourceViewText(places, 'Nobody', 'en', today)).toBe('');
    expect(sourceViewText(places, '', 'en', today)).toBe('');
    expect(sourceViewFilename('en')).toBe('source-records-en.txt');
    expect(sourceViewFilename('fr')).toBe('source-records-fr.txt');
  });
});

describe('renderSourceTable', () => {
  it('asks for a source when none is chosen or the source is not held', () => {
    expect(renderSourceTable(places, '', 'en', true)).toBe('<p class="gl-note">Choose a source to see every record that comes from it.</p>');
    expect(renderSourceTable(places, 'Nobody', 'en', true)).toContain('Choose a source');
  });
  it('says so when no source has a usable record', () => {
    expect(renderSourceTable([places[2] as Place], '', 'fr', true)).toBe('<p class="gl-note">Aucune source n’a de fiche qui peut être signalée.</p>');
  });
  it('has a captioned table with a row for each record', () => {
    const html = renderSourceTable(places, 'City open data', 'en', false);
    expect(html).toContain('<p role="status">3 records, in 2 places. Dated from 2024-02-02 to 2026-10-01.</p>');
    expect(html).toContain('<caption>Every record from this source: City open data</caption>');
    expect(html).toContain('<tr><th scope="row">Library</th><td>Grab bar</td><td data-status="present">reported as available</td><td>CC0-1.0</td><td>2024-02-02</td><td>Tier 1</td></tr>');
    expect(html.match(/<tr><th scope="row">/g)).toHaveLength(3);
    expect(html.match(/<th scope="col">/g)).toHaveLength(6);
    expect(html).not.toContain(SOURCEVIEW_EXPORT_ID);
  });
  it('escapes the source and place names', () => {
    const html = renderSourceTable(places, 'A & B <i>', 'en', false) + renderSourceTable(places, 'Transit agency', 'en', false);
    expect(html).toContain('Every record from this source: A &amp; B &lt;i&gt;');
    expect(html).toContain('Café &lt;b&gt;');
    expect(html).not.toMatch(/<i>|<b>/);
  });
  it('has the save button when the host takes files', () => {
    expect(renderSourceTable(places, 'Transit agency', 'fr', true)).toContain(`id="${SOURCEVIEW_EXPORT_ID}">Enregistrer ce tableau en texte</button>`);
  });
});

describe('renderSourceView', () => {
  it('has a labelled list with every source and the table region', () => {
    const html = renderSourceView(places, '', 'en', false);
    expect(html).toContain(`<label for="${SOURCEVIEW_SELECT_ID}">Source to look at</label>`);
    expect(html).toContain('<option value="" selected>Choose a source</option><option value="0">A &amp; B &lt;i&gt;</option><option value="1">City open data</option><option value="2">Transit agency</option>');
    expect(html).toContain('<div data-gl-sview><p class="gl-note">Choose a source');
  });
  it('marks the chosen source and shows its table', () => {
    const html = renderSourceView(places, 'Transit agency', 'fr', false);
    expect(html).toContain('<option value="2" selected>Transit agency</option>');
    expect(html).toContain('<option value="">Choisissez une source</option>');
    expect(html).toContain('<caption>Toutes les fiches de cette source\u00a0: Transit agency</caption>');
  });
  it('treats a source that is no longer held as none', () => {
    const html = renderSourceView(places, 'Gone', 'en', false);
    expect(html).toContain('<option value="" selected>');
    expect(html).not.toContain('<table');
  });
  it('has only the first option when there are no sources', () => {
    const html = renderSourceView([], '', 'en', false);
    expect(html.match(/<option /g)).toHaveLength(1);
    expect(html).toContain('No source has a record that can be reported.');
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><details><summary>${SOURCEVIEW_UI[lang].heading}</summary>${renderSourceView(places, 'City open data', lang, true)}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('SOURCEVIEW_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = SOURCEVIEW_UI[lang];
    return [
      ui.heading, ui.label, ui.choose, ui.prompt, ui.noSources, ui.caption('City open data'), ui.place, ui.feature, ui.reported, ui.licence, ui.date, ui.tier,
      ui.count(1, 1), ui.count(5, 3), ui.dates('2026-10-01', '2026-10-01'), ui.dates('2024-02-02', '2026-10-01'), ui.exportList, ui.title('City open data'), ui.made(today),
      ui.line('Hall', 'Ramp', 'reported as available'), ui.detail('CC0-1.0', '2026-10-01', 'Tier 1'),
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(SOURCEVIEW_UI.fr)).toEqual(Object.keys(SOURCEVIEW_UI.en));
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

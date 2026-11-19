import { describe, expect, it } from 'vitest';
import {
  LICENCEVIEW_EXPORT_ID,
  LICENCEVIEW_UI,
  auditHtml,
  frenchIssues,
  licenceGroupText,
  licenceGroups,
  licenceViewFilename,
  licenceViewText,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  readabilityIssues,
  renderLicenceView,
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
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit), c('grab-bar', 'present', { ...city, date: 'soon' })] },
  { id: 'cafe', name: 'Café', claims: [c('ramp', 'present', { ...city, licence: 'Proprietary <x>' }), c('elevator', 'present'), c('grab-bar', 'unknown', city)] },
  { id: 'pool', name: 'Pool', claims: [] },
  {
    id: 'hall',
    name: 'Hall',
    claims: [c('ramp', 'present', { ...city, source: 'Other' }), c('elevator', 'present', { ...city, licence: ' ' }), c('not-a-term', 'present', city), c('automatic-door', 'absent', { ...transit, licence: 'All rights reserved' })],
  },
];

describe('licenceGroups', () => {
  const totals = licenceGroups(places);
  it('groups the records by licence, accepted licences first, each in name order', () => {
    expect(totals.groups.map((g) => `${g.licence}|${g.open}`)).toEqual(['CC0-1.0|true', 'OGL-Canada-2.0|true', '|false', 'All rights reserved|false', 'Proprietary <x>|false']);
  });
  it('counts records held, records that can be reported, places and sources', () => {
    expect(totals.groups[0]).toEqual({ licence: 'CC0-1.0', open: true, records: 3, usable: 2, places: 2, sources: 2 });
    expect(totals.groups[1]).toEqual({ licence: 'OGL-Canada-2.0', open: true, records: 1, usable: 1, places: 1, sources: 1 });
  });
  it('never counts a record under another licence as one that can be reported', () => {
    for (const g of totals.groups.filter((x) => !x.open)) expect(g.usable, g.licence).toBe(0);
    expect(totals.groups[4]).toMatchObject({ records: 1, places: 1, sources: 1 });
  });
  it('counts records with no source apart, and skips unknown records and unknown features', () => {
    expect(totals.noSource).toBe(1);
    expect(totals.records).toBe(8);
    expect(totals.groups.reduce((n, g) => n + g.records, 0) + totals.noSource).toBe(totals.records);
  });
  it('is empty for no places', () => {
    expect(licenceGroups([])).toEqual({ groups: [], noSource: 0, records: 0 });
  });
  it('does not change the places', () => {
    const before = JSON.stringify(places);
    licenceGroups(places);
    expect(JSON.stringify(places)).toBe(before);
  });
});

describe('texts', () => {
  const totals = licenceGroups(places);
  it('writes a group as one line', () => {
    expect(licenceGroupText(totals.groups[0] as (typeof totals.groups)[number], 'en')).toBe('CC0-1.0: records held 3, records that can be reported 2. It is an open licence we accept.');
    expect(licenceGroupText(totals.groups[2] as (typeof totals.groups)[number], 'en')).toBe('No licence given: records held 1, records that can be reported 0. It is not an open licence we accept.');
  });
  it('is French with French spacing', () => {
    const text = licenceGroupText(totals.groups[1] as (typeof totals.groups)[number], 'fr');
    expect(text).toBe('OGL-Canada-2.0\u00a0: fiches conservées 1, fiches qui peuvent être signalées 1. C’est une licence ouverte que nous acceptons.');
    expect(frenchIssues(text)).toEqual([]);
  });
  it('gives the table as text, with the records that have no source', () => {
    const text = licenceViewText(places, 'en', today);
    expect(text.startsWith('Records by licence\nMade on 2026-11-19.\n\nOnly a record under an open licence we accept can be reported.')).toBe(true);
    expect(text.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(5);
    expect(text.endsWith('\n1 more record has no source at all.\n')).toBe(true);
  });
  it('says so when no records are held', () => {
    expect(licenceViewText([], 'fr', today)).toBe('Fiches par licence\nFait le 2026-11-19.\n\nAucune fiche n’est conservée.\n');
    expect(licenceViewText([{ id: 'a', name: 'A', claims: [c('ramp', 'unknown', city)] }], 'en', today)).toContain('No records are held.');
  });
  it('has only the last line when every record has no source', () => {
    const text = licenceViewText([{ id: 'a', name: 'A', claims: [c('ramp', 'present'), c('elevator', 'absent')] }], 'en', today);
    expect(text).toContain('2 more records have no source at all.');
    expect(text).not.toContain('- ');
  });
  it('names the file by language', () => {
    expect(licenceViewFilename('en')).toBe('records-by-licence-en.txt');
    expect(licenceViewFilename('fr')).toBe('records-by-licence-fr.txt');
  });
});

describe('renderLicenceView', () => {
  it('says so when no records are held', () => {
    expect(renderLicenceView([], 'en', true)).toBe('<p class="gl-note">No records are held.</p>');
  });
  it('has a captioned table with a row for each licence', () => {
    const html = renderLicenceView(places, 'en', false);
    expect(html).toContain('<caption>How many records are held under each licence</caption>');
    expect(html).toContain('<tr data-open="yes"><th scope="row">CC0-1.0</th><td>Yes</td><td>3</td><td>2</td><td>2</td><td>2</td></tr>');
    expect(html).toContain('<tr data-open="no"><th scope="row">No licence given</th><td>No</td><td>1</td><td>0</td><td>1</td><td>1</td></tr>');
    expect(html.match(/<th scope="col">/g)).toHaveLength(6);
    expect(html).toContain('<p class="gl-note">1 more record has no source at all.</p>');
    expect(html).not.toContain(LICENCEVIEW_EXPORT_ID);
  });
  it('escapes licence names', () => {
    const html = renderLicenceView(places, 'en', false);
    expect(html).toContain('Proprietary &lt;x&gt;');
    expect(html).not.toContain('<x>');
  });
  it('has no table when every record has no source', () => {
    const html = renderLicenceView([{ id: 'a', name: 'A', claims: [c('ramp', 'present')] }], 'fr', true);
    expect(html).not.toContain('<table');
    expect(html).toContain('1 autre fiche n’a aucune provenance.');
    expect(html).toContain(LICENCEVIEW_EXPORT_ID);
  });
  it('has the save button when the host takes files', () => {
    expect(renderLicenceView(places, 'fr', true)).toContain(`id="${LICENCEVIEW_EXPORT_ID}">Enregistrer ce tableau en texte</button>`);
  });
  it('passes the HTML audit in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const html = `<div lang="${lang}"><details><summary>${LICENCEVIEW_UI[lang].heading}</summary>${renderLicenceView(places, lang, true)}</details></div>`;
      expect(auditHtml(html, 'panel')).toEqual([]);
    }
  });
});

describe('LICENCEVIEW_UI', () => {
  const samples = (lang: Lang): string[] => {
    const ui = LICENCEVIEW_UI[lang];
    return [
      ui.heading, ui.intro, ui.none, ui.caption, ui.licence, ui.accepted, ui.records, ui.usable, ui.places, ui.sources, ui.yes, ui.no, ui.noLicence, ui.noSource(1), ui.noSource(4),
      ui.exportList, ui.title, ui.made(today), ui.line('CC0-1.0', 3, 2), ui.acceptedLine, ui.refusedLine,
    ];
  };
  it('has the same keys in both languages', () => {
    expect(Object.keys(LICENCEVIEW_UI.fr)).toEqual(Object.keys(LICENCEVIEW_UI.en));
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

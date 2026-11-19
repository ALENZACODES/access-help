import { describe, expect, it } from 'vitest';
import {
  RECORDS_UI,
  RECORD_EDIT_UI,
  parseRemovePlaceId,
  parseRemoveRecordId,
  removePlace,
  removePlaceId,
  removeRecord,
  removeRecordId,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  placeRecords,
  placeRecordsText,
  plainLanguageIssues,
  readabilityIssues,
  recordText,
  renderPlaceRecords,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const older: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04' };
const closed: Provenance = { source: 'Private list', licence: 'Proprietary', date: '2026-01-01', tier: 'tier-1' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };

const place: Place = {
  id: 'lib',
  name: 'Library',
  claims: [c('elevator', 'absent', older), c('ramp', 'present', older), c('ramp', 'present', city), c('grab-bar', 'present'), c('automatic-door', 'present', closed), c('not-a-term', 'present', city)],
};

describe('placeRecords', () => {
  const rows = placeRecords(place, 'en');
  it('has a row for each record about a known feature', () => {
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.termId)).not.toContain('not-a-term');
  });
  it('is in glossary order, then newest first', () => {
    const ramps = rows.filter((r) => r.termId === 'ramp');
    expect(ramps.map((r) => r.date)).toEqual(['2026-10-01', '2025-03-04']);
    const order = rows.map((r) => r.termId);
    expect(order.indexOf('ramp')).toBeLessThan(order.indexOf('elevator'));
  });
  it('gives source, licence, date and tier for each record', () => {
    expect(rows.find((r) => r.termId === 'ramp')).toEqual({
      termId: 'ramp', feature: 'Ramp', status: 'present', source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1', claimIndex: 2,
    });
  });
  it('shows no tier when the record has none', () => {
    expect(rows.find((r) => r.termId === 'elevator')?.tier).toBeNull();
  });
  it('keeps a record with no source, as unknown with empty fields', () => {
    expect(rows.find((r) => r.termId === 'grab-bar')).toMatchObject({ status: 'unknown', source: '', licence: '', date: '', tier: null });
  });
  it('keeps a record under a licence that is not open, as unknown', () => {
    expect(rows.find((r) => r.termId === 'automatic-door')).toMatchObject({ status: 'unknown', source: 'Private list', licence: 'Proprietary' });
  });
  it('names features in French', () => {
    expect(placeRecords(place, 'fr').find((r) => r.termId === 'ramp')?.feature).toBe('Rampe');
  });
  it('is empty for a place with no records, and does not change its input', () => {
    expect(placeRecords({ id: 'x', name: 'X', claims: [] }, 'en')).toEqual([]);
    const copy = JSON.stringify(place);
    placeRecords(place, 'en');
    expect(JSON.stringify(place)).toBe(copy);
  });
});

describe('text', () => {
  it('writes a record in one line', () => {
    const row = placeRecords(place, 'en').find((r) => r.termId === 'ramp');
    expect(row).toBeDefined();
    if (row === undefined) return;
    expect(recordText(row, 'en')).toBe('Ramp: reported as available. Source: City open data. Licence: CC0-1.0. Dated: 2026-10-01. Tier 1.');
  });
  it('says Unknown for each missing part', () => {
    const row = placeRecords(place, 'en').find((r) => r.termId === 'grab-bar');
    if (row === undefined) return;
    expect(recordText(row, 'en')).toBe('Grab bar: unknown. Source: Unknown. Licence: Unknown. Dated: Unknown. Tier unknown.');
  });
  it('is French with its spacing', () => {
    const row = placeRecords(place, 'fr').find((r) => r.termId === 'ramp');
    if (row === undefined) return;
    expect(recordText(row, 'fr')).toBe('Rampe\u00a0: signalé comme disponible. Provenance\u00a0: City open data. Licence\u00a0: CC0-1.0. Date\u00a0: 2026-10-01. Niveau 1.');
  });
  it('writes all the records for a place, or says there are none', () => {
    const text = placeRecordsText(place, 'en');
    expect(text.split('\n')[0]).toBe('Every record we hold for Library');
    expect(text.match(/^- /gm)).toHaveLength(5);
    expect(placeRecordsText({ id: 'x', name: 'X', claims: [] }, 'en')).toBe(`Every record we hold for X\n${RECORDS_UI.en.none}\n`);
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const p of [place, { id: 'x', name: 'X', claims: [] }]) {
      expect(auditHtml(`<div lang="${lang}">${renderPlaceRecords(p, lang)}</div>`, 'records')).toEqual([]);
    }
  });
  it('is a closed block with the place name and a count', () => {
    const html = renderPlaceRecords(place, 'en');
    expect(html.startsWith('<details class="gl-records"><summary>Sources for Library <span class="gl-note">(5 records)</span></summary>')).toBe(true);
    expect(html).not.toContain('<details open');
  });
  it('is a table with a caption, column headers and a row header for each record', () => {
    const html = renderPlaceRecords(place, 'en');
    expect(html).toContain('<caption>Every record we hold for Library</caption>');
    expect(html.match(/<th scope="col">/g)).toHaveLength(6);
    expect(html.match(/<th scope="row">/g)).toHaveLength(5);
    expect(html).toContain('<th scope="row">Ramp</th><td data-status="present">reported as available</td><td>City open data</td><td>CC0-1.0</td><td>2026-10-01</td><td>Tier 1</td>');
  });
  it('shows Unknown in words for every missing part', () => {
    const html = renderPlaceRecords(place, 'en');
    expect(html).toContain('<td data-status="unknown">unknown</td><td>Unknown</td><td>Unknown</td><td>Unknown</td><td>Tier unknown</td>');
  });
  it('says so for a place with no records', () => {
    expect(renderPlaceRecords({ id: 'x', name: 'X', claims: [] }, 'en')).toContain(RECORDS_UI.en.none);
  });
  it('escapes names and sources', () => {
    const bad: Place = { id: 'x', name: '<b>x</b>', claims: [c('ramp', 'present', { ...city, source: '<i>s</i>' })] };
    const html = renderPlaceRecords(bad, 'en');
    expect(html).not.toContain('<b>x');
    expect(html).not.toContain('<i>s');
  });
  it('never calls the place accessible', () => {
    for (const lang of ['en', 'fr'] as Lang[]) expect(renderPlaceRecords(place, lang)).not.toMatch(/accessible/i);
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = RECORDS_UI[lang];
    const texts = [
      ui.summary('Library'), ui.caption('Library'), ui.feature, ui.reported, ui.source, ui.licence, ui.date, ui.tier, ui.missing, ui.none,
      ui.count(1), ui.count(3), ui.text('Rampe', 'inconnu'), ui.from('Ville', 'CC0-1.0'), ui.when('2026-10-01', 'Niveau 1'),
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

describe('removing records and places', () => {
  const list: Place[] = [place, { id: 'x', name: 'X', claims: [] }];
  it('removes one record and leaves the rest as they were', () => {
    const next = removeRecord(list, 0, 1);
    expect(next[0]?.claims).toHaveLength(place.claims.length - 1);
    expect(next[0]?.claims.map((r) => r.termId)).toEqual(['elevator', 'ramp', 'grab-bar', 'automatic-door', 'not-a-term']);
    expect(next[1]).toBe(list[1]);
  });
  it('returns the same list when there is no such record or place', () => {
    for (const [p, r] of [[0, 99], [0, -1], [9, 0], [0, 1.5]] as const) expect(removeRecord(list, p, r)).toBe(list);
    expect(removePlace(list, 7)).toBe(list);
    expect(removePlace(list, -1)).toBe(list);
  });
  it('removes one place', () => {
    expect(removePlace(list, 0).map((p) => p.id)).toEqual(['x']);
  });
  it('does not change the list it was given', () => {
    const copy = JSON.stringify(list);
    removeRecord(list, 0, 0);
    removePlace(list, 0);
    expect(JSON.stringify(list)).toBe(copy);
  });
  it('gives each row the index of its record in the place, whatever the order shown', () => {
    const rows = placeRecords(place, 'en');
    for (const r of rows) expect(place.claims[r.claimIndex]?.termId).toBe(r.termId);
    expect(new Set(rows.map((r) => r.claimIndex)).size).toBe(rows.length);
  });
  it('round-trips its ids', () => {
    expect(parseRemoveRecordId(removeRecordId(3, 12))).toEqual({ placeIndex: 3, claimIndex: 12 });
    expect(parseRemovePlaceId(removePlaceId(4))).toBe(4);
    for (const id of ['', 'gl-rrm-1', 'gl-rrm-a-b', 'gl-prm-1']) expect(parseRemoveRecordId(id), id).toBeNull();
    for (const id of ['', 'gl-prm-', 'gl-rrm-1-2']) expect(parseRemovePlaceId(id), id).toBeNull();
  });
  it.each(['en', 'fr'] as Lang[])('is valid markup with the remove buttons in %s', (lang) => {
    for (const p of list) expect(auditHtml(`<div lang="${lang}">${renderPlaceRecords(p, lang, 0)}</div>`, 'edit')).toEqual([]);
  });
  it('has no buttons unless asked', () => {
    const html = renderPlaceRecords(place, 'en');
    expect(html).not.toContain('gl-rrm-');
    expect(html).not.toContain('gl-prm-');
    expect(html.match(/<th scope="col">/g)).toHaveLength(6);
  });
  it('has a named Remove button on each row that points at the right record, and one more column', () => {
    const html = renderPlaceRecords(place, 'en', 4);
    expect(html.match(/<th scope="col">/g)).toHaveLength(7);
    expect(html.match(/id="gl-rrm-4-\d+"/g)).toHaveLength(5);
    expect(html).toContain('id="gl-rrm-4-2" aria-label="Remove the record: Ramp, City open data">Remove</button>');
    expect(html).toContain('aria-label="Remove the record: Grab bar, Unknown"');
  });
  it('has a named Change button on each row, before Remove', () => {
    const html = renderPlaceRecords(place, 'en', 4);
    expect(html.match(/id="gl-redit-4-\d+"/g)).toHaveLength(5);
    expect(html).toContain('id="gl-redit-4-2" aria-label="Change the record: Ramp, City open data">Change</button> <button type="button" class="gl-btn" id="gl-rrm-4-2"');
    expect(renderPlaceRecords(place, 'fr', 4)).toContain('aria-label="Modifier la fiche\u00a0: Rampe, City open data">Modifier</button>');
    expect(renderPlaceRecords(place, 'en')).not.toContain('gl-redit-');
  });
  it('has a button to remove the place, also for a place with no records', () => {
    expect(renderPlaceRecords(place, 'en', 4)).toContain('id="gl-prm-4" aria-label="Remove this place: Library">Remove this place</button>');
    expect(renderPlaceRecords({ id: 'x', name: 'X', claims: [] }, 'en', 1)).toContain('id="gl-prm-1"');
  });
  it('has wording that passes the rules', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const ui = RECORDS_UI[lang];
      const edit = RECORD_EDIT_UI[lang];
      for (const text of [ui.action, ui.remove, ui.removeLabel('Rampe', 'Ville'), ui.removePlace, ui.removePlaceLabel('Library'), edit.removedRecord('Library', 'Rampe'), edit.removedPlace('Library')]) {
        expect(lintCopy(text), text).toEqual([]);
        expect(lintClaims(text), text).toEqual([]);
        expect(plainLanguageIssues(text), text).toEqual([]);
        if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
      }
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  LOAD_MODES,
  LOAD_MODE_IDS,
  MERGE_UI,
  auditHtml,
  frenchIssues,
  isLoadMode,
  lintClaims,
  lintCopy,
  mergeMessage,
  mergeRecords,
  parseLoadModeId,
  plainLanguageIssues,
  readabilityIssues,
  recordKey,
  renderLoadMode,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const town: Provenance = { source: 'Town list', licence: 'CC-BY-4.0', date: '2026-01-01' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const held: Place[] = [
  { id: 'lib', name: 'Library', claims: [c('ramp', 'present', city)] },
  { id: 'cafe', name: 'Café Nord', claims: [] },
];

describe('recordKey', () => {
  it('is the same for records with the same parts', () => {
    expect(recordKey(c('ramp', 'present', city))).toBe(recordKey(c('ramp', 'present', { ...city })));
    expect(recordKey(c('ramp', 'unknown'))).toBe(recordKey(c('ramp', 'unknown')));
  });
  it('differs when any part differs', () => {
    const base = recordKey(c('ramp', 'present', city));
    const others = [
      c('elevator', 'present', city),
      c('ramp', 'absent', city),
      c('ramp', 'present', { ...city, source: 'Other' }),
      c('ramp', 'present', { ...city, licence: 'CC-BY-4.0' }),
      c('ramp', 'present', { ...city, date: '2026-10-02' }),
      c('ramp', 'present', { ...city, tier: 'tier-0' }),
      c('ramp', 'present', { ...city, url: 'https://example.org' }),
      c('ramp', 'present'),
    ];
    for (const o of others) expect(recordKey(o)).not.toBe(base);
  });
  it('cannot be fooled by text that looks like a separator', () => {
    expect(recordKey(c('ramp', 'present', { ...city, source: 'a","b' }))).not.toBe(recordKey(c('ramp', 'present', { ...city, source: 'a', licence: 'b' })));
  });
});

describe('mergeRecords', () => {
  it('adds new records to a place that is held', () => {
    const r = mergeRecords(held, [{ id: 'lib', name: 'Library', claims: [c('elevator', 'absent', town)] }]);
    expect(r).toMatchObject({ addedPlaces: 0, addedRecords: 1, sameRecords: 0, keptNames: 0 });
    expect(r.places[0]?.claims.map((x) => x.termId)).toEqual(['ramp', 'elevator']);
  });
  it('does not add a record that is already there', () => {
    const r = mergeRecords(held, [{ id: 'lib', name: 'Library', claims: [c('ramp', 'present', { ...city })] }]);
    expect(r).toMatchObject({ addedRecords: 0, sameRecords: 1 });
    expect(r.places).toBe(held);
  });
  it('does not add the same record twice from one table', () => {
    const r = mergeRecords(held, [{ id: 'cafe', name: 'Café Nord', claims: [c('ramp', 'present', town), c('ramp', 'present', town)] }]);
    expect(r).toMatchObject({ addedRecords: 1, sameRecords: 1 });
  });
  it('adds new places at the end, in the order of the table', () => {
    const r = mergeRecords(held, [{ id: 'z', name: 'Zoo', claims: [] }, { id: 'a', name: 'Arena', claims: [c('ramp', 'present', town)] }]);
    expect(r.places.map((p) => p.id)).toEqual(['lib', 'cafe', 'z', 'a']);
    expect(r).toMatchObject({ addedPlaces: 2, addedRecords: 1 });
  });
  it('keeps the name a place had, and counts the difference', () => {
    const r = mergeRecords(held, [{ id: 'lib', name: 'Main Library', claims: [c('elevator', 'present', town)] }]);
    expect(r.places[0]?.name).toBe('Library');
    expect(r.keptNames).toBe(1);
  });
  it('never removes a place or a record', () => {
    const r = mergeRecords(held, [{ id: 'new', name: 'New', claims: [c('ramp', 'absent', town)] }]);
    for (const p of held) {
      const now = r.places.find((x) => x.id === p.id);
      expect(now).toBeDefined();
      for (const claim of p.claims) expect(now?.claims).toContainEqual(claim);
    }
  });
  it('leaves untouched places as the same objects', () => {
    const r = mergeRecords(held, [{ id: 'lib', name: 'Library', claims: [c('elevator', 'present', town)] }]);
    expect(r.places[1]).toBe(held[1]);
    expect(r.places[0]).not.toBe(held[0]);
  });
  it('returns the same list for an empty table or one with nothing new', () => {
    expect(mergeRecords(held, []).places).toBe(held);
    expect(mergeRecords(held, held).places).toBe(held);
    expect(mergeRecords(held, held)).toMatchObject({ addedPlaces: 0, addedRecords: 0, sameRecords: 1 });
  });
  it('fills an empty store from the table', () => {
    const r = mergeRecords([], held);
    expect(r.places).toEqual(held);
    expect(r).toMatchObject({ addedPlaces: 2, addedRecords: 1 });
  });
  it('changes neither list', () => {
    const a = JSON.stringify(held);
    const incoming: Place[] = [{ id: 'lib', name: 'X', claims: [c('elevator', 'present', town)] }];
    const b = JSON.stringify(incoming);
    mergeRecords(held, incoming);
    expect(JSON.stringify(held)).toBe(a);
    expect(JSON.stringify(incoming)).toBe(b);
  });
  it('is safe with prototype names as ids', () => {
    const r = mergeRecords([], [{ id: '__proto__', name: 'P', claims: [] }, { id: 'constructor', name: 'C', claims: [] }]);
    expect(r.places.map((p) => p.id)).toEqual(['__proto__', 'constructor']);
  });
  it('can be repeated with the same result', () => {
    const incoming: Place[] = [{ id: 'lib', name: 'Library', claims: [c('elevator', 'present', town)] }, { id: 'n', name: 'N', claims: [] }];
    const once = mergeRecords(held, incoming).places;
    const twice = mergeRecords(once, incoming);
    expect(twice.places).toBe(once);
  });
});

describe('messages', () => {
  it('says what was added', () => {
    expect(mergeMessage(mergeRecords(held, [{ id: 'n', name: 'N', claims: [c('ramp', 'present', town)] }]), 'en')).toBe('Added 1 records and 1 new places.');
  });
  it('says when nothing was new, and how many records were already there', () => {
    expect(mergeMessage(mergeRecords(held, held), 'en')).toBe('Nothing new was in the table. 1 record was already there.');
  });
  it('says when a place kept its name', () => {
    const r = mergeRecords(held, [{ id: 'lib', name: 'Other', claims: [c('elevator', 'present', town)] }]);
    expect(mergeMessage(r, 'en')).toBe('Added 1 records and 0 new places. 1 place kept the name it had.');
  });
  it('is French', () => {
    expect(mergeMessage(mergeRecords(held, held), 'fr')).toBe('Le tableau ne contenait rien de nouveau. 1 fiche était déjà là.');
  });
});

describe('load mode', () => {
  it('knows its modes and ids', () => {
    expect(LOAD_MODES).toEqual(['replace', 'add']);
    for (const m of LOAD_MODES) {
      expect(isLoadMode(m)).toBe(true);
      expect(parseLoadModeId(LOAD_MODE_IDS[m])).toBe(m);
    }
    for (const bad of ['', 'merge', 1, null]) expect(isLoadMode(bad), String(bad)).toBe(false);
    for (const id of ['', 'gl-records-mode', 'gl-records-load']) expect(parseLoadModeId(id), id).toBeNull();
  });
  it.each(['en', 'fr'] as Lang[])('is a valid group of two labelled radio buttons in %s', (lang) => {
    const html = renderLoadMode('add', lang);
    expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'mode')).toEqual([]);
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html.match(/name="gl-records-mode"/g)).toHaveLength(2);
    expect(html).toContain(`<legend>${MERGE_UI[lang].legend}</legend>`);
  });
  it('checks the current mode only', () => {
    expect(renderLoadMode('replace', 'en')).toContain('id="gl-records-mode-replace" value="replace" checked>');
    expect(renderLoadMode('replace', 'en')).toContain('id="gl-records-mode-add" value="add">');
    expect(renderLoadMode('add', 'en')).toContain('id="gl-records-mode-add" value="add" checked>');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = MERGE_UI[lang];
    for (const text of [ui.legend, ui.replace, ui.add, ui.added(3, 2), ui.nothing, ui.same(1), ui.same(4), ui.keptNames(1), ui.keptNames(2)]) {
      expect(lintCopy(text), text).toEqual([]);
      expect(lintClaims(text), text).toEqual([]);
      expect(plainLanguageIssues(text), text).toEqual([]);
      expect(readabilityIssues(text, lang), text).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(text), text).toEqual([]);
    }
  });
});

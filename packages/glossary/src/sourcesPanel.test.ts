import { describe, expect, it } from 'vitest';
import {
  CREDITS_EXPORT_ID,
  LICENCE_UI,
  SOURCES_UI,
  anyNeedsCredit,
  auditHtml,
  creditsFilename,
  creditsText,
  frenchIssues,
  groupDatesText,
  groupLines,
  groupTiersText,
  lintClaims,
  lintCopy,
  plainLanguageIssues,
  readabilityIssues,
  renderSources,
  sourceGroups,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const cityOld: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2025-02-03', tier: 'tier-0' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2026-05-06' };
const closed: Provenance = { source: 'Private list', licence: 'Proprietary', date: '2026-01-01' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };

const places: Place[] = [
  { id: 'a', name: 'A', claims: [c('ramp', 'present', city), c('elevator', 'absent', cityOld), c('grab-bar', 'present', transit)] },
  { id: 'b', name: 'B', claims: [c('ramp', 'present', city), c('elevator', 'present', closed), c('grab-bar', 'present'), c('automatic-door', 'unknown', transit)] },
];

describe('sourceGroups', () => {
  const groups = sourceGroups(places);
  it('has one entry for each source and licence that gave a usable record', () => {
    expect(groups.map((g) => g.source)).toEqual(['City open data', 'Transit agency']);
  });
  it('counts records and places', () => {
    expect(groups[0]).toMatchObject({ records: 3, places: 2 });
    expect(groups[1]).toMatchObject({ records: 1, places: 1 });
  });
  it('gives the oldest and newest dates', () => {
    expect(groups[0]).toMatchObject({ oldest: '2025-02-03', newest: '2026-10-01' });
    expect(groups[1]).toMatchObject({ oldest: '2026-05-06', newest: '2026-05-06' });
  });
  it('gives the tiers that may be shown, and counts records with none', () => {
    expect(groups[0]?.tiers).toEqual(['tier-0', 'tier-1']);
    expect(groups[0]?.unknownTier).toBe(0);
    expect(groups[1]?.tiers).toEqual([]);
    expect(groups[1]?.unknownTier).toBe(1);
  });
  it('leaves out records that cannot be reported', () => {
    expect(groups.some((g) => g.source === 'Private list')).toBe(false);
  });
  it('keeps the same source under two licences apart', () => {
    const two = sourceGroups([{ id: 'x', name: 'X', claims: [c('ramp', 'present', city), c('elevator', 'present', { ...city, licence: 'CC-BY-4.0' })] }]);
    expect(two).toHaveLength(2);
  });
  it('joins a source whose name differs only by spaces at the ends', () => {
    const one = sourceGroups([{ id: 'x', name: 'X', claims: [c('ramp', 'present', city), c('elevator', 'present', { ...city, source: ' City open data ' })] }]);
    expect(one).toHaveLength(1);
    expect(one[0]?.records).toBe(2);
  });
  it('always includes the source of the place list, even with no records', () => {
    const list: Provenance = { source: 'Region list', licence: 'CC-BY-4.0', date: '2026-09-09' };
    const g = sourceGroups(places, list);
    expect(g.at(-1)).toMatchObject({ source: 'Region list', records: 0, places: 0, ofList: true });
    expect(sourceGroups([], list)).toHaveLength(1);
  });
  it('marks the list source when records also come from it', () => {
    const g = sourceGroups(places, city);
    expect(g).toHaveLength(2);
    expect(g[0]).toMatchObject({ source: 'City open data', ofList: true, records: 3 });
  });
  it('ignores a list source that cannot be used', () => {
    expect(sourceGroups([], closed)).toEqual([]);
    expect(sourceGroups([], null)).toEqual([]);
  });
  it('sorts by records, then by name', () => {
    const g = sourceGroups([{ id: 'x', name: 'X', claims: [c('ramp', 'present', transit), c('elevator', 'present', city)] }]);
    expect(g.map((x) => x.source)).toEqual(['City open data', 'Transit agency']);
  });
  it('does not change its input', () => {
    const copy = JSON.stringify(places);
    sourceGroups(places, city);
    expect(JSON.stringify(places)).toBe(copy);
  });
});

describe('texts', () => {
  const groups = sourceGroups(places, transit);
  it('names the tiers, with unknown when a record has none', () => {
    expect(groupTiersText(groups[0] as never, 'en')).toBe('Tier 0, Tier 1');
    expect(groupTiersText(groups[1] as never, 'en')).toBe('Tier unknown');
    expect(groupTiersText({ tiers: ['tier-1'], unknownTier: 2, records: 3 }, 'fr')).toBe('Niveau 1, Niveau inconnu');
  });
  it('gives one date or a range', () => {
    expect(groupDatesText({ oldest: '2026-05-06', newest: '2026-05-06' }, 'en')).toBe('Dated 2026-05-06.');
    expect(groupDatesText({ oldest: '2025-02-03', newest: '2026-10-01' }, 'en')).toBe('Dated from 2025-02-03 to 2026-10-01.');
    expect(groupDatesText({ oldest: '2025-02-03', newest: '2026-10-01' }, 'fr')).toBe('Datées du 2025-02-03 au 2026-10-01.');
  });
  it('describes a source in short lines', () => {
    expect(groupLines(groups[0] as never, 'en')).toEqual([
      '3 records, for 2 places.',
      'Licence: CC0-1.0 (Creative Commons Zero 1.0).',
      'Dated from 2025-02-03 to 2026-10-01.',
      'Tiers: Tier 0, Tier 1.',
    ]);
    expect(groupLines(groups[1] as never, 'en').at(-1)).toBe(SOURCES_UI.en.ofList);
  });
  it('is French with its spacing', () => {
    expect(groupLines(groups[0] as never, 'fr')[1]).toBe('Licence\u00a0: CC0-1.0 (Creative Commons Zero 1.0).');
    expect(groupLines(groups[0] as never, 'fr')[3]).toBe('Niveaux\u00a0: Niveau 0, Niveau 1.');
  });
  it('knows when a credit is needed', () => {
    expect(anyNeedsCredit(groups)).toBe(true);
    expect(anyNeedsCredit(sourceGroups([{ id: 'x', name: 'X', claims: [c('ramp', 'present', city)] }]))).toBe(false);
    expect(anyNeedsCredit([])).toBe(false);
  });
});

describe('credits file', () => {
  const groups = sourceGroups(places);
  it('has a block for each source with its credit and what the licence asks', () => {
    expect(creditsText(groups, 'en', '2026-11-19')).toBe(
      'Credits for the information\nMade on 2026-11-19.\n\n' +
        'Contains information from City open data, dated 2026-10-01. Licence: CC0-1.0 (Creative Commons Zero 1.0).\n- No conditions for sharing.\n\n' +
        'Contains information from Transit agency, dated 2026-05-06. Licence: OGL-Canada-2.0 (Open Government Licence – Canada 2.0).\n- Say where the data came from.\n\n' +
        `${LICENCE_UI.en.note}\n`,
    );
  });
  it('says so with no sources', () => {
    expect(creditsText([], 'en', '2026-11-19')).toBe(`Credits for the information\nMade on 2026-11-19.\n\n${SOURCES_UI.en.none}\n`);
  });
  it('is French', () => {
    const text = creditsText(groups, 'fr', '2026-11-19');
    expect(text.startsWith('Mentions pour l’information\nFait le 2026-11-19.\n')).toBe(true);
    expect(text).toContain('- Dites d’où viennent les données.');
  });
  it('names the file by language', () => {
    expect(creditsFilename('en')).toBe('data-credits-en.txt');
    expect(creditsFilename('fr')).toBe('data-credits-fr.txt');
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const html of [renderSources(places, transit, lang, true), renderSources(places, null, lang, false), renderSources([], null, lang, true)]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'sources')).toEqual([]);
    }
  });
  it('lists each source with its lines, the count and the note about credit', () => {
    const html = renderSources(places, null, 'en', false);
    expect(html).toContain('<p role="status">2 sources</p>');
    expect(html).toContain('<li><strong>City open data</strong><ul><li>3 records, for 2 places.</li>');
    expect(html).toContain(SOURCES_UI.en.mustCredit);
    expect(html).toContain(LICENCE_UI.en.heading);
    expect(html).toContain('Tier 1: a label only.');
  });
  it('has the save button only with a host that takes files', () => {
    expect(renderSources(places, null, 'en', true)).toContain(`id="${CREDITS_EXPORT_ID}"`);
    expect(renderSources(places, null, 'en', false)).not.toContain(CREDITS_EXPORT_ID);
  });
  it('says so with no sources, and has no button then', () => {
    const html = renderSources([], null, 'en', true);
    expect(html).toContain(SOURCES_UI.en.none);
    expect(html).not.toContain(CREDITS_EXPORT_ID);
  });
  it('has no credit note when no licence asks for one', () => {
    const html = renderSources([{ id: 'x', name: 'X', claims: [c('ramp', 'present', city)] }], null, 'en', false);
    expect(html).not.toContain(SOURCES_UI.en.mustCredit);
  });
  it('escapes source names', () => {
    const html = renderSources([{ id: 'x', name: 'X', claims: [c('ramp', 'present', { ...city, source: '<b>s</b>' })] }], null, 'en', false);
    expect(html).not.toContain('<b>s');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = SOURCES_UI[lang];
    const texts = [
      ui.heading, ui.intro, ui.none, ui.count(1), ui.count(3), ui.records(1), ui.records(5), ui.places(1), ui.places(4), ui.licence('CC0-1.0'),
      ui.oneDate('2026-10-01'), ui.dates('2025-02-03', '2026-10-01'), ui.tiers('1'), ui.ofList, ui.exportCredits, ui.title, ui.made('2026-11-19'), ui.mustCredit,
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

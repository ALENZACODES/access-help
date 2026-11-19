import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RECORD_VIEW,
  MAX_HIDDEN_SOURCES,
  RECORDVIEW_IDS,
  RECORDVIEW_UI,
  RECORD_VIEW_KEY,
  TIER_CHOICES,
  applyRecordView,
  auditHtml,
  countsRecord,
  frenchIssues,
  isDefaultRecordView,
  isTierChoice,
  leftOutCount,
  lintClaims,
  lintCopy,
  matchPlace,
  normaliseRecordView,
  parseRecordView,
  parseSourceBoxId,
  plainLanguageIssues,
  readabilityIssues,
  renderRecordView,
  renderViewNote,
  serialiseRecordView,
  setSourceCounted,
  setTierChoice,
  sourceBoxId,
  sourceNames,
  viewChangeText,
  type FeatureClaim,
  type Lang,
  type Place,
  type Provenance,
  type RecordView,
} from './index';

const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const transit: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2025-03-04', tier: 'tier-0' };
const town: Provenance = { source: 'Town list', licence: 'CC-BY-4.0', date: '2026-01-01' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const places: Place[] = [
  { id: 'a', name: 'A', claims: [c('ramp', 'present', city), c('elevator', 'absent', transit), c('grab-bar', 'present', town)] },
  { id: 'b', name: 'B', claims: [c('ramp', 'present', town), c('elevator', 'unknown'), c('grab-bar', 'present')] },
  { id: 'c', name: 'C', claims: [] },
];
const v = (over: Partial<RecordView>): RecordView => ({ ...DEFAULT_RECORD_VIEW, ...over });

describe('the view', () => {
  it('counts every record by default', () => {
    expect(DEFAULT_RECORD_VIEW).toEqual({ tier: 'all', hiddenSources: [] });
    expect(isDefaultRecordView(DEFAULT_RECORD_VIEW)).toBe(true);
    expect(isDefaultRecordView(v({ tier: 'shown' }))).toBe(false);
    expect(isDefaultRecordView(v({ hiddenSources: ['x'] }))).toBe(false);
  });
  it('knows its tier choices', () => {
    expect(TIER_CHOICES).toEqual(['all', 'shown', 'tier-1']);
    for (const t of TIER_CHOICES) expect(isTierChoice(t)).toBe(true);
    for (const bad of ['', 'tier-0', 'ALL', 1, null, 'constructor']) expect(isTierChoice(bad), String(bad)).toBe(false);
  });
  it('sets the tier choice, and ignores one it does not know', () => {
    expect(setTierChoice(DEFAULT_RECORD_VIEW, 'tier-1').tier).toBe('tier-1');
    expect(setTierChoice(DEFAULT_RECORD_VIEW, 'gold')).toBe(DEFAULT_RECORD_VIEW);
    expect(setTierChoice(DEFAULT_RECORD_VIEW, 'all')).toBe(DEFAULT_RECORD_VIEW);
  });
  it('leaves a source out and counts it again', () => {
    const out = setSourceCounted(DEFAULT_RECORD_VIEW, ' Town list ', false);
    expect(out.hiddenSources).toEqual(['Town list']);
    expect(setSourceCounted(out, 'Town list', true)).toEqual(DEFAULT_RECORD_VIEW);
  });
  it('returns the same view when nothing changes', () => {
    const out = setSourceCounted(DEFAULT_RECORD_VIEW, 'Town list', false);
    expect(setSourceCounted(out, 'Town list', false)).toBe(out);
    expect(setSourceCounted(DEFAULT_RECORD_VIEW, 'Town list', true)).toBe(DEFAULT_RECORD_VIEW);
    expect(setSourceCounted(DEFAULT_RECORD_VIEW, '  ', false)).toBe(DEFAULT_RECORD_VIEW);
  });
  it('keeps names once each, in order, within the limit', () => {
    expect(normaliseRecordView({ tier: 'shown', hiddenSources: ['b', ' a ', 'b', '', 3, null] })).toEqual({ tier: 'shown', hiddenSources: ['a', 'b'] });
    const many = Array.from({ length: MAX_HIDDEN_SOURCES + 9 }, (_, i) => `s${String(i).padStart(3, '0')}`);
    expect(normaliseRecordView({ hiddenSources: many }).hiddenSources).toHaveLength(MAX_HIDDEN_SOURCES);
    expect(normaliseRecordView({ hiddenSources: ['x'.repeat(500)] }).hiddenSources).toEqual([]);
    expect(normaliseRecordView({ tier: 'gold', hiddenSources: 'nope' })).toEqual(DEFAULT_RECORD_VIEW);
  });
});

describe('storage', () => {
  it('round-trips', () => {
    const view = v({ tier: 'tier-1', hiddenSources: ['Town list'] });
    expect(parseRecordView(serialiseRecordView(view))).toEqual(view);
  });
  it('is null for text that is not an object', () => {
    for (const bad of ['', 'x', '[]', 'null', '7']) expect(parseRecordView(bad), bad).toBeNull();
  });
  it('falls back to counting every record for odd contents', () => {
    expect(parseRecordView('{"tier":"gold","hiddenSources":{"a":1}}')).toEqual(DEFAULT_RECORD_VIEW);
    expect(parseRecordView('{}')).toEqual(DEFAULT_RECORD_VIEW);
  });
  it('has a stable key', () => {
    expect(RECORD_VIEW_KEY).toBe('glossary-record-view');
  });
});

describe('counting records', () => {
  it('counts every record by default, also ones that say nothing', () => {
    for (const p of places) for (const claim of p.claims) expect(countsRecord(claim, DEFAULT_RECORD_VIEW)).toBe(true);
  });
  it('leaves out a source by name', () => {
    const view = v({ hiddenSources: ['Town list'] });
    expect(countsRecord(c('ramp', 'present', town), view)).toBe(false);
    expect(countsRecord(c('ramp', 'present', { ...town, source: '  Town list ' }), view)).toBe(false);
    expect(countsRecord(c('ramp', 'present', city), view)).toBe(true);
    expect(countsRecord(c('ramp', 'present'), view)).toBe(true);
  });
  it('counts only records with a tier that can be shown', () => {
    const view = v({ tier: 'shown' });
    expect(countsRecord(c('ramp', 'present', city), view)).toBe(true);
    expect(countsRecord(c('ramp', 'present', transit), view)).toBe(true);
    expect(countsRecord(c('ramp', 'present', town), view)).toBe(false);
    expect(countsRecord(c('ramp', 'present', { ...city, tier: 'tier-3' }), view)).toBe(false);
    expect(countsRecord(c('ramp', 'present'), view)).toBe(false);
  });
  it('counts only Tier 1 records', () => {
    const view = v({ tier: 'tier-1' });
    expect(countsRecord(c('ramp', 'present', city), view)).toBe(true);
    expect(countsRecord(c('ramp', 'present', transit), view)).toBe(false);
    expect(countsRecord(c('ramp', 'present', { ...city, tier: 'Tier 1' }), view)).toBe(true);
  });
});

describe('applyRecordView', () => {
  it('returns the same list when every record is counted', () => {
    expect(applyRecordView(places, DEFAULT_RECORD_VIEW)).toBe(places);
  });
  it('returns the same list when the view leaves nothing out', () => {
    expect(applyRecordView(places, v({ hiddenSources: ['Nobody'] }))).toBe(places);
  });
  it('keeps every place, in order, with only the counted records', () => {
    const next = applyRecordView(places, v({ hiddenSources: ['Town list'] }));
    expect(next.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(next[0]?.claims.map((x) => x.termId)).toEqual(['ramp', 'elevator']);
    expect(next[1]?.claims.map((x) => x.termId)).toEqual(['elevator', 'grab-bar']);
    expect(next[2]).toBe(places[2]);
  });
  it('makes a feature unknown when its only record is left out', () => {
    const next = applyRecordView(places, v({ tier: 'tier-1' }));
    const a = next[0] as Place;
    expect(matchPlace(a, ['ramp', 'elevator', 'grab-bar']).counts).toMatchObject({ met: 1, notMet: 0, unknown: 2 });
  });
  it('combines the tier choice and the sources', () => {
    const next = applyRecordView(places, v({ tier: 'shown', hiddenSources: ['City open data'] }));
    expect(next[0]?.claims.map((x) => x.termId)).toEqual(['elevator']);
  });
  it('never adds a record, and never changes one', () => {
    for (const view of [v({ tier: 'shown' }), v({ tier: 'tier-1' }), v({ hiddenSources: ['Town list', 'City open data'] })]) {
      const next = applyRecordView(places, view);
      next.forEach((p, i) => {
        for (const claim of p.claims) expect(places[i]?.claims).toContain(claim);
      });
    }
  });
  it('does not change the list it was given', () => {
    const copy = JSON.stringify(places);
    applyRecordView(places, v({ tier: 'tier-1', hiddenSources: ['Town list'] }));
    expect(JSON.stringify(places)).toBe(copy);
  });
});

describe('counts and names', () => {
  it('counts the reportable records that are left out', () => {
    expect(leftOutCount(places, DEFAULT_RECORD_VIEW)).toBe(0);
    expect(leftOutCount(places, v({ hiddenSources: ['Town list'] }))).toBe(2);
    expect(leftOutCount(places, v({ tier: 'shown' }))).toBe(2);
    expect(leftOutCount(places, v({ tier: 'tier-1' }))).toBe(3);
  });
  it('does not count records that say nothing or have no usable source', () => {
    const only: Place[] = [{ id: 'x', name: 'X', claims: [c('ramp', 'unknown'), c('elevator', 'present')] }];
    expect(leftOutCount(only, v({ tier: 'tier-1' }))).toBe(0);
  });
  it('lists the sources behind reportable records, in name order', () => {
    expect(sourceNames(places)).toEqual(['City open data', 'Town list', 'Transit agency']);
    expect(sourceNames([])).toEqual([]);
    expect(sourceNames([{ id: 'x', name: 'X', claims: [c('ramp', 'present', { ...city, licence: 'Proprietary', source: 'Closed' })] }])).toEqual([]);
  });
});

describe('markup', () => {
  it.each(['en', 'fr'] as Lang[])('is valid in %s', (lang) => {
    for (const html of [
      renderRecordView(places, DEFAULT_RECORD_VIEW, lang),
      renderRecordView(places, v({ tier: 'tier-1', hiddenSources: ['Town list'] }), lang),
      renderRecordView([], DEFAULT_RECORD_VIEW, lang),
      renderViewNote(places, v({ tier: 'shown' }), lang),
    ]) {
      expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'view')).toEqual([]);
    }
  });
  it('has a labelled list of tier choices with the current one selected', () => {
    const html = renderRecordView(places, v({ tier: 'shown' }), 'en');
    expect(html).toContain(`<label for="${RECORDVIEW_IDS.tier}">Tiers to count</label>`);
    expect(html).toContain('<option value="shown" selected>Only records with a tier</option>');
    expect(html).toContain('<option value="all">Every record</option>');
  });
  it('has a check box for each source, checked when it is counted', () => {
    const html = renderRecordView(places, v({ hiddenSources: ['Town list'] }), 'en');
    expect(html).toContain('<legend>Sources to count</legend>');
    expect(html).toContain('<input type="checkbox" class="gl-box" id="gl-rv-src-0" checked> <label for="gl-rv-src-0">City open data</label>');
    expect(html).toContain('<input type="checkbox" class="gl-box" id="gl-rv-src-1"> <label for="gl-rv-src-1">Town list</label>');
  });
  it('says how many records are left out, and offers to count them all again', () => {
    const html = renderRecordView(places, v({ hiddenSources: ['Town list'] }), 'en');
    expect(html).toContain('<p role="status">2 records are left out. They are still on this device.</p>');
    expect(html).toContain(`id="${RECORDVIEW_IDS.reset}"`);
  });
  it('says every record is counted by default, with no reset button', () => {
    const html = renderRecordView(places, DEFAULT_RECORD_VIEW, 'en');
    expect(html).toContain(RECORDVIEW_UI.en.allCounted);
    expect(html).not.toContain(RECORDVIEW_IDS.reset);
  });
  it('says so with no sources', () => {
    expect(renderRecordView([], DEFAULT_RECORD_VIEW, 'en')).toContain(RECORDVIEW_UI.en.noSources);
  });
  it('has a note for the list only when records are left out', () => {
    expect(renderViewNote(places, DEFAULT_RECORD_VIEW, 'en')).toBe('');
    expect(renderViewNote(places, v({ tier: 'tier-1' }), 'en')).toBe('<p class="gl-note" data-gl-rv-note>3 records are left out of this list.</p>');
    expect(renderViewNote(places, v({ hiddenSources: ['Nobody'] }), 'fr')).toContain('0 fiches sont laissées de côté dans cette liste.');
  });
  it('escapes source names', () => {
    const odd: Place[] = [{ id: 'x', name: 'X', claims: [c('ramp', 'present', { ...city, source: '<b>s</b>' })] }];
    expect(renderRecordView(odd, DEFAULT_RECORD_VIEW, 'en')).not.toContain('<b>s');
  });
  it('round-trips its ids', () => {
    expect(parseSourceBoxId(sourceBoxId(6))).toBe(6);
    for (const id of ['', 'gl-rv-src-', 'gl-rv-src-x', 'gl-rv-tier']) expect(parseSourceBoxId(id), id).toBeNull();
  });
});

describe('what is said', () => {
  it('names the change', () => {
    expect(viewChangeText({ kind: 'tier', tier: 'tier-1' }, 'en')).toBe('Now counting: Only Tier 1 records.');
    expect(viewChangeText({ kind: 'source', source: 'Town list', counted: false }, 'en')).toBe('Leaving out records from Town list.');
    expect(viewChangeText({ kind: 'source', source: 'Town list', counted: true }, 'en')).toBe('Counting records from Town list.');
    expect(viewChangeText({ kind: 'reset' }, 'en')).toBe('Counting every record again.');
  });
  it('is French with its spacing', () => {
    expect(viewChangeText({ kind: 'tier', tier: 'all' }, 'fr')).toBe('Fiches comptées\u00a0: Toutes les fiches.');
    expect(viewChangeText({ kind: 'reset' }, 'fr')).toBe('Toutes les fiches sont de nouveau comptées.');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = RECORDVIEW_UI[lang];
    const texts = [
      ui.heading, ui.intro, ui.tierLabel, ...Object.values(ui.tiers), ui.sources, ui.noSources, ui.leftOut(1), ui.leftOut(4), ui.allCounted, ui.reset,
      ui.note(1), ui.note(3), ui.saidTier('x'), ui.saidOn('Ville'), ui.saidOff('Ville'), ui.saidReset,
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

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEW,
  EMPTY_STATE,
  MAX_RELAX_OPTIONS,
  RELAX_UI,
  applyRelaxation,
  auditHtml,
  frenchIssues,
  lintClaims,
  lintCopy,
  parseRelaxId,
  plainLanguageIssues,
  relaxId,
  relaxLabel,
  relaxOptions,
  renderRelax,
  type FeatureClaim,
  type FinderState,
  type Lang,
  type Place,
  type Provenance,
  type Relaxation,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01' } as const;
const old: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2019-01-01' } as const;
const claim = (termId: string, status: FeatureClaim['status'] = 'present', p: Provenance = prov): FeatureClaim => ({ termId, status, provenance: p });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [claim('ramp'), claim('elevator', 'absent')] },
  { id: 'cafe', name: 'Café Nord', claims: [claim('ramp', 'present', old)] },
  { id: 'pool', name: 'Pool', claims: [] },
];
const today = '2026-11-15';
const st = (over: Partial<FinderState>): FinderState => ({ ...EMPTY_STATE, ...over });

describe('relaxOptions', () => {
  it('offers nothing while places match', () => {
    expect(relaxOptions(places, EMPTY_STATE, DEFAULT_VIEW, [], today, 'en')).toEqual([]);
  });
  it('offers nothing when there are no places at all', () => {
    expect(relaxOptions([], st({ query: 'x' }), DEFAULT_VIEW, [], today, 'en')).toEqual([]);
  });
  it('offers to drop a name search that matches nothing', () => {
    const options = relaxOptions(places, st({ query: 'zzz' }), DEFAULT_VIEW, [], today, 'en');
    expect(options).toEqual([{ relax: { kind: 'query' }, count: 3 }]);
  });
  it('offers to stop hiding places', () => {
    const state = st({ features: ['elevator'], query: 'library', hideNotAvailable: true });
    const options = relaxOptions(places, state, DEFAULT_VIEW, [], today, 'en');
    expect(options.map((o) => o.relax.kind)).toContain('hide');
    expect(options.find((o) => o.relax.kind === 'hide')?.count).toBe(1);
  });
  it('offers to drop only saved and only recent', () => {
    const view = { ...DEFAULT_VIEW, savedOnly: true };
    expect(relaxOptions(places, EMPTY_STATE, view, [], today, 'en')).toEqual([{ relax: { kind: 'saved' }, count: 3 }]);
    const recent = { ...DEFAULT_VIEW, recentOnly: true };
    const only = relaxOptions(places, st({ query: 'cafe' }), recent, [], today, 'en');
    expect(only.map((o) => o.relax.kind).sort()).toEqual(['query', 'recent']);
    expect(only.find((o) => o.relax.kind === 'recent')?.count).toBe(1);
  });
  it('lists the most helpful option first, and ties in the order choices were made', () => {
    const view = { ...DEFAULT_VIEW, savedOnly: true };
    const options = relaxOptions(places, st({ query: 'zzz' }), view, [], today, 'en');
    expect(options.map((o) => o.relax.kind)).toEqual(['query', 'saved'].filter((k) => options.some((o) => o.relax.kind === k)));
  });
  it('never offers an option that still leaves nothing', () => {
    const view = { ...DEFAULT_VIEW, savedOnly: true };
    const options = relaxOptions(places, st({ query: 'zzz' }), view, [], today, 'en');
    expect(options.every((o) => o.count > 0)).toBe(true);
    expect(options.find((o) => o.relax.kind === 'saved')).toBeUndefined();
  });
  it('is capped', () => {
    expect(relaxOptions(places, st({ query: 'zzz' }), DEFAULT_VIEW, [], today, 'en').length).toBeLessThanOrEqual(MAX_RELAX_OPTIONS);
  });
});

describe('ids', () => {
  const all: Relaxation[] = [{ kind: 'feature', id: 'ramp' }, { kind: 'query' }, { kind: 'hide' }, { kind: 'saved' }, { kind: 'recent' }];
  it('round-trips', () => {
    for (const r of all) expect(parseRelaxId(relaxId(r))).toEqual(r);
  });
  it('rejects other ids', () => {
    for (const id of ['', 'gl-relax-', 'gl-relax-nope', 'gl-relax-feature-', 'gl-relax-feature-A B', 'gl-more', 'relax-query']) expect(parseRelaxId(id), id).toBeNull();
  });
});

describe('applyRelaxation', () => {
  const state = st({ features: ['ramp', 'elevator'], query: 'lib', hideNotAvailable: true });
  const view = { ...DEFAULT_VIEW, savedOnly: true, recentOnly: true };
  it('drops one feature', () => {
    expect(applyRelaxation(state, view, { kind: 'feature', id: 'ramp' }).state.features).toEqual(['elevator']);
  });
  it('drops one choice and keeps the rest', () => {
    expect(applyRelaxation(state, view, { kind: 'query' })).toEqual({ state: { ...state, query: '' }, view });
    expect(applyRelaxation(state, view, { kind: 'hide' }).state.hideNotAvailable).toBe(false);
    expect(applyRelaxation(state, view, { kind: 'saved' }).view).toEqual({ ...view, savedOnly: false });
    expect(applyRelaxation(state, view, { kind: 'recent' }).view).toEqual({ ...view, recentOnly: false });
  });
  it('does not change its inputs', () => {
    const copy = JSON.stringify([state, view]);
    applyRelaxation(state, view, { kind: 'feature', id: 'ramp' });
    expect(JSON.stringify([state, view])).toBe(copy);
  });
});

describe('labels and markup', () => {
  it('counts places with the right plural', () => {
    expect(relaxLabel({ relax: { kind: 'query' }, count: 1 }, 'en')).toBe('Without the name search: 1 place');
    expect(relaxLabel({ relax: { kind: 'query' }, count: 3 }, 'en')).toBe('Without the name search: 3 places');
    expect(relaxLabel({ relax: { kind: 'query' }, count: 1 }, 'fr')).toBe('Sans la recherche par nom\u00a0: 1 lieu');
  });
  it('names the feature in words', () => {
    expect(relaxLabel({ relax: { kind: 'feature', id: 'ramp' }, count: 2 }, 'en')).toContain('“Ramp”');
    expect(relaxLabel({ relax: { kind: 'feature', id: 'ramp' }, count: 2 }, 'fr')).toContain('«\u202fRampe\u202f»');
  });
  it('draws nothing while places match or when there are no places', () => {
    expect(renderRelax(places, EMPTY_STATE, DEFAULT_VIEW, [], today, 'en')).toBe('');
    expect(renderRelax([], st({ query: 'x' }), DEFAULT_VIEW, [], today, 'en')).toBe('');
  });
  it.each(['en', 'fr'] as Lang[])('draws buttons in %s with valid markup', (lang) => {
    const html = renderRelax(places, st({ features: ['ramp', 'elevator'], query: 'zzz' }), DEFAULT_VIEW, [], today, lang);
    expect(html).toContain('id="gl-relax-query"');
    expect(html).toContain('role="group" aria-labelledby="gl-relax-label"');
    expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'relax')).toEqual([]);
  });
  it('says so when no single choice helps', () => {
    const html = renderRelax(places, st({ query: 'zzz' }), { ...DEFAULT_VIEW, savedOnly: true }, [], today, 'en');
    expect(html).toBe(`<p class="gl-note">${RELAX_UI.en.none}</p>`);
  });
  it('escapes text', () => {
    expect(renderRelax(places, st({ query: '<b>' }), DEFAULT_VIEW, [], today, 'en')).not.toContain('<b>');
  });
});

describe('wording', () => {
  it.each(['en', 'fr'] as Lang[])('passes every rule in %s', (lang) => {
    const ui = RELAX_UI[lang];
    const texts = [ui.label, ui.none, ui.feature('Ramp', 2), ui.query(1), ui.hide(2), ui.saved(3), ui.recent(4)];
    for (const t of texts) {
      expect(lintCopy(t), t).toEqual([]);
      expect(lintClaims(t), t).toEqual([]);
      expect(plainLanguageIssues(t), t).toEqual([]);
      if (lang === 'fr') expect(frenchIssues(t), t).toEqual([]);
    }
  });
});

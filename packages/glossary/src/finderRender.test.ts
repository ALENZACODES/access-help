import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE,
  FINDER_CSS,
  FINDER_UI,
  PLAIN_TERMS as TERMS,
  auditCss,
  auditHtml,
  buildDataset,
  frenchIssues,
  lintCopy,
  placeCountText,
  renderFinderShell,
  resultsView,
  type FeatureClaim,
  type FinderState,
  type Place,
  type Provenance,
} from './index';

const prov: Provenance = { source: 'City open data', licence: 'OGL-Canada-2.0', date: '2026-10-01' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const no = (termId: string): FeatureClaim => ({ termId, status: 'absent', provenance: prov });
const places: Place[] = [
  { id: 'lib', name: 'Library', claims: [yes('ramp'), yes('elevator')] },
  { id: 'cafe', name: 'Café <Nord>', claims: [yes('ramp'), no('elevator')] },
  { id: 'gym', name: 'Gym', claims: [] },
];
const today = '2026-11-15';
const state = (s: Partial<FinderState>): FinderState => ({ ...EMPTY_STATE, ...s });

describe('placeCountText', () => {
  it('handles none, one and many in both languages', () => {
    expect(placeCountText('en', 0)).toBe('No places match.');
    expect(placeCountText('en', 1)).toBe('1 place shown');
    expect(placeCountText('en', 3)).toBe('3 places shown');
    expect(placeCountText('fr', 0)).toBe('Aucun lieu ne correspond.');
    expect(placeCountText('fr', 1)).toBe('1 lieu affiché');
    expect(placeCountText('fr', 3)).toBe('3 lieux affichés');
  });
});

describe('resultsView', () => {
  it('lists ranked places with a compare button each', () => {
    const v = resultsView(places, state({ features: ['ramp', 'elevator'] }), 'en', today, []);
    expect(v.shown).toBe(3);
    expect(v.count).toBe('3 places shown');
    expect(v.list.indexOf('Library')).toBeLessThan(v.list.indexOf('Gym'));
    expect(v.list.indexOf('Gym')).toBeLessThan(v.list.indexOf('Café'));
    expect(v.list).toContain('id="gl-cmp-0"');
    expect(v.list).toContain('aria-label="Compare Library"');
    expect(v.compare).toBe('');
  });

  it('keeps compare button ids tied to the place, not the rank', () => {
    const v = resultsView(places, state({ features: ['elevator'] }), 'en', today, []);
    expect(v.list).toMatch(/Café[\s\S]*id="gl-cmp-1"/);
  });

  it('marks selected places as pressed', () => {
    const v = resultsView(places, EMPTY_STATE, 'en', today, [2]);
    expect(v.list).toContain('id="gl-cmp-2" aria-pressed="true"');
    expect(v.list).toContain('id="gl-cmp-0" aria-pressed="false"');
  });

  it('asks for a second place after one is selected, and compares after two', () => {
    expect(resultsView(places, EMPTY_STATE, 'en', today, [0]).compare).toContain('Choose two places to compare.');
    const two = resultsView(places, state({ features: ['ramp'] }), 'en', today, [0, 1]);
    expect(two.compare).toContain('<h3>Comparison</h3>');
    expect(two.compare).toContain('Comparison of Library and Café &lt;Nord&gt;');
  });

  it('shows an empty message and a zero count', () => {
    const v = resultsView(places, state({ query: 'zzz' }), 'fr', today, []);
    expect(v.shown).toBe(0);
    expect(v.list).toContain('Aucun lieu ne correspond.');
    expect(v.count).toBe('Aucun lieu ne correspond.');
  });

  it('ignores selected indexes that do not exist', () => {
    expect(resultsView(places, EMPTY_STATE, 'en', today, [7, 9]).compare).toContain('Choose two places');
  });
});

describe('renderFinderShell', () => {
  const dataset = buildDataset(places, prov).dataset;

  it('has a fieldset of every glossary feature, each described by its plain-language text', () => {
    const html = renderFinderShell({ lang: 'en', state: EMPTY_STATE, places, dataset, today });
    expect(html).toContain('<legend>Features that matter to you</legend>');
    for (const t of TERMS) {
      expect(html).toContain(`id="gl-f-${t.id}"`);
      expect(html).toContain(`aria-describedby="gl-fd-${t.id}"`);
      expect(html).toContain(`id="gl-fd-${t.id}"`);
      expect(html).toContain(t.en.plain);
    }
  });

  it('reflects the state in the controls', () => {
    const html = renderFinderShell({
      lang: 'en',
      state: state({ features: ['ramp'], query: '"><b>x', hideNotAvailable: true }),
      places,
      today,
    });
    expect(html).toMatch(/id="gl-f-ramp" checked/);
    expect(html).not.toMatch(/id="gl-f-elevator" checked/);
    expect(html).toMatch(/id="gl-hide" checked/);
    expect(html).not.toContain('<b>x');
    expect(html).toContain('value="&quot;&gt;&lt;b&gt;x"');
  });

  it('has a polite live count and labelled search', () => {
    const html = renderFinderShell({ lang: 'fr', state: EMPTY_STATE, places, today });
    expect(html).toContain('<label for="gl-pq">Rechercher un lieu par nom</label>');
    expect(html).toContain('role="status" aria-live="polite" data-gl-pcount>3 lieux affichés');
    expect(html).toContain('lang="fr-CA"');
  });

  it('shows where the data came from, or that none is loaded', () => {
    expect(renderFinderShell({ lang: 'en', state: EMPTY_STATE, places, dataset, today })).toContain(
      'Data: Source: City open data. Licence: OGL-Canada-2.0. Date: 2026-10-01.',
    );
    const none = renderFinderShell({ lang: 'fr', state: EMPTY_STATE, places: [], today });
    expect(none).toContain('Données\u00a0: Aucune donnée de lieu chargée.');
  });

  it('shows the offline banner only when offline', () => {
    expect(renderFinderShell({ lang: 'en', state: EMPTY_STATE, places, today, offline: true })).toContain('data-gl-offline');
    expect(renderFinderShell({ lang: 'en', state: EMPTY_STATE, places, today })).not.toContain('data-gl-offline');
  });

  it('has the clear button and compare buttons', () => {
    const html = renderFinderShell({ lang: 'en', state: EMPTY_STATE, places, today });
    expect(html).toContain('id="gl-clear">Clear choices</button>');
    expect((html.match(/class="gl-btn" id="gl-cmp-/g) ?? []).length).toBe(3);
  });

  it('passes the markup audit in many states and both languages', () => {
    const states = [EMPTY_STATE, state({ features: ['ramp', 'elevator'] }), state({ query: 'zzz' }), state({ hideNotAvailable: true, features: ['elevator'] })];
    for (const lang of ['en', 'fr'] as const) {
      for (const st of states) {
        for (const selected of [[], [0], [0, 1]]) {
          const html = renderFinderShell({ lang, state: st, places, dataset, today, selected, offline: selected.length === 1 });
          expect(auditHtml(html, `${lang}`)).toEqual([]);
        }
      }
    }
  });

  it('passes the wording rules in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const text = renderFinderShell({ lang, state: EMPTY_STATE, places, dataset, today, selected: [0, 1] }).replace(/<[^>]+>/g, ' ');
      expect(lintCopy(text)).toEqual([]);
    }
  });
});

describe('finder strings', () => {
  it('follow French typography', () => {
    const fr = FINDER_UI.fr;
    for (const s of [fr.title, fr.featuresLegend, fr.featuresHint, fr.searchLabel, fr.hideLabel, fr.clear, fr.compare, fr.compareLabel('Parc'), fr.compareTitle, fr.pickTwo, fr.none, fr.one, fr.many(4), fr.dataHeading, fr.noData]) {
      expect(frenchIssues(s), s).toEqual([]);
    }
  });
});

describe('FINDER_CSS', () => {
  it('passes the stylesheet audit on its own with a focus style', () => {
    expect(auditCss(FINDER_CSS)).toEqual([]);
  });

  it('keeps buttons and checkbox labels at 44px', () => {
    expect(FINDER_CSS).toMatch(/\.gl-btn \{[^}]*min-height: 44px/);
    expect(FINDER_CSS).toMatch(/\.gl-check \{[^}]*min-height: 44px/);
  });

  it('lets wide tables scroll instead of overflowing the page', () => {
    expect(FINDER_CSS).toMatch(/\.gl-compare-wrap \{[^}]*overflow-x: auto/);
  });
});

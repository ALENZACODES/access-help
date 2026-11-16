import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEW,
  EMPTY_STATE,
  SUMMARY_UI,
  frenchIssues,
  joinList,
  lintClaims,
  lintCopy,
  renderSummary,
  summariseFilters,
  summaryParts,
  type FinderState,
  type FinderView,
  type Lang,
} from './index';

const state = (over: Partial<FinderState> = {}): FinderState => ({ ...EMPTY_STATE, ...over });
const view = (over: Partial<FinderView> = {}): FinderView => ({ ...DEFAULT_VIEW, ...over });
const langs: Lang[] = ['en', 'fr'];

describe('joinList', () => {
  it('handles none, one, two and three', () => {
    expect(joinList([], 'and')).toBe('');
    expect(joinList(['a'], 'and')).toBe('a');
    expect(joinList(['a', 'b'], 'and')).toBe('a and b');
    expect(joinList(['a', 'b', 'c'], 'et')).toBe('a, b et c');
  });
});

describe('summaryParts', () => {
  it('is empty when nothing is chosen', () => {
    for (const lang of langs) expect(summaryParts(EMPTY_STATE, DEFAULT_VIEW, lang)).toEqual([]);
  });
  it('has one sentence per choice, in a fixed order', () => {
    const parts = summaryParts(state({ features: ['ramp'], query: 'café', hideNotAvailable: true }), view({ recentOnly: true, savedOnly: true }), 'en');
    expect(parts).toEqual([
      'Ranking by: Ramp.',
      'Name contains “café”.',
      SUMMARY_UI.en.hide,
      SUMMARY_UI.en.recent,
      SUMMARY_UI.en.saved,
    ]);
  });
  it('names features as the language knows them', () => {
    expect(summaryParts(state({ features: ['ramp', 'elevator'] }), DEFAULT_VIEW, 'en')[0]).toBe('Ranking by: Ramp and Elevator.');
    expect(summaryParts(state({ features: ['ramp', 'elevator'] }), DEFAULT_VIEW, 'fr')[0]).toContain(' et ');
  });
  it('tidies the typed words', () => {
    expect(summaryParts(state({ query: '  café   nord ' }), DEFAULT_VIEW, 'en')).toEqual(['Name contains “café nord”.']);
  });
  it('ignores a query of spaces', () => {
    expect(summaryParts(state({ query: '   ' }), DEFAULT_VIEW, 'en')).toEqual([]);
  });
});

describe('summariseFilters', () => {
  it('joins the sentences with a space', () => {
    expect(summariseFilters(state({ hideNotAvailable: true }), view({ savedOnly: true }), 'en')).toBe(`${SUMMARY_UI.en.hide} ${SUMMARY_UI.en.saved}`);
  });
  it('is empty for nothing', () => {
    expect(summariseFilters(EMPTY_STATE, DEFAULT_VIEW, 'fr')).toBe('');
  });
  it.each(langs)('passes every rule in %s', (lang) => {
    const text = summariseFilters(state({ features: ['ramp', 'elevator', 'grab-bar'], query: 'bibliothèque', hideNotAvailable: true }), view({ recentOnly: true, savedOnly: true }), lang);
    expect(text).not.toBe('');
    expect(lintCopy(text)).toEqual([]);
    expect(lintClaims(text)).toEqual([]);
    if (lang === 'fr') expect(frenchIssues(text)).toEqual([]);
  });
  it('has French typography around the colon and the guillemets', () => {
    const text = summariseFilters(state({ features: ['ramp'], query: 'x' }), DEFAULT_VIEW, 'fr');
    expect(text).toMatch(/selon[  ]:/);
    expect(text).toMatch(/«[  ]x[  ]»/);
  });
});

describe('renderSummary', () => {
  it('is empty for nothing', () => {
    expect(renderSummary(EMPTY_STATE, DEFAULT_VIEW, 'en')).toBe('');
  });
  it('escapes what was typed', () => {
    const html = renderSummary(state({ query: '<b>"x"&' }), DEFAULT_VIEW, 'en');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('&amp;');
  });
  it('says nothing about any place', () => {
    for (const lang of langs) {
      const html = renderSummary(state({ features: ['ramp'] }), view({ savedOnly: true }), lang);
      expect(html).not.toMatch(/verified|v[ée]rifi|accessible overall/i);
    }
  });
});

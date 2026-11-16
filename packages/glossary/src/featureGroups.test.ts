import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE,
  FEATURE_GROUPS,
  GROUP_UI,
  PLAIN_TERMS,
  auditHtml,
  frenchIssues,
  groupButtonId,
  groupById,
  groupFeatures,
  groupIsChosen,
  parseGroupId,
  renderGroups,
  toggleGroup,
  toggleFeature,
  type FinderState,
  type Lang,
} from './index';

const ids = PLAIN_TERMS.map((t) => t.id);
const state = (features: string[]): FinderState => ({ ...EMPTY_STATE, features });
const group = (id: string) => {
  const g = groupById(id);
  if (g === undefined) throw new Error(id);
  return g;
};

describe('FEATURE_GROUPS', () => {
  it('only names features in the glossary', () => {
    for (const g of FEATURE_GROUPS) for (const f of g.features) expect(ids, `${g.id}: ${f}`).toContain(f);
  });
  it('has unique ids and no repeated feature inside a group', () => {
    expect(new Set(FEATURE_GROUPS.map((g) => g.id)).size).toBe(FEATURE_GROUPS.length);
    for (const g of FEATURE_GROUPS) expect(new Set(g.features).size).toBe(g.features.length);
  });
  it('has at least two features in each group', () => {
    for (const g of FEATURE_GROUPS) expect(g.features.length).toBeGreaterThanOrEqual(2);
  });
  it('has a name in both languages for every group', () => {
    for (const lang of ['en', 'fr'] as Lang[]) for (const g of FEATURE_GROUPS) expect(GROUP_UI[lang].names[g.id as keyof typeof GROUP_UI.en.names], `${lang} ${g.id}`).toBeTruthy();
  });
});

describe('groupFeatures', () => {
  it('returns the features in glossary order', () => {
    const features = groupFeatures(group('getting-in'));
    expect([...features].sort((a, b) => ids.indexOf(a) - ids.indexOf(b))).toEqual([...features]);
  });
  it('drops a feature the glossary does not know', () => {
    expect(groupFeatures({ id: 'x', features: ['ramp', 'teleporter'] })).toEqual(['ramp']);
  });
});

describe('groupIsChosen / toggleGroup', () => {
  const g = group('moving-inside');
  it('is not chosen until every feature is', () => {
    expect(groupIsChosen(g, EMPTY_STATE)).toBe(false);
    expect(groupIsChosen(g, state(['elevator']))).toBe(false);
    expect(groupIsChosen(g, state(['elevator', 'clear-door-width']))).toBe(true);
  });
  it('is never chosen for a group with no known feature', () => {
    expect(groupIsChosen({ id: 'x', features: ['teleporter'] }, EMPTY_STATE)).toBe(false);
  });
  it('chooses all of them, keeping other choices', () => {
    const next = toggleGroup(state(['ramp']), g);
    expect(next.features).toEqual(expect.arrayContaining(['ramp', 'elevator', 'clear-door-width']));
    expect(next.features.length).toBe(3);
  });
  it('completes a half-chosen group', () => {
    expect(toggleGroup(state(['elevator']), g).features.slice().sort()).toEqual(['clear-door-width', 'elevator']);
  });
  it('removes only the group features when all are chosen', () => {
    const next = toggleGroup(state(['ramp', 'elevator', 'clear-door-width']), g);
    expect(next.features).toEqual(['ramp']);
  });
  it('keeps the query and the other flags', () => {
    const next = toggleGroup({ features: [], query: 'café', hideNotAvailable: true }, g);
    expect(next.query).toBe('café');
    expect(next.hideNotAvailable).toBe(true);
  });
  it('twice gives back what was there', () => {
    const start = state(['ramp']);
    expect(toggleGroup(toggleGroup(start, g), g)).toEqual(start);
  });
  it('agrees with toggling each feature by hand', () => {
    let by = EMPTY_STATE;
    for (const f of groupFeatures(g)) by = toggleFeature(by, f);
    expect(toggleGroup(EMPTY_STATE, g).features).toEqual(by.features);
  });
});

describe('group ids', () => {
  it('round-trips for every group', () => {
    for (const g of FEATURE_GROUPS) expect(parseGroupId(groupButtonId(g.id))).toBe(g.id);
  });
  it('rejects unknown groups and other buttons', () => {
    for (const bad of ['gl-grp-', 'gl-grp-nope', 'gl-f-ramp', 'grp-arriving']) expect(parseGroupId(bad), bad).toBeNull();
  });
});

describe('renderGroups', () => {
  it.each(['en', 'fr'] as Lang[])('has one pressed-state button per group in %s', (lang) => {
    const html = renderGroups(EMPTY_STATE, lang);
    for (const g of FEATURE_GROUPS) expect(html).toContain(`id="${groupButtonId(g.id)}"`);
    expect(html.match(/aria-pressed="false"/g)?.length).toBe(FEATURE_GROUPS.length);
    expect(auditHtml(`<div lang="${lang}">${html}</div>`, 'groups')).toEqual([]);
  });
  it('marks a chosen group as pressed', () => {
    const html = renderGroups(state(['elevator', 'clear-door-width']), 'en');
    expect(html.match(/aria-pressed="true"/g)?.length).toBe(1);
    expect(html).toMatch(/id="gl-grp-moving-inside" aria-pressed="true"/);
  });
  it('is clean French', () => {
    for (const g of FEATURE_GROUPS) {
      const name = GROUP_UI.fr.names[g.id as keyof typeof GROUP_UI.fr.names];
      expect(frenchIssues(GROUP_UI.fr.label(name))).toEqual([]);
    }
  });
});

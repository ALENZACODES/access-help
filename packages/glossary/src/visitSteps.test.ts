import { describe, expect, it } from 'vitest';
import {
  FEATURE_GROUPS,
  NAME_SORT,
  STEP_IDS,
  STEP_SCOPES,
  VISIT_SORT,
  countStates,
  featureStates,
  firstOpenStep,
  isOverviewSort,
  isStepId,
  isStepScope,
  mustOpen,
  overviewTotals,
  pairSteps,
  pairTotals,
  scopeIndexes,
  seenDiffers,
  sortOverview,
  stepFeatureIds,
  stepOutcome,
  stepOverview,
  stepStateOf,
  stillUnknown,
  visitCounts,
  visitFeatures,
  visitSteps,
  type FeatureClaim,
  type Observations,
  type Place,
  type Provenance,
  type VisitStep,
} from './index';

const today = '2026-11-19';
const city: Provenance = { source: 'City open data', licence: 'CC0-1.0', date: '2026-10-01', tier: 'tier-1' };
const old: Provenance = { source: 'Transit agency', licence: 'OGL-Canada-2.0', date: '2024-03-04' };
const aging: Provenance = { source: 'Town list', licence: 'CC-BY-4.0', date: '2025-06-01' };
const c = (termId: string, status: FeatureClaim['status'], provenance?: Provenance): FeatureClaim =>
  provenance === undefined ? { termId, status } : { termId, status, provenance };
const ALL = ['step-free-entrance', 'automatic-door', 'clear-door-width', 'ramp', 'elevator', 'grab-bar', 'accessible-washroom', 'accessible-parking'];
const lib: Place = {
  id: 'lib',
  name: 'Library',
  claims: [c('accessible-parking', 'present', city), c('step-free-entrance', 'present', city), c('automatic-door', 'absent', old), c('ramp', 'present', city), c('ramp', 'absent', old), c('elevator', 'present', aging), c('grab-bar', 'present')],
};
const cafe: Place = { id: 'cafe', name: 'Café Nord', claims: [] };
const full: Place = { id: 'full', name: 'Full', claims: ALL.map((t) => c(t, 'present', city)) };
const none: Place = { id: 'none', name: 'Nothing there', claims: ALL.map((t) => c(t, 'absent', city)) };
const places = [lib, cafe, full, none];
const seen: Observations = [
  { placeId: 'lib', termId: 'automatic-door', seen: 'there', date: '2026-11-15' },
  { placeId: 'lib', termId: 'step-free-entrance', seen: 'not-there', date: '2026-11-15' },
  { placeId: 'lib', termId: 'grab-bar', seen: 'there', date: '2026-11-15' },
  { placeId: 'lib', termId: 'elevator', seen: 'not-sure', date: '2026-11-15' },
  { placeId: 'lib', termId: 'accessible-parking', seen: 'there', date: '2026-11-15' },
  { placeId: 'cafe', termId: 'ramp', seen: 'there', date: '2026-11-15' },
];
const steps = (place: Place, o: { must?: string[]; seen?: Observations } = {}): readonly VisitStep[] => visitSteps(place, { today, ...o });
const step = (list: readonly VisitStep[], id: string): VisitStep => list.find((s) => s.id === id) as VisitStep;

describe('the steps of a visit', () => {
  it('are the quick choices of the finder, in the same order', () => {
    expect(STEP_IDS).toEqual(FEATURE_GROUPS.map((g) => g.id));
    expect(STEP_IDS).toEqual(['arriving', 'getting-in', 'moving-inside', 'washroom-stop']);
    for (const id of STEP_IDS) expect(isStepId(id)).toBe(true);
    for (const id of ['', 'leaving', 'visit', 7, null, undefined]) expect(isStepId(id), String(id)).toBe(false);
  });
  it('each have features of the glossary, in the order of the glossary', () => {
    expect(stepFeatureIds('arriving')).toEqual(['step-free-entrance', 'accessible-parking']);
    expect(stepFeatureIds('getting-in')).toEqual(['step-free-entrance', 'automatic-door', 'clear-door-width', 'ramp']);
    expect(stepFeatureIds('moving-inside')).toEqual(['clear-door-width', 'elevator']);
    expect(stepFeatureIds('washroom-stop')).toEqual(['clear-door-width', 'grab-bar', 'accessible-washroom']);
    expect(stepFeatureIds('leaving')).toEqual([]);
  });
  it('cover every feature of the glossary between them', () => {
    expect([...new Set(STEP_IDS.flatMap(stepFeatureIds))].sort()).toEqual([...ALL].sort());
  });
});

describe('what the records report for a feature', () => {
  it('is available or not available only with a usable source', () => {
    expect(featureStates(lib, ['accessible-parking', 'automatic-door'])).toEqual(['available', 'not-available']);
    expect(featureStates(lib, ['grab-bar'])).toEqual(['unknown']);
    expect(featureStates({ claims: [c('ramp', 'present', { ...city, licence: 'Proprietary' })] }, ['ramp'])).toEqual(['unknown']);
  });
  it('is unknown with no record, and says so when the sources disagree', () => {
    expect(featureStates(cafe, ['ramp'])).toEqual(['unknown']);
    expect(featureStates(lib, ['ramp'])).toEqual(['disagree']);
    expect(featureStates(lib, [])).toEqual([]);
  });
  it('maps each answer of the list', () => {
    expect(stepStateOf({ status: 'present', conflict: false })).toBe('available');
    expect(stepStateOf({ status: 'absent', conflict: false })).toBe('not-available');
    expect(stepStateOf({ status: 'unknown', conflict: false })).toBe('unknown');
    expect(stepStateOf({ status: 'unknown', conflict: true })).toBe('disagree');
  });
  it('counts disagreement as unknown', () => {
    expect(countStates(['available', 'available', 'not-available', 'unknown', 'disagree'])).toEqual({ available: 2, notAvailable: 1, unknown: 2 });
    expect(countStates([])).toEqual({ available: 0, notAvailable: 0, unknown: 0 });
  });
});

describe('the outcome of a step', () => {
  it('is decided first by a feature reported as not available, then by anything unknown', () => {
    expect(stepOutcome({ available: 3, notAvailable: 0, unknown: 0 })).toBe('all-reported-available');
    expect(stepOutcome({ available: 2, notAvailable: 0, unknown: 1 })).toBe('some-unknown');
    expect(stepOutcome({ available: 1, notAvailable: 1, unknown: 1 })).toBe('some-not-available');
    expect(stepOutcome({ available: 0, notAvailable: 0, unknown: 0 })).toBe('all-reported-available');
  });
});

describe('visitSteps', () => {
  const list = steps(lib);
  it('gives every step, each with its features', () => {
    expect(list.map((s) => s.id)).toEqual(STEP_IDS);
    for (const s of list) expect(s.features.map((f) => f.termId)).toEqual(stepFeatureIds(s.id));
  });
  it('reports each feature by the rules of the list', () => {
    expect(step(list, 'arriving').features.map((f) => f.state)).toEqual(['available', 'available']);
    expect(step(list, 'getting-in').features.map((f) => f.state)).toEqual(['available', 'not-available', 'unknown', 'disagree']);
    expect(step(list, 'moving-inside').features.map((f) => f.state)).toEqual(['unknown', 'available']);
    expect(step(list, 'washroom-stop').features.map((f) => f.state)).toEqual(['unknown', 'unknown', 'unknown']);
  });
  it('counts each step and gives its outcome', () => {
    expect(step(list, 'arriving')).toMatchObject({ counts: { available: 2, notAvailable: 0, unknown: 0 }, outcome: 'all-reported-available' });
    expect(step(list, 'getting-in')).toMatchObject({ counts: { available: 1, notAvailable: 1, unknown: 2 }, outcome: 'some-not-available' });
    expect(step(list, 'moving-inside')).toMatchObject({ counts: { available: 1, notAvailable: 0, unknown: 1 }, outcome: 'some-unknown' });
    expect(step(list, 'washroom-stop')).toMatchObject({ counts: { available: 0, notAvailable: 0, unknown: 3 }, outcome: 'some-unknown' });
  });
  it('gives the source only for an answer the records report', () => {
    const features = step(list, 'getting-in').features;
    expect(features[0]?.source).toEqual(city);
    expect(features[1]?.source).toEqual(old);
    expect('source' in (features[2] as object)).toBe(false);
    expect('source' in (features[3] as object)).toBe(false);
    expect('source' in (step(list, 'washroom-stop').features[1] as object)).toBe(false);
  });
  it('says how old each answer is', () => {
    expect(step(list, 'arriving').features.map((f) => f.freshness)).toEqual(['current', 'current']);
    expect(step(list, 'getting-in').features.map((f) => f.freshness)).toEqual(['current', 'old', 'undated', 'undated']);
    expect(step(list, 'moving-inside').features[1]?.freshness).toBe('aging');
  });
  it('marks the person’s must-haves and nothing else', () => {
    const marked = steps(lib, { must: ['clear-door-width', 'elevator'] });
    expect(visitFeatures(marked).filter((f) => f.must).map((f) => f.termId)).toEqual(['clear-door-width', 'elevator']);
    expect(visitFeatures(list).some((f) => f.must)).toBe(false);
  });
  it('sets what the person saw beside a feature, and never changes what the records report', () => {
    const with_ = steps(lib, { seen });
    expect(with_.map((s) => s.features.map((f) => f.state))).toEqual(list.map((s) => s.features.map((f) => f.state)));
    expect(with_.map((s) => s.counts)).toEqual(list.map((s) => s.counts));
    expect(step(with_, 'getting-in').features[1]?.seen).toEqual(seen[0]);
    expect(step(with_, 'washroom-stop').features[1]?.seen?.seen).toBe('there');
    expect(step(with_, 'washroom-stop').features[1]?.state).toBe('unknown');
    expect('seen' in (step(with_, 'getting-in').features[3] as object)).toBe(false);
  });
  it('uses only the notes of this place', () => {
    expect(visitFeatures(steps(cafe, { seen })).filter((f) => f.seen !== undefined).map((f) => f.termId)).toEqual(['ramp']);
    expect(visitFeatures(steps(full, { seen })).some((f) => f.seen !== undefined)).toBe(false);
  });
  it('does not change the place', () => {
    const before = JSON.stringify(lib);
    steps(lib, { seen, must: ['ramp'] });
    expect(JSON.stringify(lib)).toBe(before);
  });
  it('reports a place with no records as unknown at every step', () => {
    for (const s of steps(cafe)) {
      expect(s.outcome).toBe('some-unknown');
      expect(s.counts.unknown).toBe(s.features.length);
    }
  });
  it('reports a place where everything is recorded', () => {
    expect(steps(full).map((s) => s.outcome)).toEqual(['all-reported-available', 'all-reported-available', 'all-reported-available', 'all-reported-available']);
    expect(steps(none).map((s) => s.outcome)).toEqual(['some-not-available', 'some-not-available', 'some-not-available', 'some-not-available']);
  });
});

describe('the whole visit', () => {
  const list = steps(lib, { seen, must: ['elevator', 'grab-bar', 'automatic-door', 'accessible-parking'] });
  it('counts each feature once, however many steps it is part of', () => {
    expect(visitFeatures(list).map((f) => f.termId)).toEqual(['step-free-entrance', 'accessible-parking', 'automatic-door', 'clear-door-width', 'ramp', 'elevator', 'grab-bar', 'accessible-washroom']);
    expect(visitCounts(list)).toEqual({ available: 3, notAvailable: 1, unknown: 4 });
    expect(visitCounts(steps(full))).toEqual({ available: 8, notAvailable: 0, unknown: 0 });
    expect(visitCounts([])).toEqual({ available: 0, notAvailable: 0, unknown: 0 });
  });
  it('lists what is still unknown, each feature once, in the order it comes up', () => {
    expect(stillUnknown(list)).toEqual(['clear-door-width', 'ramp', 'grab-bar', 'accessible-washroom']);
    expect(stillUnknown(steps(full))).toEqual([]);
    expect(stillUnknown(steps(none))).toEqual([]);
    expect(stillUnknown(steps(cafe))).toHaveLength(8);
  });
  it('lists the must-haves the records do not report as available', () => {
    expect(mustOpen(list).map((f) => `${f.termId}:${f.state}`)).toEqual(['automatic-door:not-available', 'grab-bar:unknown']);
    expect(mustOpen(steps(lib))).toEqual([]);
    expect(mustOpen(steps(full, { must: ALL }))).toEqual([]);
  });
  it('finds the first step where the information runs short', () => {
    expect(firstOpenStep(list)).toBe(1);
    expect(firstOpenStep(steps(cafe))).toBe(0);
    expect(firstOpenStep(steps(full))).toBe(-1);
    expect(firstOpenStep(steps(none))).toBe(0);
    expect(firstOpenStep([])).toBe(-1);
  });
  it('finds where what the person saw and the records do not match', () => {
    expect(seenDiffers(list).map((f) => f.termId)).toEqual(['step-free-entrance', 'automatic-door']);
  });
  it('does not call it a difference when the records are unknown or the person could not tell', () => {
    const differs = seenDiffers(list).map((f) => f.termId);
    expect(differs).not.toContain('grab-bar');
    expect(differs).not.toContain('elevator');
    expect(differs).not.toContain('accessible-parking');
    expect(seenDiffers(steps(cafe, { seen }))).toEqual([]);
    expect(seenDiffers(steps(lib))).toEqual([]);
  });
});

describe('two visits side by side', () => {
  const paired = pairSteps(steps(lib), steps(full));
  it('pairs every step and every feature', () => {
    expect(paired.map((s) => s.id)).toEqual(STEP_IDS);
    for (const s of paired) expect(s.features.map((f) => f.termId)).toEqual(stepFeatureIds(s.id));
  });
  it('keeps what the records report for each place, and the counts of each', () => {
    const gettingIn = paired[1];
    expect(gettingIn?.features).toEqual([
      { termId: 'step-free-entrance', a: 'available', b: 'available', differs: false },
      { termId: 'automatic-door', a: 'not-available', b: 'available', differs: true },
      { termId: 'clear-door-width', a: 'unknown', b: 'available', differs: true },
      { termId: 'ramp', a: 'disagree', b: 'available', differs: true },
    ]);
    expect(gettingIn?.a).toEqual({ available: 1, notAvailable: 1, unknown: 2 });
    expect(gettingIn?.b).toEqual({ available: 4, notAvailable: 0, unknown: 0 });
  });
  it('treats unknown and disagreeing sources as the same lack of an answer', () => {
    const both = pairSteps(steps(lib), steps(cafe));
    const ramp = both[1]?.features.find((f) => f.termId === 'ramp');
    expect(ramp).toEqual({ termId: 'ramp', a: 'disagree', b: 'unknown', differs: false });
  });
  it('finds no difference between a place and itself', () => {
    for (const place of places) expect(pairTotals(pairSteps(steps(place), steps(place))).differ, place.id).toBe(0);
  });
  it('counts each feature once over the whole visit', () => {
    expect(pairTotals(paired)).toEqual({ features: 8, differ: 5, bothUnknown: 0 });
    expect(pairTotals(pairSteps(steps(lib), steps(cafe)))).toEqual({ features: 8, differ: 4, bothUnknown: 4 });
    expect(pairTotals(pairSteps(steps(full), steps(none)))).toEqual({ features: 8, differ: 8, bothUnknown: 0 });
    expect(pairTotals(pairSteps(steps(cafe), steps(cafe)))).toEqual({ features: 8, differ: 0, bothUnknown: 8 });
    expect(pairTotals([])).toEqual({ features: 0, differ: 0, bothUnknown: 0 });
  });
  it('is the same seen from the other place', () => {
    const back = pairSteps(steps(full), steps(lib));
    expect(pairTotals(back)).toEqual(pairTotals(paired));
    expect(back[1]?.features[1]).toEqual({ termId: 'automatic-door', a: 'available', b: 'not-available', differs: true });
  });
  it('leaves out a step or a feature that the two visits do not share', () => {
    const list = steps(lib);
    expect(pairSteps(list, list.slice(0, 2))).toHaveLength(2);
    expect(pairSteps(list, [...list].reverse()).map((s) => s.id)).toEqual([]);
    const short = list.map((s) => ({ ...s, features: s.features.slice(0, 1) }));
    expect(pairSteps(list, short).map((s) => s.features.length)).toEqual([1, 1, 1, 1]);
    expect(pairSteps([], list)).toEqual([]);
  });
  it('ignores what the person saw and the must-haves: only the records are compared', () => {
    expect(pairSteps(steps(lib, { seen, must: ['ramp'] }), steps(full))).toEqual(paired);
  });
});

describe('which places the table lists', () => {
  it('knows the three choices', () => {
    expect([...STEP_SCOPES]).toEqual(['all', 'saved', 'plan']);
    for (const s of STEP_SCOPES) expect(isStepScope(s)).toBe(true);
    for (const s of ['', 'lists', 3, undefined]) expect(isStepScope(s)).toBe(false);
  });
  it('keeps every place, the saved places, or the places in the plan, in the order of the list', () => {
    expect(scopeIndexes(places, 'all', [], {})).toEqual([0, 1, 2, 3]);
    expect(scopeIndexes(places, 'saved', ['none', 'cafe', 'gone'], {})).toEqual([1, 3]);
    expect(scopeIndexes(places, 'plan', ['cafe'], { full: [], lib: ['ramp'] })).toEqual([0, 2]);
    expect(scopeIndexes(places, 'saved', [], { lib: [] })).toEqual([]);
    expect(scopeIndexes([], 'all', ['lib'], {})).toEqual([]);
  });
});

describe('stepOverview', () => {
  const rows = stepOverview(places);
  it('gives one row per place with the counts of each step and of the whole visit', () => {
    expect(rows.map((r) => r.name)).toEqual(['Library', 'Café Nord', 'Full', 'Nothing there']);
    expect(rows[0]).toEqual({
      placeIndex: 0,
      placeId: 'lib',
      name: 'Library',
      steps: [
        { available: 2, notAvailable: 0, unknown: 0 },
        { available: 1, notAvailable: 1, unknown: 2 },
        { available: 1, notAvailable: 0, unknown: 1 },
        { available: 0, notAvailable: 0, unknown: 3 },
      ],
      visit: { available: 3, notAvailable: 1, unknown: 4 },
    });
  });
  it('agrees with the steps of each place', () => {
    for (const row of rows) {
      const list = steps(places[row.placeIndex] as Place);
      expect(row.steps).toEqual(list.map((s) => s.counts));
      expect(row.visit).toEqual(visitCounts(list));
    }
  });
  it('keeps only the places asked for, and ignores a position that is not in the list', () => {
    expect(stepOverview(places, [2, 0, 9]).map((r) => r.placeId)).toEqual(['full', 'lib']);
    expect(stepOverview(places, [])).toEqual([]);
    expect(stepOverview([])).toEqual([]);
  });
  it('sums the places where nothing, or everything, is unknown', () => {
    expect(overviewTotals(rows)).toEqual({ places: 4, nothingUnknown: 2, allUnknown: 1 });
    expect(overviewTotals([])).toEqual({ places: 0, nothingUnknown: 0, allUnknown: 0 });
  });
});

describe('sortOverview', () => {
  const rows = stepOverview(places);
  const names = (sort: string): string[] => sortOverview(rows, sort, 'en').map((r) => r.name);
  it('knows what the table can be ordered by', () => {
    for (const s of [NAME_SORT, VISIT_SORT, ...STEP_IDS]) expect(isOverviewSort(s)).toBe(true);
    for (const s of ['', 'best', 4, undefined]) expect(isOverviewSort(s)).toBe(false);
  });
  it('orders by name', () => {
    expect(names(NAME_SORT)).toEqual(['Café Nord', 'Full', 'Library', 'Nothing there']);
    expect(names('nonsense')).toEqual(names(NAME_SORT));
  });
  it('orders by the fewest unknown features of the whole visit, then the most reported as available, then by name', () => {
    expect(names(VISIT_SORT)).toEqual(['Full', 'Nothing there', 'Library', 'Café Nord']);
  });
  it('orders by one step', () => {
    expect(names('arriving')).toEqual(['Full', 'Library', 'Nothing there', 'Café Nord']);
    expect(names('washroom-stop')).toEqual(['Full', 'Nothing there', 'Café Nord', 'Library']);
  });
  it('puts a place that reports everything as not available beside one that reports everything as available: both are known', () => {
    const order = sortOverview(rows, VISIT_SORT, 'en');
    expect(order[0]?.visit.unknown).toBe(0);
    expect(order[1]?.visit.unknown).toBe(0);
  });
  it('keeps the order of the list for two places with the same name and counts', () => {
    const twins = stepOverview([cafe, { ...cafe, id: 'cafe2' }]);
    expect(sortOverview(twins, VISIT_SORT, 'en').map((r) => r.placeId)).toEqual(['cafe', 'cafe2']);
    expect(sortOverview([...twins].reverse(), NAME_SORT, 'en').map((r) => r.placeId)).toEqual(['cafe', 'cafe2']);
  });
  it('does not change the rows it was given', () => {
    const before = rows.map((r) => r.placeId);
    sortOverview(rows, VISIT_SORT, 'en');
    expect(rows.map((r) => r.placeId)).toEqual(before);
  });
});

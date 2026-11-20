import { FEATURE_GROUPS, groupFeatures } from './featureGroups';
import type { MustHaves } from './mustHaves';
import { observationsOf, type Observation, type Observations } from './observations';
import { claimFreshness, type Freshness, type Place } from './places';
import type { PlanState } from './plan';
import type { Provenance } from './provenance';
import { mergeClaims, type ResolvedClaim } from './status';

/**
 * A visit, step by step: arriving, getting in, moving inside, and a washroom stop. For each step
 * the page sets out what the records report about each feature, and what they do not. A step is
 * never called easy or hard. The page only counts what is reported and what is still unknown,
 * so a person can see where on the visit the information runs out.
 */
export type StepState = 'available' | 'not-available' | 'unknown' | 'disagree';

export interface StepFeature {
  readonly termId: string;
  readonly state: StepState;
  /** The source behind the answer. Only when the records report available or not available. */
  readonly source?: Provenance;
  readonly freshness: Freshness;
  /** True when the person marked this feature as one they cannot do without. */
  readonly must: boolean;
  /** What the person saw for themselves, when they kept a note. It never changes `state`. */
  readonly seen?: Observation;
}

export interface StepCounts {
  readonly available: number;
  readonly notAvailable: number;
  /** Features with no usable record, and features the sources disagree about. */
  readonly unknown: number;
}

export type StepOutcome = 'all-reported-available' | 'some-not-available' | 'some-unknown';

export interface VisitStep {
  readonly id: string;
  readonly features: readonly StepFeature[];
  readonly counts: StepCounts;
  readonly outcome: StepOutcome;
}

export const STEP_IDS: readonly string[] = FEATURE_GROUPS.map((g) => g.id);

export function isStepId(value: unknown): value is string {
  return typeof value === 'string' && STEP_IDS.includes(value);
}

/** The features of one step, in the order of the glossary. Empty for a step that does not exist. */
export function stepFeatureIds(stepId: string): readonly string[] {
  const group = FEATURE_GROUPS.find((g) => g.id === stepId);
  return group === undefined ? [] : groupFeatures(group);
}

export function countStates(states: readonly StepState[]): StepCounts {
  let available = 0;
  let notAvailable = 0;
  for (const s of states) {
    if (s === 'available') available += 1;
    else if (s === 'not-available') notAvailable += 1;
  }
  return { available, notAvailable, unknown: states.length - available - notAvailable };
}

/** A feature reported as not available decides the step first. Then anything unknown. */
export function stepOutcome(counts: StepCounts): StepOutcome {
  if (counts.notAvailable > 0) return 'some-not-available';
  return counts.unknown > 0 ? 'some-unknown' : 'all-reported-available';
}

/** Sources that disagree leave a feature unknown, and the step says why. */
export function stepStateOf(claim: Pick<ResolvedClaim, 'status' | 'conflict'>): StepState {
  if (claim.conflict) return 'disagree';
  return claim.status === 'present' ? 'available' : claim.status === 'absent' ? 'not-available' : 'unknown';
}

/** What the records of a place report for the features given, by the same rules as the list. */
export function featureStates(place: Pick<Place, 'claims'>, termIds: readonly string[]): readonly StepState[] {
  return mergeClaims(termIds, place.claims).map(stepStateOf);
}

export interface StepOptions {
  readonly today: string;
  readonly must?: MustHaves;
  readonly seen?: Observations;
}

/** The steps of a visit to one place. A feature can be part of more than one step. */
export function visitSteps(place: Place, options: StepOptions): readonly VisitStep[] {
  const must = new Set(options.must ?? []);
  const own = observationsOf(options.seen ?? [], place.id);
  return FEATURE_GROUPS.map((group): VisitStep => {
    const ids = groupFeatures(group);
    const features = mergeClaims(ids, place.claims).map((claim): StepFeature => {
      const state = stepStateOf(claim);
      const seen = own.find((o) => o.termId === claim.termId);
      return {
        termId: claim.termId,
        state,
        freshness: claimFreshness(claim, options.today),
        must: must.has(claim.termId),
        ...(claim.provenance !== undefined && (state === 'available' || state === 'not-available') ? { source: claim.provenance } : {}),
        ...(seen !== undefined ? { seen } : {}),
      };
    });
    const counts = countStates(features.map((f) => f.state));
    return { id: group.id, features, counts, outcome: stepOutcome(counts) };
  });
}

/** Every feature of the visit once, however many steps it is part of. */
export function visitFeatures(steps: readonly VisitStep[]): readonly StepFeature[] {
  const out: StepFeature[] = [];
  const seen = new Set<string>();
  for (const step of steps) {
    for (const feature of step.features) {
      if (seen.has(feature.termId)) continue;
      seen.add(feature.termId);
      out.push(feature);
    }
  }
  return out;
}

/** The counts for the whole visit, each feature once. */
export function visitCounts(steps: readonly VisitStep[]): StepCounts {
  return countStates(visitFeatures(steps).map((f) => f.state));
}

/** The features of the visit that are still unknown, each once, in the order they come up. */
export function stillUnknown(steps: readonly VisitStep[]): readonly string[] {
  return visitFeatures(steps)
    .filter((f) => f.state === 'unknown' || f.state === 'disagree')
    .map((f) => f.termId);
}

/** The must-haves the records do not report as available, each once. */
export function mustOpen(steps: readonly VisitStep[]): readonly StepFeature[] {
  return visitFeatures(steps).filter((f) => f.must && f.state !== 'available');
}

/** The first step where something is not reported as available, or -1 when every step is. */
export function firstOpenStep(steps: readonly VisitStep[]): number {
  return steps.findIndex((s) => s.outcome !== 'all-reported-available');
}

/** Where what the person saw and what the records report do not match, each feature once. */
export function seenDiffers(steps: readonly VisitStep[]): readonly StepFeature[] {
  return visitFeatures(steps).filter(
    (f) => f.seen !== undefined && ((f.seen.seen === 'there' && f.state === 'not-available') || (f.seen.seen === 'not-there' && f.state === 'available')),
  );
}

export interface StepPair {
  readonly termId: string;
  readonly a: StepState;
  readonly b: StepState;
  /** True when the records report something different for the two places. Two unknowns are the same. */
  readonly differs: boolean;
}

export interface PairedStep {
  readonly id: string;
  readonly features: readonly StepPair[];
  readonly a: StepCounts;
  readonly b: StepCounts;
}

const settled = (state: StepState): StepState => (state === 'disagree' ? 'unknown' : state);

/**
 * Two visits side by side, step by step. Both must come from `visitSteps`, so they have the
 * same steps and features. A feature differs when one place has an answer the other does not
 * have, or when the two answers are not the same. Nothing says which place is better.
 */
export function pairSteps(a: readonly VisitStep[], b: readonly VisitStep[]): readonly PairedStep[] {
  const out: PairedStep[] = [];
  a.forEach((stepA, i) => {
    const stepB = b[i];
    if (stepB === undefined || stepB.id !== stepA.id) return;
    const features: StepPair[] = [];
    stepA.features.forEach((featureA, j) => {
      const featureB = stepB.features[j];
      if (featureB === undefined || featureB.termId !== featureA.termId) return;
      features.push({ termId: featureA.termId, a: featureA.state, b: featureB.state, differs: settled(featureA.state) !== settled(featureB.state) });
    });
    out.push({ id: stepA.id, features, a: stepA.counts, b: stepB.counts });
  });
  return out;
}

export interface PairTotals {
  /** Features of the visit, each once. */
  readonly features: number;
  /** Features where the records differ between the two places. */
  readonly differ: number;
  /** Features that are unknown for both places. */
  readonly bothUnknown: number;
}

export function pairTotals(paired: readonly PairedStep[]): PairTotals {
  const seen = new Map<string, StepPair>();
  for (const step of paired) for (const f of step.features) if (!seen.has(f.termId)) seen.set(f.termId, f);
  const all = [...seen.values()];
  return {
    features: all.length,
    differ: all.filter((f) => f.differs).length,
    bothUnknown: all.filter((f) => settled(f.a) === 'unknown' && settled(f.b) === 'unknown').length,
  };
}

export const STEP_SCOPES = ['all', 'saved', 'plan'] as const;
export type StepScope = (typeof STEP_SCOPES)[number];

export function isStepScope(value: unknown): value is StepScope {
  return typeof value === 'string' && (STEP_SCOPES as readonly string[]).includes(value);
}

/** The positions of the places a scope keeps: every place, the saved places, or the places in the plan. */
export function scopeIndexes(places: readonly Place[], scope: StepScope, saved: readonly string[], plan: PlanState): readonly number[] {
  const all = places.map((_, i) => i);
  if (scope === 'all') return all;
  const keep = scope === 'saved' ? new Set(saved) : new Set(Object.keys(plan));
  return all.filter((i) => keep.has((places[i] as Place).id));
}

export interface OverviewRow {
  readonly placeIndex: number;
  readonly placeId: string;
  readonly name: string;
  /** One entry per step, in the order of the steps. */
  readonly steps: readonly StepCounts[];
  /** The whole visit, each feature once. */
  readonly visit: StepCounts;
}

/** One row per place: how much the records report for each step of a visit there. */
export function stepOverview(places: readonly Place[], indexes?: readonly number[]): readonly OverviewRow[] {
  const all: string[] = [];
  for (const id of STEP_IDS) for (const f of stepFeatureIds(id)) if (!all.includes(f)) all.push(f);
  const out: OverviewRow[] = [];
  for (const placeIndex of indexes ?? places.map((_, i) => i)) {
    const place = places[placeIndex];
    if (place === undefined) continue;
    out.push({
      placeIndex,
      placeId: place.id,
      name: place.name,
      steps: STEP_IDS.map((id) => countStates(featureStates(place, stepFeatureIds(id)))),
      visit: countStates(featureStates(place, all)),
    });
  }
  return out;
}

export const VISIT_SORT = 'visit';
export const NAME_SORT = 'name';

export function isOverviewSort(value: unknown): value is string {
  return value === VISIT_SORT || value === NAME_SORT || isStepId(value);
}

/**
 * Orders the rows by how much is known. For a step, or for the whole visit: the fewest unknown
 * features first, then the most reported as available, then by name. This orders by what the
 * records say, never by a judgement of the place. `name` orders by name only.
 */
export function sortOverview(rows: readonly OverviewRow[], sort: string, locale: string): readonly OverviewRow[] {
  const byName = (a: OverviewRow, b: OverviewRow): number => a.name.localeCompare(b.name, locale) || a.placeIndex - b.placeIndex;
  const at = STEP_IDS.indexOf(sort);
  if (sort !== VISIT_SORT && at === -1) return [...rows].sort(byName);
  const pick = (row: OverviewRow): StepCounts => (at === -1 ? row.visit : (row.steps[at] as StepCounts));
  return [...rows].sort((a, b) => pick(a).unknown - pick(b).unknown || pick(b).available - pick(a).available || byName(a, b));
}

export interface OverviewTotals {
  readonly places: number;
  /** Places where nothing on the visit is unknown. */
  readonly nothingUnknown: number;
  /** Places where every feature of the visit is unknown. */
  readonly allUnknown: number;
}

export function overviewTotals(rows: readonly OverviewRow[]): OverviewTotals {
  return {
    places: rows.length,
    nothingUnknown: rows.filter((r) => r.visit.unknown === 0).length,
    allUnknown: rows.filter((r) => r.visit.available === 0 && r.visit.notAvailable === 0).length,
  };
}

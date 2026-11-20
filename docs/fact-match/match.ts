/**
 * Holds a place's measured facts against the numbers a person set. Every answer is one of
 * three: the fact fits the number, it does not, or the fact is UNKNOWN so nothing can be said.
 * UNKNOWN is never counted as fitting and never as not fitting. This says how facts compare
 * with numbers; it does not say who can use a place.
 */
import { setCriteria, type Criteria, type CriterionKey } from './criteria.js';
import type { Measures } from '../place-measures/index.js';

export type Outcome = 'fits' | 'does-not-fit' | 'unknown';
export type FactSource = 'measured' | 'told';

export interface Check {
  key: CriterionKey;
  outcome: Outcome;
  /** Where the fact came from. Null when it is UNKNOWN. */
  source: FactSource | null;
  /** For a length or a count: the fact minus the number the person set. Null otherwise. */
  margin: number | null;
  /** True when a ramp stood in for the step limit. */
  byRamp: boolean;
}

export type Overall = 'no-criteria' | 'fits' | 'does-not-fit' | 'cannot-say';

export interface MatchResult {
  recordId: string;
  overall: Overall;
  checks: Check[];
  /** True when at least one fact used came from what the place said. */
  usedTold: boolean;
}

interface Found<T> {
  value: T;
  source: FactSource;
}

function fact<K extends keyof Measures>(key: K, measured: Measures | null, told: Measures | null, countTold: boolean): Found<NonNullable<Measures[K]>> | null {
  const mine = measured === null ? null : measured[key];
  if (mine !== null) return { value: mine as NonNullable<Measures[K]>, source: 'measured' };
  const theirs = !countTold || told === null ? null : told[key];
  return theirs === null ? null : { value: theirs as NonNullable<Measures[K]>, source: 'told' };
}

const unknown = (key: CriterionKey): Check => ({ key, outcome: 'unknown', source: null, margin: null, byRamp: false });

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function checkOne(key: CriterionKey, criteria: Criteria, measured: Measures | null, told: Measures | null): Check {
  const get = <K extends keyof Measures>(name: K) => fact(name, measured, told, criteria.countTold);
  const ramp = criteria.rampInstead ? get('ramp') : null;
  const rampFits = (): Check | null => (ramp !== null && ramp.value === 'yes' ? { key, outcome: 'fits', source: ramp.source, margin: null, byRamp: true } : null);
  switch (key) {
    case 'steps': {
      const steps = get('steps');
      if (steps !== null && steps.value <= (criteria.maxSteps ?? 0)) return { key, outcome: 'fits', source: steps.source, margin: steps.value - (criteria.maxSteps ?? 0), byRamp: false };
      const byRamp = rampFits();
      if (byRamp !== null) return byRamp;
      if (steps === null) return unknown(key);
      // More steps than the number set. With "a ramp counts instead" on and the ramp UNKNOWN, nothing can be said yet.
      if (criteria.rampInstead && ramp === null) return unknown(key);
      return { key, outcome: 'does-not-fit', source: steps.source, margin: steps.value - (criteria.maxSteps ?? 0), byRamp: false };
    }
    case 'stepHeight': {
      const steps = get('steps');
      if (steps !== null && steps.value === 0) return { key, outcome: 'fits', source: steps.source, margin: null, byRamp: false };
      const height = get('stepHeightCm');
      const limit = criteria.maxStepHeightCm ?? 0;
      if (height !== null && height.value <= limit) return { key, outcome: 'fits', source: height.source, margin: round(height.value - limit), byRamp: false };
      const byRamp = rampFits();
      if (byRamp !== null) return byRamp;
      if (height === null) return unknown(key);
      if (criteria.rampInstead && ramp === null) return unknown(key);
      return { key, outcome: 'does-not-fit', source: height.source, margin: round(height.value - limit), byRamp: false };
    }
    case 'doorWidth': {
      const width = get('doorWidthCm');
      if (width === null) return unknown(key);
      const margin = round(width.value - (criteria.minDoorWidthCm ?? 0));
      return { key, outcome: margin >= 0 ? 'fits' : 'does-not-fit', source: width.source, margin, byRamp: false };
    }
    case 'door': {
      const opening = get('doorOpening');
      if (opening === null) return unknown(key);
      const fits = criteria.door === 'by-itself' ? opening.value === 'automatic' : opening.value !== 'manual';
      return { key, outcome: fits ? 'fits' : 'does-not-fit', source: opening.source, margin: null, byRamp: false };
    }
    case 'toilet': {
      const toilet = get('toilet');
      if (toilet === null) return unknown(key);
      return { key, outcome: toilet.value === 'yes' ? 'fits' : 'does-not-fit', source: toilet.source, margin: null, byRamp: false };
    }
    case 'toiletDoor': {
      const toilet = get('toilet');
      if (toilet !== null && toilet.value === 'no') return { key, outcome: 'does-not-fit', source: toilet.source, margin: null, byRamp: false };
      const width = get('toiletDoorCm');
      if (width === null) return unknown(key);
      const margin = round(width.value - (criteria.minToiletDoorCm ?? 0));
      return { key, outcome: margin >= 0 ? 'fits' : 'does-not-fit', source: width.source, margin, byRamp: false };
    }
  }
}

/**
 * One place against the criteria. A place fits only when every criterion fits. One criterion
 * that does not fit settles it. Otherwise, with anything UNKNOWN, nothing can be said.
 */
export function matchPlace(recordId: string, criteria: Criteria, measured: Measures | null, told: Measures | null): MatchResult {
  const checks = setCriteria(criteria).map((key) => checkOne(key, criteria, measured, told));
  let overall: Overall = 'fits';
  if (checks.length === 0) overall = 'no-criteria';
  else if (checks.some((check) => check.outcome === 'does-not-fit')) overall = 'does-not-fit';
  else if (checks.some((check) => check.outcome === 'unknown')) overall = 'cannot-say';
  return { recordId, overall, checks, usedTold: checks.some((check) => check.source === 'told') };
}

export interface MatchCounts {
  total: number;
  fits: number;
  doesNotFit: number;
  cannotSay: number;
}

export function matchCounts(results: readonly MatchResult[]): MatchCounts {
  const counts: MatchCounts = { total: results.length, fits: 0, doesNotFit: 0, cannotSay: 0 };
  for (const result of results) {
    if (result.overall === 'fits') counts.fits += 1;
    else if (result.overall === 'does-not-fit') counts.doesNotFit += 1;
    else if (result.overall === 'cannot-say') counts.cannotSay += 1;
  }
  return counts;
}

/** The criteria that are UNKNOWN for a place: what to measure or ask about next. */
export function unknownChecks(result: MatchResult): CriterionKey[] {
  return result.checks.filter((check) => check.outcome === 'unknown').map((check) => check.key);
}

export function failedChecks(result: MatchResult): CriterionKey[] {
  return result.checks.filter((check) => check.outcome === 'does-not-fit').map((check) => check.key);
}

/** How many places are UNKNOWN on each criterion, most first: where one more measurement settles the most. */
export function unknownTally(results: readonly MatchResult[]): { key: CriterionKey; places: number }[] {
  const tally = new Map<CriterionKey, number>();
  for (const result of results) {
    if (result.overall !== 'cannot-say') continue;
    for (const key of unknownChecks(result)) tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return [...tally.entries()].map(([key, places]) => ({ key, places })).sort((a, b) => b.places - a.places || a.key.localeCompare(b.key));
}

/**
 * Sets a person's own observation beside the pack place it seems to be about, and says how the
 * two differ. It does not say which one is right, and UNKNOWN on either side stays UNKNOWN.
 */
import { DEFAULT_RADIUS, matchFor, type Candidate, type Match, type NoteRecord } from './match.js';
import { daysBetween, isIsoDay } from '../presubmit/text.js';

export type Outcome = 'differs' | 'unsure' | 'fills-unknown' | 'new' | 'mine-unknown' | 'both-unknown' | 'agrees';

export const OUTCOME_ORDER: readonly Outcome[] = ['differs', 'unsure', 'fills-unknown', 'new', 'mine-unknown', 'both-unknown', 'agrees'];

export type Newer = 'mine' | 'theirs' | 'same-day' | 'unknown';

export interface Comparison {
  mine: NoteRecord;
  match: Match;
  outcome: Outcome;
  /** Which record was seen more recently. Unknown when a date is not a real day or there is no match. */
  newer: Newer;
  /** Days between the two observation dates, never negative. Null when unknown. */
  daysApart: number | null;
  /** True when both records have a name and the names share less than half their words. */
  nameDiffers: boolean;
  licenceDiffers: boolean;
}

const KNOWN: readonly string[] = ['yes', 'limited', 'no'];

export function isKnownStatus(status: string): boolean {
  return KNOWN.includes(status);
}

export function outcomeFor(mine: NoteRecord, match: Match): Outcome {
  if (match.kind === 'none') return 'new';
  if (match.kind === 'unsure' || match.best === null) return 'unsure';
  const theirs = match.best.record;
  const mineKnown = isKnownStatus(mine.wheelchair);
  const theirsKnown = isKnownStatus(theirs.wheelchair);
  if (!mineKnown && !theirsKnown) return 'both-unknown';
  if (!mineKnown) return 'mine-unknown';
  if (!theirsKnown) return 'fills-unknown';
  return mine.wheelchair === theirs.wheelchair ? 'agrees' : 'differs';
}

export function newerOf(mine: NoteRecord, best: Candidate | null): { newer: Newer; daysApart: number | null } {
  if (best === null || !isIsoDay(mine.observedOn) || !isIsoDay(best.record.observedOn)) return { newer: 'unknown', daysApart: null };
  const days = daysBetween(best.record.observedOn, mine.observedOn);
  if (days === null) return { newer: 'unknown', daysApart: null };
  if (days === 0) return { newer: 'same-day', daysApart: 0 };
  return { newer: days > 0 ? 'mine' : 'theirs', daysApart: Math.abs(days) };
}

export function compareOne(mine: NoteRecord, theirs: readonly NoteRecord[], radius: number = DEFAULT_RADIUS): Comparison {
  const match = matchFor(mine, theirs, radius);
  const best = match.best;
  const { newer, daysApart } = newerOf(mine, best);
  return {
    mine,
    match,
    outcome: outcomeFor(mine, match),
    newer,
    daysApart,
    nameDiffers: best !== null && best.similarity !== null && best.similarity < 0.5,
    licenceDiffers: best !== null && best.record.licence !== mine.licence,
  };
}

export type OutcomeCounts = Record<Outcome, number> & { total: number };

export interface CompareReport {
  radius: number;
  items: Comparison[];
  counts: OutcomeCounts;
  /** How many pack places were looked at. */
  packPlaces: number;
}

export function emptyCounts(): OutcomeCounts {
  return { total: 0, differs: 0, unsure: 0, 'fills-unknown': 0, new: 0, 'mine-unknown': 0, 'both-unknown': 0, agrees: 0 };
}

export function compareAll(mine: readonly NoteRecord[], theirs: readonly NoteRecord[], radius: number = DEFAULT_RADIUS): CompareReport {
  const items = mine.map((record) => compareOne(record, theirs, radius));
  items.sort(
    (a, b) =>
      OUTCOME_ORDER.indexOf(a.outcome) - OUTCOME_ORDER.indexOf(b.outcome) ||
      a.mine.observedOn.localeCompare(b.mine.observedOn) ||
      a.mine.id.localeCompare(b.mine.id),
  );
  const counts = emptyCounts();
  for (const item of items) {
    counts.total += 1;
    counts[item.outcome] += 1;
  }
  return { radius, items, counts, packPlaces: theirs.length };
}

export function withOutcome(report: CompareReport, outcome: Outcome | 'all'): Comparison[] {
  return outcome === 'all' ? [...report.items] : report.items.filter((item) => item.outcome === outcome);
}

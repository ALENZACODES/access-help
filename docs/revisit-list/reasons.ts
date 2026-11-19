/**
 * Why a place in a loaded pack may be worth another visit. Pure: no network, no storage, no
 * clock. A reason is a prompt for a person to go and look. It says nothing about what they
 * will find, and it never changes a record.
 */
import { daysBetween, isIsoDay } from '../presubmit/text.js';

export interface RevisitRecord {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  wheelchair: string;
  source: string;
  licence: string;
  observedOn: string;
}

export interface RevisitPlace {
  record: RevisitRecord;
  /** Set when loaded packs disagree about this place. */
  conflict: 'status' | 'location' | null;
}

export const REASONS = ['packs-disagree', 'status-unknown', 'very-old', 'old', 'date-unclear', 'no-name'] as const;
export type Reason = (typeof REASONS)[number];

export const OLD_DAYS = 365;
export const VERY_OLD_DAYS = 730;

const WEIGHT: Record<Reason, number> = {
  'packs-disagree': 5,
  'status-unknown': 4,
  'very-old': 3,
  old: 2,
  'date-unclear': 2,
  'no-name': 1,
};

export function reasonWeight(reason: Reason): number {
  return WEIGHT[reason];
}

const KNOWN: readonly string[] = ['yes', 'limited', 'no'];

/** Age of the observation in days. Null when the date is not a real day or is after today. */
export function ageDays(observedOn: string, today: string): number | null {
  if (!isIsoDay(observedOn) || !isIsoDay(today)) return null;
  const days = daysBetween(observedOn, today);
  return days === null || days < 0 ? null : days;
}

/** Reasons for one place, heaviest first. Empty when there is none. */
export function reasonsFor(place: RevisitPlace, today: string): Reason[] {
  const out: Reason[] = [];
  const { record } = place;
  if (place.conflict !== null) out.push('packs-disagree');
  // A conflict is shown as UNKNOWN already; do not count the same thing twice.
  else if (!KNOWN.includes(record.wheelchair)) out.push('status-unknown');
  const age = ageDays(record.observedOn, today);
  if (age === null) out.push('date-unclear');
  else if (age >= VERY_OLD_DAYS) out.push('very-old');
  else if (age >= OLD_DAYS) out.push('old');
  if (record.name === null || record.name.trim() === '') out.push('no-name');
  return out.sort((a, b) => WEIGHT[b] - WEIGHT[a]);
}

export function scoreOf(reasons: readonly Reason[]): number {
  return reasons.reduce((sum, reason) => sum + WEIGHT[reason], 0);
}

export function cleanReasons(value: readonly string[]): Reason[] {
  return REASONS.filter((reason) => value.includes(reason));
}

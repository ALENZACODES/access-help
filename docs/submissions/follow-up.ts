/**
 * Gentle reminders to look at a place on the map again, some time after the person says they
 * submitted it. Pure: today comes in as an argument. A reminder is a suggestion the person can
 * ignore. It does not say anything is wrong.
 */
import type { Ledger, LedgerEntry } from './ledger.js';
import { daysBetween } from './text.js';

export const LOOK_AGAIN_AFTER_DAYS = 30;

export type FollowUpReason = 'never-looked' | 'looked-long-ago';

export interface FollowUp {
  recordId: string;
  reason: FollowUpReason;
  /** Days since the person marked it submitted (never-looked) or since they last looked (looked-long-ago). */
  days: number;
}

/** Whole days from a day to today, or null when either is not a real day. */
export function daysSince(day: string, today: string): number | null {
  return daysBetween(day, today);
}

/** The follow-up for one entry, or null when it is not due. */
export function followUpFor(entry: LedgerEntry, today: string, afterDays: number = LOOK_AGAIN_AFTER_DAYS): FollowUp | null {
  if (entry.lookedAgainOn === null) {
    const days = daysSince(entry.markedOn, today);
    return days !== null && days >= afterDays ? { recordId: entry.recordId, reason: 'never-looked', days } : null;
  }
  const days = daysSince(entry.lookedAgainOn, today);
  return days !== null && days >= afterDays * 3 ? { recordId: entry.recordId, reason: 'looked-long-ago', days } : null;
}

/** Follow-ups that are due, the longest-waiting first. Ties are put in id order. */
export function followUps(ledger: Ledger, today: string, afterDays: number = LOOK_AGAIN_AFTER_DAYS): FollowUp[] {
  return ledger.entries
    .map((entry) => followUpFor(entry, today, afterDays))
    .filter((item): item is FollowUp => item !== null)
    .sort((a, b) => b.days - a.days || a.recordId.localeCompare(b.recordId));
}

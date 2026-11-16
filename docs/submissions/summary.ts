/**
 * Counts for the submissions screen. The numbers describe what the person told the App. The
 * App cannot see OpenStreetMap, so none of them says anything was received or accepted.
 */
import { followUps, type FollowUp } from './follow-up.js';
import type { Ledger } from './ledger.js';
import { entryFor } from './ledger.js';
import { fill, pick, type SubLang } from './text.js';

export interface SummaryRecord {
  id: string;
  name: string | null;
  observedOn: string;
}

export interface Summary {
  total: number;
  marked: number;
  notMarked: number;
  /** Entries whose place is no longer saved. */
  orphans: number;
  followUps: FollowUp[];
  /** Number marked per month (YYYY-MM), oldest month first. */
  byMonth: { month: string; count: number }[];
  /** With a changeset number given. */
  withChangeset: number;
}

export function summarise(records: readonly SummaryRecord[], ledger: Ledger, today: string): Summary {
  const ids = new Set(records.map((r) => r.id));
  const marked = records.filter((r) => entryFor(ledger, r.id) !== undefined).length;
  const months = new Map<string, number>();
  for (const entry of ledger.entries) {
    if (!ids.has(entry.recordId)) continue;
    const month = entry.markedOn.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + 1);
  }
  return {
    total: records.length,
    marked,
    notMarked: records.length - marked,
    orphans: ledger.entries.filter((entry) => !ids.has(entry.recordId)).length,
    followUps: followUps({ version: 1, entries: ledger.entries.filter((e) => ids.has(e.recordId)) }, today),
    byMonth: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
    withChangeset: ledger.entries.filter((e) => ids.has(e.recordId) && e.changeset !== null).length,
  };
}

/** Places not yet marked, the oldest observation first, then by id. */
export function nextToSubmit(records: readonly SummaryRecord[], ledger: Ledger, limit = 5): SummaryRecord[] {
  return records
    .filter((r) => entryFor(ledger, r.id) === undefined)
    .sort((a, b) => a.observedOn.localeCompare(b.observedOn) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit));
}

export function ledgerSummaryText(summary: Summary, lang: SubLang): string {
  if (summary.total === 0) {
    return pick(lang, 'You have no saved observations.', 'Vous n’avez aucune observation enregistrée.');
  }
  return fill(
    pick(
      lang,
      'You marked {marked} of {total} saved observations as submitted. {notMarked} not marked yet. These counts are what you told the App. It cannot see OpenStreetMap.',
      'Vous avez marqué {marked} observations enregistrées sur {total} comme soumises. {notMarked} pas encore marquées. Ces chiffres sont ce que vous avez indiqué à l’application. Elle ne peut pas voir OpenStreetMap.',
    ),
    { marked: summary.marked, total: summary.total, notMarked: summary.notMarked },
  );
}

/**
 * A person's own list of what they have submitted to OpenStreetMap. Pure functions.
 * An entry means "I told the App I submitted this". It is never evidence that the
 * submission reached OpenStreetMap or was accepted: the App cannot see OpenStreetMap.
 */
import { isChangesetId, parseChangesetId, type ChangesetFailure } from './changeset.js';
import { daysBetween, isIsoDay } from './text.js';

export const MAX_NOTE = 200;
export const MAX_ENTRIES = 400;

export interface LedgerEntry {
  recordId: string;
  /** The day the person says they submitted, YYYY-MM-DD. */
  markedOn: string;
  /** Changeset number the person gave, or null. */
  changeset: string | null;
  note: string;
  /** The day the person says they looked at the place on the map again, or null. */
  lookedAgainOn: string | null;
}

export interface Ledger {
  version: 1;
  entries: LedgerEntry[];
}

export const EMPTY_LEDGER: Ledger = { version: 1, entries: [] };

export function emptyLedger(): Ledger {
  return { version: 1, entries: [] };
}

export interface SubmitInput {
  markedOn: string;
  changeset: string;
  note: string;
}

export type EntryField = 'markedOn' | 'changeset' | 'note' | 'lookedAgainOn';

export type EntryIssueCode =
  | 'date-invalid'
  | 'date-future'
  | 'date-before-seen'
  | 'date-before-marked'
  | 'changeset-not-a-number'
  | 'changeset-too-long'
  | 'changeset-zero'
  | 'note-too-long'
  | 'ledger-full';

export interface EntryIssue {
  field: EntryField;
  code: EntryIssueCode;
}

export type LedgerResult = { ok: true; ledger: Ledger } | { ok: false; issues: EntryIssue[] };

export interface SeenRecord {
  id: string;
  /** The day the place was observed, YYYY-MM-DD. */
  observedOn: string;
}

const CHANGESET_CODE: Record<Exclude<ChangesetFailure, 'empty'>, EntryIssueCode> = {
  'not-a-number': 'changeset-not-a-number',
  'too-long': 'changeset-too-long',
  zero: 'changeset-zero',
};

export function entryFor(ledger: Ledger, recordId: string): LedgerEntry | undefined {
  return ledger.entries.find((entry) => entry.recordId === recordId);
}

function replaceEntry(ledger: Ledger, entry: LedgerEntry): Ledger {
  const rest = ledger.entries.filter((item) => item.recordId !== entry.recordId);
  return { version: 1, entries: [...rest, entry].sort((a, b) => a.recordId.localeCompare(b.recordId)) };
}

/**
 * Records that the person submitted a place. The day must be a real day, not after today and
 * not before the day the place was observed. A changeset number is optional. Saving again for
 * the same place replaces the entry and keeps a "looked again" day only if it is still valid.
 */
export function markSubmitted(ledger: Ledger, record: SeenRecord, input: SubmitInput, today: string): LedgerResult {
  const issues: EntryIssue[] = [];
  const markedOn = input.markedOn.trim();
  if (!isIsoDay(markedOn)) issues.push({ field: 'markedOn', code: 'date-invalid' });
  else if ((daysBetween(markedOn, today) ?? 0) < 0) issues.push({ field: 'markedOn', code: 'date-future' });
  else if (isIsoDay(record.observedOn) && (daysBetween(record.observedOn, markedOn) ?? 0) < 0) {
    issues.push({ field: 'markedOn', code: 'date-before-seen' });
  }
  let changeset: string | null = null;
  const typed = input.changeset.trim();
  if (typed !== '') {
    const parsed = parseChangesetId(typed);
    if (parsed.ok) changeset = parsed.id;
    else if (parsed.code !== 'empty') issues.push({ field: 'changeset', code: CHANGESET_CODE[parsed.code] });
  }
  const note = input.note.trim();
  if (Array.from(note).length > MAX_NOTE) issues.push({ field: 'note', code: 'note-too-long' });
  const existing = entryFor(ledger, record.id);
  if (existing === undefined && ledger.entries.length >= MAX_ENTRIES) issues.push({ field: 'markedOn', code: 'ledger-full' });
  if (issues.length > 0) return { ok: false, issues };
  const keepLooked =
    existing?.lookedAgainOn != null && (daysBetween(markedOn, existing.lookedAgainOn) ?? -1) >= 0 ? existing.lookedAgainOn : null;
  return {
    ok: true,
    ledger: replaceEntry(ledger, { recordId: record.id, markedOn, changeset, note, lookedAgainOn: keepLooked }),
  };
}

/** Records the day the person looked at the place on the map again. */
export function recordLookedAgain(ledger: Ledger, recordId: string, day: string, today: string): LedgerResult {
  const entry = entryFor(ledger, recordId);
  const issues: EntryIssue[] = [];
  const text = day.trim();
  if (!isIsoDay(text)) issues.push({ field: 'lookedAgainOn', code: 'date-invalid' });
  else if ((daysBetween(text, today) ?? 0) < 0) issues.push({ field: 'lookedAgainOn', code: 'date-future' });
  else if (entry !== undefined && (daysBetween(entry.markedOn, text) ?? 0) < 0) {
    issues.push({ field: 'lookedAgainOn', code: 'date-before-marked' });
  }
  if (issues.length > 0 || entry === undefined) return { ok: false, issues };
  return { ok: true, ledger: replaceEntry(ledger, { ...entry, lookedAgainOn: text }) };
}

export function unmark(ledger: Ledger, recordId: string): Ledger {
  return { version: 1, entries: ledger.entries.filter((entry) => entry.recordId !== recordId) };
}

/** Drops entries whose place is no longer saved. */
export function pruneLedger(ledger: Ledger, existingIds: readonly string[]): Ledger {
  const keep = new Set(existingIds);
  const entries = ledger.entries.filter((entry) => keep.has(entry.recordId));
  return entries.length === ledger.entries.length ? ledger : { version: 1, entries };
}

export type SubmissionStatus = 'not-marked' | 'marked';

export function statusOf(entry: LedgerEntry | undefined): SubmissionStatus {
  return entry === undefined ? 'not-marked' : 'marked';
}

/** True when the value is a well-formed entry. Used when reading stored or restored data. */
export function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.recordId === 'string' &&
    v.recordId !== '' &&
    v.recordId.length <= 120 &&
    typeof v.markedOn === 'string' &&
    isIsoDay(v.markedOn) &&
    (v.changeset === null || isChangesetId(v.changeset)) &&
    typeof v.note === 'string' &&
    Array.from(v.note).length <= MAX_NOTE &&
    (v.lookedAgainOn === null || (typeof v.lookedAgainOn === 'string' && isIsoDay(v.lookedAgainOn) && v.lookedAgainOn >= v.markedOn))
  );
}

export interface ReadLedger {
  ledger: Ledger;
  /** Entries that were not well formed, were repeated, or were past the limit. */
  dropped: number;
}

/** Keeps the well-formed entries, the first of any repeated place, and no more than MAX_ENTRIES. Never repairs an entry. */
export function readLedger(value: unknown): ReadLedger {
  const items = typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as { entries?: unknown }).entries : undefined;
  if (!Array.isArray(items)) return { ledger: emptyLedger(), dropped: 0 };
  const seen = new Set<string>();
  const entries: LedgerEntry[] = [];
  let dropped = 0;
  for (const item of items) {
    if (!isLedgerEntry(item) || seen.has(item.recordId) || entries.length >= MAX_ENTRIES) {
      dropped += 1;
      continue;
    }
    seen.add(item.recordId);
    entries.push({
      recordId: item.recordId,
      markedOn: item.markedOn,
      changeset: item.changeset,
      note: item.note,
      lookedAgainOn: item.lookedAgainOn,
    });
  }
  entries.sort((a, b) => a.recordId.localeCompare(b.recordId));
  return { ledger: { version: 1, entries }, dropped };
}

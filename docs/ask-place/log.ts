/**
 * A person's own list of the times they asked a place a question. An entry means "I say I
 * asked". The App sends nothing and cannot see whether a message arrived or was answered.
 */
import { cleanQuestions } from './questions.js';
import { isChannel, type Channel } from './letter.js';
import type { FactKey } from '../place-measures/index.js';
import { daysBetween, isIsoDay } from '../presubmit/text.js';

export const ASK_STATUSES = ['waiting', 'answered', 'no-reply'] as const;
export type AskStatus = (typeof ASK_STATUSES)[number];

export const MAX_ASKS = 400;
export const MAX_ASKS_PER_PLACE = 6;

export interface AskEntry {
  /** A number that tells two asks about the same place apart. */
  n: number;
  recordId: string;
  /** The day the person says they asked, YYYY-MM-DD. */
  askedOn: string;
  channel: Channel;
  questions: FactKey[];
  status: AskStatus;
  /** The day the person marked the ask answered or closed without a reply, or null while waiting. */
  closedOn: string | null;
}

export interface AskLog {
  version: 1;
  entries: AskEntry[];
}

export function emptyLog(): AskLog {
  return { version: 1, entries: [] };
}

export function isAskStatus(value: unknown): value is AskStatus {
  return typeof value === 'string' && (ASK_STATUSES as readonly string[]).includes(value);
}

function sorted(entries: AskEntry[]): AskEntry[] {
  return [...entries].sort((a, b) => a.recordId.localeCompare(b.recordId) || a.askedOn.localeCompare(b.askedOn) || a.n - b.n);
}

export function asksFor(log: AskLog, recordId: string): AskEntry[] {
  return log.entries.filter((entry) => entry.recordId === recordId);
}

export type AskIssue = 'date-invalid' | 'date-future' | 'no-question' | 'too-many-for-place' | 'log-full';
export type AskResult = { ok: true; log: AskLog; entry: AskEntry } | { ok: false; issue: AskIssue };

export interface AskInput {
  recordId: string;
  askedOn: string;
  channel: Channel;
  questions: readonly FactKey[];
}

/** Notes that the person asked. The day must be a real day and not after today. */
export function recordAsk(log: AskLog, input: AskInput, today: string): AskResult {
  if (!isIsoDay(input.askedOn)) return { ok: false, issue: 'date-invalid' };
  if ((daysBetween(input.askedOn, today) ?? 0) < 0) return { ok: false, issue: 'date-future' };
  const questions = cleanQuestions([...input.questions]);
  if (questions.length === 0) return { ok: false, issue: 'no-question' };
  if (asksFor(log, input.recordId).length >= MAX_ASKS_PER_PLACE) return { ok: false, issue: 'too-many-for-place' };
  if (log.entries.length >= MAX_ASKS) return { ok: false, issue: 'log-full' };
  const n = log.entries.reduce((max, entry) => Math.max(max, entry.n), 0) + 1;
  const entry: AskEntry = { n, recordId: input.recordId, askedOn: input.askedOn, channel: input.channel, questions, status: 'waiting', closedOn: null };
  return { ok: true, log: { version: 1, entries: sorted([...log.entries, entry]) }, entry };
}

/**
 * Changes what the person says happened to an ask. Closing it stamps today; setting it back to
 * waiting clears the stamp. An ask that does not exist leaves the log as it was.
 */
export function setAskStatus(log: AskLog, n: number, status: AskStatus, today: string): AskLog {
  if (!log.entries.some((entry) => entry.n === n)) return log;
  return {
    version: 1,
    entries: log.entries.map((entry) => (entry.n === n ? { ...entry, status, closedOn: status === 'waiting' ? null : isIsoDay(today) && today >= entry.askedOn ? today : entry.askedOn } : entry)),
  };
}

export function removeAsk(log: AskLog, n: number): AskLog {
  const entries = log.entries.filter((entry) => entry.n !== n);
  return entries.length === log.entries.length ? log : { version: 1, entries };
}

/** Drops asks for observations that are no longer saved. */
export function pruneLog(log: AskLog, existingIds: readonly string[]): AskLog {
  const keep = new Set(existingIds);
  const entries = log.entries.filter((entry) => keep.has(entry.recordId));
  return entries.length === log.entries.length ? log : { version: 1, entries };
}

/** Whole days since the person asked, while they are still waiting. Null otherwise. */
export function daysWaiting(entry: AskEntry, today: string): number | null {
  if (entry.status !== 'waiting') return null;
  const days = daysBetween(entry.askedOn, today);
  return days === null || days < 0 ? null : days;
}

export interface AskCounts {
  total: number;
  waiting: number;
  answered: number;
  noReply: number;
}

export function askCounts(entries: readonly AskEntry[]): AskCounts {
  const counts: AskCounts = { total: entries.length, waiting: 0, answered: 0, noReply: 0 };
  for (const entry of entries) {
    if (entry.status === 'waiting') counts.waiting += 1;
    else if (entry.status === 'answered') counts.answered += 1;
    else counts.noReply += 1;
  }
  return counts;
}

function cleanEntry(value: unknown): AskEntry | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.n !== 'number' || !Number.isInteger(item.n) || item.n < 1 || item.n > 1_000_000) return null;
  if (typeof item.recordId !== 'string' || item.recordId === '' || item.recordId.length > 200) return null;
  if (typeof item.askedOn !== 'string' || !isIsoDay(item.askedOn) || !isChannel(item.channel)) return null;
  const questions = cleanQuestions(item.questions);
  if (questions.length === 0) return null;
  const status = isAskStatus(item.status) ? item.status : 'waiting';
  const closedOn = status !== 'waiting' && typeof item.closedOn === 'string' && isIsoDay(item.closedOn) && item.closedOn >= item.askedOn ? item.closedOn : null;
  return { n: item.n, recordId: item.recordId, askedOn: item.askedOn, channel: item.channel, questions, status, closedOn: status === 'waiting' ? null : (closedOn ?? item.askedOn) };
}

export interface ReadLog {
  log: AskLog;
  /** Entries that could not be used and were left out. */
  dropped: number;
}

/** Reads a stored log. Entries are cleaned one by one; a repeated number is dropped. */
export function readLog(value: unknown): ReadLog {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { log: emptyLog(), dropped: 0 };
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || !Array.isArray(item.entries)) return { log: emptyLog(), dropped: 0 };
  const seen = new Set<number>();
  const perPlace = new Map<string, number>();
  const entries: AskEntry[] = [];
  let dropped = 0;
  for (const raw of item.entries) {
    const clean = cleanEntry(raw);
    const count = clean === null ? 0 : (perPlace.get(clean.recordId) ?? 0);
    if (clean === null || seen.has(clean.n) || count >= MAX_ASKS_PER_PLACE || entries.length >= MAX_ASKS) {
      dropped += 1;
      continue;
    }
    seen.add(clean.n);
    perPlace.set(clean.recordId, count + 1);
    entries.push(clean);
  }
  return { log: { version: 1, entries: sorted(entries) }, dropped };
}

export interface MergeLogs {
  log: AskLog;
  added: number;
  /** Asks left out because the observation is not saved, the same ask is already there, or there was no room. */
  skipped: number;
}

function sameAsk(a: AskEntry, b: AskEntry): boolean {
  return a.recordId === b.recordId && a.askedOn === b.askedOn && a.channel === b.channel && a.questions.join() === b.questions.join();
}

/** Adds asks from a backup for saved observations. Nothing on the device is replaced. */
export function mergeLogs(current: AskLog, incoming: AskLog, existingIds: readonly string[]): MergeLogs {
  const saved = new Set(existingIds);
  let entries = [...current.entries];
  let added = 0;
  let skipped = 0;
  for (const entry of incoming.entries) {
    const here = entries.filter((item) => item.recordId === entry.recordId);
    if (!saved.has(entry.recordId) || here.some((item) => sameAsk(item, entry)) || here.length >= MAX_ASKS_PER_PLACE || entries.length >= MAX_ASKS) {
      skipped += 1;
      continue;
    }
    const n = entries.reduce((max, item) => Math.max(max, item.n), 0) + 1;
    entries = [...entries, { ...entry, n }];
    added += 1;
  }
  return { log: added === 0 ? current : { version: 1, entries: sorted(entries) }, added, skipped };
}

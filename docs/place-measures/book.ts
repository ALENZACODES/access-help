/**
 * The person's measures for all their observations, one entry per observation. Pure functions:
 * the screen's store does the reading and writing.
 */
import { cleanMeasures, type Measures } from './measures.js';

export const MAX_MEASURED = 200;

export interface MeasureBook {
  version: 1;
  entries: Measures[];
}

export function emptyBook(): MeasureBook {
  return { version: 1, entries: [] };
}

export function measuresFor(book: MeasureBook, recordId: string): Measures | null {
  return book.entries.find((entry) => entry.recordId === recordId) ?? null;
}

export type PutResult = { ok: true; book: MeasureBook } | { ok: false; reason: 'book-full' };

/** Saves measures for an observation, replacing any it had. */
export function putMeasures(book: MeasureBook, measures: Measures): PutResult {
  const rest = book.entries.filter((entry) => entry.recordId !== measures.recordId);
  if (rest.length >= MAX_MEASURED) return { ok: false, reason: 'book-full' };
  return { ok: true, book: { version: 1, entries: [...rest, measures].sort((a, b) => a.recordId.localeCompare(b.recordId)) } };
}

export function removeMeasures(book: MeasureBook, recordId: string): MeasureBook {
  const entries = book.entries.filter((entry) => entry.recordId !== recordId);
  return entries.length === book.entries.length ? book : { version: 1, entries };
}

/** Drops measures for observations that are no longer saved. */
export function pruneBook(book: MeasureBook, existingIds: readonly string[]): MeasureBook {
  const keep = new Set(existingIds);
  const entries = book.entries.filter((entry) => keep.has(entry.recordId));
  return entries.length === book.entries.length ? book : { version: 1, entries };
}

export interface ReadBook {
  book: MeasureBook;
  /** Entries that could not be used and were left out. */
  dropped: number;
}

/** Reads a stored book. Entries are cleaned one by one; a second entry for the same observation is dropped. */
export function readBook(value: unknown): ReadBook {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { book: emptyBook(), dropped: 0 };
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || !Array.isArray(item.entries)) return { book: emptyBook(), dropped: 0 };
  const seen = new Set<string>();
  const entries: Measures[] = [];
  let dropped = 0;
  for (const raw of item.entries) {
    const clean = cleanMeasures(raw);
    if (clean === null || seen.has(clean.recordId) || entries.length >= MAX_MEASURED) {
      dropped += 1;
      continue;
    }
    seen.add(clean.recordId);
    entries.push(clean);
  }
  entries.sort((a, b) => a.recordId.localeCompare(b.recordId));
  return { book: { version: 1, entries }, dropped };
}

export interface MergeSummary {
  book: MeasureBook;
  added: number;
  /** Entries left out because the observation already had measures, is not saved, or the book was full. */
  skipped: number;
}

/** Adds measures from a backup for saved observations that have none. Nothing on the device is replaced. */
export function mergeBooks(current: MeasureBook, incoming: MeasureBook, existingIds: readonly string[]): MergeSummary {
  const saved = new Set(existingIds);
  let book = current;
  let added = 0;
  let skipped = 0;
  for (const entry of incoming.entries) {
    if (!saved.has(entry.recordId) || measuresFor(book, entry.recordId) !== null) {
      skipped += 1;
      continue;
    }
    const result = putMeasures(book, entry);
    if (result.ok) {
      book = result.book;
      added += 1;
    } else skipped += 1;
  }
  return { book, added, skipped };
}

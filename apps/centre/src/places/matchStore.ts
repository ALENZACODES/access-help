/**
 * The numbers a person set to look through their measured places, and the named sets of
 * numbers they keep, on this device only. Reads re-run the cleaning rules, so edited or
 * damaged storage cannot put a number on screen that the person did not set.
 */
import { cleanMatchCriteria, emptyMatchCriteria, emptyMatchSetBook, hasMatchCriteria, readMatchSetBook, removeMatchSet, saveMatchSet, type MatchCriteria, type MatchSetBook, type MatchSetIssue } from "./docs-bridge.js";
import type { KeyValueStorage, SaveResult } from "./store.js";

export const MATCH_SETS_KEY = "the-app-match-sets";
export const MATCH_CURRENT_KEY = "the-app-match-current";

export type SaveSetResult = { ok: true; id: string } | { ok: false; kind: "issue"; issue: MatchSetIssue } | { ok: false; kind: "save"; reason: "storage-full" | "storage-unavailable" };

export interface MatchStore {
  /** The numbers in use. Nothing set when none were saved. */
  current(): MatchCriteria;
  setCurrent(criteria: MatchCriteria): SaveResult;
  sets(): MatchSetBook;
  saveSet(name: string, criteria: MatchCriteria): SaveSetResult;
  removeSet(id: string): SaveResult;
  /** Replaces all the sets, for a restore. */
  replaceSets(book: MatchSetBook): SaveResult;
  clear(): void;
}

export function parseStoredMatchSets(raw: string | null): MatchSetBook {
  if (raw === null) return emptyMatchSetBook();
  try {
    return readMatchSetBook(JSON.parse(raw)).book;
  } catch {
    return emptyMatchSetBook();
  }
}

export function parseStoredMatchCurrent(raw: string | null): MatchCriteria {
  if (raw === null) return emptyMatchCriteria();
  try {
    return cleanMatchCriteria(JSON.parse(raw));
  } catch {
    return emptyMatchCriteria();
  }
}

export function createMatchStore(storage: KeyValueStorage): MatchStore {
  function write(key: string, value: unknown, empty: boolean): SaveResult {
    try {
      if (empty) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (error) {
      const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
      return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
    }
  }
  function sets(): MatchSetBook {
    try {
      return parseStoredMatchSets(storage.getItem(MATCH_SETS_KEY));
    } catch {
      return emptyMatchSetBook();
    }
  }
  const writeSets = (book: MatchSetBook) => write(MATCH_SETS_KEY, book, book.sets.length === 0);
  return {
    current() {
      try {
        return parseStoredMatchCurrent(storage.getItem(MATCH_CURRENT_KEY));
      } catch {
        return emptyMatchCriteria();
      }
    },
    setCurrent(criteria) {
      const clean = cleanMatchCriteria(criteria);
      return write(MATCH_CURRENT_KEY, clean, !hasMatchCriteria(clean));
    },
    sets,
    saveSet(name, criteria) {
      const result = saveMatchSet(sets(), name, criteria);
      if (!result.ok) return { ok: false, kind: "issue", issue: result.issue };
      const written = writeSets(result.book);
      return written.ok ? { ok: true, id: result.set.id } : { ok: false, kind: "save", reason: written.reason };
    },
    removeSet(id) {
      return writeSets(removeMatchSet(sets(), id));
    },
    replaceSets: writeSets,
    clear() {
      for (const key of [MATCH_SETS_KEY, MATCH_CURRENT_KEY]) {
        try {
          storage.removeItem(key);
        } catch {
          /* nothing to clear */
        }
      }
    },
  };
}

/** Removes the numbers and the sets from this device. Called when the person clears their places data. */
export function clearMatchData(storage: KeyValueStorage): void {
  createMatchStore(storage).clear();
}

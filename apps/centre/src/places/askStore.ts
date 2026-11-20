/**
 * A person's own list of the times they asked a place a question, and what places told them,
 * kept on this device only. Reads re-run the cleaning rules, so edited or damaged storage
 * cannot put anything unchecked on screen. The App sends nothing and cannot see a reply.
 */
import { emptyAskLog, pruneAskLog, readAskLog, recordAsk, removeAsk, setAskStatus, type AskChannel, type AskIssue, type AskLog, type AskStatus, type MeasureFactKey } from "./docs-bridge.js";
import { createMeasuresStore, type MeasuresStore } from "./measuresStore.js";
import type { KeyValueStorage, SaveResult } from "./store.js";

export const ASKS_KEY = "the-app-place-asks";
/** What places said, kept in a book of its own so it is never mixed with what the person measured. */
export const TOLD_KEY = "the-app-place-told";

export type AskStoreResult = { ok: true } | { ok: false; kind: "issue"; issue: AskIssue } | { ok: false; kind: "save"; reason: "storage-full" | "storage-unavailable" };

export interface AskStore {
  read(): AskLog;
  add(input: { recordId: string; askedOn: string; channel: AskChannel; questions: readonly MeasureFactKey[] }, today: string): AskStoreResult;
  setStatus(n: number, status: AskStatus, today: string): SaveResult;
  remove(n: number): SaveResult;
  /** Replaces the whole list, for a restore. */
  replace(log: AskLog): SaveResult;
  /** Drops asks for observations that are no longer saved. */
  prune(existingIds: readonly string[]): void;
  clear(): void;
}

export function parseStoredAsks(raw: string | null): AskLog {
  if (raw === null) return emptyAskLog();
  try {
    return readAskLog(JSON.parse(raw)).log;
  } catch {
    return emptyAskLog();
  }
}

export function createAskStore(storage: KeyValueStorage): AskStore {
  function read(): AskLog {
    try {
      return parseStoredAsks(storage.getItem(ASKS_KEY));
    } catch {
      return emptyAskLog();
    }
  }
  function write(log: AskLog): SaveResult {
    try {
      if (log.entries.length === 0) storage.removeItem(ASKS_KEY);
      else storage.setItem(ASKS_KEY, JSON.stringify(log));
      return { ok: true };
    } catch (error) {
      const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
      return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
    }
  }
  return {
    read,
    add(input, today) {
      const result = recordAsk(read(), input, today);
      if (!result.ok) return { ok: false, kind: "issue", issue: result.issue };
      const written = write(result.log);
      return written.ok ? { ok: true } : { ok: false, kind: "save", reason: written.reason };
    },
    setStatus(n, status, today) {
      return write(setAskStatus(read(), n, status, today));
    },
    remove(n) {
      return write(removeAsk(read(), n));
    },
    replace: write,
    prune(existingIds) {
      const current = read();
      const next = pruneAskLog(current, existingIds);
      if (next !== current) write(next);
    },
    clear() {
      try {
        storage.removeItem(ASKS_KEY);
      } catch {
        /* nothing to clear */
      }
    },
  };
}

/** The book of what places said. It follows the same rules as the book of measures, under its own key. */
export function createToldStore(storage: KeyValueStorage): MeasuresStore {
  return createMeasuresStore(storage, TOLD_KEY);
}

/** Removes the asks and what places said from this device. Called when the person clears their places data. */
export function clearAskData(storage: KeyValueStorage): void {
  createAskStore(storage).clear();
  createToldStore(storage).clear();
}

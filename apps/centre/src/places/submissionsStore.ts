/**
 * A person's own list of what they say they submitted to OpenStreetMap, kept on this device.
 * Reads re-validate with the pure ledger rules, so edited or damaged storage cannot put an
 * unchecked entry on screen. Nothing here leaves the device, and nothing here can tell
 * whether a submission reached OpenStreetMap.
 */
import {
  emptyLedger,
  markSubmitted,
  pruneLedger,
  readLedger,
  recordLookedAgain,
  unmarkSubmitted,
  type EntryIssue,
  type Ledger,
  type SubmitInput,
} from "./docs-bridge.js";
import type { KeyValueStorage, SaveResult } from "./store.js";

export const SUBMISSIONS_KEY = "the-app-submissions";

export type StoreResult =
  | { ok: true }
  | { ok: false; kind: "issues"; issues: EntryIssue[] }
  | { ok: false; kind: "save"; reason: "storage-full" | "storage-unavailable" };

export interface SubmissionsStore {
  read(): Ledger;
  mark(record: { id: string; observedOn: string }, input: SubmitInput, today: string): StoreResult;
  lookAgain(recordId: string, day: string, today: string): StoreResult;
  unmark(recordId: string): StoreResult;
  /** Replaces the whole ledger, for a restore. */
  replace(ledger: Ledger): SaveResult;
  /** Drops marks for observations that are no longer saved. */
  prune(existingIds: readonly string[]): void;
  clear(): void;
}

export function parseStoredLedger(raw: string | null): Ledger {
  if (raw === null) return emptyLedger();
  try {
    return readLedger(JSON.parse(raw)).ledger;
  } catch {
    return emptyLedger();
  }
}

export function createSubmissionsStore(storage: KeyValueStorage): SubmissionsStore {
  function read(): Ledger {
    try {
      return parseStoredLedger(storage.getItem(SUBMISSIONS_KEY));
    } catch {
      return emptyLedger();
    }
  }
  function write(ledger: Ledger): SaveResult {
    try {
      storage.setItem(SUBMISSIONS_KEY, JSON.stringify(ledger));
      return { ok: true };
    } catch (error) {
      const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
      return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
    }
  }
  function saved(ledger: Ledger): StoreResult {
    const result = write(ledger);
    return result.ok ? { ok: true } : { ok: false, kind: "save", reason: result.reason };
  }
  return {
    read,
    mark(record, input, today) {
      const result = markSubmitted(read(), record, input, today);
      return result.ok ? saved(result.ledger) : { ok: false, kind: "issues", issues: result.issues };
    },
    lookAgain(recordId, day, today) {
      const result = recordLookedAgain(read(), recordId, day, today);
      return result.ok ? saved(result.ledger) : { ok: false, kind: "issues", issues: result.issues };
    },
    unmark(recordId) {
      return saved(unmarkSubmitted(read(), recordId));
    },
    replace: write,
    prune(existingIds) {
      const current = read();
      const next = pruneLedger(current, existingIds);
      if (next !== current) write(next);
    },
    clear() {
      try {
        storage.removeItem(SUBMISSIONS_KEY);
      } catch {
        /* nothing to clear */
      }
    },
  };
}

/** Removes the submissions list from this device. Called when the person clears their places data. */
export function clearSubmissionsData(storage: KeyValueStorage): void {
  createSubmissionsStore(storage).clear();
}

/**
 * The on-site questions in progress, kept on this device only so a locked screen or a closed
 * tab does not lose them. One place at a time. Reads re-run every check, so edited or damaged
 * storage shows an unanswered question and never a made-up number. Nothing here touches the
 * saved measures: those change only when the person saves at the end.
 */
import { cleanOnsite, isOnsiteUnit, type OnsiteUnit, type OnsiteWalk } from "./docs-bridge.js";
import type { KeyValueStorage, SaveResult } from "./store.js";

export const ONSITE_KEY = "the-app-onsite-progress";
export const ONSITE_UNIT_KEY = "the-app-onsite-unit";

export interface OnsiteStore {
  /** The questions in progress, or null when there are none. */
  read(): OnsiteWalk | null;
  write(walk: OnsiteWalk): SaveResult;
  /** The unit the person last typed lengths in. Centimetres until they choose. */
  readUnit(): OnsiteUnit;
  writeUnit(unit: OnsiteUnit): SaveResult;
  /** Drops progress for an observation that is no longer saved. */
  prune(existingIds: readonly string[]): void;
  /** Forgets the questions in progress. The unit stays. */
  discard(): void;
  clear(): void;
}

export function parseStoredOnsite(raw: string | null): OnsiteWalk | null {
  if (raw === null) return null;
  try {
    return cleanOnsite(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function createOnsiteStore(storage: KeyValueStorage): OnsiteStore {
  function put(key: string, value: string): SaveResult {
    try {
      storage.setItem(key, value);
      return { ok: true };
    } catch (error) {
      const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
      return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
    }
  }
  function drop(key: string) {
    try {
      storage.removeItem(key);
    } catch {
      /* nothing to clear */
    }
  }
  function read(): OnsiteWalk | null {
    try {
      return parseStoredOnsite(storage.getItem(ONSITE_KEY));
    } catch {
      return null;
    }
  }
  return {
    read,
    write(walk) {
      return put(ONSITE_KEY, JSON.stringify(walk));
    },
    readUnit() {
      try {
        const raw = storage.getItem(ONSITE_UNIT_KEY);
        return isOnsiteUnit(raw) ? raw : "cm";
      } catch {
        return "cm";
      }
    },
    writeUnit(unit) {
      return put(ONSITE_UNIT_KEY, unit);
    },
    prune(existingIds) {
      const current = read();
      if (current !== null && !existingIds.includes(current.recordId)) drop(ONSITE_KEY);
    },
    discard() {
      drop(ONSITE_KEY);
    },
    clear() {
      drop(ONSITE_KEY);
      drop(ONSITE_UNIT_KEY);
    },
  };
}

/** Removes the on-site progress from this device. Called when the person clears their places data. */
export function clearOnsiteData(storage: KeyValueStorage): void {
  createOnsiteStore(storage).clear();
}

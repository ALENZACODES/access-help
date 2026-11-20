/**
 * The sitting a person has under way for adding observations to OpenStreetMap by hand, kept
 * on this device so it can be picked up again. Reads re-run the cleaning rules, so edited or
 * damaged storage cannot put anything unchecked on screen. Nothing here leaves the device.
 */
import { SIT_MAX_QUEUE, cleanSitting, type Sitting } from "./docs-bridge.js";
import type { KeyValueStorage, SaveResult } from "./store.js";

export const SITTING_KEY = "the-app-add-sitting";

export interface SittingStore {
  /** Null when there is no sitting under way. */
  read(): Sitting | null;
  save(sitting: Sitting): SaveResult;
  clear(): void;
}

export function parseStoredSitting(raw: string | null): Sitting | null {
  if (raw === null) return null;
  try {
    return cleanSitting(JSON.parse(raw), SIT_MAX_QUEUE);
  } catch {
    return null;
  }
}

export function createSittingStore(storage: KeyValueStorage): SittingStore {
  return {
    read() {
      try {
        return parseStoredSitting(storage.getItem(SITTING_KEY));
      } catch {
        return null;
      }
    },
    save(sitting) {
      try {
        storage.setItem(SITTING_KEY, JSON.stringify(sitting));
        return { ok: true };
      } catch (error) {
        const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
        return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
      }
    },
    clear() {
      try {
        storage.removeItem(SITTING_KEY);
      } catch {
        /* nothing to clear */
      }
    },
  };
}

/** Removes the sitting from this device. Called when the person clears their places data. */
export function clearSittingData(storage: KeyValueStorage): void {
  createSittingStore(storage).clear();
}

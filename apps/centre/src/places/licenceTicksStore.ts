/**
 * The ticks a person puts on the "before you share" list of the licence screen, kept on this
 * device only. A tick means "I say I did this". The App cannot see whether it was done. Reads
 * keep known item ids only, so edited or damaged storage cannot put anything unchecked on screen.
 */
import { isShareCheckId, type ShareCheckId } from "./docs-bridge.js";
import type { KeyValueStorage, SaveResult } from "./store.js";

export const LICENCE_TICKS_KEY = "the-app-licence-ticks";

export interface LicenceTicksStore {
  read(): ShareCheckId[];
  /** Replaces the saved ticks. An empty list removes the key. */
  save(ticks: readonly ShareCheckId[]): SaveResult;
  clear(): void;
}

/** Known ids only, each once, in the order saved. */
export function cleanLicenceTicks(value: unknown): ShareCheckId[] {
  if (!Array.isArray(value)) return [];
  const out: ShareCheckId[] = [];
  for (const item of value) {
    if (typeof item === "string" && isShareCheckId(item) && !out.includes(item)) out.push(item);
  }
  return out;
}

export function parseStoredLicenceTicks(raw: string | null): ShareCheckId[] {
  if (raw === null) return [];
  try {
    return cleanLicenceTicks(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function createLicenceTicksStore(storage: KeyValueStorage): LicenceTicksStore {
  return {
    read() {
      try {
        return parseStoredLicenceTicks(storage.getItem(LICENCE_TICKS_KEY));
      } catch {
        return [];
      }
    },
    save(ticks) {
      const clean = cleanLicenceTicks([...ticks]);
      try {
        if (clean.length === 0) storage.removeItem(LICENCE_TICKS_KEY);
        else storage.setItem(LICENCE_TICKS_KEY, JSON.stringify(clean));
        return { ok: true };
      } catch (error) {
        const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
        return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
      }
    },
    clear() {
      try {
        storage.removeItem(LICENCE_TICKS_KEY);
      } catch {
        /* nothing to clear */
      }
    },
  };
}

/** Removes the ticks from this device. Called when the person clears their places data. */
export function clearLicenceTicksData(storage: KeyValueStorage): void {
  createLicenceTicksStore(storage).clear();
}

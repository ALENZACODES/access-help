/**
 * The measures a person took at their own observations, kept on this device only. Reads
 * re-run the cleaning rules, so edited or damaged storage shows UNKNOWN and never a made-up
 * number. The measures sit beside the observations and never change them.
 */
import { emptyMeasureBook, pruneMeasureBook, putMeasures, readMeasureBook, removeMeasures, type MeasureBook, type Measures } from "./docs-bridge.js";
import type { KeyValueStorage, SaveResult } from "./store.js";

export const MEASURES_KEY = "the-app-place-measures";

export type SaveMeasuresResult = SaveResult | { ok: false; reason: "book-full" };

export interface MeasuresStore {
  read(): MeasureBook;
  save(measures: Measures): SaveMeasuresResult;
  remove(recordId: string): SaveResult;
  /** Replaces the whole book, for a restore. */
  replace(book: MeasureBook): SaveResult;
  /** Drops measures for observations that are no longer saved. */
  prune(existingIds: readonly string[]): void;
  clear(): void;
}

export function parseStoredMeasures(raw: string | null): MeasureBook {
  if (raw === null) return emptyMeasureBook();
  try {
    return readMeasureBook(JSON.parse(raw)).book;
  } catch {
    return emptyMeasureBook();
  }
}

/** The key can be given so the same rules keep a second book, such as what places said. */
export function createMeasuresStore(storage: KeyValueStorage, key: string = MEASURES_KEY): MeasuresStore {
  function read(): MeasureBook {
    try {
      return parseStoredMeasures(storage.getItem(key));
    } catch {
      return emptyMeasureBook();
    }
  }
  function write(book: MeasureBook): SaveResult {
    try {
      if (book.entries.length === 0) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(book));
      return { ok: true };
    } catch (error) {
      const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
      return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
    }
  }
  return {
    read,
    save(measures) {
      const result = putMeasures(read(), measures);
      return result.ok ? write(result.book) : result;
    },
    remove(recordId) {
      return write(removeMeasures(read(), recordId));
    },
    replace: write,
    prune(existingIds) {
      const current = read();
      const next = pruneMeasureBook(current, existingIds);
      if (next !== current) write(next);
    },
    clear() {
      try {
        storage.removeItem(key);
      } catch {
        /* nothing to clear */
      }
    },
  };
}

/** Removes the measures from this device. Called when the person clears their places data. */
export function clearMeasuresData(storage: KeyValueStorage): void {
  createMeasuresStore(storage).clear();
}

/**
 * The short notes a person keeps for their days of observing, on this device only.
 * Reads re-run the cleaning rules, so edited or damaged storage cannot put anything unchecked on
 * screen. The notes are never added to an observation and never leave the device.
 */
import { cleanDayNotes, setDayNote, type DayNotes } from "./docs-bridge.js";
import type { KeyValueStorage, SaveResult } from "./store.js";

export const DAY_NOTES_KEY = "the-app-day-notes";

export type SaveNoteResult = SaveResult | { ok: false; reason: "not-a-day" | "too-many" };

export interface DayNotesStore {
  read(): DayNotes;
  save(day: string, text: string): SaveNoteResult;
  clear(): void;
}

export function parseStoredDayNotes(raw: string | null): DayNotes {
  if (raw === null) return {};
  try {
    return cleanDayNotes(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function createDayNotesStore(storage: KeyValueStorage): DayNotesStore {
  function read(): DayNotes {
    try {
      return parseStoredDayNotes(storage.getItem(DAY_NOTES_KEY));
    } catch {
      return {};
    }
  }
  return {
    read,
    save(day, text) {
      const result = setDayNote(read(), day, text);
      if (!result.ok) return result;
      try {
        if (Object.keys(result.notes).length === 0) storage.removeItem(DAY_NOTES_KEY);
        else storage.setItem(DAY_NOTES_KEY, JSON.stringify(result.notes));
        return { ok: true };
      } catch (error) {
        const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
        return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
      }
    },
    clear() {
      try {
        storage.removeItem(DAY_NOTES_KEY);
      } catch {
        /* nothing to clear */
      }
    },
  };
}

/** Removes the day notes from this device. Called when the person clears their places data. */
export function clearDayNotesData(storage: KeyValueStorage): void {
  createDayNotesStore(storage).clear();
}

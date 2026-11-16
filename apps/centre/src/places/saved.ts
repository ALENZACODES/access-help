/**
 * Places a person saved on this device, with a short private note.
 *
 * A saved entry keeps the place id, the name as it was when saved, the date saved,
 * and the note. It never keeps an access status. The status is read from the packs
 * loaded on this device each time a saved place is shown, so a saved place can
 * not carry an old status forward, and a place that is in no loaded pack reads
 * as UNKNOWN. Stored entries are cleaned again on every read.
 */
import type { MergedPlace } from "./packs.js";
import type { KeyValueStorage, SaveResult } from "./store.js";
import type { Wheelchair } from "./types.js";

export const SAVED_KEY = "the-app-saved-places";
export const MAX_SAVED = 100;
export const MAX_NOTE = 300;
const MAX_ID = 200;
const MAX_NAME = 200;

export interface SavedPlace {
  id: string;
  /** The name when it was saved. null when the place had no name. */
  name: string | null;
  note: string;
  /** YYYY-MM-DD */
  savedOn: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Control characters and line breaks become spaces, runs of spaces collapse, and the ends are trimmed. */
export function cleanNote(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, MAX_NOTE);
}

/** Keeps only entries that are well formed. Duplicates by id keep the first. */
export function cleanSaved(value: unknown): SavedPlace[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: SavedPlace[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    if (id === "" || id.length > MAX_ID || seen.has(id)) continue;
    const savedOn = typeof entry.savedOn === "string" && ISO_DATE.test(entry.savedOn) ? entry.savedOn : null;
    if (savedOn === null) continue;
    const rawName = typeof entry.name === "string" ? entry.name.trim() : "";
    seen.add(id);
    out.push({
      id,
      name: rawName === "" ? null : rawName.slice(0, MAX_NAME),
      note: cleanNote(entry.note),
      savedOn,
    });
    if (out.length >= MAX_SAVED) break;
  }
  return out;
}

export type AddSavedResult = SaveResult | { ok: false; reason: "too-many" };

export interface SavedStore {
  list(): SavedPlace[];
  has(id: string): boolean;
  /** Saving an id that is already saved keeps the old entry and its note. */
  add(entry: SavedPlace): AddSavedResult;
  setNote(id: string, note: string): SaveResult;
  remove(id: string): void;
  clear(): void;
}

export function createSavedStore(storage: KeyValueStorage): SavedStore {
  function read(): SavedPlace[] {
    try {
      const raw = storage.getItem(SAVED_KEY);
      return raw === null ? [] : cleanSaved(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  function write(entries: readonly SavedPlace[]): SaveResult {
    try {
      storage.setItem(SAVED_KEY, JSON.stringify(entries));
      return { ok: true };
    } catch (error) {
      const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
      return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
    }
  }
  return {
    list: read,
    has: (id) => read().some((entry) => entry.id === id),
    add(entry) {
      const current = read();
      if (current.some((item) => item.id === entry.id)) return { ok: true };
      if (current.length >= MAX_SAVED) return { ok: false, reason: "too-many" };
      const [clean] = cleanSaved([entry]);
      if (clean === undefined) return { ok: false, reason: "storage-unavailable" };
      return write([...current, clean]);
    },
    setNote(id, note) {
      return write(read().map((entry) => (entry.id === id ? { ...entry, note: cleanNote(note) } : entry)));
    },
    remove(id) {
      write(read().filter((entry) => entry.id !== id));
    },
    clear() {
      try {
        storage.removeItem(SAVED_KEY);
      } catch {
        /* nothing to clear */
      }
    },
  };
}

export interface ResolvedSaved {
  saved: SavedPlace;
  /** null when no loaded pack has this place. */
  place: MergedPlace | null;
  /** UNKNOWN whenever the place is in no loaded pack or the packs disagree. */
  status: Wheelchair;
}

export function resolveSaved(saved: readonly SavedPlace[], places: readonly MergedPlace[]): ResolvedSaved[] {
  const byId = new Map(places.map((place) => [place.id, place]));
  return saved.map((entry) => {
    const place = byId.get(entry.id) ?? null;
    return { saved: entry, place, status: place?.record.wheelchair ?? "UNKNOWN" };
  });
}

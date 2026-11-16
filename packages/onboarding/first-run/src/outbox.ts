import { LIMITS, parseNote, type Note } from "./model";
import type { KeyValueStore } from "./store";

/**
 * Notes live in local storage on this device. Nothing is uploaded. This is a
 * plain store: a list that is validated every time it is read.
 */
export const NOTES_KEY = "app.onboarding.notes.v1";

export interface LoadResult {
  readonly notes: Note[];
  /** Entries in storage that were dropped because they were not valid notes. */
  readonly dropped: number;
}

export function loadNotes(store: KeyValueStore | undefined): LoadResult {
  let raw: string | null = null;
  try {
    raw = store?.getItem(NOTES_KEY) ?? null;
  } catch {
    return { notes: [], dropped: 0 };
  }
  if (!raw) return { notes: [], dropped: 0 };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { notes: [], dropped: 0 };
  }
  if (!Array.isArray(data)) return { notes: [], dropped: 0 };
  const notes: Note[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const entry of data.slice(0, LIMITS.notes * 2)) {
    const n = parseNote(entry);
    if (!n || seen.has(n.id) || notes.length >= LIMITS.notes) {
      dropped++;
      continue;
    }
    seen.add(n.id);
    notes.push(n);
  }
  return { notes, dropped };
}

export type WriteResult = "saved" | "unavailable" | "full";

export function saveNotes(store: KeyValueStore | undefined, notes: readonly Note[]): WriteResult {
  if (!store) return "unavailable";
  if (notes.length > LIMITS.notes) return "full";
  try {
    store.setItem(NOTES_KEY, JSON.stringify(notes));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export interface AddResult {
  readonly result: WriteResult;
  readonly notes: Note[];
}

/** Newest first. Refuses (without changing anything) once the limit is reached. */
export function addNote(store: KeyValueStore | undefined, note: Note): AddResult {
  const current = loadNotes(store).notes;
  if (current.length >= LIMITS.notes) return { result: "full", notes: current };
  const next = [note, ...current.filter((n) => n.id !== note.id)];
  const result = saveNotes(store, next);
  return { result, notes: result === "saved" ? next : current };
}

export function removeNote(store: KeyValueStore | undefined, id: string): AddResult {
  const current = loadNotes(store).notes;
  const next = current.filter((n) => n.id !== id);
  if (next.length === current.length) return { result: "saved", notes: current };
  const result = saveNotes(store, next);
  return { result, notes: result === "saved" ? next : current };
}

export function clearNotes(store: KeyValueStore | undefined): void {
  try {
    store?.removeItem(NOTES_KEY);
  } catch {
    /* nothing to clear */
  }
}

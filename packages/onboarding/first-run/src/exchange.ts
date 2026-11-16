import { LIMITS, parseNote, type Note } from "./model";

/**
 * Export and import of notes as plain JSON text. Works offline: the export is
 * a download link built from text, and import is a paste box.
 */
export const EXPORT_FORMAT = "app-notes";
export const EXPORT_VERSION = 1;

export function exportNotes(notes: readonly Note[], exportedOn: string): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedOn, notes }, null, 2);
}

export function exportFilename(exportedOn: string): string {
  return `notes-${exportedOn}.json`;
}

/** A data: URL for a download link. No script or network needed. */
export function exportHref(text: string): string {
  return `data:application/json;charset=utf-8,${encodeURIComponent(text)}`;
}

export type ImportError = "empty" | "too-large" | "not-json" | "wrong-format" | "wrong-version";

export interface ImportResult {
  readonly notes: Note[];
  /** Entries that were not valid notes. */
  readonly rejected: number;
  readonly error: ImportError | undefined;
}

const fail = (error: ImportError): ImportResult => ({ notes: [], rejected: 0, error });

export function importNotes(text: string): ImportResult {
  if (text.trim() === "") return fail("empty");
  if (text.length > LIMITS.importChars) return fail("too-large");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail("not-json");
  }
  if (!data || typeof data !== "object") return fail("wrong-format");
  const o = data as Record<string, unknown>;
  if (o["format"] !== EXPORT_FORMAT || !Array.isArray(o["notes"])) return fail("wrong-format");
  if (o["version"] !== EXPORT_VERSION) return fail("wrong-version");
  const notes: Note[] = [];
  let rejected = 0;
  const seen = new Set<string>();
  for (const entry of o["notes"].slice(0, LIMITS.notes * 2)) {
    const n = parseNote(entry);
    if (!n || seen.has(n.id)) {
      rejected++;
      continue;
    }
    seen.add(n.id);
    notes.push(n);
  }
  rejected += Math.max(0, o["notes"].length - LIMITS.notes * 2);
  return { notes, rejected, error: undefined };
}

export interface MergeResult {
  readonly notes: Note[];
  readonly added: number;
  /** Already present (same id) or over the limit. */
  readonly skipped: number;
}

/** Adds incoming notes after the existing ones. Existing notes always win. */
export function mergeNotes(existing: readonly Note[], incoming: readonly Note[]): MergeResult {
  const ids = new Set(existing.map((n) => n.id));
  const out = [...existing];
  let added = 0;
  let skipped = 0;
  for (const n of incoming) {
    if (ids.has(n.id) || out.length >= LIMITS.notes) {
      skipped++;
      continue;
    }
    ids.add(n.id);
    out.push(n);
    added++;
  }
  return { notes: out, added, skipped };
}

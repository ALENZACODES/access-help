import type { Locale } from "../../switch-first/src/index";
import { importNotes, mergeNotes, type ImportError } from "./exchange";
import { groupPlaces } from "./places";
import { LIMITS, type Note } from "./model";

/**
 * A look at what an import would do, before it does it. Nothing is saved here:
 * it reads the text the same way the import does, works out what would be new,
 * what is already on this device and what would be left out, and reports
 * counts. The import itself still keeps what is on the device and adds only
 * what is missing.
 */
export interface NotesPreview {
  readonly error: undefined;
  /** Valid notes in the text. */
  readonly inText: number;
  readonly added: number;
  /** Same note id already on this device. */
  readonly alreadyHere: number;
  /** Left out because the device holds as many notes as it can. */
  readonly overLimit: number;
  /** Entries in the text that are not valid notes. */
  readonly rejected: number;
  /** Names of places that exist only in the new notes, sorted. */
  readonly newPlaces: readonly string[];
  /** Places already on this device that would get more notes. */
  readonly morePlaces: number;
  /** Distinct sources recorded in the new notes, sorted. */
  readonly sources: readonly string[];
}

export type PreviewResult = { readonly error: ImportError } | NotesPreview;

export function previewNotesImport(existing: readonly Note[], text: string, locale: Locale): PreviewResult {
  const r = importNotes(text);
  if (r.error) return { error: r.error };
  const merged = mergeNotes(existing, r.notes);
  const have = new Set(existing.map((n) => n.id));
  const alreadyHere = r.notes.filter((n) => have.has(n.id)).length;
  const overLimit = r.notes.length - alreadyHere - merged.added;
  const addedNotes = merged.notes.slice(existing.length);
  const before = new Map(groupPlaces(existing, locale).map((p) => [p.id, p]));
  const after = groupPlaces(merged.notes, locale);
  const newPlaces = after.filter((p) => !before.has(p.id)).map((p) => p.name);
  const morePlaces = after.filter((p) => before.has(p.id) && p.notes.length > (before.get(p.id)?.notes.length ?? 0)).length;
  const sources = new Set<string>();
  for (const n of addedNotes) for (const f of n.facts) if (f.provenance) sources.add(f.provenance.source);
  return {
    error: undefined,
    inText: r.notes.length,
    added: merged.added,
    alreadyHere,
    overLimit,
    rejected: r.rejected,
    newPlaces: newPlaces.sort(new Intl.Collator(locale, { sensitivity: "base" }).compare),
    morePlaces,
    sources: [...sources].sort(),
  };
}

/** True when the preview says the import would change nothing. */
export function isEmptyPreview(p: NotesPreview): boolean {
  return p.added === 0;
}

/** Room left on this device for more notes. */
export function roomFor(existing: readonly Note[]): number {
  return Math.max(0, LIMITS.notes - existing.length);
}

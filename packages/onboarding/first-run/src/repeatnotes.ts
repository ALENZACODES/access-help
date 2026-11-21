import type { Locale } from "../../switch-first/src/index";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import type { Note } from "./model";
import { csvField, guardCell } from "./notes-csv";
import { groupPlaces, placeId } from "./places";

/**
 * "Remove repeated notes": finds notes that say exactly the same thing as
 * another note about the same place, as happens when a file is combined with
 * itself or the same export is brought in twice, and takes the repeats out of
 * a copy. Two notes are repeats only when the place's name and address, the
 * note text, the note's licence and every record (answer, source, licence
 * and the day it was recorded) are the same. By default the day a note was
 * made must be the same too, so two visits that found the same thing are
 * never taken for repeats unless the person says so. The oldest note of each
 * group is kept. The person can keep any group as it is. The copy is read
 * back, and every place must give the same answers as before.
 */

export interface RepeatOptions {
  /** Also count notes made on different days as repeats. */
  readonly anyDay: boolean;
  /**
   * Also take out a note with no text whose every record is in a fuller note
   * about the same place, under the same licence.
   */
  readonly within: boolean;
}

export const DEFAULT_REPEATS: RepeatOptions = { anyDay: false, within: false };

export interface RepeatGroup {
  /** "same": the notes say the same thing; "within": their records are all in the note kept. */
  readonly kind: "same" | "within";
  /** The content key the notes share. */
  readonly key: string;
  /** The note kept: the oldest, then the first by id. */
  readonly kept: Note;
  /** The notes that repeat it, oldest first. */
  readonly repeats: readonly Note[];
}

/** Everything a note says, apart from its id and, unless asked, the day it was made. */
export function contentKey(n: Note, o: RepeatOptions): string {
  const facts = FACT_KEYS.map((k) => {
    const f = n.facts.find((x) => x.key === k);
    if (!f || f.value === "unknown" || !f.provenance) return [k, "unknown"];
    return [k, f.value, f.provenance.source, f.provenance.licence, f.provenance.recordedOn];
  });
  return JSON.stringify([n.placeName, n.address ?? null, n.note ?? null, n.licence, o.anyDay ? null : n.createdOn, facts]);
}

const oldestFirst = (a: Note, b: Note): number => (a.createdOn === b.createdOn ? a.id.localeCompare(b.id) : a.createdOn < b.createdOn ? -1 : 1);

/** Groups of notes that repeat one another, in the order their first note comes in the file. */
export function findRepeats(notes: readonly Note[], o: RepeatOptions): RepeatGroup[] {
  const byKey = new Map<string, Note[]>();
  for (const n of notes) {
    const key = contentKey(n, o);
    byKey.set(key, [...(byKey.get(key) ?? []), n]);
  }
  const groups: RepeatGroup[] = [];
  for (const [key, list] of byKey) {
    if (list.length < 2) continue;
    const [kept, ...repeats] = [...list].sort(oldestFirst);
    if (kept) groups.push({ kind: "same", key, kept, repeats });
  }
  if (!o.within) return groups;
  const gone = new Set(groups.flatMap((g) => g.repeats.map((n) => n.id)));
  return [...groups, ...findWithin(notes.filter((n) => !gone.has(n.id)))];
}

/** A note's records, each as one string: detail, answer, source, licence and day. */
function recordsOf(n: Note): string[] {
  return n.facts.flatMap((f) => (f.value === "unknown" || !f.provenance ? [] : [`${f.key}|${f.value}|${f.provenance.source}|${f.provenance.licence}|${f.provenance.recordedOn}`]));
}

/** True when every record of the note is also in the other, which holds more. */
export function isWithin(n: Note, other: Note): boolean {
  if (n.id === other.id || n.note !== undefined) return false;
  if (n.placeName !== other.placeName || n.address !== other.address || n.licence !== other.licence) return false;
  const mine = recordsOf(n);
  const theirs = new Set(recordsOf(other));
  return theirs.size > mine.length && mine.every((r) => theirs.has(r));
}

/**
 * Notes whose records are all in a fuller note about the same place. Each is
 * grouped under the fullest note that holds it (then the oldest), and that
 * note is never itself taken out.
 */
function findWithin(notes: readonly Note[]): RepeatGroup[] {
  const fullest = [...notes].sort((a, b) => recordsOf(b).length - recordsOf(a).length || oldestFirst(a, b));
  const held = new Map<string, Note[]>();
  const taken = new Set<string>();
  for (const n of notes) {
    const by = fullest.find((m) => !taken.has(m.id) && isWithin(n, m));
    // A note that holds others is kept, so it is never taken out itself.
    if (!by || held.has(n.id)) continue;
    taken.add(n.id);
    held.set(by.id, [...(held.get(by.id) ?? []), n]);
  }
  const byId = new Map(notes.map((n) => [n.id, n]));
  return [...held].flatMap(([id, list]) => {
    const kept = byId.get(id);
    return kept ? [{ kind: "within" as const, key: `within:${id}`, kept, repeats: [...list].sort(oldestFirst) }] : [];
  });
}

/** Notes that would be taken out across the groups. */
export function repeatCount(groups: readonly RepeatGroup[]): number {
  return groups.reduce((s, g) => s + g.repeats.length, 0);
}

export interface RepeatRemoval {
  /** Every note left, in the file's order. */
  readonly kept: readonly Note[];
  /** The repeats taken out, in the file's order. */
  readonly removed: readonly Note[];
  /** Groups whose repeats were taken out. */
  readonly groups: readonly RepeatGroup[];
}

/** Takes out the repeats of the groups whose keys are given; other groups stay as they are. */
export function removeRepeats(notes: readonly Note[], groups: readonly RepeatGroup[], keys: readonly string[]): RepeatRemoval {
  const chosen = new Set(keys);
  const taken = groups.filter((g) => chosen.has(g.key));
  const out = new Set(taken.flatMap((g) => g.repeats.map((n) => n.id)));
  return { kept: notes.filter((n) => !out.has(n.id)), removed: notes.filter((n) => out.has(n.id)), groups: taken };
}

export type RepeatCheck =
  | { readonly ok: true; readonly notes: number }
  | { readonly ok: false; readonly reason: "unreadable" | "count" | "changed" | "left-in" | "answers" };

/** What a place shows for each detail: Unknown, an answer, or reports that differ. */
function answers(notes: readonly Note[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of groupPlaces(notes, "en"))
    out.set(
      p.id,
      FACT_KEYS.map((k: FactKey) => {
        const r = p.resolutions[k];
        return r.kind === "agree" ? r.value : r.kind;
      }).join(","),
    );
  return out;
}

/**
 * Reads the copy back as the App would and checks it: every kept note is
 * there unchanged, no repeat taken out is left, and every place gives the
 * same answer for every detail as in the file read.
 */
export function checkRepeats(copy: string, original: readonly Note[], r: RepeatRemoval): RepeatCheck {
  const back = importNotes(copy);
  if (back.error || back.rejected > 0) return { ok: false, reason: "unreadable" };
  if (back.notes.length !== r.kept.length) return { ok: false, reason: "count" };
  const gone = new Set(r.removed.map((n) => n.id));
  if (back.notes.some((n) => gone.has(n.id))) return { ok: false, reason: "left-in" };
  const byId = new Map(back.notes.map((n) => [n.id, n]));
  for (const n of r.kept) {
    const b = byId.get(n.id);
    if (!b || JSON.stringify(b) !== JSON.stringify(n)) return { ok: false, reason: "changed" };
  }
  const before = answers(original);
  const after = answers(back.notes);
  if (before.size !== after.size) return { ok: false, reason: "answers" };
  for (const [id, a] of before) if (after.get(id) !== a) return { ok: false, reason: "answers" };
  return { ok: true, notes: back.notes.length };
}

/** The copy without the repeats, and a file of the repeats taken out. */
export function repeatFiles(r: RepeatRemoval, today: Date): { copy: string; removed: string } {
  const day = today.toISOString().slice(0, 10);
  return { copy: exportNotes(r.kept, day), removed: exportNotes(r.removed, day) };
}

export const REPEAT_CSV_COLUMNS = ["place", "address", "kind", "kept_note", "kept_made_on", "removed_note", "removed_made_on"] as const;

/** One row for each note taken out, with the note kept in its place; cells guarded against formulas. */
export function repeatsCsv(r: RepeatRemoval): string {
  const rows: string[][] = [[...REPEAT_CSV_COLUMNS]];
  for (const g of r.groups) for (const n of g.repeats) rows.push([g.kept.placeName, g.kept.address ?? "", g.kind, g.kept.id, g.kept.createdOn, n.id, n.createdOn]);
  return `\uFEFF${rows.map((x) => x.map((v) => csvField(guardCell(v))).join(",")).join("\r\n")}\r\n`;
}

/** Groups by the place's name, in the person's language, then by the day the kept note was made. */
export function sortGroups(groups: readonly RepeatGroup[], locale: Locale): RepeatGroup[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  return [...groups].sort(
    (a, b) =>
      collator.compare(a.kept.placeName, b.kept.placeName) ||
      collator.compare(a.kept.address ?? "", b.kept.address ?? "") ||
      a.kept.createdOn.localeCompare(b.kept.createdOn) ||
      a.kept.id.localeCompare(b.kept.id),
  );
}

/** A URL-safe id for a group: its place's id, the id of the note kept (both already URL-safe) and its kind. */
export function groupId(g: RepeatGroup): string {
  return `${placeId(g.kept)}-${g.kept.id}${g.kind === "within" ? "-within" : ""}`;
}

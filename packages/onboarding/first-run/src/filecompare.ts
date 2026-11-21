import type { Locale } from "../../switch-first/src/index";
import { importNotes, type ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import type { Note } from "./model";
import { groupPlaces, type Observation, type Place, type Resolution } from "./places";
import { similarReason, type SimilarReason } from "./similar";

/**
 * "Compare two note files": two notes exports (for example last month's file
 * and this month's, or a person's own file and one a friend sent) are read
 * side by side. The comparison is read-only: nothing is saved on this device,
 * nothing is merged and nothing is removed. It never says which file is
 * right. A detail with no record in a file stays UNKNOWN for that file, and a
 * record only counts when it carries a source, an open licence and a date
 * (the same rule the App uses everywhere, through importNotes).
 */

export type Side = "a" | "b";
export const SIDES: readonly Side[] = ["a", "b"];

/** What one file says about one detail of one place. */
export type SideAnswer = "unknown" | "yes" | "no" | "differ";

/**
 * How the two files compare for one detail:
 * - "both-unknown": neither file has a record;
 * - "only-a" / "only-b": one file has a record, the other has none;
 * - "same-answer": both files give the same Yes or the same No;
 * - "different-answers": the files give different answers, or a file holds reports that differ.
 */
export type DetailStatus = "both-unknown" | "only-a" | "only-b" | "same-answer" | "different-answers";
export const DETAIL_STATUSES: readonly DetailStatus[] = ["different-answers", "only-a", "only-b", "same-answer", "both-unknown"];

export interface DetailComparison {
  readonly key: FactKey;
  readonly a: SideAnswer;
  readonly b: SideAnswer;
  readonly status: DetailStatus;
  /** Records in file A, newest first. */
  readonly recordsA: readonly Observation[];
  /** Records in file B, newest first. */
  readonly recordsB: readonly Observation[];
  /** Records found in both files: same answer, source, licence and date. */
  readonly shared: number;
}

export interface PlaceComparison {
  readonly id: string;
  /** The place as file A holds it. */
  readonly a: Place;
  /** The place as file B holds it. */
  readonly b: Place;
  /** The name as file A has it (the newest note there). */
  readonly nameA: string;
  readonly nameB: string;
  readonly addressA: string | undefined;
  readonly addressB: string | undefined;
  readonly details: readonly DetailComparison[];
  /** True when at least one detail is not "same-answer" or "both-unknown". */
  readonly differs: boolean;
}

export interface OnePlace {
  readonly side: Side;
  readonly place: Place;
  /** Details with a record in this file. */
  readonly recorded: number;
}

export interface MaybeSame {
  readonly a: Place;
  readonly b: Place;
  readonly reason: SimilarReason;
}

export interface FileSummary {
  readonly notes: number;
  readonly places: number;
  /** Entries that were not valid notes and were left out. */
  readonly rejected: number;
  /** Yes or No records with a source, licence and date. */
  readonly records: number;
}

export interface FileComparison {
  readonly summaryA: FileSummary;
  readonly summaryB: FileSummary;
  readonly both: readonly PlaceComparison[];
  readonly onlyA: readonly OnePlace[];
  readonly onlyB: readonly OnePlace[];
  /** Pairs, one place from each "only" list, that may be the same place. Never merged. */
  readonly maybeSame: readonly MaybeSame[];
  readonly totals: Readonly<Record<DetailStatus, number>>;
}

export type FileErrorCode = ImportError | "no-notes" | "same-text";

export interface FileError {
  readonly side: Side;
  readonly code: FileErrorCode;
}

export type CompareResult =
  | { readonly ok: true; readonly comparison: FileComparison }
  | { readonly ok: false; readonly errors: readonly FileError[] };

/** At most this many "may be the same place" pairs are listed. */
export const MAX_MAYBE_SAME = 40;

export function sideAnswer(r: Resolution): SideAnswer {
  if (r.kind === "unknown") return "unknown";
  if (r.kind === "differ") return "differ";
  return r.value;
}

export function detailStatus(a: SideAnswer, b: SideAnswer): DetailStatus {
  if (a === "unknown" && b === "unknown") return "both-unknown";
  if (b === "unknown") return "only-a";
  if (a === "unknown") return "only-b";
  if (a === b && a !== "differ") return "same-answer";
  return "different-answers";
}

/** One line per record, for matching the same record in two files. */
export function recordKey(o: Observation): string {
  const p = o.provenance;
  return [o.value, p.source, p.licence, p.recordedOn].join("\u0000");
}

/** How many records appear in both lists. A record repeated in one list is matched once per copy on the other side. */
export function sharedRecords(a: readonly Observation[], b: readonly Observation[]): number {
  const counts = new Map<string, number>();
  for (const o of a) counts.set(recordKey(o), (counts.get(recordKey(o)) ?? 0) + 1);
  let shared = 0;
  for (const o of b) {
    const k = recordKey(o);
    const left = counts.get(k) ?? 0;
    if (left > 0) {
      shared++;
      counts.set(k, left - 1);
    }
  }
  return shared;
}

function recordsOf(r: Resolution): readonly Observation[] {
  return r.kind === "unknown" ? [] : r.observations;
}

export function compareDetail(key: FactKey, a: Place, b: Place): DetailComparison {
  const ra = a.resolutions[key];
  const rb = b.resolutions[key];
  const sa = sideAnswer(ra);
  const sb = sideAnswer(rb);
  const recordsA = recordsOf(ra);
  const recordsB = recordsOf(rb);
  return { key, a: sa, b: sb, status: detailStatus(sa, sb), recordsA, recordsB, shared: sharedRecords(recordsA, recordsB) };
}

export function comparePlace(a: Place, b: Place): PlaceComparison {
  const details = FACT_KEYS.map((k) => compareDetail(k, a, b));
  return {
    id: a.id,
    a,
    b,
    nameA: a.name,
    nameB: b.name,
    addressA: a.address,
    addressB: b.address,
    details,
    differs: details.some((d) => d.status !== "same-answer" && d.status !== "both-unknown"),
  };
}

/** Details with a Yes, No or differing reports in this place. */
export function recordedDetails(p: Place): number {
  return FACT_KEYS.filter((k) => p.resolutions[k].kind !== "unknown").length;
}

function summary(notes: readonly Note[], places: readonly Place[], rejected: number): FileSummary {
  let records = 0;
  for (const p of places) for (const k of FACT_KEYS) records += recordsOf(p.resolutions[k]).length;
  return { notes: notes.length, places: places.length, rejected, records };
}

/** Pairs that may be the same place, using the same rule as the possible-matches page. Each place is used once. */
export function maybeSamePairs(onlyA: readonly Place[], onlyB: readonly Place[]): MaybeSame[] {
  const order: Record<SimilarReason, number> = { "same-address": 0, "same-name": 1, "similar-name": 2 };
  const found: MaybeSame[] = [];
  for (const a of onlyA) {
    for (const b of onlyB) {
      const reason = similarReason(a, b);
      if (reason) found.push({ a, b, reason });
    }
  }
  found.sort((x, y) => order[x.reason] - order[y.reason] || x.a.id.localeCompare(y.a.id) || x.b.id.localeCompare(y.b.id));
  const usedA = new Set<string>();
  const usedB = new Set<string>();
  const out: MaybeSame[] = [];
  for (const m of found) {
    if (usedA.has(m.a.id) || usedB.has(m.b.id)) continue;
    usedA.add(m.a.id);
    usedB.add(m.b.id);
    out.push(m);
    if (out.length >= MAX_MAYBE_SAME) break;
  }
  return out;
}

function emptyTotals(): Record<DetailStatus, number> {
  return { "both-unknown": 0, "only-a": 0, "only-b": 0, "same-answer": 0, "different-answers": 0 };
}

/** Compares two lists of notes that have already been read. */
export function compareNotes(notesA: readonly Note[], notesB: readonly Note[], locale: Locale, rejected: { a: number; b: number } = { a: 0, b: 0 }): FileComparison {
  const placesA = groupPlaces(notesA, locale);
  const placesB = groupPlaces(notesB, locale);
  const byIdB = new Map(placesB.map((p) => [p.id, p]));
  const idsA = new Set(placesA.map((p) => p.id));
  const both: PlaceComparison[] = [];
  const onlyA: OnePlace[] = [];
  const totals = emptyTotals();
  for (const a of placesA) {
    const b = byIdB.get(a.id);
    if (!b) {
      onlyA.push({ side: "a", place: a, recorded: recordedDetails(a) });
      continue;
    }
    const c = comparePlace(a, b);
    for (const d of c.details) totals[d.status]++;
    both.push(c);
  }
  const onlyB: OnePlace[] = placesB.filter((p) => !idsA.has(p.id)).map((p) => ({ side: "b", place: p, recorded: recordedDetails(p) }));
  return {
    summaryA: summary(notesA, placesA, rejected.a),
    summaryB: summary(notesB, placesB, rejected.b),
    both,
    onlyA,
    onlyB,
    maybeSame: maybeSamePairs(
      onlyA.map((o) => o.place),
      onlyB.map((o) => o.place),
    ),
    totals,
  };
}

/**
 * Reads two pasted or opened files and compares them. Each file must be a
 * notes export with at least one usable note. Two identical texts are refused,
 * since comparing a file with itself shows nothing.
 */
export function compareFiles(textA: string, textB: string, locale: Locale): CompareResult {
  const errors: FileError[] = [];
  const read = (side: Side, text: string): { notes: Note[]; rejected: number } | undefined => {
    const r = importNotes(text);
    if (r.error) {
      errors.push({ side, code: r.error });
      return undefined;
    }
    if (r.notes.length === 0) {
      errors.push({ side, code: "no-notes" });
      return undefined;
    }
    return { notes: r.notes, rejected: r.rejected };
  };
  const a = read("a", textA);
  const b = read("b", textB);
  if (!a || !b) return { ok: false, errors };
  if (textA.trim() === textB.trim()) return { ok: false, errors: [{ side: "b", code: "same-text" }] };
  return { ok: true, comparison: compareNotes(a.notes, b.notes, locale, { a: a.rejected, b: b.rejected }) };
}

/** Places in both files, those where the files differ first, then by name; or only those that differ. */
export function placesToShow(c: FileComparison, onlyDiffering: boolean): PlaceComparison[] {
  const list = onlyDiffering ? c.both.filter((p) => p.differs) : [...c.both];
  return list.sort((x, y) => Number(y.differs) - Number(x.differs));
}

/** True when the two files say the same about every place they share and share every place. */
export function filesAgree(c: FileComparison): boolean {
  return c.onlyA.length === 0 && c.onlyB.length === 0 && c.both.every((p) => !p.differs);
}

import { exportNotes, type ImportError } from "./exchange";
import { FACT_KEYS, OPEN_LICENCES, isIsoDate, type FactKey } from "./facts";
import { checkFile } from "./filecheck";
import { foldText } from "./filter";
import { noteFact, type Note } from "./model";

/**
 * "Split a notes file": the notes in one export are chosen with plain filters
 * (words in the name or address, a detail and its answer, a source, a licence,
 * the dates of records) and by hand, and the chosen part or the rest is
 * downloaded as its own notes file or as a spreadsheet. For example, an
 * organiser can give each volunteer the notes for their own streets.
 *
 * The filters only choose notes; they never change one. A note with no record
 * for a detail has that detail UNKNOWN, and "UNKNOWN" is a filter value of its
 * own: it never counts as a No. The file is read with the App's own rules
 * (checkFile, so parseNote). Nothing is saved.
 */

/** The answer a detail filter looks for. "any" means any recorded Yes or No. */
export type AnswerFilter = "any" | "yes" | "no" | "unknown";
export const ANSWER_FILTERS: readonly AnswerFilter[] = ["any", "yes", "no", "unknown"];

export interface SplitFilters {
  /** Words that must all appear in the place name or the address (case and accents ignored). */
  readonly words: string;
  /** A detail and the answer it must have; no detail means no detail filter. */
  readonly detail: FactKey | "";
  readonly answer: AnswerFilter;
  /** A source that at least one record in the note must name; "" for any. */
  readonly source: string;
  /** A licence of the note or of one of its records; "" for any. */
  readonly licence: string;
  /** At least one record dated on or after `from` and on or before `to` (ISO dates; "" for open). */
  readonly from: string;
  readonly to: string;
}

export const NO_FILTERS: SplitFilters = { words: "", detail: "", answer: "any", source: "", licence: "", from: "", to: "" };

export type FilterError = "bad-from" | "bad-to" | "from-after-to" | "bad-detail" | "bad-answer" | "bad-licence";

/** Hand-made changes on top of the filters: notes added or taken out by the person. */
export interface HandPicks {
  readonly add: readonly string[];
  readonly remove: readonly string[];
}

export const NO_PICKS: HandPicks = { add: [], remove: [] };

export interface SplitFile {
  readonly notes: readonly Note[];
  readonly leftOut: number;
  /** Every source named by a record in the file, sorted, for the source list. */
  readonly sources: readonly string[];
  /** Every open licence used in the file, in the App's order. */
  readonly licences: readonly string[];
}

export type SplitRead = { readonly ok: true; readonly file: SplitFile } | { readonly ok: false; readonly error: ImportError | "no-notes" };

export interface Split {
  /** Notes chosen, in file order. */
  readonly chosen: readonly Note[];
  /** The rest, in file order. */
  readonly rest: readonly Note[];
  /** Ids the filters choose, before hand picks. */
  readonly byFilters: ReadonlySet<string>;
}

export function readSplitFile(text: string, today: Date): SplitRead {
  const r = checkFile(text, today);
  if (!r.ok) return { ok: false, error: r.error };
  const notes = r.check.readable;
  if (notes.length === 0) return { ok: false, error: "no-notes" };
  const sources = new Set<string>();
  const licences = new Set<string>();
  for (const n of notes) {
    licences.add(n.licence);
    for (const f of n.facts) {
      if (!f.provenance) continue;
      sources.add(f.provenance.source);
      licences.add(f.provenance.licence);
    }
  }
  const collator = new Intl.Collator("en", { sensitivity: "base" });
  return {
    ok: true,
    file: {
      notes,
      leftOut: r.check.totals.leftOut,
      sources: [...sources].sort((a, b) => collator.compare(a, b) || a.localeCompare(b)),
      licences: OPEN_LICENCES.filter((l) => licences.has(l)),
    },
  };
}

/** Problems with the filters as typed; an empty list means they can be used. */
export function filterErrors(f: SplitFilters): FilterError[] {
  const out: FilterError[] = [];
  if (f.from !== "" && !isIsoDate(f.from)) out.push("bad-from");
  if (f.to !== "" && !isIsoDate(f.to)) out.push("bad-to");
  if (f.from !== "" && f.to !== "" && isIsoDate(f.from) && isIsoDate(f.to) && f.from > f.to) out.push("from-after-to");
  if (f.detail !== "" && !FACT_KEYS.includes(f.detail)) out.push("bad-detail");
  if (!ANSWER_FILTERS.includes(f.answer)) out.push("bad-answer");
  if (f.licence !== "" && !OPEN_LICENCES.includes(f.licence)) out.push("bad-licence");
  return out;
}

/** The words of a search, folded; empty words are dropped. */
export function searchWords(words: string): string[] {
  return foldText(words)
    .split(/[^a-z0-9]+/)
    .filter((w) => w !== "");
}

/** Whether one note passes every filter that is set. */
export function matches(n: Note, f: SplitFilters): boolean {
  const words = searchWords(f.words);
  if (words.length > 0) {
    const hay = foldText(`${n.placeName} ${n.address ?? ""}`);
    if (!words.every((w) => hay.includes(w))) return false;
  }
  if (f.detail !== "") {
    const fact = noteFact(n, f.detail);
    const recorded = fact.value !== "unknown" && fact.provenance !== undefined;
    if (f.answer === "unknown" && recorded) return false;
    if (f.answer === "any" && !recorded) return false;
    if ((f.answer === "yes" || f.answer === "no") && (!recorded || fact.value !== f.answer)) return false;
  }
  const records = n.facts.filter((x) => x.provenance !== undefined && x.value !== "unknown");
  if (f.source !== "" && !records.some((x) => x.provenance?.source === f.source)) return false;
  if (f.licence !== "" && n.licence !== f.licence && !records.some((x) => x.provenance?.licence === f.licence)) return false;
  if (f.from !== "" || f.to !== "") {
    const inRange = records.some((x) => {
      const d = x.provenance?.recordedOn ?? "";
      return (f.from === "" || d >= f.from) && (f.to === "" || d <= f.to);
    });
    if (!inRange) return false;
  }
  return true;
}

/** True when no filter is set: then the filters choose nothing, and only hand picks count. */
export function noFilterSet(f: SplitFilters): boolean {
  return searchWords(f.words).length === 0 && f.detail === "" && f.source === "" && f.licence === "" && f.from === "" && f.to === "";
}

/** Splits the notes. With no filter set, the filters choose nothing, so the person starts from an empty choice. */
export function splitNotes(notes: readonly Note[], f: SplitFilters, picks: HandPicks): Split {
  const byFilters = new Set<string>(noFilterSet(f) ? [] : notes.filter((n) => matches(n, f)).map((n) => n.id));
  const add = new Set(picks.add);
  const remove = new Set(picks.remove);
  const chosen: Note[] = [];
  const rest: Note[] = [];
  for (const n of notes) {
    const on = remove.has(n.id) ? false : add.has(n.id) || byFilters.has(n.id);
    (on ? chosen : rest).push(n);
  }
  return { chosen, rest, byFilters };
}

/** Turns one note on or off by hand. A hand pick that matches what the filters say is dropped, so picks stay small. */
export function togglePick(picks: HandPicks, id: string, on: boolean, byFilters: ReadonlySet<string>): HandPicks {
  const add = picks.add.filter((x) => x !== id);
  const remove = picks.remove.filter((x) => x !== id);
  const filtered = byFilters.has(id);
  if (on && !filtered) add.push(id);
  if (!on && filtered) remove.push(id);
  return { add, remove };
}

/** Keeps only picks for notes in the file. */
export function prunePicks(picks: HandPicks, notes: readonly Note[]): HandPicks {
  const ids = new Set(notes.map((n) => n.id));
  return { add: picks.add.filter((x) => ids.has(x)), remove: picks.remove.filter((x) => ids.has(x)) };
}

/** A notes export of some of the notes. */
export function partExport(notes: readonly Note[], today: Date): string {
  return exportNotes(notes, today.toISOString().slice(0, 10));
}

/** How many chosen notes have a Yes, a No and no record for each detail: plain counts, for the summary. */
export function detailCounts(notes: readonly Note[]): Record<FactKey, { yes: number; no: number; unknown: number }> {
  const out = {} as Record<FactKey, { yes: number; no: number; unknown: number }>;
  for (const k of FACT_KEYS) out[k] = { yes: 0, no: 0, unknown: 0 };
  for (const n of notes) {
    for (const k of FACT_KEYS) {
      const f = noteFact(n, k);
      const c = out[k];
      if (f.value === "unknown" || !f.provenance) c.unknown++;
      else c[f.value]++;
    }
  }
  return out;
}

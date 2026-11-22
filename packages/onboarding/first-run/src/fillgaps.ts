import type { Locale } from "../../switch-first/src/index";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS, isIsoDate, type FactKey } from "./facts";
import type { Note } from "./model";
import { csvField, guardCell } from "./notes-csv";
import { groupPlaces, placeId, type Place } from "./places";

/**
 * "Fill gaps from another file": from a second notes file, brings into a copy
 * of the person's file only the notes about places already in it that answer
 * a detail the file has no record for. Notes about other places, notes that
 * answer nothing missing, and notes already in the file stay out. A note comes
 * in whole, with its own source, licence and dates, so by default a note that
 * also answers another detail stays out too, and the copy gains answers where
 * there were none and nothing else; the person can choose to bring such notes
 * in, and is told which other details they add to. Every note of the person's
 * file stays as it was. The copy is read back before it is offered.
 */

export interface FillOptions {
  /** Details whose gaps are to be filled. */
  readonly keys: readonly FactKey[];
  /** Bring in only notes whose every record answers a chosen gap. */
  readonly onlyGaps: boolean;
  /** When set (ISO date), bring in only notes whose every record was made on or after this day. */
  readonly since: string;
}

export const DEFAULT_FILL: FillOptions = { keys: FACT_KEYS, onlyGaps: true, since: "" };

/** True when the day to bring records in from is empty or a real ISO date. */
export function sinceOk(since: string): boolean {
  return since === "" || isIsoDate(since);
}

export interface FillNote {
  readonly note: Note;
  /** Chosen details the place has no record for and this note answers, in the App's order. */
  readonly fills: readonly FactKey[];
  /** Other details the note also answers, which it adds a record to, in the App's order. */
  readonly also: readonly FactKey[];
}

export interface FillPlace {
  /** The place in the person's file. */
  readonly place: Place;
  /** Notes from the other file that answer a gap, oldest first. */
  readonly notes: readonly FillNote[];
  /** Every gap these notes answer, in the App's order. */
  readonly fills: readonly FactKey[];
  /** Every other detail these notes add a record to, in the App's order. */
  readonly also: readonly FactKey[];
}

export interface FillPlan {
  /** Places with notes to bring in, by name in the person's language. */
  readonly places: readonly FillPlace[];
  /** Notes in the other file about places not in the person's file. */
  readonly otherPlaces: number;
  /** Notes about places in the file that answer no gap among the chosen details. */
  readonly nothingMissing: number;
  /** Notes already in the person's file, the same in both. */
  readonly alreadyIn: number;
  /** Notes with the id of a note in the person's file but saying something else; they cannot be brought in. */
  readonly sameId: number;
  /** Notes left out because they also answer another detail, when only gaps are filled. */
  readonly alsoOther: number;
  /** Notes left out because a record was made before the day chosen. */
  readonly older: number;
}

/** True when the note has a Yes or No for the detail. */
const answers = (n: Note, key: FactKey): boolean => n.facts.some((f) => f.key === key && f.value !== "unknown" && f.provenance !== undefined);

/** What the other file can bring in: its notes that answer a gap of a place in the person's file. */
export function fillPlan(mine: readonly Note[], other: readonly Note[], o: FillOptions, locale: Locale): FillPlan {
  const places = groupPlaces(mine, locale);
  const byId = new Map(places.map((p) => [p.id, p]));
  const mineById = new Map(mine.map((n) => [n.id, n]));
  const chosen = FACT_KEYS.filter((k) => o.keys.includes(k));
  const found = new Map<string, FillNote[]>();
  let otherPlaces = 0;
  let nothingMissing = 0;
  let alreadyIn = 0;
  let sameId = 0;
  let alsoOther = 0;
  let older = 0;
  for (const n of other) {
    const same = mineById.get(n.id);
    if (same) {
      if (JSON.stringify(same) === JSON.stringify(n)) alreadyIn += 1;
      else sameId += 1;
      continue;
    }
    const place = byId.get(placeId(n));
    if (!place) {
      otherPlaces += 1;
      continue;
    }
    const fills = chosen.filter((k) => place.resolutions[k].kind === "unknown" && answers(n, k));
    if (fills.length === 0) {
      nothingMissing += 1;
      continue;
    }
    if (o.since !== "" && n.facts.some((f) => f.value !== "unknown" && f.provenance && f.provenance.recordedOn < o.since)) {
      older += 1;
      continue;
    }
    const also = FACT_KEYS.filter((k) => !fills.includes(k) && answers(n, k));
    if (o.onlyGaps && also.length > 0) {
      alsoOther += 1;
      continue;
    }
    found.set(place.id, [...(found.get(place.id) ?? []), { note: n, fills, also }]);
  }
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const out: FillPlace[] = [...found].flatMap(([id, notes]) => {
    const place = byId.get(id);
    if (!place) return [];
    const sorted = [...notes].sort((a, b) => a.note.createdOn.localeCompare(b.note.createdOn) || a.note.id.localeCompare(b.note.id));
    const fills = chosen.filter((k) => sorted.some((x) => x.fills.includes(k)));
    const also = FACT_KEYS.filter((k) => !fills.includes(k) && sorted.some((x) => x.also.includes(k)));
    return [{ place, notes: sorted, fills, also }];
  });
  out.sort((a, b) => collator.compare(a.place.name, b.place.name) || collator.compare(a.place.address ?? "", b.place.address ?? ""));
  return { places: out, otherPlaces, nothingMissing, alreadyIn, sameId, alsoOther, older };
}

/** Notes to bring in and gaps answered, across the places. */
export function planCounts(places: readonly FillPlace[]): { notes: number; gaps: number } {
  return { notes: places.reduce((s, p) => s + p.notes.length, 0), gaps: places.reduce((s, p) => s + p.fills.length, 0) };
}

export interface Filled {
  /** The person's notes, then the notes brought in. */
  readonly notes: readonly Note[];
  readonly added: readonly Note[];
  /** The places whose notes were brought in. */
  readonly places: readonly FillPlace[];
}

/** The person's notes as they were, followed by the notes of the chosen places. */
export function fillCopy(mine: readonly Note[], plan: FillPlan, placeIds: readonly string[]): Filled {
  const chosen = new Set(placeIds);
  const places = plan.places.filter((p) => chosen.has(p.place.id));
  const added = places.flatMap((p) => p.notes.map((x) => x.note));
  return { notes: [...mine, ...added], added, places };
}

export type FillCheck =
  | { readonly ok: true; readonly notes: number; readonly filled: number }
  | { readonly ok: false; readonly reason: "unreadable" | "count" | "changed" | "new-place" | "still-unknown" | "other-answer" };

/** What a place shows for a detail: Unknown, an answer, or reports that differ. */
const shownAs = (p: Place | undefined, k: FactKey): string => {
  const r = p?.resolutions[k];
  return !r ? "none" : r.kind === "agree" ? r.value : r.kind;
};

/**
 * Reads the copy back as the App would and checks it: every note of the
 * person's file and every note brought in is there unchanged, no place is
 * new, and every gap the notes were brought in for now has an answer. When no
 * note brought in answers another detail, every other answer must be as it was.
 */
export function checkFill(copy: string, mine: readonly Note[], f: Filled, locale: Locale): FillCheck {
  const back = importNotes(copy);
  if (back.error || back.rejected > 0) return { ok: false, reason: "unreadable" };
  if (back.notes.length !== mine.length + f.added.length) return { ok: false, reason: "count" };
  const byId = new Map(back.notes.map((n) => [n.id, n]));
  for (const n of [...mine, ...f.added]) {
    const b = byId.get(n.id);
    if (!b || JSON.stringify(b) !== JSON.stringify(n)) return { ok: false, reason: "changed" };
  }
  const before = new Set(mine.map((n) => placeId(n)));
  if (back.notes.some((n) => !before.has(placeId(n)))) return { ok: false, reason: "new-place" };
  const after = new Map(groupPlaces(back.notes, locale).map((p) => [p.id, p]));
  let filled = 0;
  for (const p of f.places)
    for (const k of p.fills) {
      if (after.get(p.place.id)?.resolutions[k].kind === "unknown") return { ok: false, reason: "still-unknown" };
      filled += 1;
    }
  if (f.places.every((p) => p.also.length === 0)) {
    const fills = new Map(f.places.map((p) => [p.place.id, p.fills]));
    for (const p of groupPlaces(mine, locale))
      for (const k of FACT_KEYS) if (!fills.get(p.id)?.includes(k) && shownAs(after.get(p.id), k) !== shownAs(p, k)) return { ok: false, reason: "other-answer" };
  }
  return { ok: true, notes: back.notes.length, filled };
}

export const FILL_CSV_COLUMNS = ["place", "address", "note", "made_on", "fills", "also", "sources"] as const;

/** One row for each note added: its place, the gaps it fills and other details it adds to, and its sources; cells guarded. */
export function filledCsv(f: Filled): string {
  const rows: string[][] = [[...FILL_CSV_COLUMNS]];
  for (const p of f.places)
    for (const x of p.notes) {
      const sources = [...new Set(x.note.facts.flatMap((fa) => (fa.provenance && fa.value !== "unknown" ? [fa.provenance.source] : [])))];
      rows.push([p.place.name, p.place.address ?? "", x.note.id, x.note.createdOn, x.fills.join(" "), x.also.join(" "), sources.join("; ")]);
    }
  return `\uFEFF${rows.map((r) => r.map((v) => csvField(guardCell(v))).join(",")).join("\r\n")}\r\n`;
}

/** The copy, as a notes export. */
export function filledFile(f: Filled, today: Date): string {
  return exportNotes(f.notes, today.toISOString().slice(0, 10));
}

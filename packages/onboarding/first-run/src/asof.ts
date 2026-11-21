import type { Locale } from "../../switch-first/src/index";
import { exportNotes } from "./exchange";
import { FACT_KEYS, isIsoDate, type Fact, type FactKey } from "./facts";
import type { StreetFile } from "./filestreets";
import { parseNote, type Note } from "./model";
import { csvField, guardCell } from "./notes-csv";
import { groupPlaces, type Place } from "./places";

/**
 * "A notes file as it was on a day": what a notes file held on a past day,
 * and what has changed since. A note made after the day is left out, and a
 * record made after the day goes back to Unknown, as it was not known yet;
 * nothing else changes and nothing is filled in. The App then compares,
 * detail by detail, how many places had an answer on the day and how many
 * have one now, and lists the places that got an answer since. The dates are
 * those the notes and records carry: the App cannot know when a note was
 * last changed before it was exported.
 */

export type DayProblem = "empty" | "bad" | "future";

/** Problems with the optional second day: it must be a real day, today or before, and after the first. */
export type ToProblem = "bad" | "future" | "not-after";

/** A place's reading of a detail: an answer, reports that differ, no record, or not in the file at all. */
export type Reading = "yes" | "no" | "differ" | "unknown" | "absent";

export interface ReadingChange {
  readonly place: Place;
  readonly then: Reading;
  readonly now: Reading;
}

export interface SourceSince {
  readonly source: string;
  /** Records from this source made after the day (and up to the second day, when there is one). */
  readonly records: number;
  readonly places: number;
}

export interface Snapshot {
  readonly day: string;
  readonly notes: readonly Note[];
  /** Notes made after the day. */
  readonly leftOut: number;
  /** Records in the kept notes made after the day, set back to Unknown. */
  readonly hidden: number;
}

export interface Counts {
  /** Places with a Yes or No that agree. */
  readonly yes: number;
  readonly no: number;
  /** Places whose reports differ. */
  readonly differ: number;
  /** Places with no record. */
  readonly unknown: number;
}

export interface DetailChange {
  readonly key: FactKey;
  readonly then: Counts;
  readonly now: Counts;
  /** Places with no record on the day that have one now. */
  readonly answered: readonly Place[];
  /** Places whose reading is different now: a new answer, a changed answer, or reports that now differ or no longer do. */
  readonly changed: number;
  /** Those places, with their reading then and now, by name. */
  readonly differently: readonly ReadingChange[];
}

export interface Comparison {
  readonly day: string;
  /** The second day, when the comparison is between two days rather than with the file now. */
  readonly to: string | undefined;
  /** Places then and now. */
  readonly placesThen: number;
  readonly placesNow: number;
  readonly details: readonly DetailChange[];
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);

export function toProblem(typed: string, day: string, today: Date): ToProblem | undefined {
  const d = typed.trim();
  if (d === "") return undefined;
  if (!isIsoDate(d)) return "bad";
  if (d > iso(today)) return "future";
  if (d <= day) return "not-after";
  return undefined;
}

export type QuickDay = "month" | "quarter" | "year" | "year-ago";
export const QUICK_DAYS: readonly QuickDay[] = ["month", "quarter", "year", "year-ago"];

/**
 * Days people often look back to, worked out from today (in UTC, as every
 * date in a notes file is): the last day of last month, of last quarter and
 * of last year, and the same day a year ago (28 February in a year without
 * the 29th).
 */
export function quickDay(kind: QuickDay, today: Date): string {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const lastDay = (year: number, month: number): string => iso(new Date(Date.UTC(year, month + 1, 0)));
  if (kind === "month") return lastDay(y, m - 1);
  if (kind === "quarter") return lastDay(y, m - (m % 3) - 1);
  if (kind === "year") return `${y - 1}-12-31`;
  const d = today.getUTCDate();
  const same = new Date(Date.UTC(y - 1, m, d));
  return same.getUTCMonth() === m ? iso(same) : lastDay(y - 1, m);
}

export function dayProblem(typed: string, today: Date): DayProblem | undefined {
  const d = typed.trim();
  if (d === "") return "empty";
  if (!isIsoDate(d)) return "bad";
  if (d > iso(today)) return "future";
  return undefined;
}

/**
 * The file's notes as they stood on the day. Each note kept with a record
 * hidden goes through the App's own note reader; a note it would not keep
 * as made is left out, and counted with the notes made after the day.
 */
export function snapshot(file: StreetFile, day: string): Snapshot {
  const notes: Note[] = [];
  let leftOut = 0;
  let hidden = 0;
  for (const n of file.places.flatMap((p) => p.notes)) {
    if (n.createdOn > day) {
      leftOut += 1;
      continue;
    }
    const later = n.facts.filter((f) => f.provenance && f.provenance.recordedOn > day).length;
    if (later === 0) {
      notes.push(n);
      continue;
    }
    const facts: Fact[] = n.facts.map((f) => (f.provenance && f.provenance.recordedOn > day ? { key: f.key, value: "unknown", provenance: undefined } : f));
    const parsed = parseNote({ ...n, facts });
    if (parsed && JSON.stringify(parsed.facts) === JSON.stringify(facts)) {
      notes.push(parsed);
      hidden += later;
    } else leftOut += 1;
  }
  return { day, notes, leftOut, hidden };
}

export function countsFor(places: readonly Place[], key: FactKey): Counts {
  const c = { yes: 0, no: 0, differ: 0, unknown: 0 };
  for (const p of places) {
    const r = p.resolutions[key];
    if (r.kind === "unknown") c.unknown += 1;
    else if (r.kind === "differ") c.differ += 1;
    else c[r.value] += 1;
  }
  return c;
}

export function reading(p: Place | undefined, key: FactKey): Reading {
  if (!p) return "absent";
  const r = p.resolutions[key];
  return r.kind === "agree" ? r.value : r.kind;
}

/**
 * Detail by detail, the file on the day against the file now, or against the
 * file on a second, later day. Places are matched the way the App groups
 * notes into places.
 */
export function compare(file: StreetFile, snap: Snapshot, locale: Locale, to?: Snapshot): Comparison {
  const then = groupPlaces(snap.notes, locale);
  const now = to ? groupPlaces(to.notes, locale) : file.places;
  const byId = new Map(then.map((p) => [p.id, p]));
  const details = FACT_KEYS.map((key) => {
    const answered = now.filter((p) => {
      const was = reading(byId.get(p.id), key);
      return p.resolutions[key].kind !== "unknown" && (was === "unknown" || was === "absent");
    });
    // A place made since with no record reads Unknown both times: that is not a change.
    const differently = sortChanges(
      now
        .map((p) => ({ place: p, then: reading(byId.get(p.id), key), now: reading(p, key) }))
        .filter((c) => c.now !== (c.then === "absent" ? "unknown" : c.then)),
      locale,
    );
    return { key, then: countsFor(then, key), now: countsFor(now, key), answered: sortPlaces(answered, locale), changed: differently.length, differently };
  });
  return { day: snap.day, to: to?.day, placesThen: then.length, placesNow: now.length, details };
}

function sortChanges(changes: readonly ReadingChange[], locale: Locale): ReadingChange[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  return [...changes].sort((a, b) => collator.compare(a.place.name, b.place.name) || (a.place.address ?? "").localeCompare(b.place.address ?? ""));
}

/**
 * The sources of the records made after the day (and up to the second day,
 * when there is one), most records first, then by name: who added what.
 */
export function sourcesSince(file: StreetFile, day: string, to?: string): SourceSince[] {
  const by = new Map<string, { records: number; places: Set<string> }>();
  for (const place of file.places)
    for (const n of place.notes)
      for (const f of n.facts) {
        const p = f.provenance;
        if (!p || p.recordedOn <= day || (to !== undefined && p.recordedOn > to)) continue;
        if (to !== undefined && n.createdOn > to) continue;
        const s = by.get(p.source) ?? { records: 0, places: new Set<string>() };
        s.records += 1;
        s.places.add(place.id);
        by.set(p.source, s);
      }
  return [...by]
    .map(([source, s]) => ({ source, records: s.records, places: s.places.size }))
    .sort((a, b) => b.records - a.records || a.source.localeCompare(b.source));
}

function sortPlaces(places: readonly Place[], locale: Locale): Place[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  return [...places].sort((a, b) => collator.compare(a.name, b.name) || (a.address ?? "").localeCompare(b.address ?? ""));
}

/** Places with an answer (agreeing or differing). */
export const answeredCount = (c: Counts): number => c.yes + c.no + c.differ;

export function snapshotFile(s: Snapshot, today: Date): string {
  return exportNotes([...s.notes], iso(today));
}

export const CHANGES_CSV_COLUMNS = ["detail", "place_name", "address", "then", "now"] as const;

/**
 * One row for each place and detail whose reading changed, to follow up on:
 * the detail, the place, and its reading then and now ("yes", "no",
 * "differ", "unknown" or "absent"), guarded like the App's own CSV.
 */
export function changesCsv(c: Comparison): string {
  const rows: string[][] = [[...CHANGES_CSV_COLUMNS]];
  for (const d of c.details) for (const x of d.differently) rows.push([d.key, x.place.name, x.place.address ?? "", x.then, x.now]);
  return `\uFEFF${rows.map((r) => r.map((v) => csvField(guardCell(v))).join(",")).join("\r\n")}\r\n`;
}

export const ASOF_CSV_COLUMNS = [
  "detail",
  "answered_then",
  "answered_now",
  "yes_then",
  "yes_now",
  "no_then",
  "no_now",
  "differ_then",
  "differ_now",
  "unknown_then",
  "unknown_now",
  "places_changed",
] as const;

/** The comparison as a table, one row for each detail, guarded like the App's own CSV. */
export function comparisonCsv(c: Comparison): string {
  const rows: string[][] = [[...ASOF_CSV_COLUMNS]];
  for (const d of c.details)
    rows.push(
      [d.key, answeredCount(d.then), answeredCount(d.now), d.then.yes, d.now.yes, d.then.no, d.now.no, d.then.differ, d.now.differ, d.then.unknown, d.now.unknown, d.changed].map(String),
    );
  return `\uFEFF${rows.map((x) => x.map((v) => csvField(guardCell(v))).join(",")).join("\r\n")}\r\n`;
}

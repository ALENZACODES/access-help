import { FACT_KEYS, type FactKey } from "./facts";
import type { StreetFile } from "./filestreets";
import { inArea } from "./lookfirst";
import { csvField, guardCell } from "./notes-csv";
import type { Observation, Place } from "./places";

/**
 * "Records over time": how the records in a notes export built up, period by
 * period, from the date each record says it was recorded on. It counts only
 * what the file holds: records dated in each period, details and places that
 * got their first record, how many details had a record by the end of each
 * period, and how many had reports that differ by then. It does not say
 * which report is right, and a detail with no record stays Unknown.
 */

export type TimeStep = "month" | "year";
export const TIME_STEPS: readonly TimeStep[] = ["month", "year"];

/** The most periods shown; earlier periods are counted in the totals but not listed. */
export const MAX_PERIODS = 120;

export interface PeriodRow {
  /** "2026-03" for a month, "2026" for a year. */
  readonly period: string;
  /** Records dated in this period. */
  readonly records: number;
  /** Details (one detail of one place) whose first record is dated in this period. */
  readonly firstRecords: number;
  /** Places whose first record of any detail is dated in this period. */
  readonly placesStarted: number;
  /** Details with at least one record dated in or before this period. */
  readonly recorded: number;
  /** Details whose records dated in or before this period do not all say the same. */
  readonly differing: number;
}

export interface DetailRow {
  readonly key: FactKey;
  readonly records: number;
  /** Places with at least one record of this detail. */
  readonly places: number;
  readonly oldest: string | undefined;
  readonly newest: string | undefined;
}

export interface Timeline {
  readonly step: TimeStep;
  /** Places in the file (or in the area), records or not. */
  readonly places: number;
  /** Places × details: every detail that could have a record. */
  readonly details: number;
  /** Oldest period first. Empty when no record is dated on or before today. */
  readonly rows: readonly PeriodRow[];
  /** Periods before the first row shown, when there are more than MAX_PERIODS. */
  readonly hidden: number;
  /** Records dated after today: left out of every count, as the App cannot place them in time. */
  readonly future: number;
  readonly byDetail: readonly DetailRow[];
}

export function isTimeStep(s: string | null | undefined): s is TimeStep {
  return s === "month" || s === "year";
}

export function periodOf(date: string, step: TimeStep): string {
  return step === "month" ? date.slice(0, 7) : date.slice(0, 4);
}

/** The period after this one: "2026-12" → "2027-01", "2026" → "2027". */
export function nextPeriod(period: string, step: TimeStep): string {
  const year = Number(period.slice(0, 4));
  if (step === "year") return String(year + 1).padStart(4, "0");
  const month = Number(period.slice(5, 7));
  return month === 12 ? `${String(year + 1).padStart(4, "0")}-01` : `${period.slice(0, 4)}-${String(month + 1).padStart(2, "0")}`;
}

/** Every period from the first to the last, gaps included, so a quiet month shows as a row of zeros. */
export function periodsBetween(first: string, last: string, step: TimeStep): string[] {
  const out: string[] = [];
  for (let p = first; p <= last; p = nextPeriod(p, step)) out.push(p);
  return out;
}

/** One detail of one place: its records dated on or before today, oldest first. */
interface Pair {
  readonly place: Place;
  readonly key: FactKey;
  readonly dated: readonly Observation[];
}

function pairsOf(places: readonly Place[], todayIso: string): { pairs: Pair[]; future: number } {
  const pairs: Pair[] = [];
  let future = 0;
  for (const place of places) {
    for (const key of FACT_KEYS) {
      const r = place.resolutions[key];
      const all = r.kind === "unknown" ? [] : r.observations;
      const dated = all.filter((o) => o.provenance.recordedOn <= todayIso);
      future += all.length - dated.length;
      dated.sort((a, b) => (a.provenance.recordedOn < b.provenance.recordedOn ? -1 : a.provenance.recordedOn > b.provenance.recordedOn ? 1 : 0));
      pairs.push({ place, key, dated });
    }
  }
  return { pairs, future };
}

/** True when the records dated in or before the period do not all say the same. */
function differsBy(dated: readonly Observation[], period: string, step: TimeStep): boolean {
  let first: "yes" | "no" | undefined;
  for (const o of dated) {
    if (periodOf(o.provenance.recordedOn, step) > period) break;
    if (first === undefined) first = o.value;
    else if (o.value !== first) return true;
  }
  return false;
}

function detailRows(pairs: readonly Pair[]): DetailRow[] {
  return FACT_KEYS.map((key) => {
    const mine = pairs.filter((p) => p.key === key);
    const dates = mine.flatMap((p) => p.dated.map((o) => o.provenance.recordedOn)).sort();
    return { key, records: dates.length, places: mine.filter((p) => p.dated.length > 0).length, oldest: dates[0], newest: dates.at(-1) };
  });
}

/** The timeline of the places given, as of today. */
export function placesTimeline(places: readonly Place[], step: TimeStep, today: Date): Timeline {
  const todayIso = today.toISOString().slice(0, 10);
  const { pairs, future } = pairsOf(places, todayIso);
  const base = { step, places: places.length, details: places.length * FACT_KEYS.length, future, byDetail: detailRows(pairs) };
  const dates = pairs.flatMap((p) => p.dated.map((o) => o.provenance.recordedOn)).sort();
  const oldest = dates[0];
  const newest = dates.at(-1);
  if (oldest === undefined || newest === undefined) return { ...base, rows: [], hidden: 0 };

  const all = periodsBetween(periodOf(oldest, step), periodOf(newest, step), step);
  const shown = all.slice(-MAX_PERIODS);
  const firstShown = shown[0] ?? "";

  const records = new Map<string, number>();
  for (const d of dates) records.set(periodOf(d, step), (records.get(periodOf(d, step)) ?? 0) + 1);
  const firstRecords = new Map<string, number>();
  for (const p of pairs) {
    const d = p.dated[0];
    if (d) firstRecords.set(periodOf(d.provenance.recordedOn, step), (firstRecords.get(periodOf(d.provenance.recordedOn, step)) ?? 0) + 1);
  }
  // Each place's oldest record of any detail, in one pass.
  const placeFirst = new Map<Place, string>();
  for (const p of pairs) {
    const d = p.dated[0]?.provenance.recordedOn;
    const seen = placeFirst.get(p.place);
    if (d !== undefined && (seen === undefined || d < seen)) placeFirst.set(p.place, d);
  }
  const placesStarted = new Map<string, number>();
  for (const d of placeFirst.values()) placesStarted.set(periodOf(d, step), (placesStarted.get(periodOf(d, step)) ?? 0) + 1);

  // Details recorded before the first period shown already count in the running total.
  let recorded = 0;
  for (const [period, n] of firstRecords) if (period < firstShown) recorded += n;
  const withRecords = pairs.filter((p) => p.dated.length > 0);
  const rows = shown.map((period): PeriodRow => {
    recorded += firstRecords.get(period) ?? 0;
    return {
      period,
      records: records.get(period) ?? 0,
      firstRecords: firstRecords.get(period) ?? 0,
      placesStarted: placesStarted.get(period) ?? 0,
      recorded,
      differing: withRecords.filter((p) => differsBy(p.dated, period, step)).length,
    };
  });
  return { ...base, rows, hidden: all.length - shown.length };
}

/** The timeline of a file, or of the places whose address holds the area text. */
export function fileTimeline(file: StreetFile, step: TimeStep, area: string, today: Date): Timeline {
  return placesTimeline(
    file.places.filter((p) => inArea(p, area)),
    step,
    today,
  );
}

/** Whole percent of a part in a total, rounded down so 99.6% never reads as 100%; 0 when the total is 0. */
export function percentRecorded(part: number, total: number): number {
  return total === 0 ? 0 : Math.floor((part * 100) / total);
}

/** Records dated in the file, over every period, hidden ones included. */
export function totalRecords(t: Timeline): number {
  return t.byDetail.reduce((n, d) => n + d.records, 0);
}

export const TIMELINE_CSV_COLUMNS = ["period", "records", "details_first_recorded", "places_first_recorded", "details_with_a_record", "percent_with_a_record", "details_where_reports_differ"] as const;

/** One row per period, guarded like the App's own CSV. */
export function timelineCsv(t: Timeline): string {
  const rows: string[][] = [[...TIMELINE_CSV_COLUMNS]];
  for (const r of t.rows)
    rows.push([r.period, String(r.records), String(r.firstRecords), String(r.placesStarted), String(r.recorded), String(percentRecorded(r.recorded, t.details)), String(r.differing)]);
  return `\uFEFF${rows.map((r) => r.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

import type { Locale } from "../../switch-first/src/index";
import { agesReport, type AgesReport } from "./ages";
import { coverageSpread } from "./coverage";
import type { ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import { checkFile } from "./filecheck";
import type { Note } from "./model";
import { groupPlaces, type Place } from "./places";
import { collectSources, type SourcesReport } from "./sources";

/**
 * "Summarize a notes file": counts for one notes export, made with the same
 * reports the App uses for the notes on a device: how many details each place
 * has recorded, how old the records are, where they come from and under which
 * licences, and which details have reports that differ. Counts only: nothing
 * is scored, no source is judged, and a detail with no record stays UNKNOWN.
 */

export interface DetailRow {
  readonly key: FactKey;
  readonly yes: number;
  readonly no: number;
  readonly differ: number;
  readonly unknown: number;
}

export interface FileSummary {
  readonly notes: number;
  readonly places: number;
  readonly leftOut: number;
  readonly exportedOn: string | undefined;
  /** spread[n] = places with exactly n details recorded. */
  readonly coverage: readonly number[];
  /** One row per detail: places with a Yes, a No, reports that differ, and no record. */
  readonly details: readonly DetailRow[];
  readonly ages: AgesReport;
  readonly sources: SourcesReport;
  readonly placesWithoutAddress: number;
  /** Places with more than one note. */
  readonly placesWithSeveralNotes: number;
  /** For each detail with differing reports, the places where they differ, in name order. */
  readonly differing: ReadonlyArray<{ readonly key: FactKey; readonly places: readonly Place[] }>;
}

export type SummaryRead = { readonly ok: true; readonly summary: FileSummary; readonly notesRead: readonly Note[] } | { readonly ok: false; readonly error: ImportError | "no-notes" };

/** For each detail, how many places have each kind of answer. The four counts add up to the number of places. */
export function detailRows(places: readonly Place[]): DetailRow[] {
  return FACT_KEYS.map((key) => {
    const row = { key, yes: 0, no: 0, differ: 0, unknown: 0 };
    for (const p of places) {
      const r = p.resolutions[key];
      if (r.kind === "unknown") row.unknown++;
      else if (r.kind === "differ") row.differ++;
      else row[r.value]++;
    }
    return row;
  });
}

/** Places whose reports differ, detail by detail. The App does not pick an answer for them. */
export function differingPlaces(places: readonly Place[]): Array<{ key: FactKey; places: Place[] }> {
  return FACT_KEYS.map((key) => ({ key, places: places.filter((p) => p.resolutions[key].kind === "differ") })).filter((d) => d.places.length > 0);
}

export function summarize(notes: readonly Note[], leftOut: number, exportedOn: string | undefined, locale: Locale, today: Date): FileSummary {
  const places = groupPlaces(notes, locale);
  return {
    notes: notes.length,
    places: places.length,
    leftOut,
    exportedOn,
    coverage: coverageSpread(places),
    details: detailRows(places),
    ages: agesReport(places, today),
    sources: collectSources(notes, today),
    placesWithoutAddress: places.filter((p) => p.address === undefined).length,
    placesWithSeveralNotes: places.filter((p) => p.notes.length > 1).length,
    differing: differingPlaces(places),
  };
}

export function readSummaryFile(text: string, today: Date, locale: Locale): SummaryRead {
  const r = checkFile(text, today);
  if (!r.ok) return { ok: false, error: r.error };
  if (r.check.readable.length === 0) return { ok: false, error: "no-notes" };
  return { ok: true, notesRead: r.check.readable, summary: summarize(r.check.readable, r.check.totals.leftOut, r.check.exportedOn, locale, today) };
}

/** Checks that the counts agree with each other: every detail row, the coverage spread and the ages report count every place once. */
export function summaryConsistent(s: FileSummary): boolean {
  const rowsOk = s.details.every((d) => d.yes + d.no + d.differ + d.unknown === s.places);
  const spreadOk = s.coverage.reduce((a, b) => a + b, 0) === s.places;
  const agesOk = s.ages.places === s.places;
  const differOk = s.details.every((d) => d.differ === (s.differing.find((x) => x.key === d.key)?.places.length ?? 0));
  return rowsOk && spreadOk && agesOk && differOk;
}

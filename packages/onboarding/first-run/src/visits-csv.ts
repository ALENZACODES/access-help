import { FACT_KEYS } from "./facts";
import { csvField, guardCell } from "./notes-csv";
import type { Place } from "./places";
import { compareVisit, sortVisits, type Visit, type VisitVerdict } from "./visits";

/**
 * The person's visits as a spreadsheet (CSV): one row per visit and detail,
 * in the newest-first order of the list and the App's detail order.
 *
 * - `found` is yes, no or not_looked.
 * - `notes_say` compares what was found with the notes as they are when the
 *   file is made: same, different, notes_differ, or UNKNOWN when the notes
 *   have no record. It is empty for a detail not looked at.
 * - The person's own words are on every row of their visit, so a row read on
 *   its own still makes sense. Typed text is guarded against formulas.
 */
export const VISIT_CSV_COLUMNS = ["visit_id", "place_name", "address", "visited_on", "detail", "found", "notes_say", "own_words", "written_on"] as const;

const NOTES_SAY: Readonly<Record<VisitVerdict, string>> = { same: "same", differs: "different", "differ-already": "notes_differ", unknown: "UNKNOWN" };

export function visitsToRows(list: readonly Visit[], places: readonly Place[]): string[][] {
  const rows: string[][] = [[...VISIT_CSV_COLUMNS]];
  for (const v of sortVisits(list)) {
    const compared = compareVisit(
      v,
      places.find((p) => p.id === v.placeId),
    );
    for (const key of FACT_KEYS) {
      const c = compared.find((x) => x.key === key);
      rows.push([v.id, guardCell(v.placeName), guardCell(v.address ?? ""), v.visitedOn, key, c ? c.found : "not_looked", c ? NOTES_SAY[c.verdict] : "", guardCell(v.words), v.writtenOn]);
    }
  }
  return rows;
}

/** CRLF line ends and a byte order mark, as the notes spreadsheet has. */
export function visitsToCsv(list: readonly Visit[], places: readonly Place[]): string {
  return `\uFEFF${visitsToRows(list, places)
    .map((r) => r.map(csvField).join(","))
    .join("\r\n")}\r\n`;
}

/** "visits-2026-11-20.csv": the columns are the same in both languages. */
export function visitsCsvFilename(today: Date): string {
  return `visits-${today.toISOString().slice(0, 10)}.csv`;
}

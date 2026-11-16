/**
 * CSV of the person's saved places, with their notes and labels, for a spreadsheet or a printout.
 * The status is read from the packs loaded now. A place that is in no loaded pack is written
 * with status UNKNOWN and empty location and source cells, never with an old status.
 */
import { csvText } from "./csv.js";
import type { ResolvedSaved } from "./saved.js";

export const SAVED_CSV_COLUMNS = ["id", "name", "status", "labels", "note", "latitude", "longitude", "source", "licence", "observed_on", "in_loaded_packs", "saved_on"] as const;

export function savedToCsv(rows: readonly ResolvedSaved[]): string {
  const lines: string[] = [SAVED_CSV_COLUMNS.join(",")];
  for (const { saved, place, status } of rows) {
    const record = place?.record ?? null;
    const effective = place?.conflict ? "UNKNOWN" : status;
    lines.push(
      [
        csvText(saved.id),
        csvText(record?.name ?? saved.name ?? ""),
        effective,
        csvText(saved.labels.join("; ")),
        csvText(saved.note),
        record === null ? "" : String(record.lat),
        record === null ? "" : String(record.lon),
        record === null ? "" : csvText(record.source),
        record === null ? "" : record.licence,
        record === null ? "" : record.observedOn,
        record === null ? "no" : "yes",
        saved.savedOn,
      ].join(","),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function savedCsvFilename(today: string): string {
  return `saved-places-${today}.csv`;
}

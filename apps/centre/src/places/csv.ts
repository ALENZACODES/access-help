/**
 * CSV of the places on screen, for a spreadsheet or a printout.
 * Every row keeps its status, source, licence, and observation date. UNKNOWN is
 * written as UNKNOWN. Text cells that a spreadsheet could read as a formula get
 * a leading apostrophe, so a place name cannot run anything when opened.
 */
import type { PlaceRecord } from "./types.js";

export const CSV_COLUMNS = ["id", "name", "status", "latitude", "longitude", "source", "licence", "observed_on", "note"] as const;

export interface CsvRow {
  record: PlaceRecord;
  /** Empty, or a short English note such as "packs disagree (status)". */
  note: string;
}

const FORMULA_START = /^[=+\-@\t\r]/;

/** Quotes a text cell and neutralises formula starts. Not for numbers. */
export function csvText(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: readonly CsvRow[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const { record, note } of rows) {
    lines.push(
      [
        csvText(record.id),
        csvText(record.name ?? ""),
        record.wheelchair,
        String(record.lat),
        String(record.lon),
        csvText(record.source),
        record.licence,
        record.observedOn,
        csvText(note),
      ].join(","),
    );
  }
  // A byte order mark keeps accents readable when a spreadsheet opens the file.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function csvFilename(today: string): string {
  return `places-${today}.csv`;
}

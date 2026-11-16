/** CSV of what differs between two packs. UNKNOWN is written as UNKNOWN, before and after. */
import { csvText } from "./csv.js";
import type { PackDiff } from "./diff.js";

export const DIFF_CSV_COLUMNS = ["id", "name", "change", "differs_in", "status_before", "status_after", "latitude", "longitude", "source", "licence", "observed_on"] as const;

export function diffToCsv(diff: PackDiff): string {
  const lines: string[] = [DIFF_CSV_COLUMNS.join(",")];
  const row = (change: string, differsIn: string, before: string, after: string, record: { id: string; name: string | null; lat: number; lon: number; source: string; licence: string; observedOn: string }) =>
    lines.push([csvText(record.id), csvText(record.name ?? ""), change, differsIn, before, after, String(record.lat), String(record.lon), csvText(record.source), record.licence, record.observedOn].join(","));
  for (const record of diff.added) row("added", "", "", record.wheelchair, record);
  for (const record of diff.removed) row("removed", "", record.wheelchair, "", record);
  for (const item of diff.changed) row("changed", item.kinds.join("; "), item.before.wheelchair, item.after.wheelchair, item.after);
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function diffCsvFilename(today: string): string {
  return `pack-differences-${today}.csv`;
}

import type { Locale } from "../../switch-first/src/index";
import { FACT_KEYS, type FactKey } from "./facts";
import type { StreetFile } from "./filestreets";
import { foldText } from "./filter";
import { csvField, guardCell } from "./notes-csv";
import type { Place } from "./places";

/**
 * "Answers by place, in a table": one row for each place in a notes file and
 * one column for each detail, giving what the App shows for it (Yes, No,
 * Unknown, or reports that differ), the day of the newest record and how many
 * sources it rests on. The person can narrow the rows by name or address and
 * by the answer to one detail, order them, and read them a page at a time. It
 * shows what is written down; a detail with no record stays Unknown.
 */

export type Shown = "yes" | "no" | "unknown" | "differ";
export const SHOWN: readonly Shown[] = ["yes", "no", "unknown", "differ"];

export interface Cell {
  readonly shown: Shown;
  /** Day of the newest record, ISO date; "" when there is none. */
  readonly newest: string;
  /** Sources the answer rests on. */
  readonly sources: number;
}

export interface GridRow {
  readonly place: Place;
  readonly cells: Readonly<Record<FactKey, Cell>>;
  /** Details with no record. */
  readonly unknown: number;
}

export type GridOrder = "name" | "unknown" | "newest";
export const GRID_ORDERS: readonly GridOrder[] = ["name", "unknown", "newest"];

export interface GridFilter {
  /** Words that must all be in the place's name or address. */
  readonly text: string;
  /** The detail whose answer narrows the rows, "any" for any detail shown as a column, or "" for none. */
  readonly key: FactKey | "any" | "";
  /** The answer that detail must show; ignored when no detail is chosen. */
  readonly shown: Shown;
  readonly order: GridOrder;
  /** Details shown as columns, in the App's order; they also decide what "no record" counts. */
  readonly columns: readonly FactKey[];
}

export const DEFAULT_GRID: GridFilter = { text: "", key: "", shown: "unknown", order: "name", columns: FACT_KEYS };

/** Details with no record among the given details. */
export function unknownIn(r: GridRow, keys: readonly FactKey[]): number {
  return keys.filter((k) => r.cells[k].shown === "unknown").length;
}

/** A page number typed by the person: a whole number from 1 to the number of pages, or undefined. */
export function parsePage(text: string, pages: number): number | undefined {
  const s = text.trim();
  if (!/^\d{1,6}$/.test(s)) return undefined;
  const n = Number(s);
  return n >= 1 && n <= pages ? n : undefined;
}

/** Rows on one page. */
export const PAGE_SIZE = 25;

export function cellOf(place: Place, key: FactKey): Cell {
  const r = place.resolutions[key];
  if (r.kind === "unknown") return { shown: "unknown", newest: "", sources: 0 };
  const newest = r.observations.reduce((d, o) => (o.provenance.recordedOn > d ? o.provenance.recordedOn : d), "");
  const sources = new Set(r.observations.map((o) => o.provenance.source)).size;
  return { shown: r.kind === "agree" ? r.value : "differ", newest, sources };
}

export function rowOf(place: Place): GridRow {
  const cells = Object.fromEntries(FACT_KEYS.map((k) => [k, cellOf(place, k)])) as Record<FactKey, Cell>;
  return { place, cells, unknown: FACT_KEYS.filter((k) => cells[k].shown === "unknown").length };
}

/** The newest record of the row across every detail; "" when it has none. */
export function rowNewest(r: GridRow): string {
  return FACT_KEYS.reduce((d, k) => (r.cells[k].newest > d ? r.cells[k].newest : d), "");
}

/** True when every word of the text is in the place's name or address; case and accents do not matter. */
export function matchesText(place: Place, text: string): boolean {
  const words = foldText(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w !== "");
  const hay = foldText(`${place.name} ${place.address ?? ""}`).replace(/[^a-z0-9]+/g, " ");
  return words.every((w) => hay.includes(w));
}

/** The rows that pass the filter, in the order asked for; ties go by name in the person's language. When ids are given, only those places. */
export function gridRows(file: StreetFile, f: GridFilter, locale: Locale, only?: ReadonlySet<string>): GridRow[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const byName = (a: GridRow, b: GridRow): number => collator.compare(a.place.name, b.place.name) || collator.compare(a.place.address ?? "", b.place.address ?? "");
  return file.places
    .filter((p) => (only ? only.has(p.id) : true) && matchesText(p, f.text))
    .map(rowOf)
    .filter((r) => {
      if (f.key === "") return true;
      if (f.key === "any") return f.columns.some((k) => r.cells[k].shown === f.shown);
      return r.cells[f.key].shown === f.shown;
    })
    .sort((a, b) => {
      if (f.order === "unknown") return unknownIn(b, f.columns) - unknownIn(a, f.columns) || byName(a, b);
      // Rows with no record at all come last when ordered by the newest record.
      if (f.order === "newest") return rowNewest(b).localeCompare(rowNewest(a)) || byName(a, b);
      return byName(a, b);
    });
}

export interface Page {
  /** 1-based page shown, within 1 and the number of pages. */
  readonly page: number;
  readonly pages: number;
  /** 1-based position of the first and last row shown; 0 when there is none. */
  readonly first: number;
  readonly last: number;
  readonly total: number;
  readonly rows: readonly GridRow[];
}

/** One page of the rows; a page asked for outside the range is brought within it. */
export function pageOf(rows: readonly GridRow[], page: number, size = PAGE_SIZE): Page {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (p - 1) * size;
  const shown = rows.slice(start, start + size);
  return { page: p, pages, first: shown.length > 0 ? start + 1 : 0, last: start + shown.length, total: rows.length, rows: shown };
}

/** How many rows show each answer for a detail. */
export function shownCounts(rows: readonly GridRow[], key: FactKey): Record<Shown, number> {
  const out: Record<Shown, number> = { yes: 0, no: 0, unknown: 0, differ: 0 };
  for (const r of rows) out[r.cells[key].shown] += 1;
  return out;
}

export const GRID_CSV_COLUMNS = ["place", "address", "unknown"] as const;

/** The word written in the CSV for an answer: the same in every language, with UNKNOWN for no record. */
export const csvWord = (s: Shown): string => (s === "unknown" ? "UNKNOWN" : s);

/** One row for each place, with the answer, the newest day and the number of sources for each detail shown; cells guarded. */
export function gridCsv(rows: readonly GridRow[], columns: readonly FactKey[] = FACT_KEYS): string {
  const keys = FACT_KEYS.filter((k) => columns.includes(k));
  const header = [...GRID_CSV_COLUMNS, ...keys.flatMap((k) => [k, `${k}_newest`, `${k}_sources`])];
  const out: string[][] = [header];
  for (const r of rows)
    out.push([
      r.place.name,
      r.place.address ?? "",
      String(unknownIn(r, keys)),
      ...keys.flatMap((k) => [csvWord(r.cells[k].shown), r.cells[k].newest, String(r.cells[k].sources)]),
    ]);
  return `\uFEFF${out.map((x) => x.map((v) => csvField(guardCell(v))).join(",")).join("\r\n")}\r\n`;
}

import type { Locale } from "../../switch-first/src/index";
import { FACT_KEYS, type FactKey } from "./facts";
import type { StreetFile } from "./filestreets";
import { csvField, guardCell } from "./notes-csv";
import type { Place } from "./places";
import { parseStreet, postalArea } from "./streets";

/**
 * "Where records are missing": the places in a notes file grouped by postal
 * area (the first three characters of a postal code) or by street, read from
 * the address the same way the App's walking lists read it, and for each
 * group, detail by detail, how many places have a record, how many have
 * reports that differ and how many have none. It is for planning where to
 * look next. It counts what is written down; it never says an area or a
 * place is better or worse, and a detail with no record stays Unknown.
 */

export type AreaBy = "postal" | "street";
export const AREA_BYS: readonly AreaBy[] = ["postal", "street"];

export type AreaOrder = "gaps" | "name";
export const AREA_ORDERS: readonly AreaOrder[] = ["gaps", "name"];

export interface AreaOptions {
  readonly by: AreaBy;
  readonly keys: readonly FactKey[];
  readonly order: AreaOrder;
  /** Leave out areas where every chosen detail has a record for every place. */
  readonly hideFull: boolean;
}

export const DEFAULT_AREA: AreaOptions = { by: "postal", keys: FACT_KEYS, order: "gaps", hideFull: false };

export interface DetailCount {
  /** Places with a Yes or a No that agree. */
  readonly answered: number;
  /** Places whose reports differ. */
  readonly differ: number;
  /** Places with no record. */
  readonly unknown: number;
}

export interface AreaRow {
  /** "M5V", the street's key, or "" for places whose address gives no area. */
  readonly key: string;
  /** "M5V", "King Street West", or "" for places with no area. */
  readonly label: string;
  /** By name. */
  readonly places: readonly Place[];
  readonly counts: Readonly<Record<FactKey, DetailCount>>;
  /** Details with no record, across the chosen details and places. */
  readonly gaps: number;
}

export interface AreaReport {
  readonly by: AreaBy;
  readonly keys: readonly FactKey[];
  /** Areas in the order asked for; the group of places with no area is always last. */
  readonly rows: readonly AreaRow[];
  /** Areas left out because every chosen detail has a record there. */
  readonly hidden: number;
  /** Places in the file, shown or not. */
  readonly places: number;
  /** Details with no record across every area. */
  readonly gaps: number;
}

/** The area a place falls in, or undefined when its address gives none. */
export function areaOf(place: Place, by: AreaBy): { key: string; label: string } | undefined {
  if (by === "postal") {
    const a = postalArea(place.address);
    return a ? { key: a, label: a } : undefined;
  }
  const s = parseStreet(place.address);
  return s ? { key: s.key, label: s.name } : undefined;
}

export function countDetail(places: readonly Place[], key: FactKey): DetailCount {
  const c = { answered: 0, differ: 0, unknown: 0 };
  for (const p of places) {
    const r = p.resolutions[key].kind;
    if (r === "unknown") c.unknown += 1;
    else if (r === "differ") c.differ += 1;
    else c.answered += 1;
  }
  return c;
}

/** Areas by most gaps, then by name; or by name. The group with no area always comes last. */
export function areaReport(file: StreetFile, o: AreaOptions, locale: Locale): AreaReport {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const groups = new Map<string, { label: string; places: Place[] }>();
  const none: Place[] = [];
  for (const place of file.places) {
    const a = areaOf(place, o.by);
    if (!a) {
      none.push(place);
      continue;
    }
    const g = groups.get(a.key) ?? { label: a.label, places: [] };
    g.places.push(place);
    groups.set(a.key, g);
  }
  const row = (key: string, label: string, places: Place[]): AreaRow => {
    const sorted = [...places].sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.address ?? "", b.address ?? ""));
    const counts = Object.fromEntries(FACT_KEYS.map((k) => [k, countDetail(sorted, k)])) as Record<FactKey, DetailCount>;
    const gaps = o.keys.reduce((s, k) => s + counts[k].unknown, 0);
    return { key, label, places: sorted, counts, gaps };
  };
  const all = [...groups].map(([key, g]) => row(key, g.label, g.places));
  // An area with nothing missing has no gaps to add, so leaving it out does not change the total.
  const rows = o.hideFull ? all.filter((a) => a.gaps > 0) : all;
  const hidden = all.length - rows.length;
  rows.sort((a, b) => (o.order === "gaps" ? b.gaps - a.gaps : 0) || collator.compare(a.label, b.label));
  // The places with no area are always shown, so none of them goes unseen.
  if (none.length > 0) rows.push(row("", "", none));
  return { by: o.by, keys: o.keys, rows, hidden, places: file.places.length, gaps: rows.reduce((s, r) => s + r.gaps, 0) };
}

export interface PlaceGaps {
  readonly place: Place;
  /** Chosen details with no record, in the App's order. */
  readonly missing: readonly FactKey[];
  /** Chosen details whose reports differ, in the App's order. */
  readonly differ: readonly FactKey[];
}

/** Each place in an area with the chosen details it has no record for and those whose reports differ: what to look at on a visit. */
export function placeGaps(row: AreaRow, keys: readonly FactKey[]): PlaceGaps[] {
  const chosen = FACT_KEYS.filter((k) => keys.includes(k));
  return row.places.map((place) => ({
    place,
    missing: chosen.filter((k) => place.resolutions[k].kind === "unknown"),
    differ: chosen.filter((k) => place.resolutions[k].kind === "differ"),
  }));
}

/** The area with this key in the report; "" is the group of places with no area. */
export function findArea(r: AreaReport, key: string): AreaRow | undefined {
  return r.rows.find((a) => a.key === key);
}

/** The share of places with a record for the detail, from 0 to 1; 0 for an empty area. */
export function shareRecorded(c: DetailCount): number {
  const total = c.answered + c.differ + c.unknown;
  return total === 0 ? 0 : (c.answered + c.differ) / total;
}

export const AREA_CSV_COLUMNS = ["area", "places", "gaps"] as const;

/** One row for each area: its places, gaps, and for each chosen detail the places answered, with reports that differ and with no record. */
export function areaCsv(r: AreaReport, noArea: string): string {
  const header = [...AREA_CSV_COLUMNS, ...r.keys.flatMap((k) => [`${k}_answered`, `${k}_differ`, `${k}_unknown`])];
  const rows: string[][] = [header];
  for (const a of r.rows)
    rows.push([a.key === "" ? noArea : a.label, String(a.places.length), String(a.gaps), ...r.keys.flatMap((k) => [a.counts[k].answered, a.counts[k].differ, a.counts[k].unknown].map(String))]);
  return `\uFEFF${rows.map((x) => x.map((v) => csvField(guardCell(v))).join(",")).join("\r\n")}\r\n`;
}

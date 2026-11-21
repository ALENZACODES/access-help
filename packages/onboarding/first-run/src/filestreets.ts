import type { Locale } from "../../switch-first/src/index";
import { exportNotes, type ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import { checkFile } from "./filecheck";
import type { Note } from "./model";
import { csvField, guardCell } from "./notes-csv";
import { groupPlaces, type Place } from "./places";
import { compareBothSides, compareOnStreet, parseStreet, postalArea } from "./streets";

/**
 * "Sort a notes file by street": the places in one notes export, grouped by
 * the street in their address (or by postal area), in house-number order, so
 * a walk or a round of calls goes along one street at a time. The groups can
 * be shared among a number of people in lists of about the same size, each
 * group kept whole. Each group or list gets its own notes file and a visit
 * sheet.
 *
 * Streets and postal areas are read from the text of each address (see
 * streets.ts). A place whose address gives none goes in its own group: it is
 * never guessed into one. Nothing is looked up, nothing is saved.
 */

export const MAX_PEOPLE = 20;

/** Group by the street, or by the postal area (the first three characters of the postal code). */
export type GroupBy = "street" | "postal";
export const GROUP_BYS: readonly GroupBy[] = ["street", "postal"];

export interface ListOptions {
  readonly by: GroupBy;
  /** Walk one side of a street, then come back on the other: odd numbers up, even numbers down. */
  readonly bothSides: boolean;
  /** Leave out places where every detail has a record and no reports differ: nothing to look at there. */
  readonly onlyOpen: boolean;
  readonly people: number;
}

export const DEFAULT_LIST_OPTIONS: ListOptions = { by: "street", bothSides: false, onlyOpen: false, people: 1 };

export interface ListGroup {
  readonly key: string;
  readonly name: string;
  /** In walking order. */
  readonly places: readonly Place[];
}

export interface StreetFile {
  readonly notes: number;
  readonly leftOut: number;
  /** Every place, in name order. */
  readonly places: readonly Place[];
}

export interface Grouped {
  readonly by: GroupBy;
  /** Places left out because there is nothing to look at (only with onlyOpen). */
  readonly leftOutDone: number;
  /** Groups in name order. */
  readonly groups: readonly ListGroup[];
  /** Places with no street (or no postal code), in name order. */
  readonly ungrouped: readonly Place[];
}

export type StreetRead = { readonly ok: true; readonly file: StreetFile } | { readonly ok: false; readonly error: ImportError | "no-notes" };

/** A list for one person: whole groups, and its share of the places in no group. */
export interface Batch {
  readonly index: number;
  readonly groups: readonly ListGroup[];
  readonly ungrouped: readonly Place[];
  readonly size: number;
}

export function readStreetFile(text: string, today: Date, locale: Locale): StreetRead {
  const r = checkFile(text, today);
  if (!r.ok) return { ok: false, error: r.error };
  if (r.check.readable.length === 0) return { ok: false, error: "no-notes" };
  return { ok: true, file: { notes: r.check.readable.length, leftOut: r.check.totals.leftOut, places: groupPlaces(r.check.readable, locale) } };
}

/** Walking order inside a group: by street, then house number (or both sides); places with no street last, by name. */
function walkingOrder(places: readonly Place[], bothSides: boolean, collator: Intl.Collator): Place[] {
  const withStreet = places.map((place) => ({ place, street: parseStreet(place.address) }));
  return withStreet
    .sort((a, b) => {
      if (!a.street || !b.street) return a.street ? -1 : b.street ? 1 : collator.compare(a.place.name, b.place.name);
      const byStreet = collator.compare(a.street.name, b.street.name);
      if (byStreet !== 0) return byStreet;
      const x = { street: a.street, name: a.place.name };
      const y = { street: b.street, name: b.place.name };
      return bothSides ? compareBothSides(x, y) : compareOnStreet(x, y);
    })
    .map((x) => x.place);
}

/** True when a place has something to look at: a detail with no record, or reports that differ. */
export function hasOpenDetail(place: Place): boolean {
  return unknownDetails(place).length > 0 || differingDetails(place).length > 0;
}

/** Groups the places by street or postal area. */
export function groupFile(file: StreetFile, opts: Pick<ListOptions, "by" | "bothSides"> & Partial<Pick<ListOptions, "onlyOpen">>, locale: Locale): Grouped {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const by = new Map<string, { name: string; places: Place[] }>();
  const ungrouped: Place[] = [];
  const places = opts.onlyOpen ? file.places.filter(hasOpenDetail) : file.places;
  for (const place of places) {
    const street = opts.by === "street" ? parseStreet(place.address) : undefined;
    const area = opts.by === "postal" ? postalArea(place.address) : undefined;
    const key = street?.key ?? area;
    const name = street?.name ?? area;
    if (key === undefined || name === undefined) {
      ungrouped.push(place);
      continue;
    }
    const g = by.get(key) ?? { name, places: [] };
    g.places.push(place);
    by.set(key, g);
  }
  const groups = [...by].map(([key, g]) => ({ key, name: g.name, places: walkingOrder(g.places, opts.bothSides, collator) }));
  groups.sort((a, b) => collator.compare(a.name, b.name) || a.key.localeCompare(b.key));
  ungrouped.sort((a, b) => collator.compare(a.name, b.name) || a.id.localeCompare(b.id));
  return { by: opts.by, leftOutDone: file.places.length - places.length, groups, ungrouped };
}

/**
 * Shares the groups among `people` lists of about the same number of places.
 * Groups stay whole; the biggest are placed first, each in the list with the
 * fewest places so far (ties go to the lower list). The places in no group
 * are then dealt one at a time the same way. Within a list, groups keep name
 * order. A list is empty only when there are fewer groups and ungrouped
 * places than people.
 */
export function shareGroups(grouped: Grouped, people: number): Batch[] {
  const n = Math.min(Math.max(1, Math.floor(people)), MAX_PEOPLE);
  const order = new Map(grouped.groups.map((g, i) => [g.key, i]));
  const bins = Array.from({ length: n }, () => ({ groups: [] as ListGroup[], ungrouped: [] as Place[], size: 0 }));
  const lightest = (): (typeof bins)[number] => bins.reduce((a, b) => (b.size < a.size ? b : a));
  const bySize = [...grouped.groups].sort((a, b) => b.places.length - a.places.length || (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
  for (const g of bySize) {
    const bin = lightest();
    bin.groups.push(g);
    bin.size += g.places.length;
  }
  for (const p of grouped.ungrouped) {
    const bin = lightest();
    bin.ungrouped.push(p);
    bin.size += 1;
  }
  return bins.map((b, index) => ({
    index,
    groups: [...b.groups].sort((x, y) => (order.get(x.key) ?? 0) - (order.get(y.key) ?? 0)),
    ungrouped: b.ungrouped,
    size: b.size,
  }));
}

/** The places of a list in walking order: group by group, then those in no group. */
export function batchPlaces(b: Batch): Place[] {
  return [...b.groups.flatMap((g) => g.places), ...b.ungrouped];
}

/** The notes of some places, as a notes export, in the places' order. */
export function placesExport(places: readonly Place[], today: Date): string {
  const notes: Note[] = places.flatMap((p) => [...p.notes]);
  return exportNotes(notes, today.toISOString().slice(0, 10));
}

/** Details a place has no record for, in the App's order: what to look at on the visit. */
export function unknownDetails(place: Place): FactKey[] {
  return FACT_KEYS.filter((k) => place.resolutions[k].kind === "unknown");
}

/** Details whose reports differ at a place. */
export function differingDetails(place: Place): FactKey[] {
  return FACT_KEYS.filter((k) => place.resolutions[k].kind === "differ");
}

/** Checks that the lists hold every place exactly once (every place with something to look at, with onlyOpen). */
export function batchesComplete(file: StreetFile, batches: readonly Batch[], onlyOpen = false): boolean {
  const all = (onlyOpen ? file.places.filter(hasOpenDetail) : file.places).map((p) => p.id);
  const dealt = batches.flatMap((b) => batchPlaces(b).map((p) => p.id));
  return dealt.length === all.length && new Set(dealt).size === all.length && all.every((id) => dealt.includes(id));
}

/** The columns of the lists' CSV. Details are named by the App's keys, so the file reads the same in either language. */
export const LIST_CSV_COLUMNS = ["list", "group", "house_number", "place_name", "address", "no_record", "reports_differ"] as const;

/**
 * Every list as a CSV, one row per place in walking order: the list number,
 * the group, the house number, the place and what to look at. Cells are
 * guarded like the App's own CSV, with a byte-order mark and CRLF line ends.
 */
export function listsCsv(batches: readonly Batch[], ungroupedName: string): string {
  const rows: string[][] = [[...LIST_CSV_COLUMNS]];
  for (const b of batches) {
    const sections = [...b.groups.map((g) => ({ name: g.name, places: g.places })), { name: ungroupedName, places: b.ungrouped }];
    for (const s of sections) {
      for (const p of s.places) {
        rows.push([String(b.index + 1), s.name, parseStreet(p.address)?.number ?? "", p.name, p.address ?? "", unknownDetails(p).join(" "), differingDetails(p).join(" ")]);
      }
    }
  }
  return `\uFEFF${rows.map((r) => r.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

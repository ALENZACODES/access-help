import type { Locale } from "../../switch-first/src/index";
import { FACT_KEYS, STALE_AFTER_MONTHS, monthsSince, type FactKey } from "./facts";
import { foldText } from "./filter";
import { placesExport, type StreetFile } from "./filestreets";
import { csvField, guardCell } from "./notes-csv";
import type { Place } from "./places";
import { parseStreet } from "./streets";

/**
 * "Choose places to look at first": the places in a notes export, ranked by
 * what is open at each one: details with no record, details whose reports
 * differ and, if the person wants, recorded details whose newest report is a
 * year old or more. Every place's rank comes with its reasons, so the order
 * can be checked by eye. The first places can be downloaded as their own
 * notes file, to sort by street, plan or record a round. Nothing is looked up
 * or saved, and a year-old record is not treated as wrong: it is only worth
 * looking at again.
 */

export type FirstOrder = "most" | "differ" | "oldest";
export const FIRST_ORDERS: readonly FirstOrder[] = ["most", "differ", "oldest"];

export const FIRST_LIMITS = { count: { min: 1, max: 200 }, area: 60 } as const;

/** Show places one by one, or streets with what is open on each. */
export type FirstView = "places" | "streets";
export const FIRST_VIEWS: readonly FirstView[] = ["places", "streets"];

export interface FirstOptions {
  readonly view: FirstView;
  readonly order: FirstOrder;
  /** The details that count; at least one. */
  readonly keys: readonly FactKey[];
  /** Count recorded details whose newest report is a year old or more. */
  readonly includeOld: boolean;
  /** Only places whose address holds this text (any case and accents); empty for every place. */
  readonly area: string;
  /** How many places to take first. */
  readonly count: number;
}

export const DEFAULT_FIRST: FirstOptions = { view: "places", order: "most", keys: FACT_KEYS, includeOld: true, area: "", count: 10 };

/** What is open at one place, detail by detail, in the App's order. */
export interface PlaceNeeds {
  readonly place: Place;
  readonly unknown: readonly FactKey[];
  readonly differ: readonly FactKey[];
  /** Recorded and agreeing, but the newest report is a year old or more. */
  readonly old: readonly FactKey[];
  /** The newest report on any detail at the place, YYYY-MM-DD; undefined when nothing is recorded. */
  readonly newest: string | undefined;
}

export interface Ranked {
  readonly ranked: readonly PlaceNeeds[];
  /** Places with nothing open among the chosen details. */
  readonly nothingOpen: number;
  /** Places left out because their address does not hold the area text. */
  readonly outsideArea: number;
}

/** The form as typed, kept as text so a wrong value stays on screen to fix. */
export interface FirstForm {
  readonly view: FirstView;
  readonly order: FirstOrder;
  readonly keys: readonly FactKey[];
  readonly includeOld: boolean;
  readonly area: string;
  readonly count: string;
}

export type FirstField = "keys" | "area" | "count";
export interface FirstProblem {
  readonly field: FirstField;
  readonly code: "keys" | "area" | "count";
}
export type FirstCheck = { readonly ok: true; readonly options: FirstOptions } | { readonly ok: false; readonly problems: readonly FirstProblem[] };

export function isFirstOrder(s: string | null | undefined): s is FirstOrder {
  return s === "most" || s === "differ" || s === "oldest";
}

export function isFirstView(s: string | null | undefined): s is FirstView {
  return s === "places" || s === "streets";
}

export function formFor(o: FirstOptions): FirstForm {
  return { view: o.view, order: o.order, keys: [...o.keys], includeOld: o.includeOld, area: o.area, count: String(o.count) };
}

/** Reads the form. Every problem is reported at once, in the order of the fields. */
export function checkFirstForm(f: FirstForm): FirstCheck {
  const problems: FirstProblem[] = [];
  const keys = FACT_KEYS.filter((k) => f.keys.includes(k));
  if (keys.length === 0) problems.push({ field: "keys", code: "keys" });
  const area = f.area.trim();
  if (area.length > FIRST_LIMITS.area) problems.push({ field: "area", code: "area" });
  const t = f.count.trim();
  const count = /^\d{1,3}$/.test(t) ? Number(t) : NaN;
  if (!(count >= FIRST_LIMITS.count.min && count <= FIRST_LIMITS.count.max)) problems.push({ field: "count", code: "count" });
  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, options: { view: f.view, order: f.order, keys, includeOld: f.includeOld, area, count } };
}

/** The newest report on any detail at a place. */
export function newestRecord(place: Place): string | undefined {
  let newest: string | undefined;
  for (const k of FACT_KEYS) {
    const r = place.resolutions[k];
    if (r.kind === "unknown") continue;
    for (const o of r.observations) if (newest === undefined || o.provenance.recordedOn > newest) newest = o.provenance.recordedOn;
  }
  return newest;
}

/** What is open at a place among the chosen details. */
export function placeNeeds(place: Place, keys: readonly FactKey[], includeOld: boolean, today: Date): PlaceNeeds {
  const unknown: FactKey[] = [];
  const differ: FactKey[] = [];
  const old: FactKey[] = [];
  for (const k of FACT_KEYS) {
    if (!keys.includes(k)) continue;
    const r = place.resolutions[k];
    if (r.kind === "unknown") unknown.push(k);
    else if (r.kind === "differ") differ.push(k);
    else if (includeOld) {
      // Observations are newest first.
      const newest = r.observations[0];
      if (newest && monthsSince(newest.provenance.recordedOn, today) >= STALE_AFTER_MONTHS) old.push(k);
    }
  }
  return { place, unknown, differ, old, newest: newestRecord(place) };
}

export function openCount(n: PlaceNeeds): number {
  return n.unknown.length + n.differ.length + n.old.length;
}

/** Folded, with punctuation as spaces, so "King St. W" holds "king st w". */
function squash(s: string): string {
  return foldText(s).replace(/[^a-z0-9]+/g, " ").trim();
}

export function inArea(place: Place, area: string): boolean {
  const want = squash(area);
  if (want === "") return true;
  return squash(place.address ?? "").includes(want);
}

/** Never-recorded places first, then the oldest newest report. */
function byAge(a: PlaceNeeds, b: PlaceNeeds): number {
  if (a.newest === b.newest) return 0;
  if (a.newest === undefined) return -1;
  if (b.newest === undefined) return 1;
  return a.newest < b.newest ? -1 : 1;
}

/**
 * Ranks the places with something open. "most": the most open details first,
 * then the most differing reports, then the oldest. "differ": differing
 * reports first. "oldest": places never recorded, then the oldest newest
 * report. Ties go to name order in the person's language, then to the id.
 */
export function rankPlaces(file: StreetFile, o: FirstOptions, today: Date, locale: Locale): Ranked {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const inside = file.places.filter((p) => inArea(p, o.area));
  const needs = inside.map((p) => placeNeeds(p, o.keys, o.includeOld, today));
  const open = needs.filter((n) => openCount(n) > 0);
  const byName = (a: PlaceNeeds, b: PlaceNeeds): number => collator.compare(a.place.name, b.place.name) || a.place.id.localeCompare(b.place.id);
  const sorters: Record<FirstOrder, (a: PlaceNeeds, b: PlaceNeeds) => number> = {
    most: (a, b) => openCount(b) - openCount(a) || b.differ.length - a.differ.length || byAge(a, b) || byName(a, b),
    differ: (a, b) => b.differ.length - a.differ.length || openCount(b) - openCount(a) || byAge(a, b) || byName(a, b),
    oldest: (a, b) => byAge(a, b) || openCount(b) - openCount(a) || byName(a, b),
  };
  return { ranked: [...open].sort(sorters[o.order]), nothingOpen: needs.length - open.length, outsideArea: file.places.length - inside.length };
}

/** The first places of the ranking. */
export function pickFirst(r: Ranked, count: number): PlaceNeeds[] {
  return r.ranked.slice(0, Math.max(0, count));
}

/** The notes of the first places, as a notes export in rank order. */
export function firstNotesFile(picked: readonly PlaceNeeds[], today: Date): string {
  return placesExport(
    picked.map((n) => n.place),
    today,
  );
}

/** The columns of the ranking's CSV, named by the App's keys so the file reads the same in either language. */
export const FIRST_CSV_COLUMNS = ["rank", "place_name", "address", "no_record", "reports_differ", "year_old_or_more", "newest_record"] as const;

/** The first places as a CSV, one row each in rank order, guarded like the App's own CSV. */
export function firstCsv(picked: readonly PlaceNeeds[]): string {
  const rows: string[][] = [[...FIRST_CSV_COLUMNS]];
  picked.forEach((n, i) => {
    rows.push([String(i + 1), n.place.name, n.place.address ?? "", n.unknown.join(" "), n.differ.join(" "), n.old.join(" "), n.newest ?? ""]);
  });
  return `\uFEFF${rows.map((r) => r.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

/** What is open along one street, from the places on it with something open. */
export interface StreetNeeds {
  readonly key: string;
  readonly name: string;
  readonly places: readonly PlaceNeeds[];
  /** Open details over all its places. */
  readonly open: number;
  readonly unknown: number;
  readonly differ: number;
  readonly old: number;
  /** Places on it with nothing recorded at all. */
  readonly neverRecorded: number;
}

export interface StreetRanking {
  readonly streets: readonly StreetNeeds[];
  /** Places with something open but no street in their address. */
  readonly noStreet: readonly PlaceNeeds[];
}

/**
 * Groups the ranked places by the street in their address (read as "Sort a
 * notes file by street" reads it) and ranks the streets: the most open
 * details first, then the most places, then the most places never recorded,
 * then name order. Within a street, places keep the ranking's order. A place
 * whose address gives no street is listed apart, never guessed onto one.
 */
export function rankStreets(r: Ranked, locale: Locale): StreetRanking {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const by = new Map<string, { name: string; places: PlaceNeeds[] }>();
  const noStreet: PlaceNeeds[] = [];
  for (const n of r.ranked) {
    const street = parseStreet(n.place.address);
    if (!street) {
      noStreet.push(n);
      continue;
    }
    const g = by.get(street.key) ?? { name: street.name, places: [] };
    g.places.push(n);
    by.set(street.key, g);
  }
  const streets: StreetNeeds[] = [...by].map(([key, g]) => {
    const sum = (f: (n: PlaceNeeds) => number): number => g.places.reduce((a, n) => a + f(n), 0);
    return {
      key,
      name: g.name,
      places: g.places,
      open: sum(openCount),
      unknown: sum((n) => n.unknown.length),
      differ: sum((n) => n.differ.length),
      old: sum((n) => n.old.length),
      neverRecorded: g.places.filter((n) => n.newest === undefined).length,
    };
  });
  streets.sort((a, b) => b.open - a.open || b.places.length - a.places.length || b.neverRecorded - a.neverRecorded || collator.compare(a.name, b.name) || a.key.localeCompare(b.key));
  return { streets, noStreet };
}

/** The first streets, and the notes of every place on them, in the streets' order. */
export function pickStreets(s: StreetRanking, count: number): StreetNeeds[] {
  return s.streets.slice(0, Math.max(0, count));
}

export function streetsNotesFile(streets: readonly StreetNeeds[], today: Date): string {
  return placesExport(
    streets.flatMap((s) => s.places.map((n) => n.place)),
    today,
  );
}

/** The columns of the streets' CSV. */
export const STREETS_CSV_COLUMNS = ["rank", "street", "places", "open_details", "no_record", "reports_differ", "year_old_or_more", "never_recorded"] as const;

export function streetsCsv(streets: readonly StreetNeeds[]): string {
  const rows: string[][] = [[...STREETS_CSV_COLUMNS]];
  streets.forEach((s, i) => {
    rows.push([String(i + 1), s.name, String(s.places.length), String(s.open), String(s.unknown), String(s.differ), String(s.old), String(s.neverRecorded)]);
  });
  return `\uFEFF${rows.map((r) => r.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

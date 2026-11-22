import type { Locale } from "../../switch-first/src/index";
import { FACT_KEYS, type FactKey } from "./facts";
import type { StreetFile } from "./filestreets";
import { csvField, guardCell } from "./notes-csv";
import type { Place } from "./places";

/**
 * "Which sources the answers rest on": for each source in a notes file, how
 * many records it holds, for how many places, over which days and under which
 * licences; how many answers the App shows from it (its record is the newest
 * for that detail); and how many answers rest on it alone, so that without it
 * the detail would be Unknown. This is for knowing what a file depends on,
 * before a source is withdrawn or a licence is questioned. It counts records;
 * it never says that a source is better or worse.
 */

export type SourceOrder = "records" | "alone" | "name";
export const SOURCE_ORDERS: readonly SourceOrder[] = ["records", "alone", "name"];

export interface SourceOptions {
  readonly keys: readonly FactKey[];
  readonly order: SourceOrder;
}

export const DEFAULT_SOURCES: SourceOptions = { keys: FACT_KEYS, order: "records" };

export interface DetailUse {
  /** Records from the source for the detail. */
  readonly records: number;
  /** Answers for the detail that rest on the source alone. */
  readonly alone: number;
}

export interface SourceRow {
  readonly source: string;
  /** Records across the chosen details. */
  readonly records: number;
  /** Places with a record from the source for a chosen detail. */
  readonly places: number;
  /** Answers the App shows from this source: its record is the newest for that place and detail. */
  readonly shown: number;
  /** Answers that rest on this source alone. */
  readonly alone: number;
  /** First and last day it recorded, ISO dates. */
  readonly first: string;
  readonly last: string;
  /** Licences its records use, sorted. */
  readonly licences: readonly string[];
  readonly byKey: Readonly<Record<FactKey, DetailUse>>;
}

export interface SourceReport {
  readonly keys: readonly FactKey[];
  readonly rows: readonly SourceRow[];
  /** Place and detail pairs with an answer (a Yes, a No, or reports that differ). */
  readonly answers: number;
  /** Of those, the answers that rest on one source alone. */
  readonly alone: number;
  /** Of those, the answers that rest on two sources or more. */
  readonly several: number;
}

export interface AloneAnswer {
  readonly place: Place;
  readonly key: FactKey;
  readonly value: "yes" | "no" | "differ";
}

/** The sources an answer rests on: the sources of every Yes or No for that place and detail. */
export function sourcesOf(place: Place, key: FactKey): string[] {
  const r = place.resolutions[key];
  if (r.kind === "unknown") return [];
  return [...new Set(r.observations.map((o) => o.provenance.source))];
}

const blank = (): Record<FactKey, { records: number; alone: number }> =>
  Object.fromEntries(FACT_KEYS.map((k) => [k, { records: 0, alone: 0 }])) as Record<FactKey, { records: number; alone: number }>;

/** Every source in the file, with what the answers rest on, for the chosen details. */
export function sourceReport(file: StreetFile, o: SourceOptions, locale: Locale): SourceReport {
  type Acc = { records: number; places: Set<string>; shown: number; alone: number; first: string; last: string; licences: Set<string>; byKey: Record<FactKey, { records: number; alone: number }> };
  const acc = new Map<string, Acc>();
  const get = (s: string): Acc => {
    const a = acc.get(s) ?? { records: 0, places: new Set<string>(), shown: 0, alone: 0, first: "", last: "", licences: new Set<string>(), byKey: blank() };
    acc.set(s, a);
    return a;
  };
  let answers = 0;
  let alone = 0;
  for (const place of file.places)
    for (const key of o.keys) {
      const r = place.resolutions[key];
      if (r.kind === "unknown") continue;
      answers += 1;
      for (const ob of r.observations) {
        const a = get(ob.provenance.source);
        a.records += 1;
        a.places.add(place.id);
        a.licences.add(ob.provenance.licence);
        a.byKey[key].records += 1;
        const day = ob.provenance.recordedOn;
        if (a.first === "" || day < a.first) a.first = day;
        if (a.last === "" || day > a.last) a.last = day;
      }
      const newest = r.observations[0];
      if (newest) get(newest.provenance.source).shown += 1;
      const sources = sourcesOf(place, key);
      const only = sources.length === 1 ? sources[0] : undefined;
      if (only !== undefined) {
        alone += 1;
        const a = get(only);
        a.alone += 1;
        a.byKey[key].alone += 1;
      }
    }
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const rows: SourceRow[] = [...acc].map(([source, a]) => ({
    source,
    records: a.records,
    places: a.places.size,
    shown: a.shown,
    alone: a.alone,
    first: a.first,
    last: a.last,
    licences: [...a.licences].sort(),
    byKey: a.byKey,
  }));
  rows.sort((a, b) => (o.order === "records" ? b.records - a.records : o.order === "alone" ? b.alone - a.alone : 0) || collator.compare(a.source, b.source));
  return { keys: o.keys, rows, answers, alone, several: answers - alone };
}

/** The answers that rest on this source alone, by place name in the person's language, then in the App's detail order. */
export function aloneAnswers(file: StreetFile, source: string, keys: readonly FactKey[], locale: Locale): AloneAnswer[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const out: AloneAnswer[] = [];
  for (const place of file.places)
    for (const key of FACT_KEYS) {
      if (!keys.includes(key)) continue;
      const sources = sourcesOf(place, key);
      if (sources.length !== 1 || sources[0] !== source) continue;
      const r = place.resolutions[key];
      out.push({ place, key, value: r.kind === "agree" ? r.value : "differ" });
    }
  return out.sort((a, b) => collator.compare(a.place.name, b.place.name) || collator.compare(a.place.address ?? "", b.place.address ?? "") || FACT_KEYS.indexOf(a.key) - FACT_KEYS.indexOf(b.key));
}

/** The places of those answers, each once, in the order given. */
export function placesOfAnswers(answers: readonly AloneAnswer[]): Place[] {
  const seen = new Set<string>();
  return answers.flatMap((a) => (seen.has(a.place.id) ? [] : (seen.add(a.place.id), [a.place])));
}

export interface OverlapRow {
  readonly place: Place;
  readonly key: FactKey;
  /** Each source's newest answer for the place and detail. */
  readonly a: "yes" | "no";
  readonly b: "yes" | "no";
}

export interface Overlap {
  /** Place and detail pairs both sources answer. */
  readonly both: number;
  readonly same: number;
  /** Where the two sources' newest answers differ, by place name, then in the App's detail order. */
  readonly differ: readonly OverlapRow[];
}

/** A source's newest answer for a place and detail, if it has one. */
export function newestFrom(place: Place, key: FactKey, source: string): "yes" | "no" | undefined {
  const r = place.resolutions[key];
  if (r.kind === "unknown") return undefined;
  // Observations are newest first.
  return r.observations.find((o) => o.provenance.source === source)?.value;
}

/**
 * Where two sources both answer the same place and detail: how often their
 * newest answers are the same, and where they differ. It does not say which
 * source is right.
 */
export function sourceOverlap(file: StreetFile, a: string, b: string, keys: readonly FactKey[], locale: Locale): Overlap {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  let both = 0;
  let same = 0;
  const differ: OverlapRow[] = [];
  for (const place of file.places)
    for (const key of FACT_KEYS) {
      if (!keys.includes(key)) continue;
      const va = newestFrom(place, key, a);
      const vb = newestFrom(place, key, b);
      if (!va || !vb) continue;
      both += 1;
      if (va === vb) same += 1;
      else differ.push({ place, key, a: va, b: vb });
    }
  differ.sort((x, y) => collator.compare(x.place.name, y.place.name) || collator.compare(x.place.address ?? "", y.place.address ?? "") || FACT_KEYS.indexOf(x.key) - FACT_KEYS.indexOf(y.key));
  return { both, same, differ };
}

export const SOURCE_CSV_COLUMNS = ["source", "records", "places", "shown", "alone", "first", "last", "licences"] as const;

/** One row for each source, with a records and an alone column for each chosen detail; cells guarded against formulas. */
export function sourceCsv(r: SourceReport): string {
  const header = [...SOURCE_CSV_COLUMNS, ...r.keys.flatMap((k) => [`${k}_records`, `${k}_alone`])];
  const rows: string[][] = [header];
  for (const s of r.rows)
    rows.push([
      s.source,
      String(s.records),
      String(s.places),
      String(s.shown),
      String(s.alone),
      s.first,
      s.last,
      s.licences.join(" "),
      ...r.keys.flatMap((k) => [String(s.byKey[k].records), String(s.byKey[k].alone)]),
    ]);
  return `\uFEFF${rows.map((x) => x.map((v) => csvField(guardCell(v))).join(",")).join("\r\n")}\r\n`;
}

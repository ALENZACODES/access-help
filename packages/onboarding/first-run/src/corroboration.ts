import { FACT_KEYS, type FactKey } from "./facts";
import { placesExport, type StreetFile } from "./filestreets";
import { inArea } from "./lookfirst";
import { csvField, guardCell } from "./notes-csv";
import type { Observation, Place } from "./places";

/**
 * "Details with one report": which recorded details rest on one report, or on
 * reports from one source only, so a second report from someone else would
 * help most; and, for each pair of sources, how often their reports on the
 * same detail of the same place say the same. A detail with one report is
 * not wrong, and two sources that agree are not proved right: the counts only
 * say how many independent reports there are.
 */

/** How a detail whose records agree is backed. */
export type Backing = "one-report" | "one-source" | "several";
export const BACKINGS: readonly Backing[] = ["one-report", "one-source", "several"];

/** Which details to list: those with one report, or those whose reports all come from one source. */
export type SingleMode = "report" | "source";
export const SINGLE_MODES: readonly SingleMode[] = ["report", "source"];

export function isSingleMode(s: string | null | undefined): s is SingleMode {
  return s === "report" || s === "source";
}

export interface BackedDetail {
  readonly key: FactKey;
  readonly value: "yes" | "no";
  readonly reports: number;
  /** Distinct sources, in name order. */
  readonly sources: readonly string[];
  readonly newest: string;
  readonly backing: Backing;
}

export interface SinglePlace {
  readonly place: Place;
  /** In the App's detail order. */
  readonly details: readonly BackedDetail[];
}

export interface SourceAlone {
  readonly source: string;
  /** Details for which this source is the only one. */
  readonly alone: number;
  /** Details this source reports at all (whatever the others say). */
  readonly reports: number;
}

/** One detail of one place on which two sources' newest records differ. */
export interface PairDifference {
  readonly place: Place;
  readonly key: FactKey;
  readonly a: { readonly value: "yes" | "no"; readonly on: string };
  readonly b: { readonly value: "yes" | "no"; readonly on: string };
}

export interface SourcePair {
  /** The two sources, in name order. */
  readonly a: string;
  readonly b: string;
  /** Details of a place that both report. */
  readonly both: number;
  /** Of those, the details where their newest records say the same. */
  readonly same: number;
  readonly different: number;
  /** Where their newest records differ, by place name then the App's detail order. */
  readonly differences: readonly PairDifference[];
}

export interface SingleReport {
  readonly mode: SingleMode;
  /** The details considered, in the App's order. */
  readonly keys: readonly FactKey[];
  readonly places: number;
  /** Details whose records agree, by how they are backed. */
  readonly counts: Readonly<Record<Backing, number>>;
  /** Details whose reports differ: open already, so not listed. */
  readonly differ: number;
  /** Places with at least one detail listed, in name order. */
  readonly list: readonly SinglePlace[];
  /** Sources by details they alone back, most first. */
  readonly bySource: readonly SourceAlone[];
  /** Pairs of sources with at least one detail both report, most first. */
  readonly pairs: readonly SourcePair[];
}

export function distinctSources(observations: readonly Observation[]): string[] {
  return [...new Set(observations.map((o) => o.provenance.source))].sort((a, b) => a.localeCompare(b));
}

export function backingOf(observations: readonly Observation[]): Backing {
  if (observations.length === 1) return "one-report";
  return distinctSources(observations).length === 1 ? "one-source" : "several";
}

/** Every detail of a place whose records agree, with how it is backed. */
export function backedDetails(place: Place): BackedDetail[] {
  return FACT_KEYS.flatMap((key): BackedDetail[] => {
    const r = place.resolutions[key];
    if (r.kind !== "agree") return [];
    return [
      {
        key,
        value: r.value,
        reports: r.observations.length,
        sources: distinctSources(r.observations),
        // Observations are newest first.
        newest: r.observations[0]?.provenance.recordedOn ?? "",
        backing: backingOf(r.observations),
      },
    ];
  });
}

/** True when a detail is listed in this mode: one report, or (for "source") reports from one source only. */
export function isListed(d: BackedDetail, mode: SingleMode): boolean {
  return mode === "report" ? d.backing === "one-report" : d.backing !== "several";
}

/** Each source's newest record of a detail, from records newest first. */
function newestBySource(observations: readonly Observation[]): Map<string, Observation> {
  const out = new Map<string, Observation>();
  for (const o of observations) if (!out.has(o.provenance.source)) out.set(o.provenance.source, o);
  return out;
}

/** For each pair of sources, the details both report, whether their newest records say the same, and where they do not. */
export function sourcePairs(places: readonly Place[], keys: readonly FactKey[] = FACT_KEYS): SourcePair[] {
  const pairs = new Map<string, { a: string; b: string; both: number; same: number; differences: PairDifference[] }>();
  for (const place of places)
    for (const key of FACT_KEYS) {
      if (!keys.includes(key)) continue;
      const r = place.resolutions[key];
      if (r.kind === "unknown") continue;
      const by = newestBySource(r.observations);
      const names = [...by.keys()].sort((x, y) => x.localeCompare(y));
      for (let i = 0; i < names.length; i++)
        for (let j = i + 1; j < names.length; j++) {
          const a = names[i] as string;
          const b = names[j] as string;
          const oa = by.get(a) as Observation;
          const ob = by.get(b) as Observation;
          const id = `${a}\u0000${b}`;
          const p = pairs.get(id) ?? { a, b, both: 0, same: 0, differences: [] };
          p.both += 1;
          if (oa.value === ob.value) p.same += 1;
          else p.differences.push({ place, key, a: { value: oa.value, on: oa.provenance.recordedOn }, b: { value: ob.value, on: ob.provenance.recordedOn } });
          pairs.set(id, p);
        }
    }
  const order = (x: PairDifference, y: PairDifference): number =>
    x.place.name.localeCompare(y.place.name) || (x.place.address ?? "").localeCompare(y.place.address ?? "") || FACT_KEYS.indexOf(x.key) - FACT_KEYS.indexOf(y.key);
  return [...pairs.values()]
    .map((p) => ({ ...p, different: p.both - p.same, differences: [...p.differences].sort(order) }))
    .sort((x, y) => y.both - x.both || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
}

/** The details to consider, in the App's order; every detail when none is given. */
export function chosenKeys(keys: readonly FactKey[] | undefined): FactKey[] {
  return keys === undefined ? [...FACT_KEYS] : FACT_KEYS.filter((k) => keys.includes(k));
}

export function placesSingle(places: readonly Place[], mode: SingleMode, only?: readonly FactKey[]): SingleReport {
  const keys = chosenKeys(only);
  const counts: Record<Backing, number> = { "one-report": 0, "one-source": 0, several: 0 };
  let differ = 0;
  const list: SinglePlace[] = [];
  const alone = new Map<string, number>();
  const reports = new Map<string, number>();
  for (const place of places) {
    for (const key of keys) {
      const r = place.resolutions[key];
      if (r.kind === "differ") differ += 1;
      if (r.kind !== "unknown") for (const s of distinctSources(r.observations)) reports.set(s, (reports.get(s) ?? 0) + 1);
    }
    const details = backedDetails(place).filter((d) => keys.includes(d.key));
    for (const d of details) {
      counts[d.backing] += 1;
      const only = d.sources.length === 1 ? d.sources[0] : undefined;
      if (only !== undefined) alone.set(only, (alone.get(only) ?? 0) + 1);
    }
    const shown = details.filter((d) => isListed(d, mode));
    if (shown.length > 0) list.push({ place, details: shown });
  }
  list.sort((a, b) => a.place.name.localeCompare(b.place.name) || (a.place.address ?? "").localeCompare(b.place.address ?? ""));
  const bySource = [...reports.entries()]
    .map(([source, n]) => ({ source, alone: alone.get(source) ?? 0, reports: n }))
    .sort((a, b) => b.alone - a.alone || a.source.localeCompare(b.source));
  return { mode, keys, places: places.length, counts, differ, list, bySource, pairs: sourcePairs(places, keys) };
}

export function fileSingle(file: StreetFile, mode: SingleMode, area: string, only?: readonly FactKey[]): SingleReport {
  return placesSingle(
    file.places.filter((p) => inArea(p, area)),
    mode,
    only,
  );
}

/** The notes of the places listed, to look at them again or ask them. */
export function singleNotesFile(r: SingleReport, today: Date): string {
  return placesExport(
    r.list.map((p) => p.place),
    today,
  );
}

export const SINGLE_CSV_COLUMNS = ["place_name", "address", "detail", "value", "reports", "sources", "newest_record"] as const;

export const DIFFER_CSV_COLUMNS = ["place_name", "address", "detail", "source", "value", "recorded_on", "other_source", "other_value", "other_recorded_on"] as const;

/** One row for each detail on which two sources' newest records differ, pair by pair, guarded like the App's own CSV. */
export function differCsv(r: SingleReport): string {
  const rows: string[][] = [[...DIFFER_CSV_COLUMNS]];
  for (const p of r.pairs)
    for (const d of p.differences) rows.push([d.place.name, d.place.address ?? "", d.key, p.a, d.a.value, d.a.on, p.b, d.b.value, d.b.on]);
  return `\uFEFF${rows.map((row) => row.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

/** The places where two sources' newest records differ, each once, in name order. */
export function differPlaces(r: SingleReport): Place[] {
  const all = [...new Set(r.pairs.flatMap((p) => p.differences.map((d) => d.place)))];
  return all.sort((a, b) => a.name.localeCompare(b.name) || (a.address ?? "").localeCompare(b.address ?? ""));
}

/** Their notes, to visit them and settle what differs. */
export function differNotesFile(r: SingleReport, today: Date): string {
  return placesExport(differPlaces(r), today);
}

/** True when two sources' newest records differ somewhere. */
export function hasDifferences(r: SingleReport): boolean {
  return r.pairs.some((p) => p.differences.length > 0);
}

/** One row per detail listed, guarded like the App's own CSV. Sources are joined with " | ". */
export function singleCsv(r: SingleReport): string {
  const rows: string[][] = [[...SINGLE_CSV_COLUMNS]];
  for (const p of r.list) for (const d of p.details) rows.push([p.place.name, p.place.address ?? "", d.key, d.value, String(d.reports), d.sources.join(" | "), d.newest]);
  return `\uFEFF${rows.map((row) => row.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { FACT_KEYS, STALE_AFTER_MONTHS, monthsSince, type FactKey } from "./facts";
import type { Place, Resolution } from "./places";

/**
 * What the notes say, detail by detail, across all places. For each detail the
 * places are counted as Yes, No, "reports differ" or Unknown, so the four
 * numbers always add up to the number of places. Unknown is its own count and
 * is never folded into No. Nothing is scored or ranked.
 */
export interface DetailRow {
  readonly key: FactKey;
  readonly yes: number;
  readonly no: number;
  readonly differ: number;
  readonly unknown: number;
}

export interface OldPlace {
  readonly place: Place;
  /** Details whose newest record is at least STALE_AFTER_MONTHS months old. */
  readonly keys: readonly FactKey[];
}

export interface DifferingPlace {
  readonly place: Place;
  /** Details where this place's reports disagree. */
  readonly keys: readonly FactKey[];
}

export interface PlacesSummary {
  readonly places: number;
  readonly rows: readonly DetailRow[];
  readonly old: readonly OldPlace[];
  readonly differing: readonly DifferingPlace[];
}

/** Places with at least one detail whose reports disagree. The App lists them; it does not choose between the reports. */
export function differingPlaces(places: readonly Place[]): DifferingPlace[] {
  const out: DifferingPlace[] = [];
  for (const place of places) {
    const keys = FACT_KEYS.filter((k) => place.resolutions[k].kind === "differ");
    if (keys.length > 0) out.push({ place, keys });
  }
  return out.sort((a, b) => b.keys.length - a.keys.length || a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id));
}

/** The newest recorded date behind a resolution, or undefined when there is no record. */
export function newestRecord(r: Resolution): string | undefined {
  if (r.kind === "unknown") return undefined;
  return r.observations.reduce<string | undefined>((best, o) => (best === undefined || o.provenance.recordedOn > best ? o.provenance.recordedOn : best), undefined);
}

export function summarisePlaces(places: readonly Place[], today: Date): PlacesSummary {
  const rows: DetailRow[] = FACT_KEYS.map((key) => {
    let yes = 0;
    let no = 0;
    let differ = 0;
    let unknown = 0;
    for (const p of places) {
      const r = p.resolutions[key];
      if (r.kind === "unknown") unknown++;
      else if (r.kind === "differ") differ++;
      else if (r.value === "yes") yes++;
      else no++;
    }
    return { key, yes, no, differ, unknown };
  });
  const old: OldPlace[] = [];
  for (const place of places) {
    const keys = FACT_KEYS.filter((k) => {
      const newest = newestRecord(place.resolutions[k]);
      return newest !== undefined && monthsSince(newest, today) >= STALE_AFTER_MONTHS;
    });
    if (keys.length > 0) old.push({ place, keys });
  }
  old.sort((a, b) => b.keys.length - a.keys.length || a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id));
  return { places: places.length, rows, old, differing: differingPlaces(places) };
}

export function rowTotal(r: DetailRow): number {
  return r.yes + r.no + r.differ + r.unknown;
}

/** True when every row accounts for every place, which the page relies on. */
export function isConsistent(s: PlacesSummary): boolean {
  return s.rows.every((r) => rowTotal(r) === s.places);
}

export function summaryToText(s: PlacesSummary, locale: Locale): string {
  const l = locale;
  const colon = l === "fr" ? "\u00A0:" : ":";
  const title = t(COPY.summary.title, l);
  const lines = [title, "=".repeat(Math.min(title.length, 72)), "", t(COPY.summary.intro, l), "", `${t(COPY.summary.places, l)}${colon} ${s.places}`, ""];
  // French puts a narrow no-break space before a semicolon.
  const semi = l === "fr" ? "\u202F; " : "; ";
  for (const r of s.rows) {
    const parts = [
      `${t(COPY.values.yes, l)} ${r.yes}`,
      `${t(COPY.values.no, l)} ${r.no}`,
      `${t(COPY.places.differ, l)} ${r.differ}`,
      `${t(COPY.values.unknown, l)} ${r.unknown}`,
    ];
    lines.push(`${t(COPY.facts[r.key], l)}${colon} ${parts.join(semi)}`);
  }
  if (s.differing.length > 0) {
    lines.push("", t(COPY.summary.differTitle, l));
    for (const d of s.differing) lines.push(`- ${d.place.name}${d.place.address ? ` (${d.place.address})` : ""}${colon} ${d.keys.map((k) => t(COPY.facts[k], l)).join(", ")}`);
  }
  if (s.old.length > 0) {
    lines.push("", t(COPY.summary.oldTitle, l));
    for (const o of s.old) lines.push(`- ${o.place.name}${o.place.address ? ` (${o.place.address})` : ""}${colon} ${o.keys.map((k) => t(COPY.facts[k], l)).join(", ")}`);
  }
  return lines.join("\n") + "\n";
}

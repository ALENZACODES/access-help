import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { FACT_KEYS, type FactKey, type Provenance } from "./facts";
import type { Place } from "./places";
import { QUESTIONS } from "./plan";
import { recordLine } from "./tier";

/**
 * One detail across every place: which places the notes give a Yes, a No,
 * reports that differ, or nothing at all (UNKNOWN). Each Yes or No shows its
 * newest record with source, licence, date and tier. It sorts places into
 * groups by what the notes say. It does not rank places, and it does not say
 * any place suits anyone.
 */
export type DetailGroup = "yes" | "no" | "differ" | "unknown";

export const DETAIL_GROUPS: readonly DetailGroup[] = ["yes", "no", "differ", "unknown"];

export interface DetailEntry {
  readonly place: Place;
  /** Records for this detail at this place. Zero for UNKNOWN. */
  readonly reports: number;
  /** The newest record, for Yes and No only. Reports that differ are listed on the record history page. */
  readonly newest: Provenance | undefined;
}

export type DetailBuckets = Readonly<Record<DetailGroup, readonly DetailEntry[]>>;

export function isFactKey(v: string | undefined): v is FactKey {
  return v !== undefined && (FACT_KEYS as readonly string[]).includes(v);
}

const byName = (a: DetailEntry, b: DetailEntry): number => a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id);

export function groupOf(place: Place, key: FactKey): DetailGroup {
  const r = place.resolutions[key];
  if (r.kind === "unknown") return "unknown";
  if (r.kind === "differ") return "differ";
  return r.value;
}

/** Every place lands in exactly one group. Groups are sorted by place name, then id. */
export function detailBuckets(places: readonly Place[], key: FactKey): DetailBuckets {
  const out: Record<DetailGroup, DetailEntry[]> = { yes: [], no: [], differ: [], unknown: [] };
  for (const place of places) {
    const r = place.resolutions[key];
    const group = groupOf(place, key);
    // Observations are kept newest first, so the first one is the newest record.
    const newest = r.kind === "agree" ? r.observations[0]?.provenance : undefined;
    out[group].push({ place, reports: r.kind === "unknown" ? 0 : r.observations.length, newest });
  }
  for (const g of DETAIL_GROUPS) out[g].sort(byName);
  return out;
}

export function bucketCounts(b: DetailBuckets): Readonly<Record<DetailGroup, number>> {
  return { yes: b.yes.length, no: b.no.length, differ: b.differ.length, unknown: b.unknown.length };
}

/** The heading of a group, in the person's language. */
export function groupLabel(g: DetailGroup, locale: Locale): string {
  return t(g === "differ" ? COPY.places.differ : COPY.values[g], locale);
}

/** "1 report", "3 reports", "1 rapport", "3 rapports". */
export function reportCountText(n: number, locale: Locale): string {
  if (locale === "fr") return n > 1 ? `${n} rapports` : `${n} rapport`;
  return n === 1 ? "1 report" : `${n} reports`;
}

/** One line for a place in a group, for the text file. */
export function entryLine(e: DetailEntry, group: DetailGroup, locale: Locale): string {
  const where = e.place.address ? `${e.place.name}, ${e.place.address}` : e.place.name;
  if (group === "unknown") return where;
  if (group === "differ") return `${where}. ${reportCountText(e.reports, locale)}.`;
  const colon = locale === "fr" ? `${NB}:` : ":";
  const newest = e.newest ? ` ${t(COPY.byDetail.newest, locale)}${colon} ${recordLine(e.newest, locale)}.` : "";
  return `${where}. ${reportCountText(e.reports, locale)}.${newest}`;
}

const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

export function byDetailToText(places: readonly Place[], key: FactKey, locale: Locale, today: Date): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = `${t(COPY.byDetail.title, l)}${colon} ${t(COPY.facts[key], l)}`;
  const lines = [title, rule(title), "", t(COPY.byDetail.intro, l), t(COPY.byDetail.noRank, l), ""];
  if (places.length === 0) {
    lines.push(t(COPY.byDetail.noPlaces, l), "");
  } else {
    const b = detailBuckets(places, key);
    for (const g of DETAIL_GROUPS) {
      const head = `${groupLabel(g, l)} (${b[g].length})`;
      lines.push(head, rule(head, "-"));
      if (b[g].length === 0) lines.push(t(COPY.byDetail.emptyGroup, l));
      if (g === "unknown" && b[g].length > 0) lines.push(`${t(COPY.gaps.ask, l)}${colon} ${QUESTIONS[key][l]}`);
      if (g === "differ" && b[g].length > 0) lines.push(t(COPY.byDetail.differNote, l));
      for (const e of b[g]) lines.push(`- ${entryLine(e, g, l)}`);
      lines.push("");
    }
  }
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function byDetailFilename(key: FactKey, today: Date, locale: Locale): string {
  return `${locale === "fr" ? "un-detail" : "one-detail"}-${key}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}

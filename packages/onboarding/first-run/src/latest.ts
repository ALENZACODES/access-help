import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { FACT_KEYS, isIsoDate } from "./facts";
import { placeHistory, type HistoryEntry } from "./history";
import type { Place } from "./places";
import { RECORD_KINDS, recordLine, type RecordKind } from "./tier";

/**
 * The latest records across every place, newest first and grouped by month,
 * so a person can see what was recorded lately and where it came from. Each
 * record keeps its source, licence, date and tier. The list is in date order
 * only: it does not rank places or sources.
 */
export const LATEST_PAGE = 20;

export interface LatestEntry {
  readonly place: Place;
  readonly entry: HistoryEntry;
}

export interface LatestMonth {
  /** "2026-09". */
  readonly month: string;
  readonly entries: readonly LatestEntry[];
}

export function isRecordKind(v: string | undefined): v is RecordKind {
  return v !== undefined && (RECORD_KINDS as readonly string[]).includes(v);
}

/** Every record of every place, newest first. The same day is ordered by place name, then detail, then note. */
export function latestRecords(places: readonly Place[], only?: RecordKind): LatestEntry[] {
  const order = new Map(FACT_KEYS.map((k, i) => [k, i] as const));
  const out: LatestEntry[] = [];
  for (const place of places) {
    for (const d of placeHistory(place).details) {
      for (const entry of d.entries) {
        if (only === undefined || entry.kind === only) out.push({ place, entry });
      }
    }
  }
  return out.sort((a, b) => {
    const [x, y] = [a.entry.provenance.recordedOn, b.entry.provenance.recordedOn];
    if (x !== y) return x < y ? 1 : -1;
    return (
      a.place.name.localeCompare(b.place.name) ||
      a.place.id.localeCompare(b.place.id) ||
      (order.get(a.entry.key) ?? 0) - (order.get(b.entry.key) ?? 0) ||
      a.entry.noteId.localeCompare(b.entry.noteId)
    );
  });
}

export type KindCounts = Readonly<Record<RecordKind, number>>;

export function kindCounts(places: readonly Place[]): KindCounts {
  const c = { person: 0, "named-source": 0 };
  for (const e of latestRecords(places)) c[e.entry.kind] += 1;
  return c;
}

/** Splits a list that is already newest first into months, keeping the order. */
export function groupByMonth(entries: readonly LatestEntry[]): LatestMonth[] {
  const out: { month: string; entries: LatestEntry[] }[] = [];
  for (const e of entries) {
    const month = e.entry.provenance.recordedOn.slice(0, 7);
    const last = out[out.length - 1];
    if (last && last.month === month) last.entries.push(e);
    else out.push({ month, entries: [e] });
  }
  return out;
}

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** "September 2026", "septembre 2026". The month as given when it is not a real month. */
export function monthLabel(month: string, locale: Locale): string {
  if (!/^\d{4}-\d{2}$/.test(month) || !isIsoDate(`${month}-01`)) return month;
  const name = (locale === "fr" ? MONTHS_FR : MONTHS_EN)[Number(month.slice(5, 7)) - 1] ?? month;
  return `${name} ${month.slice(0, 4)}`;
}

/** How many records to show: at least one page, never more than there are. */
export function clampLatest(shown: number, total: number): number {
  if (!Number.isInteger(shown) || shown < LATEST_PAGE) return Math.min(LATEST_PAGE, total);
  return Math.min(shown, total);
}

/** "1 record shown, out of 1." or "20 records shown, out of 57." */
export function latestShownText(shown: number, total: number, locale: Locale): string {
  if (locale === "fr") return `${shown} ${shown > 1 ? "données affichées" : "donnée affichée"}, sur ${total}.`;
  return `${shown} ${shown === 1 ? "record" : "records"} shown, out of ${total}.`;
}

/** One record as a sentence: the detail and answer, then source, licence, date and tier. */
export function latestLine(e: LatestEntry, locale: Locale): string {
  const colon = locale === "fr" ? `${NB}:` : ":";
  return `${t(COPY.facts[e.entry.key], locale)}${colon} ${t(COPY.values[e.entry.value], locale)}. ${recordLine(e.entry.provenance, locale)}.`;
}

const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

export function latestToText(entries: readonly LatestEntry[], locale: Locale, today: Date, only?: RecordKind): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(COPY.latest.title, l);
  const lines: string[] = [title, rule(title), "", t(COPY.latest.intro, l), t(COPY.latest.noRank, l)];
  if (only !== undefined) lines.push(`${t(COPY.latest.showing, l)}${colon} ${t(only === "person" ? COPY.tier.person : COPY.tier.namedSource, l)}`);
  lines.push("");
  if (entries.length === 0) lines.push(t(COPY.latest.none, l), "");
  for (const m of groupByMonth(entries)) {
    const label = monthLabel(m.month, l);
    lines.push(label, rule(label, "-"));
    for (const e of m.entries) lines.push(`- ${e.place.name}. ${latestLine(e, l)}`);
    lines.push("");
  }
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function latestFilename(today: Date, locale: Locale, only?: RecordKind): string {
  const base = locale === "fr" ? "dernieres-donnees" : "latest-records";
  return `${base}${only === undefined ? "" : `-${only}`}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}

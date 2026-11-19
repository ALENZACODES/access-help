import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { FACT_KEYS, monthsSince, type FactKey, type Provenance } from "./facts";
import type { Observation, Place } from "./places";
import { recordKind, recordLine, type RecordKind } from "./tier";

/**
 * The record history of one place: every Yes or No that was recorded for each
 * detail, in date order, with its source, licence, date and tier. It shows what
 * was recorded and when a newer record said something different. It does not
 * pick an answer and does not say which record is right.
 */
export type Change = "first" | "same" | "different";

export interface HistoryEntry {
  readonly key: FactKey;
  readonly noteId: string;
  readonly value: "yes" | "no";
  readonly provenance: Provenance;
  readonly kind: RecordKind;
  /** Compared with the record just before it in date order. */
  readonly change: Change;
}

export interface DetailHistory {
  readonly key: FactKey;
  /** Newest first. Empty when nothing was recorded: the detail is Unknown. */
  readonly entries: readonly HistoryEntry[];
  /** How many records said something different from the record before them. */
  readonly changes: number;
  readonly oldest: string | undefined;
  readonly newest: string | undefined;
}

export interface PlaceHistory {
  /** One for each detail, in the usual order, including details with no record. */
  readonly details: readonly DetailHistory[];
  readonly records: number;
  readonly unknown: readonly FactKey[];
  readonly sources: readonly string[];
}

/** Oldest first; records on the same day are ordered by note id so the order never depends on storage order. */
export function chronological(observations: readonly Observation[]): Observation[] {
  return [...observations].sort((a, b) =>
    a.provenance.recordedOn === b.provenance.recordedOn
      ? a.noteId.localeCompare(b.noteId)
      : a.provenance.recordedOn < b.provenance.recordedOn ? -1 : 1,
  );
}

export function detailHistory(key: FactKey, observations: readonly Observation[]): DetailHistory {
  const ordered = chronological(observations);
  const entries: HistoryEntry[] = [];
  let previous: Observation | undefined;
  let changes = 0;
  for (const o of ordered) {
    const change: Change = previous === undefined ? "first" : previous.value === o.value ? "same" : "different";
    if (change === "different") changes += 1;
    entries.push({ key, noteId: o.noteId, value: o.value, provenance: o.provenance, kind: recordKind(o.provenance), change });
    previous = o;
  }
  return {
    key,
    entries: entries.reverse(),
    changes,
    oldest: ordered[0]?.provenance.recordedOn,
    newest: ordered[ordered.length - 1]?.provenance.recordedOn,
  };
}

export function placeHistory(place: Place): PlaceHistory {
  const details = FACT_KEYS.map((k) => {
    const r = place.resolutions[k];
    return detailHistory(k, r.kind === "unknown" ? [] : r.observations);
  });
  const sources = new Set<string>();
  for (const d of details) for (const e of d.entries) sources.add(e.provenance.source);
  return {
    details,
    records: details.reduce((n, d) => n + d.entries.length, 0),
    unknown: details.filter((d) => d.entries.length === 0).map((d) => d.key),
    sources: [...sources].sort((a, b) => a.localeCompare(b)),
  };
}

/** Every record of a place in one list, newest first, for a single timeline. Ties keep the usual detail order. */
export function timeline(history: PlaceHistory): HistoryEntry[] {
  const order = new Map(FACT_KEYS.map((k, i) => [k, i] as const));
  return history.details
    .flatMap((d) => d.entries)
    .sort((a, b) =>
      a.provenance.recordedOn === b.provenance.recordedOn
        ? (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0) || a.noteId.localeCompare(b.noteId)
        : a.provenance.recordedOn < b.provenance.recordedOn ? 1 : -1,
    );
}

export function changeLabel(change: Change, locale: Locale): string {
  return t(change === "first" ? COPY.history.first : change === "same" ? COPY.history.same : COPY.history.different, locale);
}

/** "3 records", "1 record", "3 données", "1 donnée". */
export function recordCount(n: number, locale: Locale): string {
  if (locale === "fr") return n > 1 ? `${n} données` : `${n} donnée`;
  return n === 1 ? "1 record" : `${n} records`;
}

/** "Recorded 14 months ago" is never shown as wrong; this is only the age in whole months. */
export function entryAge(e: HistoryEntry, today: Date): number {
  return monthsSince(e.provenance.recordedOn, today);
}

const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

export function historyToText(place: Place, history: PlaceHistory, locale: Locale, today: Date): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = `${t(COPY.history.title, l)}${colon} ${place.name}`;
  const lines: string[] = [title, rule(title)];
  if (place.address) lines.push(place.address);
  lines.push("", t(COPY.history.intro, l), t(COPY.history.noPick, l), "");
  for (const d of history.details) {
    const label = t(COPY.facts[d.key], l);
    lines.push(label, rule(label, "-"));
    if (d.entries.length === 0) {
      lines.push(`${t(COPY.values.unknown, l)}. ${t(COPY.history.none, l)}`, "");
      continue;
    }
    for (const e of d.entries) {
      lines.push(`- ${t(COPY.values[e.value], l)}. ${recordLine(e.provenance, l)}. ${changeLabel(e.change, l)}`);
    }
    lines.push("");
  }
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function historyFilename(place: Place, locale: Locale): string {
  return `${locale === "fr" ? "historique" : "history"}-${place.id}-${locale}.txt`;
}

import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { FACT_KEYS, type FactKey, type Provenance } from "./facts";
import type { Observation, Place } from "./places";
import { recordLine } from "./tier";

/**
 * Records saved more than once. Two notes about one place can hold exactly the
 * same record: the same answer from the same source, under the same licence,
 * on the same day. That happens when a file is brought in twice under new
 * note ids, or when a report is typed twice. It is still one record, so the
 * App shows it here instead of letting it look like two reports that agree.
 * Nothing is removed or merged for the person.
 */
export interface RepeatGroup {
  readonly key: FactKey;
  readonly value: "yes" | "no";
  readonly provenance: Provenance;
  /** The notes that hold this record, sorted, at least two. */
  readonly noteIds: readonly string[];
}

export interface PlaceRepeats {
  readonly place: Place;
  readonly groups: readonly RepeatGroup[];
}

/** Two records are the same record when the answer, source, licence and date are all the same. */
export function recordKey(o: Pick<Observation, "value" | "provenance">): string {
  const p = o.provenance;
  return JSON.stringify([o.value, p.source, p.licence, p.recordedOn]);
}

function observationsOf(place: Place, key: FactKey): readonly Observation[] {
  const r = place.resolutions[key];
  return r.kind === "unknown" ? [] : r.observations;
}

/** How many different records a detail has, counting a record saved several times once. */
export function distinctRecords(place: Place, key: FactKey): number {
  return new Set(observationsOf(place, key).map(recordKey)).size;
}

export function placeRepeats(place: Place): RepeatGroup[] {
  const out: RepeatGroup[] = [];
  for (const key of FACT_KEYS) {
    const byRecord = new Map<string, Observation[]>();
    for (const o of observationsOf(place, key)) {
      const k = recordKey(o);
      const list = byRecord.get(k);
      if (list) list.push(o);
      else byRecord.set(k, [o]);
    }
    const groups: RepeatGroup[] = [];
    for (const list of byRecord.values()) {
      const first = list[0];
      if (!first || list.length < 2) continue;
      groups.push({ key, value: first.value, provenance: first.provenance, noteIds: list.map((o) => o.noteId).sort((a, b) => a.localeCompare(b)) });
    }
    // Newest first inside one detail; the same day is ordered by answer, then source, so the order is always the same.
    groups.sort(
      (a, b) =>
        (a.provenance.recordedOn === b.provenance.recordedOn ? 0 : a.provenance.recordedOn < b.provenance.recordedOn ? 1 : -1) ||
        a.value.localeCompare(b.value) ||
        a.provenance.source.localeCompare(b.provenance.source) ||
        a.provenance.licence.localeCompare(b.provenance.licence),
    );
    out.push(...groups);
  }
  return out;
}

/** Places that hold a record more than once, by name. */
export function findRepeats(places: readonly Place[]): PlaceRepeats[] {
  const out: PlaceRepeats[] = [];
  for (const place of places) {
    const groups = placeRepeats(place);
    if (groups.length > 0) out.push({ place, groups });
  }
  return out.sort((a, b) => a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id));
}

/** Copies beyond the first, added up: the number by which a plain count of records is too high. */
export function extraCopies(list: readonly PlaceRepeats[]): number {
  return list.reduce((n, p) => n + p.groups.reduce((m, g) => m + g.noteIds.length - 1, 0), 0);
}

export function repeatGroups(list: readonly PlaceRepeats[]): number {
  return list.reduce((n, p) => n + p.groups.length, 0);
}

/** "Saved 2 times", "Enregistrée 2 fois". */
export function timesSaved(n: number, locale: Locale): string {
  return locale === "fr" ? `Enregistrée ${n} fois` : `Saved ${n} times`;
}

/** One line for a repeated record: the detail, the answer, the four parts of the record and how often it was saved. */
export function repeatLine(g: RepeatGroup, locale: Locale): string {
  const colon = locale === "fr" ? `${NB}:` : ":";
  return `${t(COPY.facts[g.key], locale)}${colon} ${t(COPY.values[g.value], locale)}. ${recordLine(g.provenance, locale)}. ${timesSaved(g.noteIds.length, locale)}.`;
}

const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

export function repeatsToText(list: readonly PlaceRepeats[], locale: Locale, today: Date): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(COPY.repeats.title, l);
  const lines: string[] = [title, rule(title), "", t(COPY.repeats.intro, l), t(COPY.repeats.oneRecord, l), ""];
  if (list.length === 0) lines.push(t(COPY.repeats.none, l), "");
  else lines.push(`${t(COPY.repeats.extra, l)}${colon} ${extraCopies(list)}`, "");
  for (const p of list) {
    lines.push(p.place.name, rule(p.place.name, "-"));
    if (p.place.address) lines.push(p.place.address);
    for (const g of p.groups) lines.push(`- ${repeatLine(g, l)}`);
    lines.push("");
  }
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function repeatsFilename(today: Date, locale: Locale): string {
  return `${locale === "fr" ? "donnees-en-double" : "repeated-records"}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}

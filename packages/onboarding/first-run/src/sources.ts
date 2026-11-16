import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, STALE_AFTER_MONTHS, monthsSince } from "./facts";
import type { Note } from "./model";

/**
 * Where the details in the notes come from. Every Yes or No is saved with a
 * source, an open licence and a date. This module adds them up so a person can
 * see which sources their notes lean on, under which licences, and how old
 * the records are. It records where details came from. It does not say that
 * any source is right: nothing here is a check of a detail.
 */
export interface SourceRow {
  readonly source: string;
  /** Licences used by this source's details, sorted. */
  readonly licences: readonly string[];
  readonly details: number;
  readonly yes: number;
  readonly no: number;
  /** Oldest and newest recorded date, ISO. */
  readonly oldest: string;
  readonly newest: string;
  /** Details recorded at least STALE_AFTER_MONTHS months ago. */
  readonly old: number;
  /** Places (by note) that have at least one detail from this source. */
  readonly notes: number;
}

export interface SourcesReport {
  readonly rows: readonly SourceRow[];
  /** Details with a Yes or No, which always has a source, licence and date. */
  readonly recorded: number;
  /** Details with no record. They stay Unknown. */
  readonly unknown: number;
  readonly notes: number;
  readonly licences: readonly string[];
  readonly oldest: string | undefined;
  readonly newest: string | undefined;
}

interface Acc {
  licences: Set<string>;
  yes: number;
  no: number;
  oldest: string;
  newest: string;
  old: number;
  notes: Set<string>;
}

export function collectSources(notes: readonly Note[], today: Date): SourcesReport {
  const by = new Map<string, Acc>();
  let unknown = 0;
  let recorded = 0;
  const allLicences = new Set<string>();
  let oldest: string | undefined;
  let newest: string | undefined;
  for (const n of notes) {
    for (const f of n.facts) {
      if (f.value === "unknown" || !f.provenance) {
        unknown++;
        continue;
      }
      recorded++;
      const p = f.provenance;
      allLicences.add(p.licence);
      oldest = oldest === undefined || p.recordedOn < oldest ? p.recordedOn : oldest;
      newest = newest === undefined || p.recordedOn > newest ? p.recordedOn : newest;
      const a = by.get(p.source) ?? { licences: new Set<string>(), yes: 0, no: 0, oldest: p.recordedOn, newest: p.recordedOn, old: 0, notes: new Set<string>() };
      a.licences.add(p.licence);
      if (f.value === "yes") a.yes++;
      else a.no++;
      if (p.recordedOn < a.oldest) a.oldest = p.recordedOn;
      if (p.recordedOn > a.newest) a.newest = p.recordedOn;
      if (monthsSince(p.recordedOn, today) >= STALE_AFTER_MONTHS) a.old++;
      a.notes.add(n.id);
      by.set(p.source, a);
    }
  }
  const rows: SourceRow[] = Array.from(by, ([source, a]) => ({
    source,
    licences: [...a.licences].sort(),
    details: a.yes + a.no,
    yes: a.yes,
    no: a.no,
    oldest: a.oldest,
    newest: a.newest,
    old: a.old,
    notes: a.notes.size,
  })).sort((a, b) => b.details - a.details || a.source.localeCompare(b.source));
  return { rows, recorded, unknown, notes: notes.length, licences: [...allLicences].sort(), oldest, newest };
}

/** The name of a source in the person's language. Only the App's own source label is translated. */
export function sourceName(source: string, locale: Locale): string {
  return source === CONTRIBUTOR_SOURCE && locale === "fr" ? "Rapport d’un contributeur" : source;
}

/** Details the notes could hold in all: every note has one slot per detail. */
export function detailSlots(notes: readonly Note[]): number {
  return notes.length * FACT_KEYS.length;
}

/** A plain text version of the report, for printing or keeping. French keeps a no-break space before colons. */
export function sourcesToText(report: SourcesReport, locale: Locale): string {
  const l = locale;
  const colon = l === "fr" ? "\u00A0:" : ":";
  const title = t(COPY.sources.title, l);
  const lines = [title, "=".repeat(Math.min(title.length, 72)), "", t(COPY.sources.notACheck, l), ""];
  lines.push(`${t(COPY.sources.recorded, l)}${colon} ${report.recorded}`);
  lines.push(`${t(COPY.sources.unknown, l)}${colon} ${report.unknown}`);
  if (report.licences.length > 0) lines.push(`${t(COPY.sources.licences, l)}${colon} ${report.licences.join(", ")}`);
  if (report.oldest && report.newest) lines.push(`${t(COPY.sources.range, l)}${colon} ${report.oldest} – ${report.newest}`);
  lines.push("");
  for (const r of report.rows) {
    lines.push(sourceName(r.source, l));
    lines.push(`  ${t(COPY.sources.details, l)}${colon} ${r.details} (${t(COPY.values.yes, l)} ${r.yes}, ${t(COPY.values.no, l)} ${r.no})`);
    lines.push(`  ${t(COPY.sources.licences, l)}${colon} ${r.licences.join(", ")}`);
    lines.push(`  ${t(COPY.sources.range, l)}${colon} ${r.oldest} – ${r.newest}`);
    if (r.old > 0) lines.push(`  ${t(COPY.sources.old, l)}${colon} ${r.old}`);
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Notes as if only one source had been recorded. Details from other sources
 * become Unknown rather than disappearing, so a place still has every slot.
 */
export function onlySource(notes: readonly Note[], source: string): Note[] {
  return notes.map((n) => ({
    ...n,
    facts: n.facts.map((f) => (f.provenance && f.provenance.source === source ? f : { key: f.key, value: "unknown" as const, provenance: undefined })),
  }));
}

/** Source names in the order of the report, so the buttons and the table agree. */
export function sourceNames(report: SourcesReport): string[] {
  return report.rows.map((r) => r.source);
}

/** "2025-03-01 – 2026-02-10", or just the one date when they are the same. */
export function rangeText(oldest: string, newest: string): string {
  return oldest === newest ? oldest : `${oldest} – ${newest}`;
}

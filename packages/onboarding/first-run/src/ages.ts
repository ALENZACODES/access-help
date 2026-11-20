import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { FACT_KEYS, STALE_AFTER_MONTHS, monthsSince, type FactKey } from "./facts";
import type { Place } from "./places";

/**
 * How old the records are: for each detail, how many records fall in each age
 * band. It counts records; it does not judge them. An old record is not shown
 * as wrong, and a detail with no record stays Unknown and is counted apart.
 */
export type AgeBand = "under3" | "under12" | "under24" | "over24";

export const AGE_BANDS: readonly AgeBand[] = ["under3", "under12", "under24", "over24"];

/** The band for an age in whole months. A date in the future counts as the newest band. */
export function bandOf(months: number): AgeBand {
  if (months < 3) return "under3";
  if (months < STALE_AFTER_MONTHS) return "under12";
  if (months < 24) return "under24";
  return "over24";
}

export type BandCounts = Readonly<Record<AgeBand, number>>;

export interface AgeRow {
  readonly key: FactKey;
  readonly bands: BandCounts;
  /** Every record for this detail, across all places. */
  readonly records: number;
  /** Places where this detail has no record. */
  readonly unknownPlaces: number;
  readonly newest: string | undefined;
  readonly oldest: string | undefined;
}

export interface AgesReport {
  readonly rows: readonly AgeRow[];
  readonly totals: BandCounts;
  readonly records: number;
  readonly places: number;
  /** Records a year old or more. */
  readonly old: number;
}

const zero = (): Record<AgeBand, number> => ({ under3: 0, under12: 0, under24: 0, over24: 0 });

export function agesReport(places: readonly Place[], today: Date): AgesReport {
  const totals = zero();
  const rows: AgeRow[] = FACT_KEYS.map((key) => {
    const bands = zero();
    let unknownPlaces = 0;
    let newest: string | undefined;
    let oldest: string | undefined;
    for (const place of places) {
      const r = place.resolutions[key];
      if (r.kind === "unknown") {
        unknownPlaces += 1;
        continue;
      }
      for (const o of r.observations) {
        const on = o.provenance.recordedOn;
        const band = bandOf(monthsSince(on, today));
        bands[band] += 1;
        totals[band] += 1;
        if (newest === undefined || on > newest) newest = on;
        if (oldest === undefined || on < oldest) oldest = on;
      }
    }
    return { key, bands, records: AGE_BANDS.reduce((n, b) => n + bands[b], 0), unknownPlaces, newest, oldest };
  });
  return {
    rows,
    totals,
    records: AGE_BANDS.reduce((n, b) => n + totals[b], 0),
    places: places.length,
    old: totals.under24 + totals.over24,
  };
}

/** True when every row and the totals add up. Used by tests and before the page is shown. */
export function agesConsistent(r: AgesReport): boolean {
  const rowsOk = r.rows.every((row) => AGE_BANDS.reduce((n, b) => n + row.bands[b], 0) === row.records);
  const totalsOk = AGE_BANDS.every((b) => r.rows.reduce((n, row) => n + row.bands[b], 0) === r.totals[b]);
  return rowsOk && totalsOk && r.rows.reduce((n, row) => n + row.records, 0) === r.records && r.old === r.totals.under24 + r.totals.over24;
}

export function bandLabel(band: AgeBand, locale: Locale): string {
  return t(COPY.ages[band], locale);
}

/** "2024-01-10 to 2026-09-09", one date when they are the same, or a dash when there is no record. */
export function ageRange(row: Pick<AgeRow, "oldest" | "newest">, locale: Locale): string {
  if (row.oldest === undefined || row.newest === undefined) return "–";
  if (row.oldest === row.newest) return row.oldest;
  return `${row.oldest} ${locale === "fr" ? "au" : "to"} ${row.newest}`;
}

const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

/** `extra` lines go just before the "made on" line, e.g. the list of old places. */
export function agesToText(report: AgesReport, locale: Locale, today: Date, extra: readonly string[] = []): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(COPY.ages.title, l);
  const lines: string[] = [title, rule(title), "", t(COPY.ages.intro, l), t(COPY.ages.notWrong, l), ""];
  lines.push(`${t(COPY.ages.records, l)}${colon} ${report.records}`, `${t(COPY.ages.oldRecords, l)}${colon} ${report.old}`, "");
  for (const row of report.rows) {
    const label = t(COPY.facts[row.key], l);
    lines.push(label, rule(label, "-"));
    for (const b of AGE_BANDS) lines.push(`- ${bandLabel(b, l)}${colon} ${row.bands[b]}`);
    lines.push(`- ${t(COPY.ages.total, l)}${colon} ${row.records}`);
    lines.push(`- ${t(COPY.ages.noRecord, l)}${colon} ${row.unknownPlaces}`);
    if (row.records > 0) lines.push(`- ${t(COPY.ages.range, l)}${colon} ${ageRange(row, l)}`);
    lines.push("");
  }
  lines.push(...extra);
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function agesFilename(today: Date, locale: Locale): string {
  return `${locale === "fr" ? "age-des-donnees" : "record-ages"}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}

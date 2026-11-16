import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";

/**
 * Place details as three-state values. "unknown" is a real state and is never
 * turned into "no" or "yes". A yes or no is only accepted with a recorded
 * source, an open licence and a valid date; otherwise it becomes unknown.
 */
export type Tri = "yes" | "no" | "unknown";
export type FactKey = keyof typeof COPY.facts;

export const FACT_KEYS: readonly FactKey[] = [
  "step-free-entry",
  "accessible-washroom",
  "automatic-door",
  "elevator",
];

/** Open licences accepted for recorded details. */
export const OPEN_LICENCES: readonly string[] = [
  "CC0-1.0",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "ODbL-1.0",
  "ODC-By-1.0",
  "OGL-Canada-2.0",
];

/** Provenance source recorded for details a person adds on this device. */
export const CONTRIBUTOR_SOURCE = "Contributor report";

export interface Provenance {
  readonly source: string;
  readonly licence: string;
  /** ISO date, YYYY-MM-DD. */
  readonly recordedOn: string;
}

export interface Fact {
  readonly key: FactKey;
  readonly value: Tri;
  readonly provenance: Provenance | undefined;
}

export interface Normalized {
  readonly fact: Fact;
  /** True when a yes/no was downgraded to unknown for missing provenance. */
  readonly coerced: boolean;
}

export function isIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function parseProvenance(raw: unknown): Provenance | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const source = o["source"];
  const licence = o["licence"];
  const recordedOn = o["recordedOn"];
  if (typeof source !== "string" || source.trim() === "") return undefined;
  if (typeof licence !== "string" || !OPEN_LICENCES.includes(licence)) return undefined;
  if (typeof recordedOn !== "string" || !isIsoDate(recordedOn)) return undefined;
  return { source: source.trim(), licence, recordedOn };
}

/** Never infers: anything not clearly yes/no with provenance is unknown. */
export function normalizeFact(key: FactKey, raw: unknown): Normalized {
  const unknown: Fact = { key, value: "unknown", provenance: undefined };
  if (!raw || typeof raw !== "object") return { fact: unknown, coerced: false };
  const o = raw as Record<string, unknown>;
  const value = o["value"];
  if (value !== "yes" && value !== "no") return { fact: unknown, coerced: false };
  const provenance = parseProvenance(o["provenance"]);
  if (!provenance) return { fact: unknown, coerced: true };
  return { fact: { key, value, provenance }, coerced: false };
}

/** Whole months from an ISO date to today (never negative). */
export function monthsSince(recordedOn: string, today: Date): number {
  const [y, m, d] = recordedOn.split("-").map(Number) as [number, number, number];
  let months = (today.getUTCFullYear() - y) * 12 + (today.getUTCMonth() + 1 - m);
  if (today.getUTCDate() < d) months -= 1;
  return Math.max(0, months);
}

/** Details older than this many months are flagged as possibly out of date. */
export const STALE_AFTER_MONTHS = 12;

export function ageText(months: number, locale: Locale): string {
  if (locale === "fr") {
    if (months < 1) return "ce mois-ci";
    return `il y a ${months} mois`;
  }
  if (months < 1) return "this month";
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export interface FactView {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

export function describeFact(fact: Fact, locale: Locale, today: Date): FactView {
  const label = t(COPY.facts[fact.key], locale);
  const value = t(COPY.values[fact.value], locale);
  const colon = locale === "fr" ? `${NB}: ` : ": ";
  if (fact.value === "unknown" || !fact.provenance) {
    return {
      label,
      value,
      detail: locale === "fr" ? "Aucune donnée enregistrée." : "No record.",
    };
  }
  const p = fact.provenance;
  const source = p.source === CONTRIBUTOR_SOURCE && locale === "fr" ? "Rapport d’un contributeur" : p.source;
  const months = monthsSince(p.recordedOn, today);
  const parts =
    locale === "fr"
      ? [
          `Source${colon}${source}.`,
          `Licence${colon}${p.licence}.`,
          `Saisi le ${p.recordedOn} (${ageText(months, locale)}).`,
        ]
      : [
          `Source${colon}${source}.`,
          `Licence${colon}${p.licence}.`,
          `Recorded on ${p.recordedOn} (${ageText(months, locale)}).`,
        ];
  if (months >= STALE_AFTER_MONTHS) {
    parts.push(locale === "fr" ? "Peut être périmé." : "May be out of date.");
  }
  return { label, value, detail: parts.join(" ") };
}

export interface Summary {
  readonly yes: number;
  readonly no: number;
  readonly unknown: number;
}

export function summarize(facts: readonly Fact[]): Summary {
  let yes = 0;
  let no = 0;
  let unknown = 0;
  for (const f of facts) {
    if (f.value === "yes") yes++;
    else if (f.value === "no") no++;
    else unknown++;
  }
  return { yes, no, unknown };
}

/**
 * Illustrative example for the "reading a place card" guide. It describes no
 * real place. Source and licence are those of this package's own text.
 */
export const EXAMPLE_PROVENANCE: Provenance = {
  source: "Illustrative example written for the App",
  licence: "CC0-1.0",
  recordedOn: "2026-11-15",
};

export function exampleFacts(): Fact[] {
  const p = EXAMPLE_PROVENANCE;
  return [
    normalizeFact("step-free-entry", { value: "yes", provenance: p }).fact,
    normalizeFact("accessible-washroom", { value: "no", provenance: p }).fact,
    // Not recorded: stays unknown.
    normalizeFact("automatic-door", undefined).fact,
    // A yes with no provenance is downgraded to unknown.
    normalizeFact("elevator", { value: "yes" }).fact,
  ];
}

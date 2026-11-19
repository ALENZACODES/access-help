import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { CONTRIBUTOR_SOURCE, type Provenance } from "./facts";

/**
 * Every recorded detail carries a source, an open licence, a date and a tier.
 * The first three are stored with the record. The tier is not stored: records
 * kept on this device have not been reviewed by anyone, so they are all tier 0,
 * and this file is the one place that says so. Nothing here raises a tier.
 */
export const RECORD_TIER = 0;
export type RecordTier = typeof RECORD_TIER;

/** Where a record came from: a person's report on a device, or a source that is named in the record. */
export type RecordKind = "person" | "named-source";

export const RECORD_KINDS: readonly RecordKind[] = ["person", "named-source"];

export function recordKind(p: Pick<Provenance, "source">): RecordKind {
  return p.source === CONTRIBUTOR_SOURCE ? "person" : "named-source";
}

/** The tier of a record on this device. Always 0: the App has no way to review a record here. */
export function recordTier(_p: Provenance): RecordTier {
  return RECORD_TIER;
}

/** "Tier 0, not reviewed". */
export function tierLabel(locale: Locale): string {
  return t(COPY.tier.label, locale);
}

export function kindLabel(kind: RecordKind, locale: Locale): string {
  return t(kind === "person" ? COPY.tier.person : COPY.tier.namedSource, locale);
}

/** The source as shown to a person: the contributor source has a French name, any other source is shown as recorded. */
export function shownSource(source: string, locale: Locale): string {
  return source === CONTRIBUTOR_SOURCE ? t(COPY.tier.contributor, locale) : source;
}

export interface RecordParts {
  readonly source: string;
  readonly licence: string;
  readonly date: string;
  readonly tier: string;
  readonly kind: string;
}

/** The four things every record shows, plus its kind, as text for one language. */
export function recordParts(p: Provenance, locale: Locale): RecordParts {
  return {
    source: shownSource(p.source, locale),
    licence: p.licence,
    date: p.recordedOn,
    tier: tierLabel(locale),
    kind: kindLabel(recordKind(p), locale),
  };
}

/** One line for plain text: source, licence, date and tier, in that order. */
export function recordLine(p: Provenance, locale: Locale): string {
  const r = recordParts(p, locale);
  return [r.source, r.licence, r.date, r.tier].join(" · ");
}

/** True when a line of text names all four parts of a record. Used by tests and the page audit. */
export function hasAllParts(text: string, p: Provenance, locale: Locale): boolean {
  const r = recordParts(p, locale);
  return [r.source, r.licence, r.date, r.tier].every((part) => text.includes(part));
}

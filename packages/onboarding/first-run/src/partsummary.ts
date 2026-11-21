import type { Locale } from "../../switch-first/src/index";
import { FACT_KEYS, STALE_AFTER_MONTHS, monthsSince, type FactKey } from "./facts";
import { foldText } from "./filter";
import { hasOpenDetail, placesExport, type StreetFile } from "./filestreets";
import { csvField, guardCell } from "./notes-csv";
import type { Place } from "./places";
import { parseStreet, postalArea } from "./streets";

/**
 * "Compare parts of a file": up to four parts of one notes export, each named
 * by text its places' addresses hold (a street, a postal area), side by side
 * with the rest of the file. For each part and each detail, how many places
 * have Yes, No, no record (Unknown) or reports that differ. The counts say how
 * much is recorded where; they never say one part is better. Nothing is looked
 * up or saved.
 */

export const MAX_PARTS = 4;
export const PART_TEXT_MAX = 60;

export interface DetailCounts {
  readonly yes: number;
  readonly no: number;
  readonly unknown: number;
  readonly differ: number;
}

export interface PartSummary {
  /** The text as typed, trimmed; undefined for the rest of the file. */
  readonly text: string | undefined;
  readonly places: readonly Place[];
  readonly perDetail: Readonly<Record<FactKey, DetailCounts>>;
  /** Details with a record (Yes, No or differing reports) over all places and details. */
  readonly recorded: number;
  /** Recorded details (Yes or No, reports agreeing) whose newest report is a year old or more. */
  readonly yearOld: number;
  /** Who recorded the part's Yes and No, most records first, then by name. */
  readonly sources: ReadonlyArray<{ readonly source: string; readonly records: number }>;
  /** The newest and oldest report at any place in the part. */
  readonly newest: string | undefined;
  readonly oldest: string | undefined;
}

export interface PartsReport {
  readonly parts: readonly PartSummary[];
  /** Places in none of the parts. */
  readonly rest: PartSummary;
  /** Places in two parts or more; they are counted in each. */
  readonly inSeveral: number;
}

export type PartProblem = "long" | "repeat" | "none-match";

export interface PartsCheck {
  /** The texts that can be used, trimmed, in the order typed, empty boxes skipped. */
  readonly texts: readonly string[];
  /** Problems by box index. */
  readonly problems: Readonly<Record<number, PartProblem>>;
  /** True when every box is empty. */
  readonly empty: boolean;
}

function squash(s: string): string {
  return foldText(s).replace(/[^a-z0-9]+/g, " ").trim();
}

/** True when the place's address holds the text (case, accents and punctuation do not matter). */
export function inPart(place: Place, text: string): boolean {
  const want = squash(text);
  return want !== "" && squash(place.address ?? "").includes(want);
}

/** Checks the boxes: each text at most 60 characters, not the same as an earlier one, and held by at least one address. */
export function checkParts(file: StreetFile, boxes: readonly string[]): PartsCheck {
  const problems: Record<number, PartProblem> = {};
  const texts: string[] = [];
  const seen = new Set<string>();
  boxes.slice(0, MAX_PARTS).forEach((raw, i) => {
    const text = raw.trim();
    if (text === "") return;
    if (text.length > PART_TEXT_MAX) problems[i] = "long";
    else if (seen.has(squash(text)) || squash(text) === "") problems[i] = "repeat";
    else if (!file.places.some((p) => inPart(p, text))) problems[i] = "none-match";
    else {
      seen.add(squash(text));
      texts.push(text);
    }
  });
  return { texts, problems, empty: boxes.every((b) => b.trim() === "") };
}

/** The oldest and newest report on any detail at a place. */
function reportDates(place: Place): { oldest: string | undefined; newest: string | undefined } {
  let oldest: string | undefined;
  let newest: string | undefined;
  for (const k of FACT_KEYS) {
    const r = place.resolutions[k];
    if (r.kind === "unknown") continue;
    for (const o of r.observations) {
      const d = o.provenance.recordedOn;
      if (newest === undefined || d > newest) newest = d;
      if (oldest === undefined || d < oldest) oldest = d;
    }
  }
  return { oldest, newest };
}

/** Counts for a set of places. `today` decides which records are a year old or more. */
export function summarize(text: string | undefined, places: readonly Place[], today: Date): PartSummary {
  const perDetail = Object.fromEntries(FACT_KEYS.map((k) => [k, { yes: 0, no: 0, unknown: 0, differ: 0 }])) as Record<FactKey, { yes: number; no: number; unknown: number; differ: number }>;
  let recorded = 0;
  let yearOld = 0;
  const bySource = new Map<string, number>();
  let newest: string | undefined;
  let oldest: string | undefined;
  for (const p of places) {
    for (const k of FACT_KEYS) {
      const r = p.resolutions[k];
      const c = perDetail[k];
      if (r.kind === "unknown") c.unknown++;
      else {
        recorded++;
        for (const o of r.observations) bySource.set(o.provenance.source, (bySource.get(o.provenance.source) ?? 0) + 1);
        if (r.kind === "differ") c.differ++;
        else {
          if (r.value === "yes") c.yes++;
          else c.no++;
          // Observations are newest first.
          const first = r.observations[0];
          if (first && monthsSince(first.provenance.recordedOn, today) >= STALE_AFTER_MONTHS) yearOld++;
        }
      }
    }
    const { oldest: o, newest: n } = reportDates(p);
    if (n !== undefined && (newest === undefined || n > newest)) newest = n;
    if (o !== undefined && (oldest === undefined || o < oldest)) oldest = o;
  }
  const sources = [...bySource].map(([source, records]) => ({ source, records })).sort((a, b) => b.records - a.records || a.source.localeCompare(b.source));
  return { text, places, perDetail, recorded, yearOld, sources, newest, oldest };
}

/** The parts and the rest of the file. Call with texts from checkParts. */
export function partsReport(file: StreetFile, texts: readonly string[], today: Date): PartsReport {
  const parts = texts.map((t) => summarize(t, file.places.filter((p) => inPart(p, t)), today));
  const counted = file.places.map((p) => texts.filter((t) => inPart(p, t)).length);
  const rest = summarize(
    undefined,
    file.places.filter((_, i) => counted[i] === 0),
    today,
  );
  return { parts, rest, inSeveral: counted.filter((n) => n > 1).length };
}

/** Share of details with a record, as a whole percent, rounded down so 99.6 % never reads as everything. */
export function recordedPercent(s: PartSummary): number {
  const slots = s.places.length * FACT_KEYS.length;
  return slots === 0 ? 0 : Math.floor((s.recorded * 100) / slots);
}

/** The postal areas written in the file's addresses, most places first, then by name. */
export function postalAreasIn(file: StreetFile, locale: Locale): Array<{ area: string; places: number }> {
  const by = new Map<string, number>();
  for (const p of file.places) {
    const a = postalArea(p.address);
    if (a) by.set(a, (by.get(a) ?? 0) + 1);
  }
  const collator = new Intl.Collator(locale, { numeric: true });
  return [...by].map(([area, places]) => ({ area, places })).sort((a, b) => b.places - a.places || collator.compare(a.area, b.area));
}

/** The street as an address writes it: the text before the first comma, without the house number or unit. */
export function writtenStreet(address: string | undefined): string | undefined {
  if (!address || !parseStreet(address)) return undefined;
  const first = (address.split(",")[0] ?? "").trim();
  const street = first.replace(/^\s*(?:\d+[A-Za-z]?-)?\d+[A-Za-z]?\s+/, "").trim();
  return street === "" ? undefined : street;
}

/**
 * The streets of the file, as their places write them, with how many places'
 * addresses hold that text: the text the "largest streets" button types, and
 * exactly what the comparison will find for it. Spellings group by the
 * street, so "King St W" and "King Street West" count as one street, written
 * the way most of its places write it.
 */
export function streetsIn(file: StreetFile, locale: Locale): Array<{ street: string; places: number }> {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const by = new Map<string, Map<string, number>>();
  for (const p of file.places) {
    const key = parseStreet(p.address)?.key;
    const written = writtenStreet(p.address);
    if (key === undefined || written === undefined) continue;
    const m = by.get(key) ?? new Map<string, number>();
    m.set(written, (m.get(written) ?? 0) + 1);
    by.set(key, m);
  }
  return [...by.values()]
    .map((m) => [...m].sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]))[0]?.[0] ?? "")
    .filter((street) => street !== "")
    .map((street) => ({ street, places: file.places.filter((p) => inPart(p, street)).length }))
    .sort((a, b) => b.places - a.places || collator.compare(a.street, b.street));
}

/** The places of a part with something to look at: a detail with no record, or reports that differ. */
export function openPlaces(s: PartSummary): Place[] {
  return s.places.filter(hasOpenDetail);
}

/** The notes of a part's places. */
export function partNotesFile(s: PartSummary, today: Date): string {
  return placesExport(s.places, today);
}

/** The columns of the report's CSV. "part" is the text typed, empty for the rest of the file. */
export const PARTS_CSV_COLUMNS = ["part", "places", "detail", "yes", "no", "no_record", "reports_differ", "year_old_or_more"] as const;

/** One row per part and detail, the rest of the file last, guarded like the App's own CSV. */
export function partsCsv(r: PartsReport, today: Date): string {
  const rows: string[][] = [[...PARTS_CSV_COLUMNS]];
  for (const s of [...r.parts, r.rest])
    for (const k of FACT_KEYS) {
      const c = s.perDetail[k];
      const old = s.places.filter((p) => {
        const res = p.resolutions[k];
        const first = res.kind === "agree" ? res.observations[0] : undefined;
        return first !== undefined && monthsSince(first.provenance.recordedOn, today) >= STALE_AFTER_MONTHS;
      }).length;
      rows.push([s.text ?? "", String(s.places.length), k, String(c.yes), String(c.no), String(c.unknown), String(c.differ), String(old)]);
    }
  return `\uFEFF${rows.map((x) => x.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

import { FACT_KEYS, type FactKey } from "./facts";
import { looksLikeEmail, looksLikePhone } from "./form";
import type { StreetFile } from "./filestreets";
import { collectLicences, type LicenceRow } from "./licences";
import { FIRST_LIMITS, inArea } from "./lookfirst";
import { LIMITS, hasControlChars, type Note } from "./model";
import { csvField, guardCell } from "./notes-csv";
import { placeId, type Place } from "./places";
import { RECORD_TIER, recordKind, type RecordKind } from "./tier";

/**
 * "Prepare a file to publish": a notes export laid out for someone outside
 * the App, such as an open-data portal or a partner, as one CSV with a row
 * for each record and a text that explains it: every column and value, the
 * details, the sources and licences to credit, the dates, and that no record
 * has been reviewed (tier 0). It adds nothing to a record and leaves out what
 * it cannot stand behind: records dated after today, and the notes' own text
 * unless the person asks for it (and never when it holds what looks like an
 * email address or phone number).
 */

export type DictLanguage = "en" | "fr" | "both";
export const DICT_LANGUAGES: readonly DictLanguage[] = ["en", "fr", "both"];

export function isDictLanguage(s: string | null | undefined): s is DictLanguage {
  return s === "en" || s === "fr" || s === "both";
}

export const TITLE_MAX = LIMITS.placeName;

/** One row for each record, or one row for each place with a group of columns for each detail. */
export type Layout = "records" | "places";
export const LAYOUTS: readonly Layout[] = ["records", "places"];

export function isLayout(s: string | null | undefined): s is Layout {
  return s === "records" || s === "places";
}

export interface PublishOptions {
  /** A title for the dataset; optional. */
  readonly title: string;
  readonly language: DictLanguage;
  /** Add a row for each detail of each place with no record, valued "unknown". */
  readonly withUnknown: boolean;
  /** Add each note's own text to its rows. */
  readonly withNoteText: boolean;
  readonly layout: Layout;
  /** Only places whose address holds this text; empty for every place. */
  readonly area: string;
  /** The licences whose records go in; undefined for every licence. */
  readonly licences: readonly string[] | undefined;
}

export type PublishProblem = "title-long" | "title-control" | "area-long" | "no-licence" | "personal-text";

export interface DatasetRow {
  readonly placeId: string;
  readonly placeName: string;
  readonly address: string;
  readonly key: FactKey;
  readonly value: "yes" | "no" | "unknown";
  readonly source: string;
  readonly licence: string;
  readonly recordedOn: string;
  /** "0" for a record; empty for an Unknown row. */
  readonly tier: string;
  readonly kind: RecordKind | "";
  readonly noteId: string;
  readonly noteText: string;
}

export interface PublishChecks {
  readonly places: number;
  readonly notes: number;
  /** Yes and No records, dated on or before today. */
  readonly records: number;
  /** Records dated after today, left out. */
  readonly future: number;
  /** Details of places with no record. */
  readonly unknown: number;
  readonly notesWithText: number;
  /** Notes whose own text looks like it holds an email address or a phone number. */
  readonly personalNotes: number;
  readonly placesNoAddress: number;
  readonly oldest: string | undefined;
  readonly newest: string | undefined;
}

export function isPersonal(text: string | undefined): boolean {
  return text !== undefined && (looksLikeEmail(text) || looksLikePhone(text));
}

const todayIso = (d: Date): string => d.toISOString().slice(0, 10);

export function publishChecks(file: StreetFile, today: Date): PublishChecks {
  const day = todayIso(today);
  const notes = file.places.flatMap((p) => [...p.notes]);
  let records = 0;
  let future = 0;
  let oldest: string | undefined;
  let newest: string | undefined;
  for (const n of notes)
    for (const f of n.facts) {
      if (f.value === "unknown" || !f.provenance) continue;
      const on = f.provenance.recordedOn;
      if (on > day) {
        future += 1;
        continue;
      }
      records += 1;
      if (oldest === undefined || on < oldest) oldest = on;
      if (newest === undefined || on > newest) newest = on;
    }
  // A detail whose only records are dated after today has no record yet, as in the dataset.
  const recordedBy = (p: Place, k: FactKey): boolean => {
    const r = p.resolutions[k];
    return r.kind !== "unknown" && r.observations.some((o) => o.provenance.recordedOn <= day);
  };
  const unknown = file.places.reduce((n, p) => n + FACT_KEYS.filter((k) => !recordedBy(p, k)).length, 0);
  return {
    places: file.places.length,
    notes: notes.length,
    records,
    future,
    unknown,
    notesWithText: notes.filter((n) => (n.note ?? "").trim() !== "").length,
    personalNotes: notes.filter((n) => isPersonal(n.note)).length,
    placesNoAddress: file.places.filter((p) => !p.address).length,
    oldest,
    newest,
  };
}

/** Problems with the options, in the order of the form. */
export function publishProblems(o: PublishOptions, checks: PublishChecks): PublishProblem[] {
  const out: PublishProblem[] = [];
  const title = o.title.trim();
  if (title.length > TITLE_MAX) out.push("title-long");
  else if (hasControlChars(title)) out.push("title-control");
  if (o.area.trim().length > FIRST_LIMITS.area) out.push("area-long");
  if (o.licences !== undefined && o.licences.length === 0) out.push("no-licence");
  // Rows per place hold no note text, so the check is only for rows per record.
  if (o.withNoteText && o.layout === "records" && checks.personalNotes > 0) out.push("personal-text");
  return out;
}

/** True when a record goes in the dataset: dated on or before the day, under a licence chosen. */
function included(p: { readonly recordedOn: string; readonly licence: string }, o: Pick<PublishOptions, "licences">, day: string): boolean {
  return p.recordedOn <= day && (o.licences === undefined || o.licences.includes(p.licence));
}

/** The places of the file in the area chosen, in name order, then address. */
export function scopedPlaces(file: StreetFile, o: Pick<PublishOptions, "area">): Place[] {
  return file.places.filter((p) => inArea(p, o.area.trim())).sort((a, b) => a.name.localeCompare(b.name) || (a.address ?? "").localeCompare(b.address ?? ""));
}

/** Records of the places in the area left out because their licence was not chosen, by licence. */
export function licenceLeftOut(file: StreetFile, o: Pick<PublishOptions, "area" | "licences">, today: Date): Array<{ readonly licence: string; readonly records: number }> {
  const chosen = o.licences;
  if (chosen === undefined) return [];
  const day = todayIso(today);
  const by = new Map<string, number>();
  for (const p of scopedPlaces(file, o))
    for (const n of p.notes)
      for (const f of n.facts) {
        if (f.value === "unknown" || !f.provenance || f.provenance.recordedOn > day || chosen.includes(f.provenance.licence)) continue;
        by.set(f.provenance.licence, (by.get(f.provenance.licence) ?? 0) + 1);
      }
  return [...by.entries()].map(([licence, records]) => ({ licence, records })).sort((a, b) => a.licence.localeCompare(b.licence));
}

/** The licences of the file's records, in name order, for the person to choose from. */
export function fileLicences(file: StreetFile): string[] {
  const found = new Set<string>();
  for (const p of file.places) for (const n of p.notes) for (const f of n.facts) if (f.value !== "unknown" && f.provenance) found.add(f.provenance.licence);
  return [...found].sort((a, b) => a.localeCompare(b));
}

function placeRows(place: Place, o: PublishOptions, day: string): DatasetRow[] {
  const base = { placeId: placeId({ placeName: place.name, address: place.address }), placeName: place.name, address: place.address ?? "" };
  const rows: DatasetRow[] = [];
  const recorded = new Set<FactKey>();
  // Notes newest first; within a note, details in the App's order.
  for (const n of place.notes)
    for (const f of n.facts) {
      if (f.value === "unknown" || !f.provenance || !included(f.provenance, o, day)) continue;
      recorded.add(f.key);
      rows.push({
        ...base,
        key: f.key,
        value: f.value,
        source: f.provenance.source,
        licence: f.provenance.licence,
        recordedOn: f.provenance.recordedOn,
        tier: String(RECORD_TIER),
        kind: recordKind(f.provenance),
        noteId: n.id,
        noteText: o.withNoteText ? (n.note ?? "").trim() : "",
      });
    }
  if (o.withUnknown)
    for (const key of FACT_KEYS)
      if (!recorded.has(key)) rows.push({ ...base, key, value: "unknown", source: "", licence: "", recordedOn: "", tier: "", kind: "", noteId: "", noteText: "" });
  const order = (r: DatasetRow): number => FACT_KEYS.indexOf(r.key);
  return rows.sort((a, b) => order(a) - order(b) || (a.recordedOn < b.recordedOn ? 1 : a.recordedOn > b.recordedOn ? -1 : 0) || a.noteId.localeCompare(b.noteId));
}

/** Every row of the dataset: places in name order, then address; details in the App's order; newest record first. */
export function datasetRows(file: StreetFile, o: PublishOptions, today: Date): DatasetRow[] {
  const day = todayIso(today);
  return scopedPlaces(file, o).flatMap((p) => placeRows(p, o, day));
}

/** What one place's records say about one detail, in one row per place. */
export interface PlaceCell {
  readonly state: "yes" | "no" | "differ" | "unknown";
  readonly records: number;
  readonly newest: string;
}

export interface PlaceRow {
  readonly placeId: string;
  readonly placeName: string;
  readonly address: string;
  readonly cells: Readonly<Record<FactKey, PlaceCell>>;
}

/** One row per place, built from the same records as the rows per record: same area, licences and day. */
export function placeLayoutRows(rows: readonly DatasetRow[]): PlaceRow[] {
  const by = new Map<string, { placeId: string; placeName: string; address: string; records: DatasetRow[] }>();
  for (const r of rows) {
    const e = by.get(r.placeId) ?? { placeId: r.placeId, placeName: r.placeName, address: r.address, records: [] };
    if (r.value !== "unknown") e.records.push(r);
    by.set(r.placeId, e);
  }
  return [...by.values()].map((e) => {
    const cells = {} as Record<FactKey, PlaceCell>;
    for (const key of FACT_KEYS) {
      const mine = e.records.filter((r) => r.key === key);
      const values = new Set(mine.map((r) => r.value));
      const state = mine.length === 0 ? "unknown" : values.size > 1 ? "differ" : (mine[0]?.value as "yes" | "no");
      cells[key] = { state, records: mine.length, newest: mine.reduce((m, r) => (r.recordedOn > m ? r.recordedOn : m), "") };
    }
    return { placeId: e.placeId, placeName: e.placeName, address: e.address, cells };
  });
}

/** place_id, place_name, address, then for each detail: its state, its number of records and its newest record date. */
export function placeColumns(): string[] {
  return ["place_id", "place_name", "address", ...FACT_KEYS.flatMap((k) => [k, `${k}_records`, `${k}_newest`])];
}

export function placesCsv(rows: readonly PlaceRow[]): string {
  const out: string[][] = [placeColumns()];
  for (const r of rows) out.push([r.placeId, r.placeName, r.address, ...FACT_KEYS.flatMap((k) => [r.cells[k].state, String(r.cells[k].records), r.cells[k].newest])]);
  return `\uFEFF${out.map((row) => row.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

export const DATASET_COLUMNS = ["place_id", "place_name", "address", "detail", "value", "source", "licence", "recorded_on", "tier", "record_kind", "note_id"] as const;
export const NOTE_TEXT_COLUMN = "note_text";

export function datasetColumns(o: Pick<PublishOptions, "withNoteText">): string[] {
  return o.withNoteText ? [...DATASET_COLUMNS, NOTE_TEXT_COLUMN] : [...DATASET_COLUMNS];
}

/** The dataset as CSV with a byte order mark, CRLF line ends and guarded cells, like the App's own CSV. */
export function datasetCsv(rows: readonly DatasetRow[], o: Pick<PublishOptions, "withNoteText">): string {
  const out: string[][] = [datasetColumns(o)];
  for (const r of rows) {
    const cells = [r.placeId, r.placeName, r.address, r.key, r.value, r.source, r.licence, r.recordedOn, r.tier, r.kind, r.noteId];
    out.push(o.withNoteText ? [...cells, r.noteText] : cells);
  }
  return `\uFEFF${out.map((row) => row.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

/** The licences of the records published, with their sources, for credits: same area, licences and day as the rows. */
export function publishedLicences(file: StreetFile, today: Date, o: Pick<PublishOptions, "area" | "licences"> = { area: "", licences: undefined }): LicenceRow[] {
  const day = todayIso(today);
  const notes: Note[] = scopedPlaces(file, o).flatMap((p) =>
    p.notes.map((n) => ({ ...n, facts: n.facts.map((f) => (f.provenance && !included(f.provenance, o, day) ? { key: f.key, value: "unknown" as const, provenance: undefined } : f)) })),
  );
  return collectLicences(notes);
}

/** Records by source, most first, then by name. */
export function sourceCounts(rows: readonly DatasetRow[]): Array<{ readonly source: string; readonly records: number }> {
  const by = new Map<string, number>();
  for (const r of rows) if (r.value !== "unknown") by.set(r.source, (by.get(r.source) ?? 0) + 1);
  return [...by.entries()].map(([source, records]) => ({ source, records })).sort((a, b) => b.records - a.records || a.source.localeCompare(b.source));
}

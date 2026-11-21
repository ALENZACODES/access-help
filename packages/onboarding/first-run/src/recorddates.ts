import { exportNotes } from "./exchange";
import { FACT_KEYS, isIsoDate, type Fact, type FactKey } from "./facts";
import type { StreetFile } from "./filestreets";
import { parseNote, type Note } from "./model";
import { csvField, guardCell } from "./notes-csv";
import type { Place } from "./places";

/**
 * "Fix record dates": the records in a notes export dated after today. The
 * App leaves such a record out wherever it counts by date, as it cannot place
 * it in time; most are typing slips. For each one the person keeps it as it
 * is, picks a suggested date, types the right date, or sets the detail back
 * to Unknown, and gets a copy. A suggestion is only offered when one plain
 * slip (two digits of the year swapped, day and month swapped, the year one
 * too high) gives a real date on or before today; the App never picks one.
 */

export type SlipKind = "year-digits" | "day-month" | "year-high";
export const SLIP_KINDS: readonly SlipKind[] = ["year-digits", "day-month", "year-high"];

export interface DateSuggestion {
  readonly date: string;
  readonly slip: SlipKind;
}

export interface FutureRecord {
  /** Stable for the record: its note and detail. */
  readonly id: string;
  readonly place: Place;
  readonly note: Note;
  readonly key: FactKey;
  readonly value: "yes" | "no";
  readonly source: string;
  readonly licence: string;
  readonly recordedOn: string;
  readonly suggestions: readonly DateSuggestion[];
}

export type DateChoice = { readonly kind: "keep" } | { readonly kind: "date"; readonly date: string } | { readonly kind: "unknown" };

export const KEEP: DateChoice = { kind: "keep" };

export type DateProblem = "empty" | "not-date" | "after-today";

export interface DatesReport {
  readonly places: number;
  readonly records: number;
  /** Records dated after today, places in name order, details in the App's order. */
  readonly future: readonly FutureRecord[];
}

export interface FixedCopy {
  readonly notes: readonly Note[];
  /** Records given another date. */
  readonly redated: number;
  /** Records set back to Unknown. */
  readonly cleared: number;
  /** Records kept with their date after today. */
  readonly kept: number;
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);

export function recordId(noteId: string, key: FactKey): string {
  return `${noteId}|${key}`;
}

/** The dates one slip away from `date` that are real days on or before today, each once, in the order of SLIP_KINDS. */
export function suggestDates(date: string, today: Date): DateSuggestion[] {
  const day = iso(today);
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return [];
  const candidates: DateSuggestion[] = [
    { date: `${y.slice(0, 2)}${y[3] ?? ""}${y[2] ?? ""}-${m}-${d}`, slip: "year-digits" },
    { date: `${y}-${d}-${m}`, slip: "day-month" },
    { date: `${String(Number(y) - 1).padStart(4, "0")}-${m}-${d}`, slip: "year-high" },
  ];
  const seen = new Set<string>([date]);
  const out: DateSuggestion[] = [];
  for (const c of candidates) {
    if (seen.has(c.date) || !isIsoDate(c.date) || c.date > day) continue;
    seen.add(c.date);
    out.push(c);
  }
  return out;
}

export function futureRecords(file: StreetFile, today: Date): DatesReport {
  const day = iso(today);
  const out: FutureRecord[] = [];
  let records = 0;
  const places = [...file.places].sort((a, b) => a.name.localeCompare(b.name) || (a.address ?? "").localeCompare(b.address ?? ""));
  for (const place of places) {
    const mine: FutureRecord[] = [];
    for (const note of place.notes)
      for (const f of note.facts) {
        if (f.value === "unknown" || !f.provenance) continue;
        records += 1;
        if (f.provenance.recordedOn <= day) continue;
        mine.push({
          id: recordId(note.id, f.key),
          place,
          note,
          key: f.key,
          value: f.value,
          source: f.provenance.source,
          licence: f.provenance.licence,
          recordedOn: f.provenance.recordedOn,
          suggestions: suggestDates(f.provenance.recordedOn, today),
        });
      }
    mine.sort((a, b) => FACT_KEYS.indexOf(a.key) - FACT_KEYS.indexOf(b.key) || a.note.id.localeCompare(b.note.id));
    out.push(...mine);
  }
  return { places: file.places.length, records, future: out };
}

/** What is wrong with a typed date, if anything. */
export function dateProblem(typed: string, today: Date): DateProblem | undefined {
  const d = typed.trim();
  if (d === "") return "empty";
  if (!isIsoDate(d)) return "not-date";
  if (d > iso(today)) return "after-today";
  return undefined;
}

/**
 * The file's notes with the choices applied. A record given a date keeps its
 * value, source and licence; a record set back to Unknown loses its value
 * and provenance together, as the App never keeps one without the other.
 * A date that is not a real day on or before today is no fix, so that record
 * is kept. Each changed note goes through the App's own note reader, and the
 * copy holds it only when every change came through as chosen (the reader
 * turns a Yes or No it cannot date into Unknown); otherwise the note stays as
 * it was and its records count as kept.
 */
export function applyDates(file: StreetFile, r: DatesReport, choices: ReadonlyMap<string, DateChoice>, today: Date): FixedCopy {
  const day = iso(today);
  const byNote = new Map<string, FutureRecord[]>();
  for (const f of r.future) byNote.set(f.note.id, [...(byNote.get(f.note.id) ?? []), f]);
  let redated = 0;
  let cleared = 0;
  let kept = 0;
  const notes: Note[] = [];
  for (const place of file.places)
    for (const n of place.notes) {
      const mine = byNote.get(n.id) ?? [];
      if (mine.length === 0) {
        notes.push(n);
        continue;
      }
      let dated = 0;
      let unknown = 0;
      const facts: Fact[] = n.facts.map((f) => {
        const c = choices.get(recordId(n.id, f.key)) ?? KEEP;
        if (!mine.some((x) => x.key === f.key) || !f.provenance || c.kind === "keep") return f;
        if (c.kind === "date" && (!isIsoDate(c.date) || c.date > day)) return f;
        if (c.kind === "unknown") {
          unknown += 1;
          return { key: f.key, value: "unknown" as const, provenance: undefined };
        }
        dated += 1;
        return { ...f, provenance: { ...f.provenance, recordedOn: c.date } };
      });
      const parsed = dated + unknown > 0 ? parseNote({ ...n, facts }) : undefined;
      const next = parsed && FACT_KEYS.every((k) => sameFact(parsed.facts.find((f) => f.key === k), facts.find((f) => f.key === k))) ? parsed : undefined;
      if (next) {
        notes.push(next);
        redated += dated;
        cleared += unknown;
        kept += mine.length - dated - unknown;
      } else {
        notes.push(n);
        kept += mine.length;
      }
    }
  return { notes, redated, cleared, kept };
}

function sameFact(a: Fact | undefined, b: Fact | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.key !== b.key || a.value !== b.value) return false;
  const p = a.provenance;
  const q = b.provenance;
  return p === q || (p !== undefined && q !== undefined && p.source === q.source && p.licence === q.licence && p.recordedOn === q.recordedOn);
}

export function fixedFile(c: FixedCopy, today: Date): string {
  return exportNotes([...c.notes], iso(today));
}

export interface DateChange {
  readonly record: FutureRecord;
  /** The record's new date, or "unknown" when the detail was set back to Unknown. */
  readonly to: string;
}

/**
 * What the copy actually holds that differs from the file, record by record,
 * in the list's order. Read from the copy itself, not from the choices, so a
 * choice the App did not apply is never shown as made.
 */
export function copyChanges(r: DatesReport, c: FixedCopy): DateChange[] {
  const out: DateChange[] = [];
  for (const f of r.future) {
    const now = c.notes.find((n) => n.id === f.note.id)?.facts.find((x) => x.key === f.key);
    if (!now) continue;
    if (now.value === "unknown") out.push({ record: f, to: "unknown" });
    else if (now.provenance && now.provenance.recordedOn !== f.recordedOn) out.push({ record: f, to: now.provenance.recordedOn });
  }
  return out;
}

export interface SourceDates {
  readonly source: string;
  /** Records from this source dated after today. */
  readonly records: number;
  /** Of those, how many have a suggested date. */
  readonly suggested: number;
  /** How many of its records each slip could explain. A record with two suggestions counts under both. */
  readonly slips: Readonly<Record<SlipKind, number>>;
}

/**
 * The records dated after today, by source, most first, then by source name.
 * Many from one source often mean one slip made the same way each time, such
 * as a survey entered with the wrong year; the person still decides each one.
 */
export function bySource(r: DatesReport): SourceDates[] {
  const out = new Map<string, { records: number; suggested: number; slips: Record<SlipKind, number> }>();
  for (const f of r.future) {
    const s = out.get(f.source) ?? { records: 0, suggested: 0, slips: { "year-digits": 0, "day-month": 0, "year-high": 0 } };
    s.records += 1;
    if (f.suggestions.length > 0) s.suggested += 1;
    for (const g of f.suggestions) s.slips[g.slip] += 1;
    out.set(f.source, s);
  }
  return [...out]
    .map(([source, s]) => ({ source, ...s }))
    .sort((a, b) => b.records - a.records || a.source.localeCompare(b.source));
}

/** The slip that explains the most of a source's records, when it explains more than one; ties go to the earlier slip. */
export function commonSlip(s: SourceDates): SlipKind | undefined {
  let best: SlipKind | undefined;
  for (const k of SLIP_KINDS) if (s.slips[k] > 1 && (best === undefined || s.slips[k] > s.slips[best])) best = k;
  return best;
}

export const DATES_CSV_COLUMNS = ["place_name", "address", "note_id", "detail", "value", "source", "licence", "recorded_on", "suggested_dates"] as const;

/** The records dated after today, with the suggested dates, guarded like the App's own CSV. */
export function datesCsv(r: DatesReport): string {
  const rows: string[][] = [[...DATES_CSV_COLUMNS]];
  for (const f of r.future)
    rows.push([f.place.name, f.place.address ?? "", f.note.id, f.key, f.value, f.source, f.licence, f.recordedOn, f.suggestions.map((s) => s.date).join(" ")]);
  return `\uFEFF${rows.map((row) => row.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

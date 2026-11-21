import { EXPORT_FORMAT, EXPORT_VERSION, exportNotes, type ImportError } from "./exchange";
import { FACT_KEYS, OPEN_LICENCES, isIsoDate, type FactKey } from "./facts";
import { looksLikeEmail, looksLikePhone } from "./form";
import { LIMITS, hasControlChars, parseNote, type Note } from "./model";
import { noteFlags, type NoteFlag } from "./notecheck";
import { sharedNotes } from "./share";

/**
 * "Check a notes file": one notes export is read the way the App reads it on
 * import, and every entry gets a plain account of what the App does with it.
 * An entry is either read as a note or left out, with each reason; inside a
 * note, a Yes or No without a source, an open licence and a valid date is read
 * as UNKNOWN, and the check says which part is missing. Nothing is saved and
 * nothing is sent. The App's own parser (parseNote) decides what is read, so
 * this page can never disagree with an import.
 */

/** Reasons the App leaves an entry out. */
export type EntryProblem =
  | "not-object"
  | "bad-id"
  | "no-name"
  | "name-too-long"
  | "name-control"
  | "bad-address"
  | "bad-note-text"
  | "bad-created-date"
  | "licence-not-open"
  | "duplicate-id"
  | "over-limit";

export const ENTRY_PROBLEMS: readonly EntryProblem[] = [
  "not-object",
  "bad-id",
  "no-name",
  "name-too-long",
  "name-control",
  "bad-address",
  "bad-note-text",
  "bad-created-date",
  "licence-not-open",
  "duplicate-id",
  "over-limit",
];

/** Why a Yes or No in a readable note is read as UNKNOWN. */
export type DropReason = "no-provenance" | "no-source" | "record-licence-not-open" | "bad-record-date";
export const DROP_REASONS: readonly DropReason[] = ["no-provenance", "no-source", "record-licence-not-open", "bad-record-date"];

/** Things in a readable note worth a look. None of them changes how the note is read. */
export type Notice = "future-date" | "repeated-detail" | "other-detail" | "odd-value" | "email-in-text" | "phone-in-text" | NoteFlag;
export const NOTICES: readonly Notice[] = ["email-in-text", "phone-in-text", "future-date", "repeated-detail", "other-detail", "odd-value", "empty", "old", "noAddress"];

export interface DroppedDetail {
  readonly key: FactKey;
  readonly value: "yes" | "no";
  readonly reasons: readonly DropReason[];
}

export interface EntryReport {
  /** Position in the file, from 1. */
  readonly position: number;
  /** The id and name as written, when they are text; shown so a person can find the entry. */
  readonly id: string | undefined;
  readonly name: string | undefined;
  /** Empty when the App reads the entry as a note. */
  readonly problems: readonly EntryProblem[];
  /** The note as the App reads it, when it is read. */
  readonly note: Note | undefined;
  readonly dropped: readonly DroppedDetail[];
  readonly notices: readonly Notice[];
}

export interface FileCheckTotals {
  readonly entries: number;
  readonly readable: number;
  readonly leftOut: number;
  /** Yes or No details read as UNKNOWN in readable notes. */
  readonly dropped: number;
  /** Readable notes whose own words hold an email address or a phone number. */
  readonly personal: number;
}

export interface FileCheck {
  readonly entries: readonly EntryReport[];
  /** The notes the App would bring in, in file order. */
  readonly readable: readonly Note[];
  readonly totals: FileCheckTotals;
  readonly exportedOn: string | undefined;
}

export type FileCheckResult = { readonly ok: true; readonly check: FileCheck } | { readonly ok: false; readonly error: ImportError };

/** The App reads at most this many entries of a file; the rest are left out. */
export const MAX_ENTRIES = LIMITS.notes * 2;
/** At most this many entries are reported one by one; the totals still count every entry. */
export const MAX_REPORTED = 500;

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Same rule as the App's optional text fields: absent, or text within the limit and without control characters. */
function optionalTextOk(v: unknown, max: number, newline: boolean): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (typeof v !== "string") return false;
  const t = v.trim();
  return t.length <= max && !hasControlChars(t, newline);
}

/** Every reason an entry is not a note, not only the first. */
export function entryProblems(raw: unknown): EntryProblem[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["not-object"];
  const o = raw as Record<string, unknown>;
  const out: EntryProblem[] = [];
  const id = o["id"];
  if (typeof id !== "string" || !ID_RE.test(id)) out.push("bad-id");
  const name = typeof o["placeName"] === "string" ? (o["placeName"] as string).trim() : "";
  if (name === "") out.push("no-name");
  else {
    if (name.length > LIMITS.placeName) out.push("name-too-long");
    if (hasControlChars(name)) out.push("name-control");
  }
  if (!optionalTextOk(o["address"], LIMITS.address, false)) out.push("bad-address");
  if (!optionalTextOk(o["note"], LIMITS.note, true)) out.push("bad-note-text");
  const created = o["createdOn"];
  if (typeof created !== "string" || !isIsoDate(created)) out.push("bad-created-date");
  const licence = o["licence"];
  if (typeof licence !== "string" || !OPEN_LICENCES.includes(licence)) out.push("licence-not-open");
  return out;
}

function factEntries(o: Record<string, unknown>): Array<Record<string, unknown>> {
  const list = Array.isArray(o["facts"]) ? (o["facts"] as unknown[]) : [];
  return list.filter((e): e is Record<string, unknown> => !!e && typeof e === "object" && !Array.isArray(e));
}

/** Why one Yes or No would be read as UNKNOWN; empty when it is kept. Mirrors parseProvenance. */
export function dropReasons(provenance: unknown): DropReason[] {
  if (!provenance || typeof provenance !== "object") return ["no-provenance"];
  const p = provenance as Record<string, unknown>;
  const out: DropReason[] = [];
  if (typeof p["source"] !== "string" || p["source"].trim() === "") out.push("no-source");
  if (typeof p["licence"] !== "string" || !OPEN_LICENCES.includes(p["licence"])) out.push("record-licence-not-open");
  if (typeof p["recordedOn"] !== "string" || !isIsoDate(p["recordedOn"])) out.push("bad-record-date");
  return out;
}

const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

/** Details and notices for an entry the App reads. The App uses the first entry for each detail. */
export function readDetails(raw: Record<string, unknown>, note: Note, today: Date): { dropped: DroppedDetail[]; notices: Notice[] } {
  const entries = factEntries(raw);
  const dropped: DroppedDetail[] = [];
  const notices = new Set<Notice>();
  const seen = new Set<string>();
  for (const e of entries) {
    const key = e["key"];
    if (typeof key !== "string" || !(FACT_KEYS as readonly string[]).includes(key)) {
      notices.add("other-detail");
      continue;
    }
    if (seen.has(key)) {
      notices.add("repeated-detail");
      continue;
    }
    seen.add(key);
    const value = e["value"];
    if (value !== "yes" && value !== "no") {
      if (value !== "unknown" && value !== undefined && value !== null) notices.add("odd-value");
      continue;
    }
    const reasons = dropReasons(e["provenance"]);
    if (reasons.length > 0) dropped.push({ key: key as FactKey, value, reasons });
  }
  const day = isoDay(today);
  for (const f of note.facts) if (f.provenance && f.provenance.recordedOn > day) notices.add("future-date");
  if (note.note !== undefined) {
    if (looksLikeEmail(note.note)) notices.add("email-in-text");
    if (looksLikePhone(note.note)) notices.add("phone-in-text");
  }
  for (const f of noteFlags(note, today)) notices.add(f);
  dropped.sort((a, b) => FACT_KEYS.indexOf(a.key) - FACT_KEYS.indexOf(b.key));
  return { dropped, notices: NOTICES.filter((n) => notices.has(n)) };
}

function textOrUndefined(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, LIMITS.placeName) : undefined;
}

/** Reads the file's text. File-level errors match the import's. */
export function checkFile(text: string, today: Date): FileCheckResult {
  if (text.trim() === "") return { ok: false, error: "empty" };
  if (text.length > LIMITS.importChars) return { ok: false, error: "too-large" };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "not-json" };
  }
  if (!data || typeof data !== "object") return { ok: false, error: "wrong-format" };
  const o = data as Record<string, unknown>;
  if (o["format"] !== EXPORT_FORMAT || !Array.isArray(o["notes"])) return { ok: false, error: "wrong-format" };
  if (o["version"] !== EXPORT_VERSION) return { ok: false, error: "wrong-version" };
  const list = o["notes"] as unknown[];
  const ids = new Set<string>();
  const entries: EntryReport[] = [];
  const readable: Note[] = [];
  let dropped = 0;
  let personal = 0;
  list.forEach((raw, i) => {
    const rec = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : undefined;
    const id = rec ? textOrUndefined(rec["id"]) : undefined;
    const name = rec ? textOrUndefined(rec["placeName"]) : undefined;
    let problems: EntryProblem[];
    let note: Note | undefined;
    if (i >= MAX_ENTRIES) problems = ["over-limit"];
    else {
      problems = entryProblems(raw);
      note = problems.length === 0 ? parseNote(raw) : undefined;
      if (note && ids.has(note.id)) {
        problems = ["duplicate-id"];
        note = undefined;
      }
    }
    let detail: { dropped: DroppedDetail[]; notices: Notice[] } = { dropped: [], notices: [] };
    if (note && rec) {
      ids.add(note.id);
      readable.push(note);
      detail = readDetails(rec, note, today);
      dropped += detail.dropped.length;
      if (detail.notices.includes("email-in-text") || detail.notices.includes("phone-in-text")) personal++;
    }
    if (entries.length < MAX_REPORTED) entries.push({ position: i + 1, id, name, problems, note, dropped: detail.dropped, notices: detail.notices });
  });
  const exportedOn = typeof o["exportedOn"] === "string" && isIsoDate(o["exportedOn"]) ? o["exportedOn"] : undefined;
  return {
    ok: true,
    check: {
      entries,
      readable,
      exportedOn,
      totals: { entries: list.length, readable: readable.length, leftOut: list.length - readable.length, dropped, personal },
    },
  };
}

/** Entries the App leaves out, in file order. */
export function leftOutEntries(c: FileCheck): EntryReport[] {
  return c.entries.filter((e) => e.problems.length > 0);
}

/** Readable notes with at least one Yes or No read as UNKNOWN. */
export function droppedEntries(c: FileCheck): EntryReport[] {
  return c.entries.filter((e) => e.note !== undefined && e.dropped.length > 0);
}

/** Readable notes with something worth a look. */
export function noticedEntries(c: FileCheck): EntryReport[] {
  return c.entries.filter((e) => e.note !== undefined && e.notices.length > 0);
}

/** How many reported entries carry each notice. */
export function noticeCounts(c: FileCheck): Record<Notice, number> {
  const out = Object.fromEntries(NOTICES.map((n) => [n, 0])) as Record<Notice, number>;
  for (const e of c.entries) for (const n of e.notices) out[n]++;
  return out;
}

/**
 * A new notes export holding only what the App reads: the readable notes, with
 * every Yes or No that lacked a source, licence or date already read as
 * UNKNOWN. With `withText` false, each note's own words are left out, for
 * sharing a file without them. The original file is not changed.
 */
export function cleanedCopy(c: FileCheck, today: Date, withText: boolean): string {
  const ids = c.readable.map((n) => n.id);
  return exportNotes(sharedNotes(c.readable, ids, withText), isoDay(today));
}

/** True when the cleaned copy would be the same notes as the file says: nothing left out and nothing read as UNKNOWN. */
export function fileIsClean(c: FileCheck): boolean {
  return c.totals.leftOut === 0 && c.totals.dropped === 0;
}

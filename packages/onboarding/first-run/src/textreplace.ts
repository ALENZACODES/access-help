import { exportNotes } from "./exchange";
import type { StreetFile } from "./filestreets";
import { LIMITS, hasControlChars, parseNote, type Note } from "./model";
import type { Locale } from "../../switch-first/src/index";
import { csvField, guardCell } from "./notes-csv";
import { groupPlaces, placeKey } from "./places";

/**
 * "Find and replace in notes": a plain find and replace over the place
 * names, addresses and note text of a notes file, made in a copy. It never
 * touches a record's answer, source, licence or date: those say what was
 * recorded and by whom, so they are not text to edit. Every change is shown
 * before and after, and the person can leave any of them out. A change that
 * would leave a field the App cannot keep (an empty place name, text too
 * long) is shown with the reason and cannot be made.
 */

export type ReplaceField = "name" | "address" | "note";
export const REPLACE_FIELDS: readonly ReplaceField[] = ["name", "address", "note"];

export const MAX_FIND = 100;
export const MAX_REPLACE = 200;

export interface ReplaceOptions {
  readonly find: string;
  readonly replace: string;
  readonly fields: readonly ReplaceField[];
  readonly matchCase: boolean;
  readonly wholeWords: boolean;
}

export const DEFAULT_REPLACE: ReplaceOptions = { find: "", replace: "", fields: REPLACE_FIELDS, matchCase: false, wholeWords: false };

export type OptionProblem = "find-empty" | "find-long" | "find-control" | "replace-long" | "replace-control" | "no-fields";
export const OPTION_PROBLEMS: readonly OptionProblem[] = ["find-empty", "find-long", "find-control", "replace-long", "replace-control", "no-fields"];

/** Why a change cannot be made: the field the App would not keep. */
export type HitProblem = "name-empty" | "too-long";

export interface Match {
  readonly start: number;
  readonly end: number;
}

export interface Hit {
  /** "name|n1", "address|n1" or "note|n1". */
  readonly id: string;
  readonly note: Note;
  readonly field: ReplaceField;
  readonly before: string;
  readonly after: string;
  readonly matches: readonly Match[];
  readonly problem: HitProblem | undefined;
}

export interface ReplaceReport {
  readonly notes: number;
  /** In the file's place order, then each note's fields in the order of REPLACE_FIELDS. */
  readonly hits: readonly Hit[];
  /** Matches across every hit. */
  readonly matches: number;
}

export interface ReplacedCopy {
  readonly notes: readonly Note[];
  /** Fields changed. */
  readonly fields: number;
  /** Matches replaced. */
  readonly replaced: number;
  /** Notes changed. */
  readonly notesChanged: number;
}

export interface ReplaceChange {
  readonly hit: Hit;
  /** The text in the copy; empty when an address or note text is now empty. */
  readonly to: string;
  /**
   * The note's new name and address are those of another place in the file,
   * so the App now reads them as one place with their records together.
   */
  readonly joins: boolean;
}

/** What is wrong with the options, every problem in the order of OPTION_PROBLEMS. */
export function optionProblems(o: ReplaceOptions): OptionProblem[] {
  const out: OptionProblem[] = [];
  if (o.find === "") out.push("find-empty");
  if (o.find.length > MAX_FIND) out.push("find-long");
  if (hasControlChars(o.find)) out.push("find-control");
  if (o.replace.length > MAX_REPLACE) out.push("replace-long");
  if (hasControlChars(o.replace)) out.push("replace-control");
  if (o.fields.length === 0) out.push("no-fields");
  return out;
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The pattern for the options: the text to find as written, ignoring case
 * unless asked; as a whole word, when asked, meaning no letter or digit just
 * before or after it. Accents always count: "cafe" does not find "café".
 */
export function findPattern(o: Pick<ReplaceOptions, "find" | "matchCase" | "wholeWords">): RegExp {
  const body = escapeRegExp(o.find);
  const source = o.wholeWords ? `(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])` : body;
  return new RegExp(source, `gu${o.matchCase ? "" : "i"}`);
}

export function matchesIn(text: string, o: Pick<ReplaceOptions, "find" | "matchCase" | "wholeWords">): Match[] {
  if (o.find === "") return [];
  return [...text.matchAll(findPattern(o))].map((m) => ({ start: m.index, end: m.index + m[0].length }));
}

/**
 * The text with every match replaced, the ends trimmed. The replacement is
 * used as written: "$1" is just "$1". When the words found are taken out,
 * the space they leave between two words is not doubled; no other spacing
 * changes.
 */
export function replaceIn(text: string, o: Pick<ReplaceOptions, "find" | "replace" | "matchCase" | "wholeWords">): string {
  if (o.find === "") return text;
  let out = "";
  let at = 0;
  for (const m of matchesIn(text, o)) {
    out += text.slice(at, m.start) + o.replace;
    at = m.end;
    if (o.replace === "" && /[ \t]$/.test(out) && /^[ \t]/.test(text.slice(at))) at += 1;
  }
  return (out + text.slice(at)).trim();
}

const fieldText = (n: Note, f: ReplaceField): string => (f === "name" ? n.placeName : f === "address" ? (n.address ?? "") : (n.note ?? ""));

/** Why the App would not keep the new text in this field, if it would not. */
export function hitProblem(field: ReplaceField, after: string): HitProblem | undefined {
  const s = after.trim();
  if (field === "name" && s === "") return "name-empty";
  const max = field === "name" ? LIMITS.placeName : field === "address" ? LIMITS.address : LIMITS.note;
  if (s.length > max) return "too-long";
  return undefined;
}

export function findHits(file: StreetFile, o: ReplaceOptions): ReplaceReport {
  const notes = file.places.flatMap((p) => p.notes);
  const hits: Hit[] = [];
  if (optionProblems(o).length > 0) return { notes: notes.length, hits, matches: 0 };
  for (const n of notes)
    for (const field of REPLACE_FIELDS) {
      if (!o.fields.includes(field)) continue;
      const before = fieldText(n, field);
      const matches = matchesIn(before, o);
      if (matches.length === 0) continue;
      const after = replaceIn(before, o);
      if (after === before) continue;
      hits.push({ id: `${field}|${n.id}`, note: n, field, before, after, matches, problem: hitProblem(field, after) });
    }
  return { notes: notes.length, hits, matches: hits.reduce((s, h) => s + h.matches.length, 0) };
}

/**
 * The file's notes with the accepted changes made. A change with a problem is
 * never made. Each changed note goes through the App's own note reader and
 * goes into the copy only when every changed field came through as shown and
 * nothing else changed; otherwise it stays as it was.
 */
export function applyReplace(file: StreetFile, r: ReplaceReport, accepted: ReadonlySet<string>): ReplacedCopy {
  const byNote = new Map<string, Hit[]>();
  for (const h of r.hits) if (accepted.has(h.id) && h.problem === undefined) byNote.set(h.note.id, [...(byNote.get(h.note.id) ?? []), h]);
  const notes: Note[] = [];
  let fields = 0;
  let replaced = 0;
  let notesChanged = 0;
  for (const n of file.places.flatMap((p) => p.notes)) {
    const mine = byNote.get(n.id);
    if (!mine) {
      notes.push(n);
      continue;
    }
    const get = (f: ReplaceField): string | undefined => mine.find((h) => h.field === f)?.after;
    const name = get("name");
    const address = get("address");
    const text = get("note");
    const want = {
      ...n,
      placeName: name ?? n.placeName,
      address: address === undefined ? n.address : address === "" ? undefined : address,
      note: text === undefined ? n.note : text === "" ? undefined : text,
    };
    const parsed = parseNote(want);
    const same =
      parsed !== undefined &&
      parsed.placeName === want.placeName &&
      parsed.address === want.address &&
      parsed.note === want.note &&
      JSON.stringify(parsed.facts) === JSON.stringify(n.facts) &&
      parsed.createdOn === n.createdOn &&
      parsed.licence === n.licence;
    if (parsed && same) {
      notes.push(parsed);
      notesChanged += 1;
      fields += mine.length;
      replaced += mine.reduce((s, h) => s + h.matches.length, 0);
    } else notes.push(n);
  }
  return { notes, fields, replaced, notesChanged };
}

/**
 * What the copy changed, read from the copy itself, in the list's order.
 * Given the file, it also says when a changed name or address makes a note
 * the same place as another that was apart before.
 */
export function replaceChanges(r: ReplaceReport, c: ReplacedCopy, file?: StreetFile): ReplaceChange[] {
  const byId = new Map<string, Note>(c.notes.map((n) => [n.id, n]));
  const placeOf = new Map<string, string>();
  for (const p of file?.places ?? []) for (const n of p.notes) placeOf.set(n.id, p.id);
  const keys = new Map<string, string>();
  for (const p of file?.places ?? []) for (const n of p.notes) keys.set(placeKey(n), p.id);
  const out: ReplaceChange[] = [];
  for (const h of r.hits) {
    const now = byId.get(h.note.id);
    if (!now) continue;
    const to = fieldText(now, h.field);
    if (to === h.before) continue;
    const other = h.field === "note" ? undefined : keys.get(placeKey(now));
    out.push({ hit: h, to, joins: other !== undefined && other !== placeOf.get(h.note.id) });
  }
  return out;
}

/** How many places the App reads in the copy, grouping its notes the same way it groups the file's. */
export function copyPlaces(c: ReplacedCopy, locale: Locale): number {
  return groupPlaces(c.notes, locale).length;
}

export function replacedFile(c: ReplacedCopy, today: Date): string {
  return exportNotes([...c.notes], today.toISOString().slice(0, 10));
}

export const REPLACE_CSV_COLUMNS = ["place_name", "note_id", "field", "matches", "before", "after", "can_change"] as const;

/** Every change found, before and after, guarded like the App's own CSV. */
export function replaceCsv(r: ReplaceReport): string {
  const rows: string[][] = [[...REPLACE_CSV_COLUMNS]];
  for (const h of r.hits) rows.push([h.note.placeName, h.note.id, h.field, String(h.matches.length), h.before, h.after, h.problem === undefined ? "yes" : h.problem]);
  return `\uFEFF${rows.map((x) => x.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

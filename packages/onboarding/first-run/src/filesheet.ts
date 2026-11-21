import { exportNotes } from "./exchange";
import { csvField } from "./notes-csv";
import { CSV_MAX_ROWS, SOURCE_MAX, columnName, detailFromCell, detectDelimiter, parseCsv, previewCsvImport, type CsvFileError, type CsvPreview } from "./csvimport";
import { FACT_KEYS, OPEN_LICENCES, isIsoDate, type FactKey } from "./facts";
import { foldText } from "./filter";
import { LIMITS, hasControlChars } from "./model";

/**
 * "Make a notes file from your own spreadsheet": a person's own spreadsheet,
 * with their own column names and their own words for yes and no, becomes a
 * notes export. The person says which of their columns is the place name, the
 * address and each detail, and where the answers come from: a source, an open
 * licence and the day they were recorded, each from a column or typed once
 * for every row. Nothing is given a default: a source, licence or date the
 * person has not given is missing, and a Yes or No without them is not used.
 *
 * The spreadsheet is turned, row for row, into the App's own one-row-per-place
 * CSV and read by the App's own CSV import (previewCsvImport), so every rule
 * the import has applies here too, and each problem points at the person's
 * own row number. Nothing is saved; the notes file is a download.
 */

/** What a column of the person's spreadsheet holds. "" means the column is not used. */
export type Target = "" | "place_name" | "address" | "source" | "licence" | "recorded_on" | FactKey;

export const RECORD_TARGETS = ["source", "licence", "recorded_on"] as const;
export type RecordTarget = (typeof RECORD_TARGETS)[number];

export const TARGETS: readonly Target[] = ["", "place_name", "address", ...FACT_KEYS, ...RECORD_TARGETS];

export interface Sheet {
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export type SheetError = "empty" | "too-large" | "unclosed-quote" | "too-many-rows" | "no-rows";

export type SheetRead = { readonly ok: true; readonly sheet: Sheet } | { readonly ok: false; readonly error: SheetError };

/** For each column of the sheet, by position, what it holds. */
export type Mapping = readonly Target[];

/** Values typed once for every row, used when no column holds them. */
export interface FixedValues {
  readonly source: string;
  readonly licence: string;
  readonly recordedOn: string;
}

export const NO_FIXED: FixedValues = { source: "", licence: "", recordedOn: "" };

/** The person's words for yes, no and unknown, as typed: separated by commas. */
export interface ValueWords {
  readonly yes: string;
  readonly no: string;
  readonly unknown: string;
}

export const DEFAULT_WORDS: ValueWords = {
  yes: "yes, oui, y, o, true, vrai, 1",
  no: "no, non, n, false, faux, 0",
  unknown: "unknown, ?, n/a, s.o., -",
};

export type SetupError =
  | "no-place-column"
  | "no-detail-column"
  | "two-columns"
  | "no-source"
  | "source-too-long"
  | "source-control"
  | "bad-licence"
  | "bad-date"
  | "future-date"
  | "word-in-two-lists";

export interface SetupProblem {
  readonly code: SetupError;
  /** The target the problem is about, when it is about one. */
  readonly target?: Target;
  /** A word found in two lists. */
  readonly word?: string;
}

export interface SheetResult {
  readonly preview: CsvPreview;
  /** The App's own CSV made from the sheet, row for row. */
  readonly appCsv: string;
  /** Cells in detail columns that are in no word list, with how often each appears, most first. */
  readonly unmatched: ReadonlyArray<{ readonly word: string; readonly count: number }>;
}

/** Reads the person's spreadsheet: commas, semicolons or tabs, quotes as usual. */
export function readSheet(text: string): SheetRead {
  if (text.trim() === "") return { ok: false, error: "empty" };
  if (text.length > LIMITS.importChars) return { ok: false, error: "too-large" };
  const parsed = parseCsv(text, detectDelimiter(text));
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const [header, ...rows] = parsed.rows;
  if (!header || rows.length === 0) return { ok: false, error: "no-rows" };
  if (rows.length > CSV_MAX_ROWS) return { ok: false, error: "too-many-rows" };
  return { ok: true, sheet: { header: header.map((h) => h.trim()), rows } };
}

/** Extra column names, in English and French, for the guess. The App's own names are known through columnName. */
const NAME_HINTS: Readonly<Record<string, Target>> = {
  place_name: "place_name",
  nom_du_lieu: "place_name",
  address: "address",
  street_address: "address",
  source: "source",
  provenance: "source",
  licence: "licence",
  license: "licence",
  recorded_on: "recorded_on",
  date_recorded: "recorded_on",
  date_de_saisie: "recorded_on",
};

/**
 * A first guess at what each column holds, from its name. It is only shown as
 * the starting choice; the person checks it. A target is guessed once, for the
 * first column that names it.
 */
export function guessMapping(header: readonly string[]): Target[] {
  const taken = new Set<Target>();
  return header.map((h) => {
    const name = foldText(columnName(h)).replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    const guess: Target = NAME_HINTS[name] ?? (detailFromCell(h) as Target | undefined) ?? "";
    if (guess === "" || taken.has(guess)) return "";
    taken.add(guess);
    return guess;
  });
}

/** Splits a word list typed by the person: commas, folded case and accents, no blanks. */
export function wordList(typed: string): string[] {
  return typed
    .split(",")
    .map((w) => foldText(w.trim()))
    .filter((w) => w !== "");
}

/** How a cell reads with the person's words. Blank is always unknown; a word in no list is undefined. */
export function readWord(cell: string, words: ValueWords): "yes" | "no" | "unknown" | undefined {
  const c = foldText(cell.trim());
  if (c === "") return "unknown";
  if (wordList(words.yes).includes(c)) return "yes";
  if (wordList(words.no).includes(c)) return "no";
  if (wordList(words.unknown).includes(c)) return "unknown";
  return undefined;
}

function columnOf(mapping: Mapping, target: Target): number {
  return mapping.indexOf(target);
}

/** Everything that must be settled before the sheet can be turned into notes. */
export function setupProblems(mapping: Mapping, fixed: FixedValues, words: ValueWords, today: Date): SetupProblem[] {
  const out: SetupProblem[] = [];
  if (columnOf(mapping, "place_name") < 0) out.push({ code: "no-place-column", target: "place_name" });
  if (!FACT_KEYS.some((k) => columnOf(mapping, k) >= 0)) out.push({ code: "no-detail-column" });
  for (const target of TARGETS) {
    if (target !== "" && mapping.filter((m) => m === target).length > 1) out.push({ code: "two-columns", target });
  }
  if (columnOf(mapping, "source") < 0) {
    const s = fixed.source.trim();
    if (s === "") out.push({ code: "no-source", target: "source" });
    else if (s.length > SOURCE_MAX) out.push({ code: "source-too-long", target: "source" });
    else if (hasControlChars(s)) out.push({ code: "source-control", target: "source" });
  }
  if (columnOf(mapping, "licence") < 0 && !OPEN_LICENCES.includes(fixed.licence)) out.push({ code: "bad-licence", target: "licence" });
  if (columnOf(mapping, "recorded_on") < 0) {
    const d = fixed.recordedOn.trim();
    if (!isIsoDate(d)) out.push({ code: "bad-date", target: "recorded_on" });
    else if (d > today.toISOString().slice(0, 10)) out.push({ code: "future-date", target: "recorded_on" });
  }
  const lists = [wordList(words.yes), wordList(words.no), wordList(words.unknown)];
  const seen = new Map<string, number>();
  lists.forEach((list, i) => {
    for (const w of new Set(list)) {
      const before = seen.get(w);
      if (before !== undefined && before !== i && !out.some((p) => p.code === "word-in-two-lists" && p.word === w)) out.push({ code: "word-in-two-lists", word: w });
      seen.set(w, i);
    }
  });
  return out;
}

/** The App's one-row-per-place columns, in the order the made CSV uses. */
export const APP_COLUMNS = ["place_name", "address", ...FACT_KEYS, "source", "licence", "recorded_on"] as const;

/**
 * The sheet as the App's own CSV, row for row, so row n of the sheet is row n
 * of the made CSV. Detail cells read as one of the person's words become
 * yes, no or blank; a cell in no list is passed on as it is, so the import
 * reports it on the person's row.
 */
export function toAppCsv(sheet: Sheet, mapping: Mapping, fixed: FixedValues, words: ValueWords): string {
  const cell = (row: readonly string[], target: Target): string => {
    const i = columnOf(mapping, target);
    return i < 0 ? "" : (row[i] ?? "").trim();
  };
  const fixedOr = (row: readonly string[], target: RecordTarget, value: string): string => (columnOf(mapping, target) >= 0 ? cell(row, target) : value.trim());
  const lines: string[][] = [[...APP_COLUMNS]];
  for (const row of sheet.rows) {
    // A row with a different width from the sheet's first row is passed on with a different width too,
    // so the import reports it as such on the person's row. Two cells, so it is never read as a blank line.
    if (row.length !== sheet.header.length) {
      lines.push([row[0] ?? "", ""]);
      continue;
    }
    const details = FACT_KEYS.map((k) => {
      if (columnOf(mapping, k) < 0) return "";
      const raw = cell(row, k);
      const v = readWord(raw, words);
      return v === undefined ? raw : v === "unknown" ? "" : v;
    });
    lines.push([
      cell(row, "place_name"),
      cell(row, "address"),
      ...details,
      fixedOr(row, "source", fixed.source),
      fixedOr(row, "licence", fixed.licence),
      fixedOr(row, "recorded_on", fixed.recordedOn),
    ]);
  }
  return `${lines.map((r) => r.map(csvField).join(",")).join("\r\n")}\r\n`;
}

/** Cells in the mapped detail columns that no word list covers, most frequent first, then in alphabetical order. */
export function unmatchedWords(sheet: Sheet, mapping: Mapping, words: ValueWords): Array<{ word: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of sheet.rows) {
    if (row.length !== sheet.header.length) continue;
    for (const k of FACT_KEYS) {
      const i = columnOf(mapping, k);
      if (i < 0) continue;
      const raw = (row[i] ?? "").trim();
      if (readWord(raw, words) === undefined) counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
  }
  return [...counts].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

/** Turns the sheet into notes with the App's own import. Call only when setupProblems is empty. */
export function makeNotes(sheet: Sheet, mapping: Mapping, fixed: FixedValues, words: ValueWords, today: Date): SheetResult | { readonly error: CsvFileError } {
  const appCsv = toAppCsv(sheet, mapping, fixed, words);
  const preview = previewCsvImport([], appCsv, today);
  if (preview.error !== undefined) return { error: preview.error };
  return { preview, appCsv, unmatched: unmatchedWords(sheet, mapping, words) };
}

/**
 * The name of the person's own column that a problem is about. A record
 * column filled from a value typed for every row is named by what it holds.
 */
export function sheetColumnFor(appColumn: string, sheet: Sheet, mapping: Mapping): string | undefined {
  const target = (APP_COLUMNS as readonly string[]).includes(appColumn) ? (appColumn as Target) : undefined;
  if (!target) return undefined;
  const i = columnOf(mapping, target);
  return i < 0 ? undefined : sheet.header[i];
}

/** The notes as a notes export. */
export function sheetNotesFile(result: SheetResult, today: Date): string {
  return exportNotes(result.preview.notes, today.toISOString().slice(0, 10));
}

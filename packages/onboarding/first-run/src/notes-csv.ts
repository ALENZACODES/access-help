import type { Locale } from "../../switch-first/src/index";
import { type Pair } from "./copy";
import { FACT_KEYS } from "./facts";
import type { Note } from "./model";

/**
 * The notes as a spreadsheet (CSV), one row per note and detail, so they can be
 * opened in any spreadsheet or shared as open data. Every row carries the
 * place, the detail, the value and, for a Yes or No, its source, licence and
 * date. A detail with no record is written as UNKNOWN with nothing after it:
 * no source is made up for it.
 *
 * Text people typed is guarded against spreadsheet formulas: a cell that
 * starts with = + - @ (or a tab or return) gets a leading apostrophe, so a
 * spreadsheet shows it as text instead of running it.
 */
export const CSV_COLUMNS = ["note_id", "place_name", "address", "detail", "value", "source", "licence", "recorded_on", "note_added_on"] as const;

export const CSV_COPY = {
  download: { en: "Download my notes as a spreadsheet (CSV)", fr: "Télécharger mes notes en tableur (CSV)" },
  hint: {
    en: "One row per note and detail, with the source, licence and date of each Yes or No. Details with no record say UNKNOWN.",
    fr: "Une ligne par note et par détail, avec la source, la licence et la date de chaque Oui ou Non. Les détails sans donnée indiquent UNKNOWN.",
  },
} as const satisfies Record<string, Pair>;

/** Makes text safe to open in a spreadsheet: formulas become plain text. */
export function guardCell(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

/** One CSV field: quoted when it holds a comma, a quote or a line break, with quotes doubled. */
export function csvField(s: string): string {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The rows, in the notes' order and the App's detail order, header first. Values are the words yes, no and UNKNOWN in either language, so the file reads the same everywhere. */
export function notesToRows(notes: readonly Note[]): string[][] {
  const rows: string[][] = [[...CSV_COLUMNS]];
  for (const n of notes) {
    for (const key of FACT_KEYS) {
      const f = n.facts.find((x) => x.key === key);
      const known = f && f.value !== "unknown" && f.provenance;
      rows.push([
        n.id,
        guardCell(n.placeName),
        guardCell(n.address ?? ""),
        key,
        known ? f.value : "UNKNOWN",
        known ? guardCell(f.provenance?.source ?? "") : "",
        known ? (f.provenance?.licence ?? "") : "",
        known ? (f.provenance?.recordedOn ?? "") : "",
        n.createdOn,
      ]);
    }
  }
  return rows;
}

/** The whole file: CRLF line ends as CSV asks, and a byte order mark so spreadsheets read the accents right. */
export function notesToCsv(notes: readonly Note[]): string {
  return `\uFEFF${notesToRows(notes).map((r) => r.map(csvField).join(",")).join("\r\n")}\r\n`;
}

/** "notes-<date>.csv", "notes-<date>-fr.csv": the columns are the same in both languages. */
export function csvFilename(today: Date, l: Locale): string {
  return `notes-${today.toISOString().slice(0, 10)}${l === "fr" ? "-fr" : ""}.csv`;
}

/** A data address for the file, for a download link. */
export function csvHref(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

export function csvStrings(): Array<[string, Pair]> {
  return Object.entries(CSV_COPY).map(([k, p]): [string, Pair] => [`csv.${k}`, p]);
}

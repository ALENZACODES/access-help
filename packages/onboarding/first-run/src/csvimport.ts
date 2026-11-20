import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import { FACT_KEYS, OPEN_LICENCES, isIsoDate, type Fact, type FactKey } from "./facts";
import { isoDate } from "./form";
import { LIMITS, hasControlChars, type Note } from "./model";
import { placeId, type Place } from "./places";
import { CSV_COLUMNS, csvField } from "./notes-csv";

/**
 * Bringing notes in from a spreadsheet (CSV). The columns are the ones the
 * App's own spreadsheet download writes, so a file downloaded on one device
 * comes back unchanged on another, and a person who keeps their own
 * spreadsheet can use the same columns.
 *
 * Nothing is guessed:
 * - A Yes or No needs a source, an open licence and the day it was recorded.
 *   A row missing any of them is not used, and that detail stays UNKNOWN.
 * - A row that says UNKNOWN adds nothing; no record is made for it.
 * - Every row that is not used is listed with its row number and the reason,
 *   and can be downloaded with that reason beside it, to fix and try again.
 *
 * Notes keep their id from the file when it has one. Otherwise the id is made
 * from the note's own content, so bringing the same rows in twice adds them
 * once. Notes already on this device are never changed.
 */
export const CSV_MAX_ROWS = 5000;
export const SOURCE_MAX = 200;

export type CsvFileError = "empty" | "too-large" | "unclosed-quote" | "too-many-rows" | "missing-columns";

export type RowProblemCode =
  | "wrong-width"
  | "no-place"
  | "place-too-long"
  | "address-too-long"
  | "bad-detail"
  | "bad-value"
  | "no-source"
  | "source-too-long"
  | "bad-licence"
  | "bad-date"
  | "future-date"
  | "control-chars"
  | "repeated-detail"
  | "note-mismatch";

export interface RowProblem {
  /** The row's number in the file, the header being row 1. */
  readonly row: number;
  readonly code: RowProblemCode;
  /** The row as it was in the file, for the download of rows to fix. */
  readonly cells: readonly string[];
  /** The column the reason is about, named as in the file's first row; empty when it is about the whole row. */
  readonly column: string;
}

export interface CsvPreview {
  readonly error?: undefined;
  /** Notes that would be added, in the file's order. */
  readonly notes: readonly Note[];
  /** Data rows read, the header left out. */
  readonly rowsRead: number;
  /** Notes in the file that are already on this device. */
  readonly alreadyHere: number;
  /** Notes in the file with no Yes or No, so nothing to add. */
  readonly nothingKnown: number;
  /** Notes that would go past the most notes this device keeps. */
  readonly noRoom: number;
  readonly problems: readonly RowProblem[];
  /** The header as it was in the file. */
  readonly header: readonly string[];
}

export type CsvResult = CsvPreview | { readonly error: CsvFileError; readonly missing?: readonly string[] };

export const REQUIRED_COLUMNS = ["place_name", "detail", "value"] as const;

// ---- Reading the file ----

/**
 * Commas, or what else separates the cells: spreadsheets set to French often
 * save with semicolons, and cells copied from a spreadsheet and pasted are
 * separated by tabs.
 */
export type Delimiter = "," | ";" | "\t";

/** The separator the first line uses most, outside quotes; a comma when there is none. */
export function detectDelimiter(text: string): Delimiter {
  const counts: Record<Delimiter, number> = { ",": 0, ";": 0, "\t": 0 };
  let quoted = false;
  for (const c of text.startsWith("\uFEFF") ? text.slice(1) : text) {
    if (c === '"') quoted = !quoted;
    else if (!quoted && (c === "\n" || c === "\r")) break;
    else if (!quoted && (c === "," || c === ";" || c === "\t")) counts[c] += 1;
  }
  const best = (["\t", ";", ","] as const).reduce((a, b) => (counts[b] > counts[a] ? b : a), "," as Delimiter);
  return counts[best] > 0 ? best : ",";
}

/**
 * Splits CSV text into rows of cells: commas between cells, double quotes
 * around a cell that holds commas, quotes or line breaks, quotes doubled
 * inside. Takes CRLF or LF line ends and an optional byte order mark. Blank
 * lines are left out.
 */
export function parseCsv(text: string, delimiter: Delimiter = ","): { readonly rows: string[][] } | { readonly error: "unclosed-quote" | "too-many-rows" } {
  const s = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let i = 0;
  const endRow = (): boolean => {
    row.push(cell);
    cell = "";
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
    return rows.length <= CSV_MAX_ROWS + 1;
  };
  while (i < s.length) {
    const c = s[i] as string;
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      cell += c;
      i += 1;
      continue;
    }
    if (c === '"' && cell === "") {
      quoted = true;
      i += 1;
    } else if (c === delimiter) {
      row.push(cell);
      cell = "";
      i += 1;
    } else if (c === "\r" || c === "\n") {
      if (!endRow()) return { error: "too-many-rows" };
      i += c === "\r" && s[i + 1] === "\n" ? 2 : 1;
    } else {
      cell += c;
      i += 1;
    }
  }
  if (quoted) return { error: "unclosed-quote" };
  if (cell !== "" || row.length > 0) {
    if (!endRow()) return { error: "too-many-rows" };
  }
  return { rows };
}

/** Takes off the apostrophe the App's download puts before text that starts like a formula. */
export function unguardCell(s: string): string {
  return /^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s;
}

/** The detail named in a cell: its key, or its name in either language. */
export function detailFromCell(cell: string): FactKey | undefined {
  const c = cell.trim().toLowerCase();
  return FACT_KEYS.find((k) => k === c || COPY.facts[k].en.toLowerCase() === c || COPY.facts[k].fr.toLowerCase() === c);
}

/** yes, no or unknown from a cell; undefined when it is something else. An empty cell is UNKNOWN. */
export function valueFromCell(cell: string): "yes" | "no" | "unknown" | undefined {
  const c = cell.trim().toLowerCase();
  if (c === "yes" || c === "oui") return "yes";
  if (c === "no" || c === "non") return "no";
  if (c === "" || c === "unknown") return "unknown";
  return undefined;
}

// ---- Ids from content ----

/** A short, stable hash of text (FNV-1a, 32 bits twice), as letters and digits. */
export function contentHash(s: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x01000193 ^ 0x2f) >>> 0;
  }
  return `${a.toString(36)}${b.toString(36)}`;
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// ---- From rows to notes ----

interface Group {
  readonly id: string | undefined;
  readonly placeName: string;
  readonly address: string | undefined;
  readonly createdOn: string | undefined;
  facts: Map<FactKey, Fact>;
  licence: string | undefined;
  /** True once a row of this note said Yes, No or UNKNOWN without a problem. */
  used: boolean;
}

/**
 * The column a reason is about: the App's name for it, or the detail's own
 * column in one row per note. Undefined when the reason is about the whole row.
 */
export function problemColumn(code: RowProblemCode, own: FactKey | undefined, has: (name: string) => boolean): string | undefined {
  const record = (name: string): string => (own && has(`${own}_${name}`) ? `${own}_${name}` : name);
  switch (code) {
    case "wrong-width":
    case "control-chars":
      return undefined;
    case "no-place":
    case "place-too-long":
      return "place_name";
    case "address-too-long":
      return "address";
    case "bad-detail":
    case "repeated-detail":
      return own ?? "detail";
    case "bad-value":
      return own ?? "value";
    case "no-source":
    case "source-too-long":
      return record("source");
    case "bad-licence":
      return record("licence");
    case "bad-date":
    case "future-date":
      return record("recorded_on");
    case "note-mismatch":
      return "note_id";
  }
}

/** Other names a column may have in a person's own spreadsheet, in either language. */
const COLUMN_NAMES: Readonly<Record<string, string>> = {
  place: "place_name",
  name: "place_name",
  lieu: "place_name",
  nom: "place_name",
  adresse: "address",
  "détail": "detail",
  valeur: "value",
  license: "licence",
  date: "recorded_on",
  recorded: "recorded_on",
};

/** A header cell as one of the App's column names: trimmed, lower case, spaces as underscores, other names mapped. */
export function columnName(cell: string): string {
  const c = cell.trim().toLowerCase().replace(/\s+/g, "_");
  return COLUMN_NAMES[c] ?? c;
}

interface RecordFields {
  readonly placeName: string;
  readonly address: string;
  readonly source: string;
  readonly recordedOn: string;
  readonly licence: string;
  readonly noteId: string;
  readonly key: FactKey | undefined;
  readonly value: "yes" | "no" | "unknown" | undefined;
}

/** The first reason a record cannot be used, in the order the columns are read; undefined when it can. */
export function recordProblem(r: RecordFields, day: string): RowProblemCode | undefined {
  if ([r.placeName, r.address, r.source, r.noteId].some((x) => hasControlChars(x))) return "control-chars";
  if (r.placeName === "") return "no-place";
  if (r.placeName.length > LIMITS.placeName) return "place-too-long";
  if (r.address.length > LIMITS.address) return "address-too-long";
  if (!r.key) return "bad-detail";
  if (!r.value) return "bad-value";
  if (r.value === "unknown") return undefined;
  if (r.source === "") return "no-source";
  if (r.source.length > SOURCE_MAX) return "source-too-long";
  if (!OPEN_LICENCES.includes(r.licence)) return "bad-licence";
  if (!isIsoDate(r.recordedOn)) return "bad-date";
  if (r.recordedOn > day) return "future-date";
  return undefined;
}

/** Reads a CSV file into the notes it would add to `existing`. Never throws. */
export function previewCsvImport(existing: readonly Note[], text: string, today: Date): CsvResult {
  if (text.trim() === "") return { error: "empty" };
  if (text.length > LIMITS.importChars) return { error: "too-large" };
  const parsed = parseCsv(text, detectDelimiter(text));
  if ("error" in parsed) return { error: parsed.error };
  const [rawHeader, ...data] = parsed.rows;
  if (!rawHeader) return { error: "empty" };
  const header = rawHeader.map(columnName);
  const col = (name: string): number => header.indexOf(name);
  // One row per place, with a column for each detail, is read as one record per detail.
  const wideColumns = header.flatMap((h, i) => {
    const key = h === "detail" || h === "value" ? undefined : detailFromCell(rawHeader[i] ?? "");
    return key ? [{ i, key }] : [];
  });
  const wide = !header.includes("detail") && !header.includes("value") && wideColumns.length > 0;
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c) && !(wide && c !== "place_name"));
  if (missing.length > 0) return { error: "missing-columns", missing };
  const day = isoDate(today);
  const problems: RowProblem[] = [];
  const groups = new Map<string, Group>();
  const order: string[] = [];
  const unknownPlaces = new Set<string>();
  const knownPlaces = new Set<string>();
  const problemPlaces = new Set<string>();

  const records = data.flatMap((cells, index) =>
    wide && cells.length === rawHeader.length
      ? wideColumns.map((w) => ({ row: index + 2, cells, detail: w.key as string, value: cells[w.i] ?? "", own: w.key as FactKey | undefined }))
      : [{ row: index + 2, cells, detail: cells[col("detail")] ?? "", value: cells[col("value")] ?? "", own: undefined }],
  );
  for (const { row, cells, detail, value: valueCell, own } of records) {
    // A row read as several records says each reason once.
    const problem = (code: RowProblemCode): void => {
      if (problems.some((p) => p.row === row && p.code === code)) return;
      const name = problemColumn(code, own, (n) => col(n) >= 0);
      problems.push({ row, code, cells, column: name === undefined ? "" : (rawHeader[col(name)] ?? name).trim() });
    };
    const get = (name: string): string => {
      const i = col(name);
      return i < 0 ? "" : unguardCell((cells[i] ?? "").trim());
    };
    if (cells.length !== rawHeader.length) {
      problem("wrong-width");
      continue;
    }
    const placeName = get("place_name");
    const address = get("address");
    // In one row per note, a detail's own source, licence and day columns come before the row's.
    const record = (name: string): string => (own && col(`${own}_${name}`) >= 0 ? get(`${own}_${name}`) : get(name));
    const source = record("source");
    const recordedOn = record("recorded_on");
    const licence = record("licence");
    const noteId = get("note_id");
    const addedOn = get("note_added_on");
    const key = detailFromCell(unguardCell(detail.trim()));
    const value = valueFromCell(unguardCell(valueCell.trim()));
    const code = recordProblem({ placeName, address, source, recordedOn, licence, noteId, key, value }, day);
    const placeKey = `${placeName.toLowerCase()}\u0000${address.toLowerCase()}`;
    if (code || !key || !value) {
      problem(code ?? "bad-value");
      problemPlaces.add(placeKey);
      continue;
    }
    const id = ID_RE.test(noteId) ? noteId : undefined;
    // Without a note id, an UNKNOWN only tells that the place was in the file.
    if (!id && value === "unknown") {
      unknownPlaces.add(placeKey);
      continue;
    }
    const groupKey = id ? `id\u0000${id}` : `place\u0000${placeKey}\u0000${licence}`;
    let g = groups.get(groupKey);
    if (!g) {
      g = {
        id,
        placeName,
        address: address === "" ? undefined : address,
        createdOn: isIsoDate(addedOn) && addedOn <= day ? addedOn : undefined,
        facts: new Map(),
        licence: undefined,
        used: false,
      };
      groups.set(groupKey, g);
      order.push(groupKey);
    } else if (id && (g.placeName !== placeName || (g.address ?? "") !== address)) {
      problem("note-mismatch");
      continue;
    }
    const before = g.facts.get(key);
    if (value === "unknown") {
      g.used = true;
      continue;
    }
    const fact: Fact = { key, value, provenance: { source, licence, recordedOn } };
    if (before && JSON.stringify(before) !== JSON.stringify(fact)) {
      problem("repeated-detail");
      continue;
    }
    g.facts.set(key, fact);
    knownPlaces.add(placeKey);
    g.licence ??= licence;
    g.used = true;
  }

  const known = new Set(existing.map((n) => n.id));
  const notes: Note[] = [];
  let alreadyHere = 0;
  let nothingKnown = 0;
  let noRoom = 0;
  // A place named only with UNKNOWN details, with no usable or unusable Yes or No anywhere in the file, has nothing to add.
  for (const p of unknownPlaces) if (!knownPlaces.has(p) && !problemPlaces.has(p)) nothingKnown += 1;
  for (const k of order) {
    const g = groups.get(k) as Group;
    if (!g.used) continue;
    if (g.facts.size === 0 || !g.licence) {
      nothingKnown += 1;
      continue;
    }
    const facts: Fact[] = FACT_KEYS.map((key) => g.facts.get(key) ?? { key, value: "unknown", provenance: undefined });
    const id = g.id ?? `csv-${contentHash(JSON.stringify([g.placeName, g.address ?? "", facts]))}`;
    if (known.has(id)) {
      alreadyHere += 1;
      continue;
    }
    if (existing.length + notes.length >= LIMITS.notes) {
      noRoom += 1;
      continue;
    }
    known.add(id);
    notes.push({ id, placeName: g.placeName, address: g.address, note: undefined, createdOn: g.createdOn ?? day, licence: g.licence, facts });
  }
  return { notes, rowsRead: data.length, alreadyHere, nothingKnown, noRoom, problems, header: rawHeader };
}

/** A file's text: Blob.text() where the browser has it, FileReader where it does not. */
export function readFileText(file: Blob): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("not text")));
    reader.onerror = () => reject(reader.error ?? new Error("unreadable"));
    reader.readAsText(file);
  });
}

// ---- Words ----

export const CSV_IMPORT_COPY = {
  open: { en: "Bring notes in from a spreadsheet", fr: "Importer des notes depuis un tableur" },
  title: { en: "Bring notes in from a spreadsheet", fr: "Importer des notes depuis un tableur" },
  pasteHint: {
    en: "Commas, semicolons or tabs between cells all work, so you can paste cells copied from a spreadsheet.",
    fr: "Des virgules, des points-virgules ou des tabulations entre les cellules conviennent tous, vous pouvez donc coller des cellules copiées d’un tableur.",
  },
  intro: {
    en: "Use the columns of the App’s spreadsheet download. Each Yes or No needs a source, an open licence and the day it was recorded. Rows that say UNKNOWN add nothing.",
    fr: "Utilisez les colonnes du tableur téléchargé depuis l’App. Chaque Oui ou Non doit avoir une source, une licence ouverte et le jour où il a été noté. Les lignes qui indiquent UNKNOWN n’ajoutent rien.",
  },
  columns: { en: "Columns", fr: "Colonnes" },
  required: { en: "needed", fr: "obligatoire" },
  licences: { en: "Open licences", fr: "Licences ouvertes" },
  template: { en: "Download an empty spreadsheet with these columns", fr: "Télécharger un tableur vide avec ces colonnes" },
  fileLabel: { en: "Choose a CSV file", fr: "Choisir un fichier CSV" },
  pasteLabel: { en: "Or paste the rows here", fr: "Ou collez les lignes ici" },
  fileRead: {
    en: "The file was read. Look at what would be added next.",
    fr: "Le fichier a été lu. Regardez ensuite ce qui serait ajouté.",
  },
  fileFailed: {
    en: "This browser could not read the file. Paste the rows instead.",
    fr: "Ce navigateur n’a pas pu lire le fichier. Collez plutôt les lignes.",
  },
  preview: { en: "Look at what would be added", fr: "Voir ce qui serait ajouté" },
  previewTitle: { en: "What would be added", fr: "Ce qui serait ajouté" },
  nothingToAdd: {
    en: "Nothing in this file would be added.",
    fr: "Rien dans ce fichier ne serait ajouté.",
  },
  problemsTitle: {
    en: "Rows that will not be used",
    fr: "Lignes qui ne seront pas utilisées",
  },
  rowColumn: { en: "Row", fr: "Ligne" },
  reasonColumn: { en: "Reason", fr: "Raison" },
  columnColumn: { en: "Column", fr: "Colonne" },
  fixDownload: {
    en: "Download these rows with their reasons, to fix them",
    fr: "Télécharger ces lignes avec leurs raisons, pour les corriger",
  },
  changed: {
    en: "The rows changed since you looked. Here is what they would add now.",
    fr: "Les lignes ont changé depuis votre aperçu. Voici ce qu’elles ajouteraient maintenant.",
  },
  cancel: { en: "Close without adding", fr: "Fermer sans ajouter" },
  notesTitle: { en: "Notes in this file", fr: "Notes de ce fichier" },
  notesHint: { en: "Clear a box to leave that note out.", fr: "Décochez une case pour laisser cette note de côté." },
  samePlace: {
    en: "Your notes already have this place; this adds another note about it.",
    fr: "Vos notes ont déjà ce lieu\u202F; ceci ajoute une autre note à son sujet.",
  },
  noneChosen: { en: "No note is chosen.", fr: "Aucune note n’est choisie." },
  closed: { en: "Nothing was added.", fr: "Rien n’a été ajouté." },
  back: { en: "Back to my notes", fr: "Retour à mes notes" },
} as const satisfies Record<string, Pair>;

export const CSV_FILE_ERRORS: Readonly<Record<CsvFileError, Pair>> = {
  empty: { en: "There is nothing to read. Choose a file or paste the rows.", fr: "Il n’y a rien à lire. Choisissez un fichier ou collez les lignes." },
  "too-large": { en: "This is too large to read here.", fr: "C’est trop volumineux pour être lu ici." },
  "unclosed-quote": { en: "A quotation mark is opened and never closed.", fr: "Un guillemet est ouvert et jamais fermé." },
  "too-many-rows": {
    en: "There are more than 5000 rows. Split the file and bring it in in parts.",
    fr: "Il y a plus de 5000 lignes. Divisez le fichier et importez-le en plusieurs parties.",
  },
  "missing-columns": {
    en: "The first row must name the columns place_name, detail and value.",
    fr: "La première ligne doit nommer les colonnes place_name, detail et value.",
  },
};

export const ROW_PROBLEMS: Readonly<Record<RowProblemCode, Pair>> = {
  "wrong-width": { en: "It has a different number of cells from the first row.", fr: "Elle n’a pas le même nombre de cellules que la première ligne." },
  "no-place": { en: "The place name is empty.", fr: "Le nom du lieu est vide." },
  "place-too-long": { en: "The place name is longer than 120 characters.", fr: "Le nom du lieu dépasse 120 caractères." },
  "address-too-long": { en: "The address is longer than 200 characters.", fr: "L’adresse dépasse 200 caractères." },
  "bad-detail": { en: "The detail is not one the App knows.", fr: "Le détail n’est pas l’un de ceux de l’App." },
  "bad-value": { en: "The value must be yes, no or UNKNOWN.", fr: "La valeur doit être yes, no ou UNKNOWN." },
  "no-source": { en: "A Yes or No needs a source.", fr: "Un Oui ou un Non doit avoir une source." },
  "source-too-long": { en: "The source is longer than 200 characters.", fr: "La source dépasse 200 caractères." },
  "bad-licence": { en: "A Yes or No needs one of the open licences listed above.", fr: "Un Oui ou un Non doit avoir l’une des licences ouvertes indiquées plus haut." },
  "bad-date": {
    en: "A Yes or No needs the day it was recorded, as year-month-day.",
    fr: "Un Oui ou un Non doit avoir le jour où il a été noté, sous la forme année-mois-jour.",
  },
  "future-date": { en: "The day it was recorded is after today.", fr: "Le jour où il a été noté est après aujourd’hui." },
  "control-chars": { en: "It contains a character that cannot be kept.", fr: "Elle contient un caractère qui ne peut pas être gardé." },
  "repeated-detail": {
    en: "The same detail is given twice for this note, differently.",
    fr: "Le même détail est donné deux fois pour cette note, de façon différente.",
  },
  "note-mismatch": { en: "This note id is used for another place earlier in the file.", fr: "Cet identifiant de note est utilisé plus haut pour un autre lieu." },
};

/** The counts, one sentence each. */
export function csvPreviewLines(p: CsvPreview, l: Locale): string[] {
  const fr = l === "fr";
  const plural = (n: number, en: string, frWord: string): string => (fr ? `${n} ${frWord}${n > 1 ? "s" : ""}` : `${n} ${en}${n === 1 ? "" : "s"}`);
  const lines = [fr ? `Lignes lues${NB}: ${p.rowsRead}.` : `Rows read: ${p.rowsRead}.`, fr ? `Notes à ajouter${NB}: ${p.notes.length}.` : `Notes to add: ${p.notes.length}.`];
  if (p.alreadyHere > 0)
    lines.push(
      fr
        ? `${plural(p.alreadyHere, "note", "note")} déjà sur cet appareil, laissée${p.alreadyHere > 1 ? "s" : ""} telle${p.alreadyHere > 1 ? "s" : ""} quelle${p.alreadyHere > 1 ? "s" : ""}.`
        : `${plural(p.alreadyHere, "note", "note")} already on this device, left as ${p.alreadyHere === 1 ? "it is" : "they are"}.`,
    );
  if (p.nothingKnown > 0)
    lines.push(fr ? `${plural(p.nothingKnown, "note", "note")} sans Oui ni Non${NB}: rien à ajouter.` : `${plural(p.nothingKnown, "note", "note")} with no Yes or No: nothing to add.`);
  if (p.noRoom > 0)
    lines.push(
      fr
        ? `${plural(p.noRoom, "note", "note")} de plus que ce que cet appareil garde (${LIMITS.notes} notes).`
        : `${plural(p.noRoom, "note", "note")} more than this device keeps (${LIMITS.notes} notes).`,
    );
  if (p.problems.length > 0) lines.push(fr ? `${plural(p.problems.length, "row", "ligne")} non utilisée${p.problems.length > 1 ? "s" : ""}.` : `${plural(p.problems.length, "row", "row")} not used.`);
  return lines;
}

/** "Elevator: Yes; Automatic door: No", for a note's line in the preview. */
export function noteDetailsText(n: Note, l: Locale): string {
  const sep = l === "fr" ? `${NB}:` : ":";
  return n.facts
    .filter((f) => f.value !== "unknown")
    .map((f) => `${t(COPY.facts[f.key], l)}${sep} ${t(COPY.values[f.value], l)}`)
    .join(l === "fr" ? "\u202F; " : "; ");
}

/** The notes chosen to add: every note in the preview except those left out. */
export function chosenNotes(p: CsvPreview, leftOut: ReadonlySet<string>): Note[] {
  return p.notes.filter((n) => !leftOut.has(n.id));
}

export interface Disagreement {
  readonly key: FactKey;
  /** What the file says. */
  readonly file: "yes" | "no";
  /** What the notes on this device say: one answer, or that they already differ. */
  readonly notes: "yes" | "no" | "differ";
}

/**
 * Where a note from the file says something other than the notes already here
 * about the same place. Details the notes say nothing about are not listed:
 * the file adds to them, it does not disagree.
 */
export function disagreements(n: Note, places: readonly Place[]): Disagreement[] {
  const place = places.find((p) => p.id === placeId(n));
  if (!place) return [];
  const out: Disagreement[] = [];
  for (const f of n.facts) {
    if (f.value === "unknown") continue;
    const r = place.resolutions[f.key];
    if (!r || r.kind === "unknown") continue;
    if (r.kind === "differ") out.push({ key: f.key, file: f.value, notes: "differ" });
    else if (r.value !== f.value) out.push({ key: f.key, file: f.value, notes: r.value });
  }
  return out;
}

/** "Elevator: this file says No; your notes say Yes." */
export function disagreementText(d: Disagreement, l: Locale): string {
  const detail = t(COPY.facts[d.key], l);
  const file = t(COPY.values[d.file], l);
  if (l === "fr") {
    const notes = d.notes === "differ" ? "vos notes divergent déjà" : `vos notes disent ${t(COPY.values[d.notes], l)}`;
    return `${detail}${NB}: ce fichier dit ${file}\u202F; ${notes}.`;
  }
  const notes = d.notes === "differ" ? "your notes already differ" : `your notes say ${t(COPY.values[d.notes], l)}`;
  return `${detail}: this file says ${file}; ${notes}.`;
}

/** "Add 3 notes" / "Ajouter 3 notes". */
export function csvAddLabel(n: number, l: Locale): string {
  return l === "fr" ? `Ajouter ${n} note${n > 1 ? "s" : ""}` : `Add ${n} note${n === 1 ? "" : "s"}`;
}

/** "3 notes were added from the spreadsheet." */
export function csvAddedText(n: number, l: Locale): string {
  return l === "fr" ? `${n} note${n > 1 ? "s ont été ajoutées" : " a été ajoutée"} depuis le tableur.` : `${n} note${n === 1 ? " was" : "s were"} added from the spreadsheet.`;
}

/** "Take back the 3 notes just added": names what the button removes. */
export function csvTakeBackLabel(n: number, l: Locale): string {
  return l === "fr"
    ? n > 1
      ? `Retirer les ${n} notes qui viennent d’être ajoutées`
      : "Retirer la note qui vient d’être ajoutée"
    : n > 1
      ? `Take back the ${n} notes just added`
      : "Take back the note just added";
}

/** "The 3 notes from the spreadsheet were taken back." */
export function csvTakenBackText(n: number, l: Locale): string {
  return l === "fr"
    ? n > 1
      ? `Les ${n} notes du tableur ont été retirées.`
      : "La note du tableur a été retirée."
    : n > 1
      ? `The ${n} notes from the spreadsheet were taken back.`
      : "The note from the spreadsheet was taken back.";
}

/** The rows not used, as a CSV with the file's header and a reason column, to fix and bring back. */
export function problemsCsv(p: CsvPreview, l: Locale): string {
  const extra = l === "fr" ? ["colonne", "raison"] : ["column", "reason"];
  const lines = [[...p.header, ...extra], ...p.problems.map((x) => [...x.cells, x.column, t(ROW_PROBLEMS[x.code], l)])];
  return `\uFEFF${lines.map((r) => r.map(csvField).join(",")).join("\r\n")}\r\n`;
}

/** An empty spreadsheet with the App's columns. */
export function templateCsv(): string {
  return `\uFEFF${CSV_COLUMNS.join(",")}\r\n`;
}

export function csvImportStrings(): Array<[string, Pair]> {
  return [
    ...Object.entries(CSV_IMPORT_COPY).map(([k, p]): [string, Pair] => [`csvimport.${k}`, p]),
    ...Object.entries(CSV_FILE_ERRORS).map(([k, p]): [string, Pair] => [`csvimport.error.${k}`, p]),
    ...Object.entries(ROW_PROBLEMS).map(([k, p]): [string, Pair] => [`csvimport.problem.${k}`, p]),
  ];
}

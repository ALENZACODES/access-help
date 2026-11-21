import { exportNotes } from "./exchange";
import { FACT_KEYS, OPEN_LICENCES } from "./facts";
import { foldText } from "./filter";
import { placesExport, type StreetFile } from "./filestreets";
import { guessMapping, type Sheet } from "./filesheet";
import { LIMITS, hasControlChars, parseNote, type Note } from "./model";
import { csvField, guardCell } from "./notes-csv";
import { placeKey, type Place } from "./places";
import { parseStreet } from "./streets";

/**
 * "Check your list of places against a notes file": a person's own list of
 * places (a spreadsheet with a name column and, if they have one, an address
 * column) next to a notes export. Each place on the list is found in the file
 * when its name and address match a place there the way the App groups notes
 * (case, accents and punctuation do not matter). When the name differs but
 * the house number and street are the same, the two are shown side by side
 * for the person to judge: the App never decides they are one place. Places
 * on the list with no notes can be downloaded as starter notes, every detail
 * Unknown, to take on a round. Nothing is looked up or saved.
 */

export type ListStatus = "found" | "same-address" | "missing";
export const LIST_STATUSES: readonly ListStatus[] = ["found", "same-address", "missing"];

export interface ListEntry {
  /** The row in the person's spreadsheet, counting the header as row 1. */
  readonly row: number;
  readonly name: string;
  readonly address: string | undefined;
}

export interface ListColumns {
  /** Index of the name column. */
  readonly name: number;
  /** Index of the address column, or -1 for none. */
  readonly address: number;
}

export interface ListRead {
  readonly entries: readonly ListEntry[];
  /** Rows with an empty name. */
  readonly blank: number;
  /** Rows whose name or address the App cannot keep (too long, or holding control characters). */
  readonly unusable: readonly number[];
  /** Rows that repeat an earlier row's place; the first is kept. */
  readonly repeats: readonly number[];
}

/** The person's answer for a place at the same address under another name. */
export type Decision = "same" | "different" | "unsure";
export const DECISIONS: readonly Decision[] = ["same", "different", "unsure"];

/** Answers by the list's row number. */
export type Decisions = Readonly<Record<number, Decision>>;

export interface EntryMatch {
  readonly entry: ListEntry;
  readonly status: ListStatus;
  /** Set when the status comes from the person's answer, not from the names and addresses. */
  readonly decided?: Decision;
  /** The matching place (found), or the places at the same address (same-address). */
  readonly places: readonly Place[];
}

export interface ListCheck {
  readonly matches: readonly EntryMatch[];
  /** Places in the file that nothing on the list matches, not even by address. */
  readonly notInList: readonly Place[];
}

export type ColumnsProblem = "name" | "same" | "licence";

/** Extra column names for the guess, in English and French, beyond the App's own. */
const NAME_WORDS = ["name", "nom", "place", "lieu", "business", "commerce", "etablissement"];
const ADDRESS_WORDS = ["address", "adresse", "street_address", "location"];

function squash(s: string): string {
  return foldText(s).replace(/[^a-z0-9]+/g, " ").trim();
}

/** A first guess at the name and address columns, from their names. */
export function guessColumns(header: readonly string[]): ListColumns {
  const app = guessMapping(header);
  const folded = header.map((h) => squash(h).replace(/ /g, "_"));
  const find = (target: "place_name" | "address", words: readonly string[]): number => {
    const i = app.indexOf(target);
    if (i >= 0) return i;
    return folded.findIndex((h) => words.includes(h));
  };
  const name = find("place_name", NAME_WORDS);
  const address = find("address", ADDRESS_WORDS);
  return { name: name >= 0 ? name : 0, address: address === (name >= 0 ? name : 0) ? -1 : address };
}

export function columnsProblems(sheet: Sheet, c: ListColumns, licence: string): ColumnsProblem[] {
  const out: ColumnsProblem[] = [];
  if (!Number.isInteger(c.name) || c.name < 0 || c.name >= sheet.header.length) out.push("name");
  else if (c.address === c.name) out.push("same");
  if (!OPEN_LICENCES.includes(licence)) out.push("licence");
  return out;
}

/** Reads the entries of the list with the chosen columns. */
export function readEntries(sheet: Sheet, c: ListColumns): ListRead {
  const entries: ListEntry[] = [];
  const unusable: number[] = [];
  const repeats: number[] = [];
  const seen = new Set<string>();
  let blank = 0;
  sheet.rows.forEach((cells, i) => {
    const row = i + 2;
    const name = (cells[c.name] ?? "").trim();
    const rawAddress = c.address >= 0 ? (cells[c.address] ?? "").trim() : "";
    if (name === "") {
      blank++;
      return;
    }
    if (name.length > LIMITS.placeName || hasControlChars(name) || rawAddress.length > LIMITS.address || hasControlChars(rawAddress)) {
      unusable.push(row);
      return;
    }
    const address = rawAddress === "" ? undefined : rawAddress;
    const key = placeKey({ placeName: name, address });
    if (seen.has(key)) {
      repeats.push(row);
      return;
    }
    seen.add(key);
    entries.push({ row, name, address });
  });
  return { entries, blank, unusable, repeats };
}

/** The house number and street of an address, or the whole address folded when it has no street. */
function addressKey(address: string | undefined): string | undefined {
  if (address === undefined) return undefined;
  const street = parseStreet(address);
  if (street) return `${street.number}|${street.key}`;
  const s = squash(address);
  return s === "" ? undefined : s;
}

/**
 * Matches each entry to the file. Found: the same place key as a place in
 * the file. Same address: no such place, but one or more places at the same
 * house number and street (or, with no street, the same folded address).
 * Missing: neither.
 */
export function checkList(read: ListRead, file: StreetFile): ListCheck {
  const byKey = new Map<string, Place>();
  const byAddress = new Map<string, Place[]>();
  for (const p of file.places) {
    byKey.set(placeKey({ placeName: p.name, address: p.address }), p);
    const a = addressKey(p.address);
    if (a !== undefined) byAddress.set(a, [...(byAddress.get(a) ?? []), p]);
  }
  const used = new Set<string>();
  const matches: EntryMatch[] = read.entries.map((entry) => {
    const found = byKey.get(placeKey({ placeName: entry.name, address: entry.address }));
    if (found) {
      used.add(found.id);
      return { entry, status: "found", places: [found] };
    }
    const a = addressKey(entry.address);
    const near = a === undefined ? [] : (byAddress.get(a) ?? []);
    if (near.length > 0) {
      for (const p of near) used.add(p.id);
      return { entry, status: "same-address", places: near };
    }
    return { entry, status: "missing", places: [] };
  });
  return { matches, notInList: file.places.filter((p) => !used.has(p.id)) };
}

/**
 * Applies the person's answers to the places at the same address. "Same
 * place": the entry counts as found, with the place it was shown beside.
 * "Different places": the entry counts as missing, so it gets a starter note,
 * and the place in the file counts as not on the list. "Not sure" (or no
 * answer) leaves the pair as it is. The App never answers for the person.
 */
export function applyDecisions(check: ListCheck, file: StreetFile, decisions: Decisions): ListCheck {
  const matches = check.matches.map((m): EntryMatch => {
    if (m.status !== "same-address") return m;
    const d = decisions[m.entry.row];
    if (d === "same") return { ...m, status: "found", decided: "same" };
    if (d === "different") return { entry: m.entry, status: "missing", places: [], decided: "different" };
    return m;
  });
  const used = new Set(matches.flatMap((m) => m.places.map((p) => p.id)));
  return { matches, notInList: file.places.filter((p) => !used.has(p.id)) };
}

export function countBy(check: ListCheck): Readonly<Record<ListStatus, number>> {
  const n = (s: ListStatus): number => check.matches.filter((m) => m.status === s).length;
  return { found: n("found"), "same-address": n("same-address"), missing: n("missing") };
}

/** How many of the App's details have a record at a place. */
export function recordedDetails(place: Place): number {
  return FACT_KEYS.filter((k) => place.resolutions[k].kind !== "unknown").length;
}

function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Starter notes for the places on the list with no notes in the file: the
 * name and address as typed, the licence the person chose, today's date, and
 * every detail Unknown. They record nothing; they let the places be taken on
 * a round. Ids are made from the place, never repeating one in the file.
 */
export function starterNotes(check: ListCheck, file: StreetFile, licence: string, today: Date): Note[] {
  const taken = new Set(file.places.flatMap((p) => p.notes.map((n) => n.id)));
  const day = today.toISOString().slice(0, 10);
  const out: Note[] = [];
  for (const m of check.matches) {
    if (m.status !== "missing") continue;
    const base = `list-${fnv(placeKey({ placeName: m.entry.name, address: m.entry.address }))}`;
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    const note = parseNote({
      id,
      placeName: m.entry.name,
      address: m.entry.address,
      createdOn: day,
      licence,
      facts: FACT_KEYS.map((key) => ({ key, value: "unknown" })),
    });
    if (note) out.push(note);
  }
  return out;
}

export function starterFile(notes: readonly Note[], today: Date): string {
  return exportNotes(notes, today.toISOString().slice(0, 10));
}

/** The notes of the places on the list that are in the file, in the list's order. */
export function foundFile(check: ListCheck, today: Date): string {
  return placesExport(
    check.matches.filter((m) => m.status === "found").flatMap((m) => m.places),
    today,
  );
}

/** The notes of the places in the file that nothing on the list matches, to add to the list. */
export function notInListFile(check: ListCheck, today: Date): string {
  return placesExport(check.notInList, today);
}

/** The columns of the check's CSV, named by the App's keys so the file reads the same in either language. */
export const LIST_CHECK_COLUMNS = ["row", "place_name", "address", "status", "decided_by_you", "place_in_file", "address_in_file", "recorded_details"] as const;

/** One row per entry (one per place at the same address), in the list's order, guarded like the App's own CSV. */
export function listCheckCsv(check: ListCheck): string {
  const rows: string[][] = [[...LIST_CHECK_COLUMNS]];
  for (const m of check.matches) {
    const base = [String(m.entry.row), m.entry.name, m.entry.address ?? "", m.status, m.decided ?? ""];
    if (m.places.length === 0) rows.push([...base, "", "", ""]);
    for (const p of m.places) rows.push([...base, p.name, p.address ?? "", String(recordedDetails(p))]);
  }
  return `\uFEFF${rows.map((r) => r.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}


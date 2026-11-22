import { exportNotes } from "./exchange";
import { foldText } from "./filter";
import type { StreetFile } from "./filestreets";
import { LIMITS, hasControlChars, parseNote, type Note } from "./model";
import { csvField, guardCell } from "./notes-csv";
import type { Locale } from "../../switch-first/src/index";
import { groupPlaces, placeKey, type Place } from "./places";
import { parseStreet, postalArea } from "./streets";

/**
 * "Add missing addresses": the places in a notes file with no address, or
 * with an address the App cannot read a house number and street from. Such a
 * place cannot be told apart from another place with the same name, and goes
 * after every street in walking lists. For each one the person leaves it as it
 * is, picks an address another place with the same name already has in the
 * same file, or types the address, and gets a copy. The App never makes an
 * address up: every address offered comes from the person's own file.
 *
 * When asked, it also lists places whose address has a street but no postal
 * code the App can read; lists by postal area put those in a group of their
 * own. For them it offers the address of another place in the file at the
 * same house number and street that has a postal code.
 */

export type AddressIssue = "none" | "no-street" | "no-postal";
export const ADDRESS_ISSUES: readonly AddressIssue[] = ["none", "no-street", "no-postal"];

export interface AddressOptions {
  /** Also list places with a readable street but no postal code. */
  readonly postal: boolean;
}

export const DEFAULT_ADDRESS_OPTIONS: AddressOptions = { postal: false };

/** At most this many addresses are offered for one place. */
export const MAX_SUGGESTIONS = 5;

export interface AddressRow {
  /** The place's id, stable while the file is the same. */
  readonly id: string;
  readonly place: Place;
  readonly issue: AddressIssue;
  /**
   * Addresses offered, by address: for a place with no address or no readable
   * street, those other places with the same name have; for one with no postal
   * code, those other places at the same house number and street have.
   */
  readonly suggestions: readonly string[];
}

export interface AddressReport {
  readonly places: number;
  /** Places with no address, then those with one the App cannot read a street from; by name within each. */
  readonly rows: readonly AddressRow[];
}

export type AddressProblem = "empty" | "too-long" | "control";

export interface AddressedCopy {
  readonly notes: readonly Note[];
  /** Places given an address. */
  readonly places: number;
  /** Notes whose address changed. */
  readonly changed: number;
  /** Of the places given an address, those the App can now read a street from. */
  readonly readable: number;
}

export interface AddressChange {
  readonly row: AddressRow;
  readonly to: string;
  /** The App can read a house number and street from the new address. */
  readonly readable: boolean;
  /** The App can read a postal code from the new address. */
  readonly postal: boolean;
  /**
   * Another place in the file already has this name and address, so the App
   * now reads them as one place and puts their records together.
   */
  readonly joins: boolean;
}

const nameKey = (name: string): string => foldText(name).replace(/[^a-z0-9]+/g, " ").trim();

/** True when the App can read a house number and street from the address. */
export function readsStreet(address: string | undefined): boolean {
  return parseStreet(address) !== undefined;
}

/** True when the App can read a postal code from the address. */
export function hasPostal(address: string | undefined): boolean {
  return postalArea(address) !== undefined;
}

/** "345|king street west": the same house number on the same street, however it is spelled. */
function streetSpot(address: string | undefined): string | undefined {
  const s = parseStreet(address);
  return s && s.number ? `${s.number}|${s.key}` : undefined;
}

function issueOf(place: Place): AddressIssue | undefined {
  if (place.address === undefined || place.address.trim() === "") return "none";
  if (!readsStreet(place.address)) return "no-street";
  if (!hasPostal(place.address)) return "no-postal";
  return undefined;
}

export function addressRows(file: StreetFile, opts: AddressOptions = DEFAULT_ADDRESS_OPTIONS): AddressReport {
  const byName = new Map<string, Set<string>>();
  const bySpot = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, k: string, a: string): void => void m.set(k, (m.get(k) ?? new Set<string>()).add(a));
  for (const p of file.places) {
    if (!p.address || !readsStreet(p.address)) continue;
    add(byName, nameKey(p.name), p.address);
    const spot = streetSpot(p.address);
    if (spot && hasPostal(p.address)) add(bySpot, spot, p.address);
  }
  const rows: AddressRow[] = [];
  for (const issue of ADDRESS_ISSUES) {
    if (issue === "no-postal" && !opts.postal) continue;
    for (const place of file.places) {
      if (issueOf(place) !== issue) continue;
      const pool = issue === "no-postal" ? bySpot.get(streetSpot(place.address) ?? "") : byName.get(nameKey(place.name));
      const suggestions = [...(pool ?? [])]
        .filter((a) => a !== place.address)
        .sort((a, b) => a.localeCompare(b))
        .slice(0, MAX_SUGGESTIONS);
      rows.push({ id: place.id, place, issue, suggestions });
    }
  }
  return { places: file.places.length, rows };
}

/** What is wrong with a typed address, if anything. An address the App cannot read a street from is allowed: it is the person's to write. */
export function addressProblem(typed: string): AddressProblem | undefined {
  const a = typed.trim();
  if (a === "") return "empty";
  if (a.length > LIMITS.address) return "too-long";
  if (hasControlChars(a)) return "control";
  return undefined;
}

/**
 * The file's notes with the chosen addresses, by row id. Every note of a
 * place takes the place's new address. A note goes into the copy changed only
 * when the App's own note reader keeps the address as written; otherwise it
 * stays as it was. Choices with a problem, or the same as the address now,
 * change nothing.
 */
export function applyAddresses(file: StreetFile, r: AddressReport, choices: ReadonlyMap<string, string>): AddressedCopy {
  const target = new Map<string, string>();
  const rowOf = new Map<string, string>();
  for (const row of r.rows) {
    const to = choices.get(row.id);
    if (to === undefined || addressProblem(to) !== undefined || to.trim() === row.place.address) continue;
    for (const n of row.place.notes) {
      target.set(n.id, to.trim());
      rowOf.set(n.id, row.id);
    }
  }
  const notes: Note[] = [];
  const done = new Set<string>();
  let changed = 0;
  for (const place of file.places)
    for (const n of place.notes) {
      const to = target.get(n.id);
      const parsed = to === undefined ? undefined : parseNote({ ...n, address: to });
      if (parsed && parsed.address === to) {
        notes.push(parsed);
        changed += 1;
        done.add(rowOf.get(n.id) ?? "");
      } else notes.push(n);
    }
  const readable = r.rows.filter((row) => done.has(row.id) && readsStreet(target.get(row.place.notes[0]?.id ?? ""))).length;
  return { notes, places: done.size, changed, readable };
}

/**
 * What the copy changed, read from the copy itself: each place whose notes
 * all carry a new address, in the list's order. A place only some of whose
 * notes changed is left out, as is any choice the App did not apply. Given
 * the file, it also says which places now join one already there.
 */
export function addressChanges(r: AddressReport, c: AddressedCopy, file?: StreetFile): AddressChange[] {
  const byId = new Map<string, Note>(c.notes.map((n) => [n.id, n]));
  const keys = new Map<string, string>();
  for (const p of file?.places ?? []) for (const n of p.notes) keys.set(placeKey(n), p.id);
  const out: AddressChange[] = [];
  for (const row of r.rows) {
    const now = row.place.notes.map((n) => byId.get(n.id)?.address);
    const to = now[0];
    if (to === undefined || to === row.place.address || !now.every((a) => a === to)) continue;
    const other = keys.get(placeKey({ placeName: row.place.name, address: to }));
    out.push({ row, to, readable: readsStreet(to), postal: hasPostal(to), joins: other !== undefined && other !== row.id });
  }
  return out;
}

/** How many places the App reads in the copy, grouping its notes the same way it groups the file's. */
export function copyPlaces(c: AddressedCopy, locale: Locale): number {
  return groupPlaces(c.notes, locale).length;
}

export function addressedFile(c: AddressedCopy, today: Date): string {
  return exportNotes([...c.notes], today.toISOString().slice(0, 10));
}

export const ADDRESSES_CSV_COLUMNS = ["place_name", "address", "issue", "notes", "addresses_in_file_for_this_name"] as const;

/** The places with no readable address, with the addresses offered, guarded like the App's own CSV. */
export function addressesCsv(r: AddressReport): string {
  const rows: string[][] = [[...ADDRESSES_CSV_COLUMNS]];
  for (const row of r.rows) rows.push([row.place.name, row.place.address ?? "", row.issue, String(row.place.notes.length), row.suggestions.join(" | ")]);
  return `\uFEFF${rows.map((x) => x.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

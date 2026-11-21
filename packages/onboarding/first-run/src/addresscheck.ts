import type { Locale } from "../../switch-first/src/index";
import { exportNotes } from "./exchange";
import type { StreetFile } from "./filestreets";
import { csvField, guardCell } from "./notes-csv";
import { parseNote, type Note } from "./model";
import { writtenStreet } from "./partsummary";
import { placeKey, type Place } from "./places";
import { foldText } from "./filter";
import { parseStreet, postalArea } from "./streets";

/**
 * "Check the addresses in a file": what in a notes export's addresses may
 * keep a place from being found, sorted or matched. A place with no address;
 * an address with no house number and street; a Canadian postal code that
 * cannot be one as written (and, only when it is clear, the code it was
 * likely meant to be); a postal code written in lowercase, without its space
 * or with a hyphen; one street written more than one way. The App changes
 * nothing by itself: the person picks which fixes go into a copy, and the
 * copy says which places will now be grouped as one. Nothing is looked up
 * or saved.
 */

export type IssueKind = "no-address" | "no-street" | "intersection" | "postal-invalid" | "postal-mistyped" | "postal-format" | "postal-other-area";
export const ISSUE_KINDS: readonly IssueKind[] = ["no-address", "intersection", "no-street", "postal-mistyped", "postal-invalid", "postal-other-area", "postal-format"];

export interface AddressIssue {
  readonly place: Place;
  readonly kind: IssueKind;
  /** The text found in the address, for postal codes. */
  readonly found?: string;
  /** The code it may be meant to be, for postal codes; never given unless it is a valid code. */
  readonly suggestion?: string;
}

export interface StreetSpellings {
  readonly key: string;
  /** Each way the street is written, most places first, then by text. */
  readonly forms: ReadonlyArray<{ readonly text: string; readonly places: number }>;
}

/** Several names at one address: maybe one place written two ways, maybe several places in one building. */
export interface NameGroup {
  readonly key: string;
  /** Most notes first, then by name. */
  readonly places: readonly Place[];
}

export interface AddressReport {
  readonly issues: readonly AddressIssue[];
  readonly streets: readonly StreetSpellings[];
  readonly names: readonly NameGroup[];
  readonly places: number;
}

const FIRST = "ABCEGHJKLMNPRSTVXY";
const OTHER = "ABCEGHJKLMNPRSTVWXYZ";

/** True for a Canadian postal code written as A1A 1A1 with letters Canada Post uses. */
export function validPostalCode(code: string): boolean {
  const m = /^([A-Z])(\d)([A-Z]) (\d)([A-Z])(\d)$/.exec(code);
  return !!m && FIRST.includes(m[1] as string) && OTHER.includes(m[3] as string) && OTHER.includes(m[5] as string);
}

/**
 * Something in an address shaped like a postal code: a letter, a digit, a
 * letter, then a digit, a letter, a digit, with or without a space or hyphen,
 * where a digit may have been typed as O, I or l.
 */
const CANDIDATE = /(?:^|[^A-Za-z0-9])([A-Za-z][0-9OIl][A-Za-z])([\s-]?)([0-9OIl][A-Za-z][0-9OIl])(?![A-Za-z0-9])/;

const DIGIT_LIKE: Readonly<Record<string, string>> = { O: "0", I: "1", l: "1" };

/** What the address's postal code looks like: fine, written unusually, likely mistyped, or not a code at all. */
export function checkPostal(address: string): { kind: "ok" | "postal-format" | "postal-mistyped" | "postal-invalid"; found: string; suggestion?: string } | undefined {
  const m = CANDIDATE.exec(address);
  if (!m) return undefined;
  const [first, sep, second] = [m[1] as string, m[2] as string, m[3] as string];
  const found = `${first}${sep}${second}`;
  const written = `${first.toUpperCase()} ${second.toUpperCase()}`;
  if (validPostalCode(written)) return found === written ? { kind: "ok", found } : { kind: "postal-format", found, suggestion: written };
  const digits = (s: string, at: readonly number[]): string =>
    s
      .split("")
      .map((c, i) => (at.includes(i) ? (DIGIT_LIKE[c] ?? c) : c))
      .join("");
  const fixed = `${digits(first, [1]).toUpperCase()} ${digits(second, [0, 2]).toUpperCase()}`;
  return validPostalCode(fixed) ? { kind: "postal-mistyped", found, suggestion: fixed } : { kind: "postal-invalid", found };
}

/**
 * True when an address names a crossing of streets rather than a house
 * number: "King St & Bay St", "Main and 1st", "corner of Elm and Oak",
 * "coin des rues Principale et Laurier".
 */
export function isIntersection(address: string): boolean {
  const a = foldText(address);
  if (/\b(corner|coin|intersection|angle)\b/.test(a)) return true;
  if (/^\s*\d/.test(a)) return false;
  return /[a-z]\s*(&|@|\/)\s*[a-z0-9]/.test(a) || /[a-z]\s+(and|et|at)\s+[a-z0-9]/.test(a);
}

/** The issues of one place, in the order of ISSUE_KINDS. */
export function placeIssues(place: Place): AddressIssue[] {
  if (place.address === undefined || place.address.trim() === "") return [{ place, kind: "no-address" }];
  const out: AddressIssue[] = [];
  if (!parseStreet(place.address)) out.push({ place, kind: isIntersection(place.address) ? "intersection" : "no-street" });
  const postal = checkPostal(place.address);
  if (postal && postal.kind !== "ok") out.push({ place, kind: postal.kind, found: postal.found, ...(postal.suggestion ? { suggestion: postal.suggestion } : {}) });
  return out;
}

/** Streets written more than one way across the file, by the street they name. */
export function streetSpellings(file: StreetFile, locale: Locale): StreetSpellings[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const by = new Map<string, Map<string, number>>();
  for (const p of file.places) {
    const key = parseStreet(p.address)?.key;
    const text = writtenStreet(p.address);
    if (key === undefined || text === undefined) continue;
    const m = by.get(key) ?? new Map<string, number>();
    m.set(text, (m.get(text) ?? 0) + 1);
    by.set(key, m);
  }
  return [...by]
    .filter(([, m]) => m.size > 1)
    .map(([key, m]) => ({ key, forms: [...m].map(([text, places]) => ({ text, places })).sort((a, b) => b.places - a.places || collator.compare(a.text, b.text)) }))
    .sort((a, b) => collator.compare(a.forms[0]?.text ?? "", b.forms[0]?.text ?? ""));
}

/**
 * Places whose postal area differs from the rest of their street: on a
 * street where at least three places have a postal code and more than half
 * share one area, the places in another area. A street can cross areas, so
 * this is only a place to look; the App does not guess a code.
 */
export function postalOutliers(file: StreetFile): AddressIssue[] {
  const by = new Map<string, Array<{ place: Place; area: string }>>();
  for (const p of file.places) {
    const key = parseStreet(p.address)?.key;
    const area = postalArea(p.address);
    if (key === undefined || area === undefined) continue;
    by.set(key, [...(by.get(key) ?? []), { place: p, area }]);
  }
  const out: AddressIssue[] = [];
  for (const list of by.values()) {
    if (list.length < 3) continue;
    const counts = new Map<string, number>();
    for (const x of list) counts.set(x.area, (counts.get(x.area) ?? 0) + 1);
    const [main, n] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
    if (n * 2 <= list.length) continue;
    for (const x of list) if (x.area !== main) out.push({ place: x.place, kind: "postal-other-area", found: x.area });
  }
  return out;
}

/** The address of a place as the App compares addresses: house number and street, or the whole address folded. */
function sameAddressKey(address: string | undefined): string | undefined {
  if (address === undefined) return undefined;
  const s = parseStreet(address);
  if (s) return `${s.number}|${s.key}`;
  const folded = foldText(address).replace(/[^a-z0-9]+/g, " ").trim();
  return folded === "" ? undefined : folded;
}

/** Addresses with places of more than one name. */
export function namesAtOneAddress(file: StreetFile, locale: Locale): NameGroup[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const by = new Map<string, Place[]>();
  for (const p of file.places) {
    const key = sameAddressKey(p.address);
    if (key !== undefined) by.set(key, [...(by.get(key) ?? []), p]);
  }
  return [...by]
    .filter(([, places]) => places.length > 1)
    .map(([key, places]) => ({ key, places: [...places].sort((a, b) => b.notes.length - a.notes.length || collator.compare(a.name, b.name)) }))
    .sort((a, b) => collator.compare(a.places[0]?.address ?? "", b.places[0]?.address ?? ""));
}

export function checkAddresses(file: StreetFile, locale: Locale): AddressReport {
  const order = new Map(ISSUE_KINDS.map((k, i) => [k, i]));
  const issues = [...file.places.flatMap(placeIssues), ...postalOutliers(file)].sort((a, b) => (order.get(a.kind) ?? 0) - (order.get(b.kind) ?? 0));
  return { issues, streets: streetSpellings(file, locale), names: namesAtOneAddress(file, locale), places: file.places.length };
}

export function countIssues(r: AddressReport): Readonly<Record<IssueKind, number>> {
  const n = (k: IssueKind): number => r.issues.filter((i) => i.kind === k).length;
  return {
    "no-address": n("no-address"),
    "intersection": n("intersection"),
    "no-street": n("no-street"),
    "postal-mistyped": n("postal-mistyped"),
    "postal-invalid": n("postal-invalid"),
    "postal-other-area": n("postal-other-area"),
    "postal-format": n("postal-format"),
  };
}

/**
 * The fixes a person picked: postal codes by place id, a form for each street
 * by key, and for an address with several names, the place whose name and
 * address the others take.
 */
export interface Fixes {
  readonly postal: readonly string[];
  readonly streets: Readonly<Record<string, string>>;
  readonly names: Readonly<Record<string, string>>;
}

export const NO_FIXES: Fixes = { postal: [], streets: {}, names: {} };

export interface FixedCopy {
  readonly notes: readonly Note[];
  /** Notes whose address or name changed. */
  readonly changedNotes: number;
  /** Places whose address or name changed. */
  readonly changedPlaces: number;
  /** Places that now have the same name and address as another, so the App shows them as one. */
  readonly joined: number;
}

/** A place's address with the picked fixes: the postal code as suggested, the street in the picked form. */
export function fixedAddress(place: Place, issues: readonly AddressIssue[], streets: readonly StreetSpellings[], fixes: Fixes): string | undefined {
  let address = place.address;
  if (address === undefined) return undefined;
  if (fixes.postal.includes(place.id)) {
    const issue = issues.find((i) => i.place.id === place.id && i.found !== undefined && i.suggestion !== undefined);
    if (issue?.found && issue.suggestion) address = address.replace(issue.found, issue.suggestion);
  }
  const key = parseStreet(address)?.key;
  const written = writtenStreet(address);
  const group = streets.find((s) => s.key === key);
  const to = group ? fixes.streets[group.key] : undefined;
  if (written !== undefined && to !== undefined && to !== written && group?.forms.some((f) => f.text === to)) address = address.replace(written, to);
  return address;
}

/**
 * The copy with the picked fixes. Only addresses change; every note keeps
 * its name, details, records, licence and date. A note whose new address the
 * App could not keep (for example too long) keeps its old one.
 */
export function applyFixes(file: StreetFile, report: AddressReport, fixes: Fixes): FixedCopy {
  const notes: Note[] = [];
  let changedNotes = 0;
  let changedPlaces = 0;
  // For a name group the person settled, every place takes the chosen place's name and (fixed) address.
  const takes = new Map<string, Place>();
  for (const g of report.names) {
    const chosen = g.places.find((p) => p.id === fixes.names[g.key]);
    if (chosen) for (const p of g.places) if (p.id !== chosen.id) takes.set(p.id, chosen);
  }
  for (const p of file.places) {
    const into = takes.get(p.id);
    const name = into ? into.name : p.name;
    const address = fixedAddress(into ?? p, report.issues, report.streets, fixes);
    const changed = address !== p.address || name !== p.name;
    // A place counts as changed only when at least one of its notes took the new address or name.
    let placeChanged = false;
    for (const n of p.notes) {
      if (!changed) {
        notes.push(n);
        continue;
      }
      const next = parseNote({ ...n, placeName: name, address });
      if (next) {
        notes.push(next);
        changedNotes++;
        placeChanged = true;
      } else notes.push(n);
    }
    if (placeChanged) changedPlaces++;
  }
  const before = new Set(file.places.map((p) => placeKey({ placeName: p.name, address: p.address })));
  const after = new Set(notes.map((n) => placeKey(n)));
  return { notes, changedNotes, changedPlaces, joined: before.size - after.size };
}

export function fixedFile(c: FixedCopy, today: Date): string {
  return exportNotes(c.notes, today.toISOString().slice(0, 10));
}

/** The columns of the check's CSV. */
export const ADDRESS_CSV_COLUMNS = ["place_name", "address", "issue", "found", "suggestion"] as const;

/** One row per issue, then one per street spelling, guarded like the App's own CSV. */
export function addressCsv(r: AddressReport): string {
  const rows: string[][] = [[...ADDRESS_CSV_COLUMNS]];
  for (const i of r.issues) rows.push([i.place.name, i.place.address ?? "", i.kind, i.found ?? "", i.suggestion ?? ""]);
  for (const s of r.streets) for (const f of s.forms) rows.push(["", "", "street-spelling", f.text, s.forms[0]?.text ?? ""]);
  for (const g of r.names) for (const p of g.places) rows.push([p.name, p.address ?? "", "names-at-one-address", String(g.places.length), ""]);
  return `\uFEFF${rows.map((x) => x.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

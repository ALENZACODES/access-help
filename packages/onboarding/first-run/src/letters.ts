import type { Locale } from "../../switch-first/src/index";
import { FACT_KEYS, type FactKey } from "./facts";
import { groupFile, placesExport, type StreetFile } from "./filestreets";
import { placeNeeds } from "./lookfirst";
import { hasControlChars } from "./model";
import { csvField, guardCell } from "./notes-csv";
import type { Place } from "./places";

/**
 * "Letters to places": for each place in a notes export with something open
 * (a detail with no record, reports that differ and, if the person wants, a
 * record a year old or more), a letter asking the place itself, with a reply
 * section to fill in. The letters are signed with the name the person types;
 * they never speak for anyone else. A letter records nothing: an answer only
 * becomes a record when the person adds it with a source, a licence and a
 * date. Nothing is looked up, saved or sent.
 */

export type LetterLanguage = "en" | "fr" | "both";
export const LETTER_LANGUAGES: readonly LetterLanguage[] = ["en", "fr", "both"];

export const SENDER_MAX = 80;
export const CONTACT_MAX = 120;
export const MAX_LETTERS = 200;

/** Why a detail is asked about in a letter. */
export type AskReason = "unknown" | "differ" | "old";

export interface Ask {
  readonly key: FactKey;
  readonly reason: AskReason;
}

export interface Letter {
  readonly place: Place;
  /** In the App's detail order. */
  readonly asks: readonly Ask[];
}

export interface LetterOptions {
  readonly language: LetterLanguage;
  readonly includeOld: boolean;
  /** Who signs the letters; required. */
  readonly sender: string;
  /** How the place can reply (an email, a phone number, a mailing address); optional. */
  readonly contact: string;
}

export type LetterProblem = "sender-empty" | "sender-long" | "sender-control" | "contact-long" | "contact-control";

export interface LetterSet {
  readonly letters: readonly Letter[];
  /** Places with nothing open, left out. */
  readonly nothingOpen: number;
  /** Places past MAX_LETTERS, left out. */
  readonly over: number;
}

export function isLetterLanguage(s: string | null | undefined): s is LetterLanguage {
  return s === "en" || s === "fr" || s === "both";
}

/** Problems with the signer's name and contact, in the order of the fields. */
export function letterProblems(o: Pick<LetterOptions, "sender" | "contact">): LetterProblem[] {
  const out: LetterProblem[] = [];
  const sender = o.sender.trim();
  if (sender === "") out.push("sender-empty");
  else if (sender.length > SENDER_MAX) out.push("sender-long");
  else if (hasControlChars(sender)) out.push("sender-control");
  const contact = o.contact.trim();
  if (contact.length > CONTACT_MAX) out.push("contact-long");
  else if (hasControlChars(contact)) out.push("contact-control");
  return out;
}

/** What to ask a place, detail by detail, in the App's order. */
export function asksFor(place: Place, includeOld: boolean, today: Date): Ask[] {
  const n = placeNeeds(place, FACT_KEYS, includeOld, today);
  return FACT_KEYS.flatMap((key): Ask[] => {
    if (n.unknown.includes(key)) return [{ key, reason: "unknown" }];
    if (n.differ.includes(key)) return [{ key, reason: "differ" }];
    if (n.old.includes(key)) return [{ key, reason: "old" }];
    return [];
  });
}

/**
 * One letter for each place with something to ask, in walking order (street
 * by street, house numbers in order, then places with no street), as "Sort a
 * notes file by street" gives them, up to MAX_LETTERS.
 */
export function makeLetters(file: StreetFile, includeOld: boolean, today: Date, locale: Locale): LetterSet {
  const g = groupFile(file, { by: "street", bothSides: false }, locale);
  const ordered = [...g.groups.flatMap((x) => x.places), ...g.ungrouped];
  const all = ordered.map((place) => ({ place, asks: asksFor(place, includeOld, today) })).filter((l) => l.asks.length > 0);
  return { letters: all.slice(0, MAX_LETTERS), nothingOpen: ordered.length - all.length, over: Math.max(0, all.length - MAX_LETTERS) };
}

/** The notes of the places that get a letter, to take on a round when the replies come. */
export function lettersNotesFile(set: LetterSet, today: Date): string {
  return placesExport(
    set.letters.map((l) => l.place),
    today,
  );
}

/** The columns of the letters' CSV, a list to track which places were written to and which replied. */
export const LETTERS_CSV_COLUMNS = ["place_name", "address", "asked_about", "reasons", "sent_on", "reply_on"] as const;

/** One row per letter, with empty columns to fill in when it is sent and answered, guarded like the App's own CSV. */
export function lettersCsv(set: LetterSet): string {
  const rows: string[][] = [[...LETTERS_CSV_COLUMNS]];
  for (const l of set.letters) rows.push([l.place.name, l.place.address ?? "", l.asks.map((a) => a.key).join(" "), l.asks.map((a) => a.reason).join(" "), "", ""]);
  return `\uFEFF${rows.map((r) => r.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

/** Typed text as one tidy line: trimmed, with runs of spaces made one. */
export function oneLine(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

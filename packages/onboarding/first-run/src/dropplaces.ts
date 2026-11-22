import type { Locale } from "../../switch-first/src/index";
import { exportNotes, importNotes } from "./exchange";
import type { StreetFile } from "./filestreets";
import { foldText } from "./filter";
import { LIMITS, hasControlChars, type Note } from "./model";
import { placeId, placeKey, type Place } from "./places";

/**
 * "Remove places from a file": takes chosen places, with every note about
 * them, out of a copy of a notes file. This is for a place that has closed or
 * moved, or one the person was asked to take out. The person finds places by
 * name or address, ticks them, and can say why in a few words. Nothing else
 * changes: every other note is kept exactly as it was. The copy is read back
 * before it is offered, and the notes taken out can be downloaded too, so
 * nothing is lost.
 */

/** Places shown for one search, at most. */
export const FOUND_MAX = 30;

export interface FoundPlaces {
  /** The first places that match, by name. */
  readonly places: readonly Place[];
  /** Every place that matches. */
  readonly total: number;
}

/** The words of a search, folded: case and accents do not matter. */
export function searchWords(query: string): string[] {
  return foldText(query)
    .split(/[^a-z0-9]+/)
    .filter((w) => w !== "");
}

/** True when every word of the search is in the place's name or address. */
export function placeMatches(place: Place, words: readonly string[]): boolean {
  const hay = foldText(`${place.name} ${place.address ?? ""}`).replace(/[^a-z0-9]+/g, " ");
  return words.every((w) => hay.includes(w));
}

/** Places whose name or address holds every word of the search; every place for an empty search. */
export function findPlaces(file: StreetFile, query: string, locale: Locale, max = FOUND_MAX): FoundPlaces {
  const words = searchWords(query);
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const all = file.places
    .filter((p) => placeMatches(p, words))
    .sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.address ?? "", b.address ?? ""));
  return { places: all.slice(0, max), total: all.length };
}

export type ReasonProblem = "too-long" | "control";
export const REASON_PROBLEMS: readonly ReasonProblem[] = ["too-long", "control"];

/** The reason is optional; when given it is one line, no longer than a note. */
export function reasonProblem(reason: string): ReasonProblem | undefined {
  if (reason.length > LIMITS.note) return "too-long";
  if (hasControlChars(reason)) return "control";
  return undefined;
}

export interface Removal {
  /** Places taken out, in the file's order. */
  readonly removed: readonly Place[];
  /** Notes about the places taken out. */
  readonly removedNotes: readonly Note[];
  /** Every other note, unchanged, in the file's order. */
  readonly kept: readonly Note[];
  /** Places left in the copy. */
  readonly keptPlaces: number;
}

/** Takes the places with these ids out; ids not in the file are ignored. */
export function removePlaces(file: StreetFile, ids: readonly string[]): Removal {
  const chosen = new Set(ids);
  const removed = file.places.filter((p) => chosen.has(p.id));
  const rest = file.places.filter((p) => !chosen.has(p.id));
  return {
    removed,
    removedNotes: removed.flatMap((p) => p.notes),
    kept: rest.flatMap((p) => p.notes),
    keptPlaces: rest.length,
  };
}

/** The copy without the places, and a file of the notes taken out. */
export function removalFiles(r: Removal, today: Date): { copy: string; removed: string } {
  const day = today.toISOString().slice(0, 10);
  return { copy: exportNotes(r.kept, day), removed: exportNotes(r.removedNotes, day) };
}

export type ReadBack =
  | { readonly ok: true; readonly notes: number; readonly places: number }
  | { readonly ok: false; readonly reason: "unreadable" | "count" | "left-in" | "changed" };

/**
 * Reads the copy back as the App would and checks it: every kept note is
 * there and unchanged, nothing was turned away, and no note of a place taken
 * out is left.
 */
export function readBack(copy: string, r: Removal): ReadBack {
  const back = importNotes(copy);
  if (back.error || back.rejected > 0) return { ok: false, reason: "unreadable" };
  if (back.notes.length !== r.kept.length) return { ok: false, reason: "count" };
  const gone = new Set(r.removed.map((p) => p.id));
  if (back.notes.some((n) => gone.has(placeId(n)))) return { ok: false, reason: "left-in" };
  const byId = new Map(back.notes.map((n) => [n.id, n]));
  for (const n of r.kept) {
    const b = byId.get(n.id);
    if (!b || JSON.stringify(b) !== JSON.stringify(n)) return { ok: false, reason: "changed" };
  }
  return { ok: true, notes: back.notes.length, places: new Set(back.notes.map((n) => placeId(n))).size };
}

/** Lines read from a pasted list, at most. */
export const LIST_MAX = 200;

export interface ListMatch {
  /** Ids of places named by exactly one line, in the file's order, without repeats. */
  readonly ids: readonly string[];
  /** Lines that tick a place. */
  readonly matched: number;
  /** Lines that name no place in the file, as written. */
  readonly unmatched: readonly string[];
  /** Lines that name more than one place, as written, with how many. */
  readonly ambiguous: readonly { readonly line: string; readonly places: number }[];
}

/** True when a pasted list has more lines than are read. */
export function listTooLong(text: string): boolean {
  return listLines(text).length > LIST_MAX;
}

/** The lines of a pasted list, trimmed, without empty lines. */
export function listLines(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l !== "");
}

/**
 * Ticks places from a list, one per line: a line is a place's name, or its
 * name and address with a comma between them. Case, accents and punctuation do
 * not matter. A name shared by places at different addresses ticks none of
 * them, so a line never takes out more than the person meant.
 */
export function matchList(file: StreetFile, text: string): ListMatch {
  const byKey = new Map<string, Place>();
  const byName = new Map<string, Place[]>();
  for (const p of file.places) {
    const key = placeKey({ placeName: p.name, address: p.address });
    byKey.set(key, p);
    const name = key.split("|")[0] ?? "";
    byName.set(name, [...(byName.get(name) ?? []), p]);
  }
  const ids: string[] = [];
  const unmatched: string[] = [];
  const ambiguous: { line: string; places: number }[] = [];
  let matched = 0;
  for (const line of listLines(text).slice(0, LIST_MAX)) {
    const comma = line.indexOf(",");
    // "Name, address" first: the name before the first comma, the rest as the address.
    const withAddress = comma > 0 ? byKey.get(placeKey({ placeName: line.slice(0, comma), address: line.slice(comma + 1) })) : undefined;
    const named = withAddress ? [withAddress] : (byName.get(placeKey({ placeName: line, address: undefined }).split("|")[0] ?? "") ?? []);
    const first = named[0];
    if (named.length === 1 && first) {
      matched += 1;
      ids.push(first.id);
    } else if (named.length > 1) ambiguous.push({ line, places: named.length });
    else unmatched.push(line);
  }
  return { ids: chosenInOrder(file, ids), matched, unmatched, ambiguous };
}

/** The ids in the order the places come in the file, without repeats or ids not in it. */
export function chosenInOrder(file: StreetFile, ids: readonly string[]): string[] {
  const chosen = new Set(ids);
  return file.places.filter((p) => chosen.has(p.id)).map((p) => p.id);
}

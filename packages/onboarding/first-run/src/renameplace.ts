import type { Locale } from "../../switch-first/src/index";
import { exportNotes, importNotes } from "./exchange";
import { foldText } from "./filter";
import { LIMITS, hasControlChars, parseNote, type Note } from "./model";
import { groupPlaces, placeKey, type Place } from "./places";

/**
 * "Rename a place": changes the name or the address of one place in every
 * note about it, in a copy of a notes file. This is for a place that was
 * renamed, or an address written two ways. Several places can be renamed one
 * after another, and the last change can be taken back. Nothing else in the
 * notes changes: records keep their answer, source, licence and date. When the
 * new name and address are those of another place in the file, the two would
 * be read as one place, so the person must say that is what they want. The
 * copy is read back before it is offered.
 */

/** Places shown for one search, at most. */
export const RENAME_FOUND_MAX = 30;

export interface PlaceName {
  readonly name: string;
  /** "" when the place has no address. */
  readonly address: string;
}

export interface RenameChange {
  readonly from: PlaceName;
  readonly to: PlaceName;
  /** Ids of the notes changed. */
  readonly noteIds: readonly string[];
  /** The other place the renamed one now reads as one with, if any. */
  readonly joined: PlaceName | undefined;
}

export type RenameProblem = "name-empty" | "name-long" | "name-control" | "address-long" | "address-control" | "unchanged" | "joins";
export const RENAME_PROBLEMS: readonly RenameProblem[] = ["name-empty", "name-long", "name-control", "address-long", "address-control", "unchanged", "joins"];

export const placeNameOf = (p: Place): PlaceName => ({ name: p.name, address: p.address ?? "" });

/** The places in the notes, grouped the way the App groups them. */
export function placesOf(notes: readonly Note[], locale: Locale): Place[] {
  return groupPlaces(notes, locale);
}

/** Places whose name or address holds every word of the search, by name; every place for an empty search. */
export function searchPlaces(places: readonly Place[], query: string, locale: Locale, max = RENAME_FOUND_MAX): { places: Place[]; total: number } {
  const words = foldText(query)
    .split(/[^a-z0-9]+/)
    .filter((w) => w !== "");
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const all = places
    .filter((p) => {
      const hay = foldText(`${p.name} ${p.address ?? ""}`).replace(/[^a-z0-9]+/g, " ");
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.address ?? "", b.address ?? ""));
  return { places: all.slice(0, max), total: all.length };
}

export interface Spelling extends PlaceName {
  /** Notes that write the place this way. */
  readonly notes: number;
}

/** The ways the notes about a place write its name and address, most used first, then in the notes' order. */
export function spellingsOf(place: Place): Spelling[] {
  const seen = new Map<string, { name: string; address: string; notes: number; first: number }>();
  place.notes.forEach((n, i) => {
    const key = `${n.placeName}\u0000${n.address ?? ""}`;
    const s = seen.get(key) ?? { name: n.placeName, address: n.address ?? "", notes: 0, first: i };
    s.notes += 1;
    seen.set(key, s);
  });
  return [...seen.values()].sort((a, b) => b.notes - a.notes || a.first - b.first).map(({ name, address, notes }) => ({ name, address, notes }));
}

/** Places whose notes write the name or address in more than one way, in the places' order. */
export function mixedPlaces(places: readonly Place[]): Place[] {
  return places.filter((p) => spellingsOf(p).length > 1);
}

/** Trims the name and address as they will be written. */
export function cleanName(n: PlaceName): PlaceName {
  return { name: n.name.trim(), address: n.address.trim() };
}

/** The other place that would be read as one with the renamed place, if any. */
export function joinsWith(places: readonly Place[], place: Place, to: PlaceName): Place | undefined {
  const t = cleanName(to);
  const key = placeKey({ placeName: t.name, address: t.address === "" ? undefined : t.address });
  return places.find((p) => p.id !== place.id && placeKey({ placeName: p.name, address: p.address }) === key);
}

/** What stops the change; "joins" only when the person has not said the two places are one. */
export function renameProblems(places: readonly Place[], place: Place, to: PlaceName, allowJoin: boolean): RenameProblem[] {
  const t = cleanName(to);
  const out: RenameProblem[] = [];
  if (t.name === "") out.push("name-empty");
  else if (t.name.length > LIMITS.placeName) out.push("name-long");
  else if (hasControlChars(t.name)) out.push("name-control");
  if (t.address.length > LIMITS.address) out.push("address-long");
  else if (hasControlChars(t.address)) out.push("address-control");
  if (out.length > 0) return out;
  // Notes about one place can spell it in different ways; writing one spelling into all of them is a change.
  if (place.notes.every((n) => n.placeName === t.name && (n.address ?? "") === t.address)) return ["unchanged"];
  if (!allowJoin && joinsWith(places, place, t)) return ["joins"];
  return [];
}

export type RenameResult = { readonly ok: true; readonly notes: Note[]; readonly change: RenameChange } | { readonly ok: false };

/**
 * Writes the new name and address into every note about the place, through
 * the App's own note reader, so no note is ever left the App would refuse.
 * Every other note is kept as it was.
 */
export function applyRename(notes: readonly Note[], places: readonly Place[], place: Place, to: PlaceName): RenameResult {
  const t = cleanName(to);
  const ids = new Set(place.notes.map((n) => n.id));
  const out: Note[] = [];
  for (const n of notes) {
    if (!ids.has(n.id)) {
      out.push(n);
      continue;
    }
    const parsed = parseNote({ ...n, placeName: t.name, address: t.address === "" ? undefined : t.address });
    if (!parsed || parsed.placeName !== t.name || (parsed.address ?? "") !== t.address) return { ok: false };
    out.push(parsed);
  }
  const other = joinsWith(places, place, t);
  return {
    ok: true,
    notes: out,
    change: { from: placeNameOf(place), to: t, noteIds: notes.filter((n) => ids.has(n.id)).map((n) => n.id), joined: other ? placeNameOf(other) : undefined },
  };
}

export type CopyCheck =
  | { readonly ok: true; readonly notes: number; readonly places: number }
  | { readonly ok: false; readonly reason: "unreadable" | "count" | "changed" | "untouched" };

/**
 * Reads the copy back as the App would, and checks it against the file read
 * and the changes made: every note is there, the notes changed hold their new
 * name and address with everything else as it was, and every other note is
 * exactly as it was.
 */
export function checkCopy(copy: string, original: readonly Note[], changes: readonly RenameChange[], locale: Locale): CopyCheck {
  const back = importNotes(copy);
  if (back.error || back.rejected > 0) return { ok: false, reason: "unreadable" };
  if (back.notes.length !== original.length) return { ok: false, reason: "count" };
  const now = new Map(back.notes.map((n) => [n.id, n]));
  // The last change to a note gives its name and address now.
  const last = new Map<string, PlaceName>();
  for (const c of changes) for (const id of c.noteIds) last.set(id, c.to);
  for (const n of original) {
    const b = now.get(n.id);
    if (!b) return { ok: false, reason: "count" };
    const to = last.get(n.id);
    if (!to) {
      if (JSON.stringify(b) !== JSON.stringify(n)) return { ok: false, reason: "untouched" };
      continue;
    }
    const expected = { ...n, placeName: to.name, address: to.address === "" ? undefined : to.address };
    if (JSON.stringify(b) !== JSON.stringify(expected)) return { ok: false, reason: "changed" };
  }
  return { ok: true, notes: back.notes.length, places: placesOf(back.notes, locale).length };
}

/** The copy, as a notes export. */
export function renamedFile(notes: readonly Note[], today: Date): string {
  return exportNotes(notes, today.toISOString().slice(0, 10));
}

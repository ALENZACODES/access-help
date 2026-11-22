import type { Locale } from "../../switch-first/src/index";
import { exportNotes, importNotes } from "./exchange";
import { foldText } from "./filter";
import { LIMITS, hasControlChars, parseNote, type Note } from "./model";
import { groupPlaces, placeId, placeKey, type Place } from "./places";

/**
 * "Move a note to another place": gives one note the name and address of
 * another place, in a copy of a notes file, for a note that was written under
 * the wrong place. The note can go to a place already in the file, taking that
 * place's name and address as the App shows them, or to a place not in the
 * file. Only the note's name and address change: its records, text, licence
 * and date stay as they were, and so does every other note. Several notes can
 * be moved one after another, and the last move can be taken back. The copy is
 * read back before it is offered.
 */

/** Places shown for one search, at most. */
export const MOVE_FOUND_MAX = 30;

export interface PlaceName {
  readonly name: string;
  /** "" when the place has no address. */
  readonly address: string;
}

export type MoveTarget = { readonly kind: "place"; readonly placeId: string } | { readonly kind: "new"; readonly name: string; readonly address: string };

export interface MoveChange {
  readonly noteId: string;
  /** The day the note was made, to tell it apart in the list of moves. */
  readonly createdOn: string;
  readonly from: PlaceName;
  readonly to: PlaceName;
  /** True when the note went to a place already in the file. */
  readonly existing: boolean;
}

export type MoveProblem = "no-target" | "same-place" | "name-empty" | "name-long" | "name-control" | "address-long" | "address-control" | "exists";
export const MOVE_PROBLEMS: readonly MoveProblem[] = ["no-target", "same-place", "name-empty", "name-long", "name-control", "address-long", "address-control", "exists"];

export const placeNameOf = (p: Place): PlaceName => ({ name: p.name, address: p.address ?? "" });
export const noteNameOf = (n: Note): PlaceName => ({ name: n.placeName, address: n.address ?? "" });
const keyOf = (n: PlaceName): string => placeKey({ placeName: n.name, address: n.address === "" ? undefined : n.address });

/** The places in the notes, grouped the way the App groups them. */
export function placesOf(notes: readonly Note[], locale: Locale): Place[] {
  return groupPlaces(notes, locale);
}

/** Places whose name or address holds every word of the search, by name; every place for an empty search. */
export function findPlaces(places: readonly Place[], query: string, locale: Locale, max = MOVE_FOUND_MAX): { places: Place[]; total: number } {
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

/** The place the note is read under now. */
export function placeOfNote(places: readonly Place[], note: Note): Place | undefined {
  const id = placeId(note);
  return places.find((p) => p.id === id);
}

/** The name and address the note will take; undefined when the target is not a place in the file. */
export function targetName(places: readonly Place[], t: MoveTarget): PlaceName | undefined {
  if (t.kind === "new") return { name: t.name.trim(), address: t.address.trim() };
  const p = places.find((x) => x.id === t.placeId);
  return p ? placeNameOf(p) : undefined;
}

/** The place in the file a new name and address belong to, if any. */
export function existingPlace(places: readonly Place[], to: PlaceName): Place | undefined {
  const key = keyOf(to);
  return places.find((p) => placeKey({ placeName: p.name, address: p.address }) === key);
}

/** What stops the move. A new place that is already in the file must be chosen from the list instead. */
export function moveProblems(places: readonly Place[], note: Note, t: MoveTarget | undefined): MoveProblem[] {
  if (!t) return ["no-target"];
  const to = targetName(places, t);
  if (!to) return ["no-target"];
  if (t.kind === "new") {
    const out: MoveProblem[] = [];
    if (to.name === "") out.push("name-empty");
    else if (to.name.length > LIMITS.placeName) out.push("name-long");
    else if (hasControlChars(to.name)) out.push("name-control");
    if (to.address.length > LIMITS.address) out.push("address-long");
    else if (hasControlChars(to.address)) out.push("address-control");
    if (out.length > 0) return out;
  }
  if (keyOf(to) === keyOf(noteNameOf(note))) return ["same-place"];
  if (t.kind === "new" && existingPlace(places, to)) return ["exists"];
  return [];
}

export type MoveResult = { readonly ok: true; readonly notes: Note[]; readonly change: MoveChange } | { readonly ok: false };

/** Writes the target's name and address into the note, through the App's own note reader; every other note is kept as it was. */
export function applyMove(notes: readonly Note[], places: readonly Place[], noteId: string, t: MoveTarget): MoveResult {
  const to = targetName(places, t);
  const note = notes.find((n) => n.id === noteId);
  if (!to || !note) return { ok: false };
  const parsed = parseNote({ ...note, placeName: to.name, address: to.address === "" ? undefined : to.address });
  if (!parsed || parsed.placeName !== to.name || (parsed.address ?? "") !== to.address) return { ok: false };
  return {
    ok: true,
    notes: notes.map((n) => (n.id === noteId ? parsed : n)),
    change: { noteId, createdOn: note.createdOn, from: noteNameOf(note), to, existing: t.kind === "place" },
  };
}

export type MoveCheck =
  | { readonly ok: true; readonly notes: number; readonly places: number }
  | { readonly ok: false; readonly reason: "unreadable" | "count" | "moved" | "untouched" };

/**
 * Reads the copy back as the App would and checks it against the file read
 * and the moves made: every note is there, each note moved differs only in
 * its name and address, which are those of the place it went to, and every
 * other note is exactly as it was.
 */
export function checkMoves(copy: string, original: readonly Note[], changes: readonly MoveChange[], locale: Locale): MoveCheck {
  const back = importNotes(copy);
  if (back.error || back.rejected > 0) return { ok: false, reason: "unreadable" };
  if (back.notes.length !== original.length) return { ok: false, reason: "count" };
  const now = new Map(back.notes.map((n) => [n.id, n]));
  const last = new Map<string, PlaceName>();
  for (const c of changes) last.set(c.noteId, c.to);
  for (const n of original) {
    const b = now.get(n.id);
    if (!b) return { ok: false, reason: "count" };
    const to = last.get(n.id);
    if (!to) {
      if (JSON.stringify(b) !== JSON.stringify(n)) return { ok: false, reason: "untouched" };
      continue;
    }
    if (JSON.stringify(b) !== JSON.stringify({ ...n, placeName: to.name, address: to.address === "" ? undefined : to.address })) return { ok: false, reason: "moved" };
  }
  return { ok: true, notes: back.notes.length, places: placesOf(back.notes, locale).length };
}

/** The copy, as a notes export. */
export function movedFile(notes: readonly Note[], today: Date): string {
  return exportNotes(notes, today.toISOString().slice(0, 10));
}

/** Records with a Yes or No in the note. */
export function recordCount(n: Note): number {
  return n.facts.filter((f) => f.value !== "unknown" && f.provenance).length;
}

import type { Locale } from "../../switch-first/src/index";
import type { ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import { checkFile } from "./filecheck";
import { foldText, type Requirement, type Verdict } from "./filter";
import type { Note } from "./model";
import { evaluatePlace, groupPlaces, type Place } from "./places";

/**
 * "Read a notes file": the places in one notes export, read the way the App
 * reads its own notes (several notes about one place are combined without
 * picking a winner), without bringing anything into this device. A person can
 * search by name or address and set must-haves; places then fall into three
 * groups, exactly as on the places page: every must-have matches, something is
 * UNKNOWN or reports differ, or a must-have is answered the other way. The
 * groups are not a ranking, and UNKNOWN never counts as No.
 */

export const PAGE_SIZE = 20;

export type Group = Verdict;
/** Order of the groups on the page. */
export const GROUPS: readonly Group[] = ["match", "unknown", "excluded"];

export interface ReaderFile {
  readonly notes: readonly Note[];
  readonly places: readonly Place[];
  readonly leftOut: number;
  readonly exportedOn: string | undefined;
}

export type ReaderRead = { readonly ok: true; readonly file: ReaderFile } | { readonly ok: false; readonly error: ImportError | "no-notes" };

export interface ReaderView {
  readonly query: string;
  readonly req: Requirement;
  /** Page per group, from 0. */
  readonly pages: Readonly<Record<Group, number>>;
  /** Place ids whose details are shown. */
  readonly open: readonly string[];
}

export const START_VIEW: ReaderView = { query: "", req: {}, pages: { match: 0, unknown: 0, excluded: 0 }, open: [] };

export interface GroupPage {
  readonly group: Group;
  readonly total: number;
  readonly page: number;
  readonly pageCount: number;
  readonly places: readonly Place[];
}

export function readNotesFile(text: string, today: Date, locale: Locale): ReaderRead {
  const r = checkFile(text, today);
  if (!r.ok) return { ok: false, error: r.error };
  if (r.check.readable.length === 0) return { ok: false, error: "no-notes" };
  const notes = r.check.readable;
  return { ok: true, file: { notes, places: groupPlaces(notes, locale), leftOut: r.check.totals.leftOut, exportedOn: r.check.exportedOn } };
}

/** True when at least one must-have is set. */
export function hasMustHaves(req: Requirement): boolean {
  return FACT_KEYS.some((k) => req[k] !== undefined);
}

/** Sets or clears one must-have. "" clears it. */
export function setMustHave(req: Requirement, key: FactKey, value: "yes" | "no" | ""): Requirement {
  const next: Record<string, "yes" | "no"> = {};
  for (const k of FACT_KEYS) {
    const v = k === key ? value : req[k];
    if (v === "yes" || v === "no") next[k] = v;
  }
  return next as Requirement;
}

/** Places whose name or address holds every word of the query (case and accents ignored). */
export function searchPlaces(places: readonly Place[], query: string): Place[] {
  const words = foldText(query)
    .split(/[^a-z0-9]+/)
    .filter((w) => w !== "");
  if (words.length === 0) return [...places];
  return places.filter((p) => {
    const hay = foldText(`${p.name} ${p.address ?? ""}`);
    return words.every((w) => hay.includes(w));
  });
}

/**
 * Places by group. Without must-haves every place is in "match" in name order:
 * nothing is being asked, so nothing is ruled out or unknown.
 */
export function groupFound(places: readonly Place[], req: Requirement): Record<Group, Place[]> {
  const out: Record<Group, Place[]> = { match: [], unknown: [], excluded: [] };
  for (const p of places) out[hasMustHaves(req) ? evaluatePlace(p, req) : "match"].push(p);
  return out;
}

export function pageOf(list: readonly Place[], group: Group, page: number): GroupPage {
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const p = Math.min(Math.max(0, Math.floor(page)), pageCount - 1);
  return { group, total: list.length, page: p, pageCount, places: list.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE) };
}

/** Everything the page shows for a view: one page per group. */
export function viewPages(file: ReaderFile, view: ReaderView): GroupPage[] {
  const groups = groupFound(searchPlaces(file.places, view.query), view.req);
  return GROUPS.map((g) => pageOf(groups[g], g, view.pages[g]));
}

/** Search or must-haves changed: back to the first page of each group. Open places stay open. */
export function withFilter(view: ReaderView, query: string, req: Requirement): ReaderView {
  return { ...view, query, req, pages: { match: 0, unknown: 0, excluded: 0 } };
}

export function withPage(view: ReaderView, group: Group, page: number): ReaderView {
  return { ...view, pages: { ...view.pages, [group]: page } };
}

export function toggleOpen(view: ReaderView, id: string): ReaderView {
  return { ...view, open: view.open.includes(id) ? view.open.filter((x) => x !== id) : [...view.open, id] };
}

/** Every place shown by the search and must-haves, in group order then name order, for the text download. */
export function shownPlaces(file: ReaderFile, view: ReaderView): Place[] {
  const groups = groupFound(searchPlaces(file.places, view.query), view.req);
  return GROUPS.flatMap((g) => groups[g]);
}

export function isGroup(s: string | undefined): s is Group {
  return s !== undefined && (GROUPS as readonly string[]).includes(s);
}

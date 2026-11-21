import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import type { StreetFile } from "./filestreets";
import { looksLikeEmail, looksLikePhone } from "./form";
import { LIMITS, hasControlChars, parseNote, type Note } from "./model";
import { placeKey, type Place } from "./places";
import { similarReason, type SimilarReason } from "./similar";
import { csvField, guardCell } from "./notes-csv";

/**
 * "Places that may be the same": in one notes export, groups of places that
 * may be one place written two ways, by the App's own rule for possible
 * matches (the same address under another name; the same name, or a name one
 * or two letters apart, when one has no address). Two different street
 * addresses are always different places. The App only suggests: the person
 * decides, group by group, to keep the places apart or to join them under
 * one place's name and address. Joining changes only the name and address of
 * the notes; every record keeps its value, source, licence and date, so where
 * the notes disagree the App still shows reports that differ.
 */

/** The most groups shown; a file with more says how many are left out. */
export const MAX_GROUPS = 100;

const REASON_ORDER: Readonly<Record<SimilarReason, number>> = { "same-address": 0, "same-name": 1, "similar-name": 2 };

export interface MatchLink {
  readonly a: Place;
  readonly b: Place;
  readonly reason: SimilarReason;
}

export interface MatchGroup {
  /** Stable for the same places, whatever their order in the file. */
  readonly id: string;
  /** In name order, then address. */
  readonly places: readonly Place[];
  /** The pairs that tie the group together, strongest reason first. */
  readonly links: readonly MatchLink[];
  /** The strongest reason in the group. */
  readonly reason: SimilarReason;
}

export interface MatchReport {
  readonly places: number;
  readonly groups: readonly MatchGroup[];
  /** Groups past MAX_GROUPS, left out. */
  readonly over: number;
}

/**
 * For each group: the id of the place whose name and address the others
 * take, TYPED to use the name and address the person typed for it, or
 * undefined to keep the places apart.
 */
export type JoinChoices = ReadonlyMap<string, string | undefined>;

/** The choice that joins a group under a name and address the person types. */
export const TYPED = "typed";

export interface TypedName {
  readonly name: string;
  readonly address: string;
}

/** For each group, the ids of its places left out of the join; every place is in it when none is given. */
export type LeftOut = ReadonlyMap<string, ReadonlySet<string>>;

/** The places of a group that a join takes: all but those left out, and always the place whose name is kept. */
export function joinedPlaces(g: MatchGroup, choices: JoinChoices, left: LeftOut = new Map()): Place[] {
  const out = left.get(g.id) ?? new Set<string>();
  const keep = choices.get(g.id);
  return g.places.filter((p) => p.id === keep || !out.has(p.id));
}

/** True when a group set to be joined would join fewer than two places. */
export function joinsTooFew(g: MatchGroup, choices: JoinChoices, left: LeftOut = new Map()): boolean {
  const c = choices.get(g.id);
  return c !== undefined && joinedPlaces(g, choices, left).length < 2;
}

/** For each group set to TYPED, what the person typed. */
export type TypedNames = ReadonlyMap<string, TypedName>;

export type TypedProblem = "name-empty" | "name-long" | "name-control" | "address-long" | "address-control" | "personal";

/** Problems with a typed name and address, in the order of the fields. The App's notes hold no email address or phone number. */
export function typedProblems(t: TypedName): TypedProblem[] {
  const out: TypedProblem[] = [];
  const name = t.name.trim();
  const address = t.address.trim();
  if (name === "") out.push("name-empty");
  else if (name.length > LIMITS.placeName) out.push("name-long");
  else if (hasControlChars(name)) out.push("name-control");
  if (address.length > LIMITS.address) out.push("address-long");
  else if (hasControlChars(address)) out.push("address-control");
  if ([name, address].some((x) => looksLikeEmail(x) || looksLikePhone(x))) out.push("personal");
  return out;
}

/** The name and address a group's notes take, or undefined when the group is kept apart or its choice is not usable. */
export function targetOf(g: MatchGroup, choices: JoinChoices, typed: TypedNames = new Map()): { readonly name: string; readonly address: string | undefined; readonly place: Place | undefined } | undefined {
  const choice = choices.get(g.id);
  if (choice === TYPED) {
    const t = typed.get(g.id);
    if (!t || typedProblems(t).length > 0) return undefined;
    const address = t.address.trim();
    return { name: t.name.trim(), address: address === "" ? undefined : address, place: undefined };
  }
  const place = g.places.find((p) => p.id === choice);
  return place ? { name: place.name, address: place.address, place } : undefined;
}

export interface JoinedCopy {
  readonly notes: readonly Note[];
  /** Groups joined. */
  readonly groups: number;
  /** Notes whose name or address changed. */
  readonly changed: number;
  /** Notes the App could not keep with their new name and address, kept as they were. */
  readonly kept: number;
  /** Places in the file before, and in the copy: notes with the same name and address make one place. */
  readonly placesBefore: number;
  readonly placesAfter: number;
  /** Each group joined, numbered as on the page, with the name and address its places now share. */
  readonly joined: ReadonlyArray<{ readonly group: number; readonly name: string; readonly address: string | undefined; readonly places: number }>;
}

const byName = (a: Place, b: Place): number => a.name.localeCompare(b.name) || (a.address ?? "").localeCompare(b.address ?? "") || a.id.localeCompare(b.id);

/** Every pair of places that may be the same, by the App's rule. */
export function matchLinks(places: readonly Place[]): MatchLink[] {
  const out: MatchLink[] = [];
  for (let i = 0; i < places.length; i++)
    for (let j = i + 1; j < places.length; j++) {
      const a = places[i] as Place;
      const b = places[j] as Place;
      const reason = similarReason(a, b);
      if (reason) out.push(byName(a, b) <= 0 ? { a, b, reason } : { a: b, b: a, reason });
    }
  return out;
}

/** Groups places joined by any chain of links, so three spellings of one place make one group. */
export function matchGroups(places: readonly Place[]): MatchReport {
  const links = matchLinks(places);
  const parent = new Map<Place, Place>();
  const find = (p: Place): Place => {
    let root = p;
    while (parent.get(root) !== undefined && parent.get(root) !== root) root = parent.get(root) as Place;
    parent.set(p, root);
    return root;
  };
  for (const l of links) {
    const ra = find(l.a);
    const rb = find(l.b);
    if (ra !== rb) parent.set(rb, ra);
  }
  const members = new Map<Place, Place[]>();
  for (const l of links)
    for (const p of [l.a, l.b]) {
      const root = find(p);
      const list = members.get(root) ?? [];
      if (!list.includes(p)) list.push(p);
      members.set(root, list);
    }
  const groups = [...members.values()].map((list): MatchGroup => {
    const sorted = [...list].sort(byName);
    const inGroup = new Set(sorted);
    const mine = links
      .filter((l) => inGroup.has(l.a))
      .sort((x, y) => REASON_ORDER[x.reason] - REASON_ORDER[y.reason] || byName(x.a, y.a) || byName(x.b, y.b));
    return { id: sorted.map((p) => p.id).sort().join("+"), places: sorted, links: mine, reason: mine[0]?.reason ?? "similar-name" };
  });
  groups.sort((x, y) => REASON_ORDER[x.reason] - REASON_ORDER[y.reason] || byName(x.places[0] as Place, y.places[0] as Place));
  return { places: places.length, groups: groups.slice(0, MAX_GROUPS), over: Math.max(0, groups.length - MAX_GROUPS) };
}

export function fileMatches(file: StreetFile): MatchReport {
  return matchGroups(file.places);
}

/** Details of a place with a Yes, a No or reports that differ. */
export function recordedCount(p: Place): number {
  return FACT_KEYS.filter((k) => p.resolutions[k].kind !== "unknown").length;
}

/** The newest record date of any detail of a place, or undefined. */
export function newestRecord(p: Place): string | undefined {
  let newest: string | undefined;
  for (const k of FACT_KEYS) {
    const r = p.resolutions[k];
    const d = r.kind === "unknown" ? undefined : r.observations[0]?.provenance.recordedOn;
    if (d !== undefined && (newest === undefined || d > newest)) newest = d;
  }
  return newest;
}

/** How many groups are set to be joined, with a usable choice. */
export function joinCount(r: MatchReport, choices: JoinChoices, typed: TypedNames = new Map(), left: LeftOut = new Map()): number {
  return r.groups.filter((g) => targetOf(g, choices, typed) !== undefined && !joinsTooFew(g, choices, left)).length;
}

/**
 * The file's notes with each joined group's notes given the chosen place's
 * name and address. Notes outside a joined group, and every record, are left
 * as they are. A note the App would not read with the new name and address
 * keeps its own.
 */
export function joinedCopy(file: StreetFile, r: MatchReport, choices: JoinChoices, typed: TypedNames = new Map(), left: LeftOut = new Map()): JoinedCopy {
  const target = new Map<Place, { readonly name: string; readonly address: string | undefined }>();
  let groups = 0;
  const joined: Array<{ group: number; name: string; address: string | undefined; places: number }> = [];
  for (const [i, g] of r.groups.entries()) {
    const into = targetOf(g, choices, typed);
    if (!into || joinsTooFew(g, choices, left)) continue;
    groups += 1;
    joined.push({ group: i + 1, name: into.name, address: into.address, places: joinedPlaces(g, choices, left).length });
    // With a typed name every place joined takes it; with a chosen place, the others joined take its name and address.
    for (const p of joinedPlaces(g, choices, left)) if (p !== into.place) target.set(p, into);
  }
  let changed = 0;
  let kept = 0;
  const notes: Note[] = [];
  for (const place of file.places)
    for (const n of place.notes) {
      const into = target.get(place);
      if (!into) {
        notes.push(n);
        continue;
      }
      const next = parseNote({ ...n, placeName: into.name, address: into.address });
      if (next && placeKey(next) === placeKey({ placeName: into.name, address: into.address })) {
        if (next.placeName === n.placeName && next.address === n.address) {
          notes.push(n);
          continue;
        }
        notes.push(next);
        changed += 1;
      } else {
        notes.push(n);
        kept += 1;
      }
    }
  return { notes, groups, changed, kept, placesBefore: file.places.length, placesAfter: new Set(notes.map((n) => placeKey(n))).size, joined };
}

export function joinedFile(copy: JoinedCopy, today: Date): string {
  return exportNotes([...copy.notes], today.toISOString().slice(0, 10));
}

export const MATCH_CSV_COLUMNS = ["group", "place_name", "address", "notes", "recorded_details", "newest_record", "reason"] as const;

/** One row per place in each group, numbered as on the page, guarded like the App's own CSV. */
export function matchCsv(r: MatchReport): string {
  const rows: string[][] = [[...MATCH_CSV_COLUMNS]];
  r.groups.forEach((g, i) => {
    for (const p of g.places) rows.push([String(i + 1), p.name, p.address ?? "", String(p.notes.length), String(recordedCount(p)), newestRecord(p) ?? "", g.reason]);
  });
  return `\uFEFF${rows.map((row) => row.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

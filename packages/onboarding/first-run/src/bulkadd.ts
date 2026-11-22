import { exportNotes } from "./exchange";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, OPEN_LICENCES, isIsoDate, type Fact, type FactKey } from "./facts";
import { foldText } from "./filter";
import type { StreetFile } from "./filestreets";
import { LIMITS, hasControlChars, parseNote, type Note } from "./model";
import { csvField, guardCell } from "./notes-csv";
import { resolve, type Place, type Resolution } from "./places";

/**
 * "Add one record to many places": the person has one answer about one detail
 * for many places from one source (a transit agency's list of stations with
 * elevators, a walk they made down a street) and adds it to each place they
 * tick, in a copy. They say who recorded it, the open licence and the date;
 * nothing is filled in for them, as in the App's own note form. Each record
 * goes in a new note for its place, so the place's earlier records stay and
 * the App shows where reports now differ. Every other detail stays Unknown in
 * the new note.
 */

export type Who = "me" | "source";

export interface AddOptions {
  readonly key: FactKey | "";
  readonly value: "yes" | "no" | "";
  /** "me": the person checked it, recorded as the App's contributor label; "source": a named source. */
  readonly who: Who | "";
  readonly source: string;
  readonly licence: string;
  readonly recordedOn: string;
}

export const EMPTY_ADD: AddOptions = { key: "", value: "", who: "", source: "", licence: "", recordedOn: "" };

export type AddProblem =
  | "no-key"
  | "no-value"
  | "no-who"
  | "source-empty"
  | "source-long"
  | "source-control"
  | "source-contributor"
  | "no-licence"
  | "date-empty"
  | "date-bad"
  | "date-future"
  | "no-places";

export const ADD_PROBLEMS: readonly AddProblem[] = [
  "no-key",
  "no-value",
  "no-who",
  "source-empty",
  "source-long",
  "source-control",
  "source-contributor",
  "no-licence",
  "date-empty",
  "date-bad",
  "date-future",
  "no-places",
];

/**
 * What the record would do at a place. "repeat": the place already holds this
 * exact record (same answer, source, licence and date), so it is not added
 * again; a record saved twice is still one record.
 */
export type Outcome = "new" | "same" | "differs" | "already-differ" | "repeat";

export interface PlannedAdd {
  readonly place: Place;
  /** The place's reading of the detail now. */
  readonly before: Resolution;
  /** The place's reading with the new record. */
  readonly after: Resolution;
  readonly outcome: Outcome;
}

export interface AddedNote {
  readonly note: Note;
  readonly place: Place;
}

export interface AddedCopy {
  readonly notes: readonly Note[];
  /** The new notes, each with the place it was added to, in the order the places were given. */
  readonly added: readonly AddedNote[];
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** The source the record is saved under. */
export function sourceOf(o: AddOptions): string {
  return o.who === "me" ? CONTRIBUTOR_SOURCE : o.source.trim();
}

/** What is wrong with the record, every problem in order. The places are checked apart, by placesProblem. */
export function addProblems(o: AddOptions, today: Date): AddProblem[] {
  const out: AddProblem[] = [];
  if (o.key === "") out.push("no-key");
  if (o.value === "") out.push("no-value");
  if (o.who === "") out.push("no-who");
  if (o.who === "source") {
    const s = o.source.trim();
    if (s === "") out.push("source-empty");
    else if (s.length > LIMITS.placeName) out.push("source-long");
    else if (hasControlChars(s)) out.push("source-control");
    else if (s === CONTRIBUTOR_SOURCE) out.push("source-contributor");
  }
  if (!OPEN_LICENCES.includes(o.licence)) out.push("no-licence");
  const d = o.recordedOn.trim();
  if (d === "") out.push("date-empty");
  else if (!isIsoDate(d)) out.push("date-bad");
  else if (d > iso(today)) out.push("date-future");
  return out;
}

/** Places whose name or address holds the text, ignoring case and accents; all of them for empty text. */
export function matchingPlaces(file: StreetFile, text: string): Place[] {
  const q = foldText(text.trim());
  if (q === "") return [...file.places];
  return file.places.filter((p) => foldText(p.name).includes(q) || foldText(p.address ?? "").includes(q));
}

/** True when the place has no Yes or No for the detail. */
export function hasNoRecord(place: Place, key: FactKey): boolean {
  return place.resolutions[key].kind === "unknown";
}

/**
 * What the record would do at each place: give it its first record ("new"),
 * agree with what it has ("same"), make its reports differ ("differs"), or
 * join reports that already differ ("already-differ").
 */
export function planAdds(places: readonly Place[], o: AddOptions, today: Date): PlannedAdd[] {
  if (addProblems(o, today).length > 0 || o.key === "" || o.value === "") return [];
  const key = o.key;
  const value = o.value;
  const provenance = { source: sourceOf(o), licence: o.licence, recordedOn: o.recordedOn.trim() };
  return places.map((place) => {
    const before = place.resolutions[key];
    const prior = before.kind === "unknown" ? [] : before.observations;
    if (holdsRecord(place, key, value, provenance)) return { place, before, after: before, outcome: "repeat" as const };
    const after = resolve([...prior, { noteId: "(new)", value, provenance }]);
    const outcome: Outcome = before.kind === "unknown" ? "new" : before.kind === "differ" ? "already-differ" : after.kind === "agree" ? "same" : "differs";
    return { place, before, after, outcome };
  });
}

/** True when the place already holds this exact record for the detail. */
export function holdsRecord(place: Place, key: FactKey, value: "yes" | "no", p: { source: string; licence: string; recordedOn: string }): boolean {
  const r = place.resolutions[key];
  return r.kind !== "unknown" && r.observations.some((o) => o.value === value && o.provenance.source === p.source && o.provenance.licence === p.licence && o.provenance.recordedOn === p.recordedOn);
}

/** Ids for the new notes: "add-20261121-1", "add-20261121-2", … skipping any id the file already uses. */
export function newIds(existing: ReadonlySet<string>, count: number, today: Date): string[] {
  const day = iso(today).replace(/-/g, "");
  const out: string[] = [];
  for (let n = 1; out.length < count; n++) {
    const id = `add-${day}-${n}`;
    if (!existing.has(id)) out.push(id);
  }
  return out;
}

/**
 * The file's notes with a new note for each place, holding only the record;
 * every other detail is Unknown. Each new note goes through the App's own
 * note reader; one it would not keep as made is left out. Nothing is added
 * when the record has a problem, nor to a place that already holds this
 * exact record.
 */
export function applyAdds(file: StreetFile, places: readonly Place[], o: AddOptions, today: Date): AddedCopy {
  const notes = file.places.flatMap((p) => p.notes);
  if (addProblems(o, today).length > 0 || o.key === "" || o.value === "" || places.length === 0) return { notes, added: [] };
  const provenance = { source: sourceOf(o), licence: o.licence, recordedOn: o.recordedOn.trim() };
  const key = o.key;
  const value = o.value;
  const fresh = places.filter((p) => !holdsRecord(p, key, value, provenance));
  const ids = newIds(new Set(notes.map((n) => n.id)), fresh.length, today);
  const added: AddedNote[] = [];
  fresh.forEach((place, i) => {
    const facts: Fact[] = FACT_KEYS.map((k) => (k === o.key ? { key: k, value: o.value as "yes" | "no", provenance } : { key: k, value: "unknown", provenance: undefined }));
    const want = { id: ids[i] ?? "", placeName: place.name, address: place.address, note: undefined, createdOn: iso(today), licence: o.licence, facts };
    const parsed = parseNote(want);
    const kept = parsed?.facts.find((f) => f.key === o.key);
    if (parsed && parsed.placeName === place.name && parsed.address === place.address && kept?.value === o.value && kept.provenance?.source === provenance.source) added.push({ note: parsed, place });
  });
  return { notes: [...notes, ...added.map((a) => a.note)], added };
}

export function addedFile(c: AddedCopy, today: Date): string {
  return exportNotes([...c.notes], iso(today));
}

export const ADDED_CSV_COLUMNS = ["place_name", "address", "note_id", "detail", "value", "source", "licence", "recorded_on", "before", "after"] as const;

const reading = (r: Resolution): string => (r.kind === "unknown" ? "unknown" : r.kind === "agree" ? r.value : "differ");

/** Every record added, with the place's reading before and after, guarded like the App's own CSV. */
export function addedCsv(c: AddedCopy, plan: readonly PlannedAdd[]): string {
  const rows: string[][] = [[...ADDED_CSV_COLUMNS]];
  const byPlace = new Map(plan.map((p) => [p.place.id, p]));
  for (const { note: n, place } of c.added) {
    const f = n.facts.find((x) => x.provenance);
    const p = byPlace.get(place.id);
    if (!f || !f.provenance || !p) continue;
    rows.push([n.placeName, n.address ?? "", n.id, f.key, f.value, f.provenance.source, f.provenance.licence, f.provenance.recordedOn, reading(p.before), reading(p.after)]);
  }
  return `\uFEFF${rows.map((x) => x.map((c2) => csvField(guardCell(c2))).join(",")).join("\r\n")}\r\n`;
}

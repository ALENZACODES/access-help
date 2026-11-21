import type { Locale } from "../../switch-first/src/index";
import { exportNotes } from "./exchange";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, OPEN_LICENCES, isIsoDate, type Fact, type FactKey } from "./facts";
import { groupFile, type StreetFile } from "./filestreets";
import { LIMITS, hasControlChars, parseNote, type Note } from "./model";
import { csvField, guardCell } from "./notes-csv";
import type { Place, Resolution } from "./places";
import { parseStreet } from "./streets";

/**
 * "Record what you found on a round": after visiting the places in a notes
 * file, a person says for each detail they checked whether it was there. Each
 * place they recorded something for becomes one new note, with the source,
 * licence and date they give on every detail. A detail they did not check
 * stays Unknown: "Not checked" is never turned into Yes or No, and nothing is
 * carried over from the file into the new notes. The file's own notes are not
 * changed; the new notes sit beside them, so where a new answer and an old one
 * differ the App shows that the reports differ.
 */

/** A round covers at most this many places on one page. */
export const ROUND_MAX_PLACES = 60;
export const SOURCE_MAX = 120;

export type Answer = "yes" | "no" | "skip";
export const ANSWERS: readonly Answer[] = ["yes", "no", "skip"];

/** Which details to ask about at each place. */
export type AskFor = "open" | "all";

export interface RoundSettings {
  /** The day of the visits, YYYY-MM-DD; not after today. */
  readonly visitedOn: string;
  readonly source: string;
  readonly licence: string;
}

export interface RoundPlace {
  readonly place: Place;
  /** The details asked about at this place, in the App's order. */
  readonly ask: readonly FactKey[];
}

export interface Round {
  readonly places: readonly RoundPlace[];
  /** Places in the file beyond ROUND_MAX_PLACES, not on this round. */
  readonly over: number;
  /** Places with nothing to look at, left off the round when asking for open details only. */
  readonly leftOutDone: number;
}

/** What a person entered for one place. */
export interface PlaceEntry {
  readonly answers: Readonly<Partial<Record<FactKey, Answer>>>;
  readonly note: string;
}

export type Entries = Readonly<Record<string, PlaceEntry>>;

export type SettingsProblem = "date" | "future" | "source" | "licence";
export type RoundProblem =
  | { readonly kind: "settings"; readonly code: SettingsProblem }
  | { readonly kind: "note"; readonly placeId: string; readonly code: "note-long" | "note-control" }
  | { readonly kind: "empty" };

/** How a new answer sits beside what the file already says. */
export type ChangeKind = "new" | "same" | "different" | "differ";

export interface Change {
  readonly place: Place;
  readonly key: FactKey;
  readonly value: "yes" | "no";
  readonly kind: ChangeKind;
  /** The id of the new note that holds this answer. */
  readonly noteId: string;
}

export interface RoundResult {
  readonly notes: readonly Note[];
  readonly changes: readonly Change[];
  /** Details asked about and left "Not checked": they stay Unknown. */
  readonly notChecked: number;
}

export function defaultSettings(today: Date): RoundSettings {
  return { visitedOn: today.toISOString().slice(0, 10), source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0" };
}

/** The details to ask about at a place: those with no record or differing reports, or every detail. */
export function detailsToAsk(place: Place, askFor: AskFor): FactKey[] {
  if (askFor === "all") return [...FACT_KEYS];
  return FACT_KEYS.filter((k) => place.resolutions[k].kind !== "agree");
}

/**
 * The places on the round, in walking order (street by street, house numbers
 * in order, then places with no street), as "Sort a notes file by street"
 * gives them. With "open", places with nothing to look at are left off.
 */
export function makeRound(file: StreetFile, askFor: AskFor, locale: Locale): Round {
  const grouped = groupFile(file, { by: "street", bothSides: false, onlyOpen: askFor === "open" }, locale);
  const ordered = [...grouped.groups.flatMap((g) => g.places), ...grouped.ungrouped];
  const places = ordered.slice(0, ROUND_MAX_PLACES).map((place) => ({ place, ask: detailsToAsk(place, askFor) }));
  return { places, over: Math.max(0, ordered.length - ROUND_MAX_PLACES), leftOutDone: grouped.leftOutDone };
}

/** Problems with the settings, in the order of the fields. */
export function settingsProblems(s: RoundSettings, today: Date): SettingsProblem[] {
  const out: SettingsProblem[] = [];
  const day = s.visitedOn.trim();
  if (!isIsoDate(day)) out.push("date");
  else if (day > today.toISOString().slice(0, 10)) out.push("future");
  const source = s.source.trim();
  if (source === "" || source.length > SOURCE_MAX || hasControlChars(source)) out.push("source");
  if (!OPEN_LICENCES.includes(s.licence)) out.push("licence");
  return out;
}

function answeredKeys(entry: PlaceEntry | undefined, ask: readonly FactKey[]): Array<{ key: FactKey; value: "yes" | "no" }> {
  if (!entry) return [];
  return ask.flatMap((key) => {
    const a = entry.answers[key];
    return a === "yes" || a === "no" ? [{ key, value: a }] : [];
  });
}

/** Every problem with the round as entered: settings, notes that are too long, and nothing recorded at all. */
export function roundProblems(round: Round, entries: Entries, s: RoundSettings, today: Date): RoundProblem[] {
  const out: RoundProblem[] = settingsProblems(s, today).map((code) => ({ kind: "settings", code }));
  let anything = false;
  for (const rp of round.places) {
    const entry = entries[rp.place.id];
    const note = entry?.note.trim() ?? "";
    if (note.length > LIMITS.note) out.push({ kind: "note", placeId: rp.place.id, code: "note-long" });
    else if (hasControlChars(note, true)) out.push({ kind: "note", placeId: rp.place.id, code: "note-control" });
    if (note !== "" || answeredKeys(entry, rp.ask).length > 0) anything = true;
  }
  if (!anything) out.push({ kind: "empty" });
  return out;
}

/** How one new answer sits beside what the file says about that detail. */
export function changeKind(r: Resolution, value: "yes" | "no"): ChangeKind {
  if (r.kind === "unknown") return "new";
  if (r.kind === "differ") return "differ";
  return r.value === value ? "same" : "different";
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
 * A note id for a place's new note: the day and a hash of the place, so the
 * same round entered twice gives the same ids, with a number added when an id
 * is already taken.
 */
export function roundNoteId(place: Place, visitedOn: string, taken: ReadonlySet<string>): string {
  const base = `round-${visitedOn.replace(/-/g, "")}-${fnv(place.id)}`;
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const id = `${base}-${n}`;
    if (!taken.has(id)) return id;
  }
}

/**
 * Makes the new notes. Call only when roundProblems is empty. Each place with
 * an answer or a note gets one note named and addressed like the place, with
 * the person's licence; each Yes or No carries the source, licence and visit
 * date; every other detail is Unknown. Each note goes through the App's own
 * check (parseNote), so a note that would not import is never made.
 */
export function buildRound(round: Round, entries: Entries, s: RoundSettings): RoundResult {
  const taken = new Set(round.places.flatMap((rp) => rp.place.notes.map((n) => n.id)));
  const notes: Note[] = [];
  const changes: Change[] = [];
  let notChecked = 0;
  const provenance = { source: s.source.trim(), licence: s.licence, recordedOn: s.visitedOn.trim() };
  for (const rp of round.places) {
    const entry = entries[rp.place.id];
    const answered = answeredKeys(entry, rp.ask);
    notChecked += rp.ask.length - answered.length;
    const text = entry?.note.trim() ?? "";
    if (answered.length === 0 && text === "") continue;
    const id = roundNoteId(rp.place, provenance.recordedOn, taken);
    taken.add(id);
    const facts: Fact[] = FACT_KEYS.map((key) => {
      const a = answered.find((x) => x.key === key);
      return a ? { key, value: a.value, provenance } : { key, value: "unknown", provenance: undefined };
    });
    const note = parseNote({
      id,
      placeName: rp.place.name,
      address: rp.place.address,
      note: text === "" ? undefined : text,
      createdOn: provenance.recordedOn,
      licence: s.licence,
      facts,
    });
    if (!note) continue;
    notes.push(note);
    for (const a of answered) changes.push({ place: rp.place, key: a.key, value: a.value, kind: changeKind(rp.place.resolutions[a.key], a.value), noteId: note.id });
  }
  return { notes, changes, notChecked };
}

/** Only the new notes, as a notes export. */
export function roundOnlyFile(result: RoundResult, today: Date): string {
  return exportNotes(result.notes, today.toISOString().slice(0, 10));
}

/** Every readable note of the file with the new notes added, as one notes export. */
export function roundWithFile(file: StreetFile, result: RoundResult, today: Date): string {
  const old = file.places.flatMap((p) => [...p.notes]);
  return exportNotes([...old, ...result.notes], today.toISOString().slice(0, 10));
}

/** Counts for the summary: new notes, Yes and No answers, and how they sit beside the file. */
export function roundCounts(result: RoundResult): Readonly<Record<"notes" | "yes" | "no" | ChangeKind | "notChecked", number>> {
  const by = (k: ChangeKind): number => result.changes.filter((c) => c.kind === k).length;
  return {
    notes: result.notes.length,
    yes: result.changes.filter((c) => c.value === "yes").length,
    no: result.changes.filter((c) => c.value === "no").length,
    new: by("new"),
    same: by("same"),
    different: by("different"),
    differ: by("differ"),
    notChecked: result.notChecked,
  };
}

/** What the file said about a detail before the round, by the App's own words: unknown, yes, no or differ. */
export function beforeValue(r: Resolution): "unknown" | "yes" | "no" | "differ" {
  return r.kind === "agree" ? r.value : r.kind;
}

/** The columns of the answers' CSV, named by the App's keys so the file reads the same in either language. */
export const ROUND_CSV_COLUMNS = ["visited_on", "place_name", "address", "house_number", "detail", "answer", "before", "change", "source", "licence", "note_id"] as const;

/**
 * Every Yes and No of the round as a CSV, one row per answer in the round's
 * order: what was found, what the file said before and how the two sit
 * together, with the source, licence and the id of the new note. Cells are
 * guarded like the App's own CSV, with a byte-order mark and CRLF line ends.
 */
export function roundCsv(result: RoundResult, s: RoundSettings): string {
  const rows: string[][] = [[...ROUND_CSV_COLUMNS]];
  for (const c of result.changes) {
    rows.push([
      s.visitedOn.trim(),
      c.place.name,
      c.place.address ?? "",
      parseStreet(c.place.address)?.number ?? "",
      c.key,
      c.value,
      beforeValue(c.place.resolutions[c.key]),
      c.kind,
      s.source.trim(),
      s.licence,
      c.noteId,
    ]);
  }
  return `\uFEFF${rows.map((r) => r.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

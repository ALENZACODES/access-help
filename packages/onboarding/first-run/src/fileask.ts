import type { Locale } from "../../switch-first/src/index";
import type { ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import { checkFile } from "./filecheck";
import { searchPlaces } from "./filereader";
import type { Requirement } from "./filter";
import { csvField, guardCell } from "./notes-csv";
import { buildPlan, plannedQuestions, type PlannedQuestion, type QuestionReason } from "./plan";
import { groupPlaces, type Place } from "./places";

/**
 * "Questions to ask": for the places in one notes export, the questions to put
 * to each place, using the App's own visit-plan questions. A detail gets a
 * question when no note records it (UNKNOWN), when reports differ, and, if the
 * person wants, when its newest record is a year old or more ("is this still
 * the case?"). It is a list for calls and visits: it calls no one, changes no
 * note, and an answer only becomes a record when the person adds a note with a
 * source, a licence and a date.
 */

export const ASK_REASONS: readonly QuestionReason[] = ["unknown", "differ", "old"];

/** How the list is ordered: place by place (for calling or visiting each place), or detail by detail (for asking one thing everywhere). */
export type AskOrder = "place" | "detail";
export const ASK_ORDERS: readonly AskOrder[] = ["place", "detail"];

export interface AskOptions {
  /** Details to ask about; empty means every detail. */
  readonly keys: readonly FactKey[];
  readonly includeOld: boolean;
  /** Words in the place name or address; empty for every place. */
  readonly query: string;
  readonly order: AskOrder;
}

export const DEFAULT_ASK: AskOptions = { keys: [], includeOld: true, query: "", order: "place" };

/** One detail and every place to ask about it, in name order. */
export interface AskDetail {
  readonly key: FactKey;
  readonly items: ReadonlyArray<{ readonly place: Place; readonly question: PlannedQuestion }>;
}

export interface AskPlace {
  readonly place: Place;
  readonly questions: readonly PlannedQuestion[];
}

export interface AskList {
  /** Places with at least one question, in name order. */
  readonly places: readonly AskPlace[];
  /** Places searched that have nothing to ask about the chosen details. */
  readonly nothingToAsk: number;
  readonly counts: Readonly<Record<QuestionReason, number>>;
}

export interface AskFile {
  readonly places: readonly Place[];
  readonly notes: number;
  readonly leftOut: number;
}

export type AskRead = { readonly ok: true; readonly file: AskFile } | { readonly ok: false; readonly error: ImportError | "no-notes" };

export function readAskFile(text: string, today: Date, locale: Locale): AskRead {
  const r = checkFile(text, today);
  if (!r.ok) return { ok: false, error: r.error };
  if (r.check.readable.length === 0) return { ok: false, error: "no-notes" };
  return { ok: true, file: { places: groupPlaces(r.check.readable, locale), notes: r.check.readable.length, leftOut: r.check.totals.leftOut } };
}

/** The details asked about, in the App's order. */
export function chosenKeys(opts: AskOptions): FactKey[] {
  return opts.keys.length === 0 ? [...FACT_KEYS] : FACT_KEYS.filter((k) => opts.keys.includes(k));
}

/**
 * The questions for one place. The plan asks for "yes" on each chosen detail
 * only so the App's plan can be reused; the wanted value never changes which
 * questions are asked, because recorded answers are only asked about again
 * when they are old.
 */
export function questionsForPlace(place: Place, opts: AskOptions, locale: Locale, today: Date): PlannedQuestion[] {
  const req: Requirement = Object.fromEntries(chosenKeys(opts).map((k) => [k, "yes"]));
  const all = plannedQuestions(buildPlan(place, req), locale, today);
  return opts.includeOld ? all : all.filter((q) => q.reason !== "old");
}

export function askList(file: AskFile, opts: AskOptions, locale: Locale, today: Date): AskList {
  const counts: Record<QuestionReason, number> = { unknown: 0, differ: 0, old: 0 };
  const places: AskPlace[] = [];
  let nothingToAsk = 0;
  for (const place of searchPlaces(file.places, opts.query)) {
    const questions = questionsForPlace(place, opts, locale, today);
    if (questions.length === 0) {
      nothingToAsk++;
      continue;
    }
    for (const q of questions) counts[q.reason]++;
    places.push({ place, questions });
  }
  return { places, nothingToAsk, counts };
}

/** The same questions, detail by detail. Details with nothing to ask are left out; places keep name order. */
export function byDetail(list: AskList): AskDetail[] {
  return FACT_KEYS.map((key) => ({
    key,
    items: list.places.flatMap((p) => p.questions.filter((q) => q.key === key).map((question) => ({ place: p.place, question }))),
  })).filter((d) => d.items.length > 0);
}

export function isAskOrder(s: string | undefined | null): s is AskOrder {
  return s === "place" || s === "detail";
}

/** The columns of the CSV: one row per question, with blank columns to write the answer, who gave it and the date. */
export const ASK_CSV_COLUMNS = ["place_name", "address", "detail", "reason", "question", "answer", "answered_by", "answered_on"] as const;

export function askCsv(list: AskList): string {
  const rows: string[][] = [[...ASK_CSV_COLUMNS]];
  for (const p of list.places) {
    for (const q of p.questions) rows.push([p.place.name, p.place.address ?? "", q.key, q.reason, q.text, "", "", ""]);
  }
  // Same form as the App's notes CSV: a byte-order mark so spreadsheets read the accents, and CRLF line ends.
  return `\uFEFF${rows.map((r) => r.map((c) => csvField(guardCell(c))).join(",")).join("\r\n")}\r\n`;
}

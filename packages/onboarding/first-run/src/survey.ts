import { FACT_KEYS, OPEN_LICENCES, isIsoDate, type FactKey, type Tri } from "./facts";
import { isoDate, toNote, validateForm, type FieldError, type FormValues, type IdMaker, defaultIdMaker } from "./form";
import { LIMITS, type Note } from "./model";
import { placeId, type Place } from "./places";
import type { KeyValueStore } from "./store";

/**
 * A survey walk: one or more places visited in a row (a plaza, a street, a
 * mall), asked about one detail at a time, then reviewed and saved as one
 * note per place. It is built for people who use a switch, a keyboard or a
 * screen reader: one question per screen, three large answers, and a way back.
 *
 * - "Not sure" leaves the detail UNKNOWN. Nothing is ever filled in for the
 *   person, and no answer is the default.
 * - The licence and the date are chosen once for the whole walk. The licence
 *   has no default; the date cannot be in the future.
 * - Every note is built by the same `toNote` as the add-a-note form, so the
 *   same rules apply: place name, no email address or phone number, an open
 *   licence, and source "Contributor report" on every Yes or No.
 * - A place with no Yes or No answer is not saved: it would say nothing.
 * - The walk is kept on this device only, so it can be finished later.
 */
export const SURVEY_KEY = "app.onboarding.survey.v1";
export const MAX_STOPS = 12;

export type SurveyPhase = "plan" | "ask" | "review";

export interface SurveyStop {
  /** Same id as the places list uses, so the same place is never added twice. */
  readonly id: string;
  readonly placeName: string;
  readonly address: string;
  /** The details asked at this stop, in the App's order. */
  readonly keys: readonly FactKey[];
  /** Only keys in `keys` are present. A key not answered yet is absent. */
  readonly answers: Readonly<Partial<Record<FactKey, Tri>>>;
}

export interface Survey {
  readonly stops: readonly SurveyStop[];
  readonly observedOn: string;
  /** Empty until the person picks one. */
  readonly licence: string;
  readonly phase: SurveyPhase;
  /** The stop and the question within it, while asking. */
  readonly stop: number;
  readonly q: number;
  /** True when a question was opened from the review, so answering it goes back there. */
  readonly fromReview: boolean;
}

export type StopErrorCode = FieldError["code"] | "duplicate" | "full" | "no-keys";

export interface StopError {
  readonly field: "placeName" | "address" | "stops";
  readonly code: StopErrorCode;
}

export type StartErrorCode = "no-stops" | FieldError["code"];

export interface StartError {
  readonly field: "stops" | "observedOn" | "licence";
  readonly code: StartErrorCode;
}

export function emptySurvey(today: Date): Survey {
  return { stops: [], observedOn: isoDate(today), licence: "", phase: "plan", stop: 0, q: 0, fromReview: false };
}

export function isEmptySurvey(s: Survey): boolean {
  return s.stops.length === 0 && s.licence === "";
}

/** A form with only the place filled in, so the place rules are the add-a-note form's rules. */
function placeForm(placeName: string, address: string, today: Date): FormValues {
  const details = Object.fromEntries(FACT_KEYS.map((k) => [k, "yes"])) as Record<FactKey, Tri>;
  return { placeName, address, details, observedOn: isoDate(today), licence: OPEN_LICENCES[0] ?? "", note: "" };
}

export function stopId(placeName: string, address: string): string {
  return placeId({ placeName: placeName.trim(), address: address.trim() === "" ? undefined : address.trim() });
}

export type StopAddResult = { readonly ok: true; readonly survey: Survey } | { readonly ok: false; readonly errors: readonly StopError[] };

/** Adds a stop at the end. Keys default to every detail; they keep the App's order and appear once. */
export function addStop(s: Survey, placeName: string, address: string, today: Date, keys: readonly FactKey[] = FACT_KEYS): StopAddResult {
  const errors: StopError[] = validateForm(placeForm(placeName, address, today), today)
    .filter((e): e is FieldError & { field: "placeName" | "address" } => e.field === "placeName" || e.field === "address")
    .map((e) => ({ field: e.field, code: e.code }));
  if (errors.length > 0) return { ok: false, errors };
  if (s.stops.length >= MAX_STOPS) return { ok: false, errors: [{ field: "stops", code: "full" }] };
  const ordered = FACT_KEYS.filter((k) => keys.includes(k));
  if (ordered.length === 0) return { ok: false, errors: [{ field: "stops", code: "no-keys" }] };
  const id = stopId(placeName, address);
  if (s.stops.some((x) => x.id === id)) return { ok: false, errors: [{ field: "placeName", code: "duplicate" }] };
  const stop: SurveyStop = { id, placeName: placeName.trim(), address: address.trim(), keys: ordered, answers: {} };
  return { ok: true, survey: { ...backToPlan(s), stops: [...s.stops, stop] } };
}

/** The details of a known place that have no record or whose reports differ: the ones worth asking about. */
export function openKeys(place: Place): FactKey[] {
  return FACT_KEYS.filter((k) => place.resolutions[k].kind !== "agree");
}

/** Adds a place from the places list, asking only its open details. */
export function addPlaceStop(s: Survey, place: Place, today: Date): StopAddResult {
  return addStop(s, place.name, place.address ?? "", today, openKeys(place));
}

function inRange(s: Survey, i: number): boolean {
  return Number.isInteger(i) && i >= 0 && i < s.stops.length;
}

/**
 * Changing the list of places is planning: it always goes back to the plan,
 * so the position can never point past a place's questions.
 */

/** Removes a stop. Out-of-range indexes change nothing. */
export function removeStop(s: Survey, i: number): Survey {
  if (!inRange(s, i)) return s;
  return { ...backToPlan(s), stops: s.stops.filter((_, n) => n !== i) };
}

/** Moves a stop up (-1) or down (+1). Moving past either end changes nothing. */
export function moveStop(s: Survey, i: number, by: -1 | 1): Survey {
  const j = i + by;
  if (!inRange(s, i) || !inRange(s, j)) return s;
  const stops = [...s.stops];
  const a = stops[i] as SurveyStop;
  stops[i] = stops[j] as SurveyStop;
  stops[j] = a;
  return { ...backToPlan(s), stops };
}

export function setLicence(s: Survey, licence: string): Survey {
  return { ...s, licence: OPEN_LICENCES.includes(licence) ? licence : "" };
}

export function setObservedOn(s: Survey, observedOn: string): Survey {
  return { ...s, observedOn: observedOn.trim().slice(0, 10) };
}

/** What stops the walk from starting. Empty when it can start. */
export function startErrors(s: Survey, today: Date): StartError[] {
  const errors: StartError[] = [];
  if (s.stops.length === 0) errors.push({ field: "stops", code: "no-stops" });
  const form: FormValues = { ...placeForm("x", "", today), observedOn: s.observedOn, licence: s.licence };
  for (const e of validateForm(form, today)) {
    if (e.field === "observedOn" || e.field === "licence") errors.push({ field: e.field, code: e.code });
  }
  return errors;
}

export type StartResult = { readonly ok: true; readonly survey: Survey } | { readonly ok: false; readonly errors: readonly StartError[] };

/** Starts (or restarts) asking at the first question not answered yet, or the review when all are answered. */
export function startSurvey(s: Survey, today: Date): StartResult {
  const errors = startErrors(s, today);
  if (errors.length > 0) return { ok: false, errors };
  const next = firstOpen(s);
  if (!next) return { ok: true, survey: { ...s, phase: "review", stop: 0, q: 0, fromReview: false } };
  return { ok: true, survey: { ...s, phase: "ask", stop: next.stop, q: next.q, fromReview: false } };
}

function firstOpen(s: Survey): { stop: number; q: number } | undefined {
  for (let i = 0; i < s.stops.length; i++) {
    const st = s.stops[i] as SurveyStop;
    const q = st.keys.findIndex((k) => st.answers[k] === undefined);
    if (q >= 0) return { stop: i, q };
  }
  return undefined;
}

export interface Current {
  readonly stop: SurveyStop;
  readonly stopIndex: number;
  readonly key: FactKey;
  readonly q: number;
}

/** The question on screen, or undefined outside the asking phase. */
export function currentQuestion(s: Survey): Current | undefined {
  if (s.phase !== "ask") return undefined;
  const stop = s.stops[s.stop];
  const key = stop?.keys[s.q];
  if (!stop || !key) return undefined;
  return { stop, stopIndex: s.stop, key, q: s.q };
}

function withAnswer(s: Survey, stopIndex: number, key: FactKey, value: Tri): Survey {
  const stops = s.stops.map((st, i) => (i === stopIndex ? { ...st, answers: { ...st.answers, [key]: value } } : st));
  return { ...s, stops };
}

/** Moves to the question after (stop, q), or to the review after the last one. */
function after(s: Survey, stop: number, q: number): Survey {
  const st = s.stops[stop];
  if (st && q + 1 < st.keys.length) return { ...s, phase: "ask", stop, q: q + 1 };
  if (stop + 1 < s.stops.length) return { ...s, phase: "ask", stop: stop + 1, q: 0 };
  return { ...s, phase: "review", stop: 0, q: 0, fromReview: false };
}

/** Records the answer on screen and moves on. From the review, it goes back to the review. */
export function answerQuestion(s: Survey, value: Tri): Survey {
  const c = currentQuestion(s);
  if (!c) return s;
  const next = withAnswer(s, c.stopIndex, c.key, value);
  if (s.fromReview) return { ...next, phase: "review", stop: 0, q: 0, fromReview: false };
  return after(next, c.stopIndex, c.q);
}

/** One question back; from the first question, back to planning. Answers are kept. */
export function stepBack(s: Survey): Survey {
  if (s.phase === "review") {
    const last = s.stops.length - 1;
    const st = s.stops[last];
    if (!st) return { ...s, phase: "plan" };
    return { ...s, phase: "ask", stop: last, q: st.keys.length - 1, fromReview: false };
  }
  if (s.phase !== "ask") return s;
  if (s.fromReview) return { ...s, phase: "review", stop: 0, q: 0, fromReview: false };
  if (s.q > 0) return { ...s, q: s.q - 1 };
  if (s.stop > 0) {
    const prev = s.stops[s.stop - 1] as SurveyStop;
    return { ...s, stop: s.stop - 1, q: prev.keys.length - 1 };
  }
  return { ...s, phase: "plan", stop: 0, q: 0 };
}

/** Leaves the place on screen: its questions not answered yet stay UNKNOWN. */
export function leaveStop(s: Survey): Survey {
  const c = currentQuestion(s);
  if (!c) return s;
  let next = s;
  for (const k of c.stop.keys.slice(c.q)) if (c.stop.answers[k] === undefined) next = withAnswer(next, c.stopIndex, k, "unknown");
  if (s.fromReview) return { ...next, phase: "review", stop: 0, q: 0, fromReview: false };
  return after(next, c.stopIndex, c.stop.keys.length - 1);
}

/** Opens one question from the review, to change its answer. */
export function editAnswer(s: Survey, stopIndex: number, key: FactKey): Survey {
  const st = s.stops[stopIndex];
  const q = st ? st.keys.indexOf(key) : -1;
  if (!st || q < 0) return s;
  return { ...s, phase: "ask", stop: stopIndex, q, fromReview: true };
}

export function backToPlan(s: Survey): Survey {
  return { ...s, phase: "plan", stop: 0, q: 0, fromReview: false };
}

export interface Progress {
  /** Questions passed so far, over all stops. */
  readonly done: number;
  readonly total: number;
}

export function surveyProgress(s: Survey): Progress {
  const total = s.stops.reduce((n, st) => n + st.keys.length, 0);
  const done = s.stops.reduce((n, st) => n + st.keys.filter((k) => st.answers[k] !== undefined).length, 0);
  return { done, total };
}

/** The answer for a detail at a stop as it would be saved: anything not answered Yes or No is UNKNOWN. */
export function savedValue(stop: SurveyStop, key: FactKey): Tri {
  const a = stop.answers[key];
  return a === "yes" || a === "no" ? a : "unknown";
}

export function hasAnswer(stop: SurveyStop): boolean {
  return FACT_KEYS.some((k) => savedValue(stop, k) !== "unknown");
}

/** The add-a-note form values for one stop. Details not asked or not answered stay UNKNOWN. */
export function stopForm(s: Survey, stop: SurveyStop): FormValues {
  const details = Object.fromEntries(FACT_KEYS.map((k) => [k, savedValue(stop, k)])) as Record<FactKey, Tri>;
  return { placeName: stop.placeName, address: stop.address, details, observedOn: s.observedOn, licence: s.licence, note: "" };
}

export interface SaveOutcome {
  readonly notes: readonly Note[];
  /** Places left out because no question got a Yes or No. */
  readonly skipped: readonly string[];
}

/** One note per stop with at least one Yes or No. Throws if the walk has errors, like `toNote`. */
export function surveyToNotes(s: Survey, today: Date, makeId: IdMaker = defaultIdMaker): SaveOutcome {
  const notes: Note[] = [];
  const skipped: string[] = [];
  for (const st of s.stops) {
    if (hasAnswer(st)) notes.push(toNote(stopForm(s, st), today, makeId));
    else skipped.push(st.placeName);
  }
  return { notes, skipped };
}

// ---- Kept on this device, read back defensively ----

const TRIS: readonly string[] = ["yes", "no", "unknown"];

function parseStop(raw: unknown, today: Date): SurveyStop | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const name = typeof o["placeName"] === "string" ? o["placeName"].slice(0, LIMITS.placeName) : "";
  const address = typeof o["address"] === "string" ? o["address"].slice(0, LIMITS.address) : "";
  const keys = Array.isArray(o["keys"]) ? FACT_KEYS.filter((k) => (o["keys"] as unknown[]).includes(k)) : [];
  const added = addStop({ ...emptySurvey(today) }, name, address, today, keys);
  if (!added.ok) return undefined;
  const stop = added.survey.stops[0] as SurveyStop;
  const a = o["answers"] && typeof o["answers"] === "object" ? (o["answers"] as Record<string, unknown>) : {};
  const answers: Partial<Record<FactKey, Tri>> = {};
  for (const k of stop.keys) {
    const v = a[k];
    if (typeof v === "string" && TRIS.includes(v)) answers[k] = v as Tri;
  }
  return { ...stop, answers };
}

/** Reads a saved walk. Bad stops are dropped; a bad position goes back to planning. Never throws. */
export function parseSurvey(raw: string | null, today: Date): Survey | undefined {
  if (!raw) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const o = data as Record<string, unknown>;
  const stops: SurveyStop[] = [];
  for (const r of Array.isArray(o["stops"]) ? o["stops"] : []) {
    const st = parseStop(r, today);
    if (st && stops.length < MAX_STOPS && !stops.some((x) => x.id === st.id)) stops.push(st);
  }
  const observedOn = typeof o["observedOn"] === "string" && isIsoDate(o["observedOn"]) ? o["observedOn"] : isoDate(today);
  const licence = typeof o["licence"] === "string" && OPEN_LICENCES.includes(o["licence"]) ? o["licence"] : "";
  const base: Survey = { ...emptySurvey(today), stops, observedOn, licence };
  const phase = o["phase"];
  if (phase === "review" && stops.length > 0) return { ...base, phase: "review" };
  if (phase === "ask") {
    const stop = Number(o["stop"]);
    const q = Number(o["q"]);
    const st = Number.isInteger(stop) ? stops[stop] : undefined;
    if (st && Number.isInteger(q) && q >= 0 && q < st.keys.length) return { ...base, phase: "ask", stop, q, fromReview: o["fromReview"] === true };
  }
  return base;
}

export function loadSurvey(store: KeyValueStore | undefined, today: Date): Survey | undefined {
  try {
    return parseSurvey(store?.getItem(SURVEY_KEY) ?? null, today);
  } catch {
    return undefined;
  }
}

export type SurveySaveResult = "saved" | "cleared" | "unavailable";

/** Saves the walk, or removes it when there is nothing in it. */
export function saveSurvey(store: KeyValueStore | undefined, s: Survey): SurveySaveResult {
  if (!store) return "unavailable";
  try {
    if (isEmptySurvey(s)) {
      store.removeItem(SURVEY_KEY);
      return "cleared";
    }
    store.setItem(SURVEY_KEY, JSON.stringify(s));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function clearSurvey(store: KeyValueStore | undefined): void {
  try {
    store?.removeItem(SURVEY_KEY);
  } catch {
    /* nothing to clear */
  }
}

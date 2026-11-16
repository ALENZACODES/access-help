import { FACT_KEYS, type FactKey } from "./facts";
import { looksLikeEmail, looksLikePhone } from "./form";
import { hasControlChars } from "./model";
import type { Place } from "./places";
import { PLACE_ID } from "./shortlist";
import type { KeyValueStore } from "./store";

/**
 * "What I asked": for each question in a visit plan, a person can tick that
 * they asked it and type down what the place said. These are the person's own
 * notes. They are not reports: a detail stays Unknown in the places view until
 * a report is added with a source, a licence and a date.
 */
export const CHECKLIST_KEY = "app.onboarding.checklist.v1";
export const ANSWER_MAX = 300;
export const MAX_CHECKLIST_PLACES = 50;

export interface ChecklistEntry {
  readonly asked: boolean;
  readonly answer: string;
}

export type PlaceChecklist = Readonly<Partial<Record<FactKey, ChecklistEntry>>>;
export type Checklist = Readonly<Record<string, PlaceChecklist>>;

export type AnswerError = "too-long" | "control-chars" | "personal-email" | "personal-phone";

export const EMPTY_ENTRY: ChecklistEntry = { asked: false, answer: "" };

export function checkAnswer(text: string): AnswerError | undefined {
  if (text.length > ANSWER_MAX) return "too-long";
  if (hasControlChars(text)) return "control-chars";
  if (looksLikeEmail(text)) return "personal-email";
  if (looksLikePhone(text)) return "personal-phone";
  return undefined;
}

function parseEntry(v: unknown): ChecklistEntry | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const asked = o["asked"] === true;
  const answer = typeof o["answer"] === "string" ? o["answer"].trim() : "";
  if (checkAnswer(answer) !== undefined) return undefined;
  return asked || answer !== "" ? { asked, answer } : undefined;
}

export function parseChecklist(raw: string | null | undefined): Checklist {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out: Record<string, PlaceChecklist> = {};
  for (const [id, v] of Object.entries(data as Record<string, unknown>)) {
    if (!PLACE_ID.test(id) || !v || typeof v !== "object") continue;
    const place: Partial<Record<FactKey, ChecklistEntry>> = {};
    for (const k of FACT_KEYS) {
      const e = parseEntry((v as Record<string, unknown>)[k]);
      if (e) place[k] = e;
    }
    if (Object.keys(place).length > 0) out[id] = place;
    if (Object.keys(out).length >= MAX_CHECKLIST_PLACES) break;
  }
  return out;
}

export function loadChecklist(store: KeyValueStore | undefined): Checklist {
  try {
    return parseChecklist(store?.getItem(CHECKLIST_KEY));
  } catch {
    return {};
  }
}

export function saveChecklist(store: KeyValueStore | undefined, list: Checklist): "saved" | "unavailable" {
  if (!store) return "unavailable";
  try {
    const clean = parseChecklist(JSON.stringify(list));
    if (Object.keys(clean).length === 0) store.removeItem(CHECKLIST_KEY);
    else store.setItem(CHECKLIST_KEY, JSON.stringify(clean));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function entryFor(list: Checklist, placeId: string, key: FactKey): ChecklistEntry {
  return list[placeId]?.[key] ?? EMPTY_ENTRY;
}

function withEntry(list: Checklist, placeId: string, key: FactKey, entry: ChecklistEntry): Checklist {
  const place: Partial<Record<FactKey, ChecklistEntry>> = { ...(list[placeId] ?? {}) };
  if (!entry.asked && entry.answer === "") delete place[key];
  else place[key] = entry;
  const next: Record<string, PlaceChecklist> = { ...list };
  if (Object.keys(place).length === 0) delete next[placeId];
  else next[placeId] = place;
  return next;
}

export function setAsked(list: Checklist, placeId: string, key: FactKey, asked: boolean): Checklist {
  if (!PLACE_ID.test(placeId)) return list;
  if (!(placeId in list) && Object.keys(list).length >= MAX_CHECKLIST_PLACES) return list;
  return withEntry(list, placeId, key, { ...entryFor(list, placeId, key), asked });
}

export type AnswerResult = { readonly ok: true; readonly list: Checklist } | { readonly ok: false; readonly error: AnswerError };

/** Typing an answer does not tick "asked" for the person, and ticking does not need an answer. */
export function setAnswer(list: Checklist, placeId: string, key: FactKey, text: string): AnswerResult {
  const answer = text.trim();
  const error = checkAnswer(answer);
  if (error) return { ok: false, error };
  if (!PLACE_ID.test(placeId)) return { ok: true, list };
  if (!(placeId in list) && Object.keys(list).length >= MAX_CHECKLIST_PLACES) return { ok: true, list };
  return { ok: true, list: withEntry(list, placeId, key, { ...entryFor(list, placeId, key), answer }) };
}

export function clearPlaceChecklist(list: Checklist, placeId: string): Checklist {
  const next: Record<string, PlaceChecklist> = { ...list };
  delete next[placeId];
  return next;
}

export function hasChecklist(list: Checklist, placeId: string): boolean {
  return Object.keys(list[placeId] ?? {}).length > 0;
}

/** Drops notes for places that no longer exist. */
export function pruneChecklist(list: Checklist, places: readonly Place[]): Checklist {
  const known = new Set(places.map((p) => p.id));
  return Object.fromEntries(Object.entries(list).filter(([id]) => known.has(id)));
}

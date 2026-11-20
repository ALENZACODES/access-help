import type { Locale } from "../../switch-first/src/index";
import { FACT_KEYS, type FactKey } from "./facts";
import type { Place } from "./places";
import { QUESTIONS } from "./plan";

/**
 * The details worth asking a place about when nothing else is chosen: those
 * with no record (UNKNOWN) and those whose reports differ, in the App's detail
 * order. A detail with one agreed answer is not asked about here; the person
 * can still ask anything they like.
 */
export function placeQuestionKeys(place: Place): FactKey[] {
  return FACT_KEYS.filter((k) => place.resolutions[k].kind !== "agree");
}

export function placeQuestions(place: Place, locale: Locale): string[] {
  return placeQuestionKeys(place).map((k) => QUESTIONS[k][locale]);
}

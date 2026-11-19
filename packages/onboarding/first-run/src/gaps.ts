import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { FACT_KEYS, type FactKey } from "./facts";
import type { Requirement } from "./filter";
import type { Place } from "./places";
import { QUESTIONS } from "./plan";

/**
 * Details with no record, one detail at a time. For each detail the App lists
 * the places where no note gives a Yes or a No, so the detail stays UNKNOWN
 * there. It is a list of what to ask. It does not say the answer is No, it
 * does not guess an answer, and it does not change any note.
 */
export interface DetailGaps {
  readonly key: FactKey;
  /** Places with no record for this detail, by name, then id. */
  readonly places: readonly Place[];
}

const byName = (a: Place, b: Place): number => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

/** True when no note gives a Yes or a No for this detail at this place. */
export function hasNoRecord(place: Place, key: FactKey): boolean {
  return place.resolutions[key].kind === "unknown";
}

/**
 * One entry for every detail asked for, in the App's detail order, even when
 * no place is missing it. With no keys given, every detail is listed.
 */
export function detailGaps(places: readonly Place[], keys: readonly FactKey[] = FACT_KEYS): DetailGaps[] {
  const wanted = new Set(keys);
  return FACT_KEYS.filter((key) => wanted.has(key)).map((key) => ({ key, places: places.filter((p) => hasNoRecord(p, key)).sort(byName) }));
}

/** The details in a person's must-haves, in the App's detail order. The answer wanted does not matter here: a gap is a gap. */
export function needKeys(needs: Requirement): FactKey[] {
  return FACT_KEYS.filter((key) => needs[key] !== undefined);
}

/** Detail-and-place pairs with no record, added up. */
export function gapTotal(list: readonly DetailGaps[]): number {
  return list.reduce((n, g) => n + g.places.length, 0);
}

/** Places missing at least one detail, each counted once. */
export function placesWithGaps(list: readonly DetailGaps[]): number {
  return new Set(list.flatMap((g) => g.places.map((p) => p.id))).size;
}

/** The detail keys a place has no record for, in the App's detail order. */
export function gapsOfPlace(place: Place): FactKey[] {
  return FACT_KEYS.filter((key) => hasNoRecord(place, key));
}

/** "2 places", "1 place"; "2 lieux", "1 lieu". */
export function placeCount(n: number, locale: Locale): string {
  if (locale === "fr") return `${n} ${n > 1 ? "lieux" : "lieu"}`;
  return `${n} ${n === 1 ? "place" : "places"}`;
}

/** The question to ask about a detail, in the language on screen. */
export function gapQuestion(key: FactKey, locale: Locale): string {
  return QUESTIONS[key][locale];
}

const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

/** The page as a plain text file a person can keep, print or read to someone on the phone. */
export function gapsToText(list: readonly DetailGaps[], placeTotal: number, locale: Locale, today: Date, onlyNeeds = false): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(COPY.gaps.title, l);
  const lines: string[] = [title, rule(title), "", t(COPY.gaps.intro, l), t(COPY.gaps.notNo, l)];
  if (onlyNeeds) lines.push(t(COPY.gaps.showingNeeds, l));
  lines.push("");
  if (placeTotal === 0) {
    lines.push(t(COPY.gaps.noPlaces, l), "");
  } else {
    lines.push(`${t(COPY.gaps.placesMissing, l)}${colon} ${placesWithGaps(list)} / ${placeTotal}`, "");
    for (const g of list) {
      const name = t(COPY.facts[g.key], l);
      lines.push(`${name} (${placeCount(g.places.length, l)})`, rule(name, "-"));
      if (g.places.length === 0) {
        lines.push(t(COPY.gaps.allRecorded, l));
      } else {
        lines.push(`${t(COPY.gaps.ask, l)}${colon} ${gapQuestion(g.key, l)}`);
        for (const p of g.places) lines.push(p.address ? `- ${p.name}, ${p.address}` : `- ${p.name}`);
      }
      lines.push("");
    }
  }
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function gapsFilename(today: Date, locale: Locale): string {
  return `${locale === "fr" ? "details-sans-donnee" : "details-with-no-record"}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}

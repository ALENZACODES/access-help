import type { Locale } from "../../switch-first/src/index";
import { NB, t, type Pair } from "./copy";
import { FACT_KEYS } from "./facts";
import { esc } from "./html";
import type { Place } from "./places";

/**
 * How many of the App's details have at least one record at each place, as a
 * spread: how many places have 0, 1, 2… of them recorded. A detail with reports
 * that differ counts as recorded; a detail with no record stays UNKNOWN and is
 * not counted. This says how much is known, never whether a place is good.
 */
export const COVERAGE_COPY = {
  title: { en: "How much is recorded", fr: "Ce qui est enregistré" },
  intro: {
    en: "For each place, how many of the details have at least one record. The rest stay Unknown.",
    fr: "Pour chaque lieu, combien de détails ont au moins une donnée. Les autres restent UNKNOWN.",
  },
  notRank: {
    en: "More records do not make a place better. They only mean more is written down.",
    fr: "Plus de données ne rendent pas un lieu meilleur. Cela veut seulement dire que plus de choses sont notées.",
  },
} as const satisfies Record<string, Pair>;

export function recordedCount(place: Place): number {
  return FACT_KEYS.filter((k) => place.resolutions[k].kind !== "unknown").length;
}

/** spread[n] = number of places with exactly n details recorded, for n = 0 … number of details. */
export function coverageSpread(places: readonly Place[]): number[] {
  const spread = new Array<number>(FACT_KEYS.length + 1).fill(0);
  for (const p of places) {
    const n = recordedCount(p);
    spread[n] = (spread[n] ?? 0) + 1;
  }
  return spread;
}

/** "2 of 4 details recorded", "2 détails sur 4 enregistrés". */
export function coverageLabel(n: number, total: number, locale: Locale): string {
  if (locale === "fr") return `${n} ${n > 1 ? "détails" : "détail"} sur ${total} ${n > 1 ? "enregistrés" : "enregistré"}`;
  return `${n} of ${total} ${total === 1 ? "detail" : "details"} recorded`;
}

/** "3 places", "1 place"; "3 lieux", "1 lieu". */
export function placesWord(n: number, locale: Locale): string {
  if (locale === "fr") return `${n} ${n > 1 ? "lieux" : "lieu"}`;
  return `${n} ${n === 1 ? "place" : "places"}`;
}

/** The section on the summary page: a list from most recorded to least, as counts only. */
export function renderCoverage(places: readonly Place[], locale: Locale): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const spread = coverageSpread(places);
  const rows: string[] = [];
  for (let n = spread.length - 1; n >= 0; n--) {
    rows.push(`<li data-recorded="${n}">${esc(coverageLabel(n, FACT_KEYS.length, l))}${colon} <strong data-coverage-count="${n}">${spread[n] ?? 0}</strong></li>`);
  }
  return (
    `<section class="coverage" aria-labelledby="coverage-title"><h3 id="coverage-title">${esc(t(COVERAGE_COPY.title, l))}</h3>` +
    `<p>${esc(t(COVERAGE_COPY.intro, l))}</p><p class="hint">${esc(t(COVERAGE_COPY.notRank, l))}</p>` +
    `<ul class="totals">${rows.join("")}</ul></section>`
  );
}

/** The same section as text lines for the summary file, most recorded first. */
export function coverageLines(places: readonly Place[], locale: Locale): string[] {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const spread = coverageSpread(places);
  const title = t(COVERAGE_COPY.title, l);
  const lines = [title, "-".repeat(Math.min(title.length, 72)), t(COVERAGE_COPY.intro, l), t(COVERAGE_COPY.notRank, l)];
  for (let n = spread.length - 1; n >= 0; n--) lines.push(`- ${coverageLabel(n, FACT_KEYS.length, l)}${colon} ${placesWord(spread[n] ?? 0, l)}`);
  return lines;
}

export function coverageStrings(): Array<[string, Pair]> {
  return Object.entries(COVERAGE_COPY).map(([k, p]): [string, Pair] => [`COVERAGE_COPY.${k}`, p]);
}

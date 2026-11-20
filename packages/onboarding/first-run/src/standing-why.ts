import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import type { FactKey } from "./facts";
import type { Requirement } from "./filter";
import type { Place } from "./places";
import { buildPlan, type PlanStatus } from "./plan";

/**
 * Why a place is in its must-haves group: which must-haves the notes answer
 * the other way, and which are UNKNOWN or have reports that differ. It only
 * names details and statuses already on the visit plan. It adds no judgement.
 */
export const WHY_COPY = {
  notMet: { en: "Does not match", fr: "Ne correspond pas" },
  toAsk: { en: "To ask about", fr: "À demander" },
  differ: { en: "reports differ", fr: "rapports divergents" },
} as const satisfies Record<string, Pair>;

export interface Why {
  readonly notMet: readonly FactKey[];
  /** Must-haves with no record (UNKNOWN). */
  readonly unknown: readonly FactKey[];
  /** Must-haves whose reports differ. */
  readonly differ: readonly FactKey[];
}

export function whyOf(place: Place, needs: Requirement): Why {
  const items = buildPlan(place, needs).items;
  const of = (s: PlanStatus): FactKey[] => items.filter((i) => i.status === s).map((i) => i.key);
  return { notMet: of("not-met"), unknown: of("unknown"), differ: of("differ") };
}

/**
 * Plain lines for a place: "Does not match: Elevator" and
 * "To ask about: Accessible washroom (Unknown), Automatic door (reports differ)".
 * No line for a place where every must-have matches.
 */
export function whyLines(why: Why, locale: Locale): string[] {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const name = (k: FactKey): string => t(COPY.facts[k], l);
  const lines: string[] = [];
  if (why.notMet.length > 0) lines.push(`${t(WHY_COPY.notMet, l)}${colon} ${why.notMet.map(name).join(", ")}`);
  const ask = [
    ...why.unknown.map((k) => `${name(k)} (${t(COPY.plan.unknown, l)})`),
    ...why.differ.map((k) => `${name(k)} (${t(WHY_COPY.differ, l)})`),
  ];
  if (ask.length > 0) lines.push(`${t(WHY_COPY.toAsk, l)}${colon} ${ask.join(", ")}`);
  return lines;
}

export function whyStrings(): Array<[string, Pair]> {
  return Object.entries(WHY_COPY).map(([k, p]): [string, Pair] => [`WHY_COPY.${k}`, p]);
}

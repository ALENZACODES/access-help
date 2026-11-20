import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { FACT_KEYS, type FactKey } from "./facts";
import type { Requirement } from "./filter";
import type { Place } from "./places";
import { buildPlan } from "./plan";
import { whyLines, whyOf } from "./standing-why";

/**
 * The must-haves page: a person picks, for each detail, whether a place needs
 * a Yes, needs a No, or whether the detail is not a must-have. Choices are
 * saved on this device only. The page then says how the places in the notes
 * stand against them, as counts. Each place is counted once, in the first
 * group that applies: a must-have the notes answer the other way, then a
 * must-have that is UNKNOWN or has reports that differ, then every must-have
 * matched. It describes places, not people, and it does not rank places.
 */
export type NeedChoice = "yes" | "no" | "none";

export const NEED_CHOICES: readonly NeedChoice[] = ["yes", "no", "none"];

export function isNeedChoice(v: string | undefined): v is NeedChoice {
  return v === "yes" || v === "no" || v === "none";
}

export function choiceOf(needs: Requirement, key: FactKey): NeedChoice {
  return needs[key] ?? "none";
}

/** A new set of must-haves with one detail changed. "none" removes the detail. The input is not changed. */
export function setNeed(needs: Requirement, key: FactKey, choice: NeedChoice): Requirement {
  const out: Partial<Record<FactKey, "yes" | "no">> = {};
  for (const k of FACT_KEYS) {
    const v = k === key ? (choice === "none" ? undefined : choice) : needs[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export type StandGroup = "notMet" | "open" | "allMatch";

export const STAND_GROUPS: readonly StandGroup[] = ["allMatch", "open", "notMet"];

/** Where one place stands against the must-haves. Undefined when no must-have is saved. */
export function standOf(place: Place, needs: Requirement): StandGroup | undefined {
  const plan = buildPlan(place, needs);
  if (plan.items.length === 0) return undefined;
  if (plan.counts["not-met"] > 0) return "notMet";
  if (plan.counts.unknown > 0 || plan.counts.differ > 0) return "open";
  return "allMatch";
}

export interface NeedsStanding {
  readonly places: number;
  readonly groups: Readonly<Record<StandGroup, readonly Place[]>>;
}

/** Every place in exactly one group, each group sorted by name, then id. Empty groups when no must-have is saved. */
export function needsStanding(places: readonly Place[], needs: Requirement): NeedsStanding {
  const groups: Record<StandGroup, Place[]> = { allMatch: [], open: [], notMet: [] };
  for (const p of places) {
    const g = standOf(p, needs);
    if (g) groups[g].push(p);
  }
  for (const g of STAND_GROUPS) groups[g].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { places: places.length, groups };
}

export function standLabel(g: StandGroup, locale: Locale): string {
  return t(COPY.mustHaves.groups[g], locale);
}

/** "Step-free entrance: Yes", for each must-have in the App's detail order. */
export function needsLines(needs: Requirement, locale: Locale): string[] {
  const colon = locale === "fr" ? `${NB}:` : ":";
  return FACT_KEYS.filter((k) => needs[k] !== undefined).map((k) => `${t(COPY.facts[k], locale)}${colon} ${t(COPY.values[needs[k] as "yes" | "no"], locale)}`);
}

const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

/** The must-haves and where the places stand, as plain text. */
export function needsToText(places: readonly Place[], needs: Requirement, locale: Locale, today: Date): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(COPY.mustHaves.title, l);
  const lines = [title, rule(title), "", t(COPY.needs.intro, l), t(COPY.mustHaves.notPeople, l), ""];
  const mine = needsLines(needs, l);
  if (mine.length === 0) {
    lines.push(t(COPY.mustHaves.none, l), "");
  } else {
    lines.push(`${t(COPY.mustHaves.yours, l)}${colon}`, ...mine.map((x) => `- ${x}`), "");
    const s = needsStanding(places, needs);
    if (s.places === 0) lines.push(t(COPY.mustHaves.noPlaces, l), "");
    for (const g of s.places === 0 ? [] : STAND_GROUPS) {
      const head = `${standLabel(g, l)} (${s.groups[g].length})`;
      lines.push(head, rule(head, "-"));
      if (s.groups[g].length === 0) lines.push(t(COPY.mustHaves.emptyGroup, l));
      for (const p of s.groups[g]) {
        lines.push(p.address ? `- ${p.name}, ${p.address}` : `- ${p.name}`);
        for (const why of whyLines(whyOf(p, needs), l)) lines.push(`  * ${why}`);
      }
      lines.push("");
    }
  }
  lines.push(`${t(COPY.textExport.madeOn, l)} ${today.toISOString().slice(0, 10)}.`);
  return lines.join("\n") + "\n";
}

export function needsFilename(today: Date, locale: Locale): string {
  return `${locale === "fr" ? "mes-incontournables" : "my-must-haves"}-${today.toISOString().slice(0, 10)}-${locale}.txt`;
}

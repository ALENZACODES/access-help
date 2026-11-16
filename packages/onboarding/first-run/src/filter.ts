import type { Locale } from "../../switch-first/src/index";
import { FACT_KEYS, type FactKey } from "./facts";
import { noteFact, type Note } from "./model";

/** For each detail the person cares about: the value a place must have. */
export type Requirement = Partial<Record<FactKey, "yes" | "no">>;

export type Verdict = "match" | "unknown" | "excluded";

/**
 * Three-way evaluation. A note only matches when every requested detail is
 * recorded with the wanted value. A detail with no record puts the note in
 * "unknown": it is neither a match nor ruled out. A recorded opposite value
 * rules it out, and that beats unknown.
 */
export function evaluate(note: Note, req: Requirement): Verdict {
  let sawUnknown = false;
  for (const key of FACT_KEYS) {
    const wanted = req[key];
    if (!wanted) continue;
    const v = noteFact(note, key).value;
    if (v === "unknown") sawUnknown = true;
    else if (v !== wanted) return "excluded";
  }
  return sawUnknown ? "unknown" : "match";
}

export function foldText(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export interface Grouped {
  readonly matches: Note[];
  readonly unknown: Note[];
  readonly excluded: Note[];
}

export function groupNotes(
  notes: readonly Note[],
  req: Requirement,
  query: string,
  locale: Locale,
): Grouped {
  const q = foldText(query.trim());
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  const out: Grouped = { matches: [], unknown: [], excluded: [] };
  for (const n of notes) {
    if (q !== "" && !foldText(n.placeName).includes(q)) continue;
    const v = evaluate(n, req);
    (v === "match" ? out.matches : v === "unknown" ? out.unknown : out.excluded).push(n);
  }
  for (const list of [out.matches, out.unknown, out.excluded]) {
    list.sort((a, b) => collator.compare(a.placeName, b.placeName));
  }
  return out;
}

export function hasRequirement(req: Requirement): boolean {
  return FACT_KEYS.some((k) => req[k] !== undefined);
}

/** Sets or clears one requirement without mutating the original. */
export function withRequirement(req: Requirement, key: FactKey, value: "yes" | "no" | "any"): Requirement {
  const next: Record<string, "yes" | "no"> = {};
  for (const k of FACT_KEYS) {
    const v = k === key ? (value === "any" ? undefined : value) : req[k];
    if (v) next[k] = v;
  }
  return next as Requirement;
}

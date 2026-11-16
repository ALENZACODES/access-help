import type { Locale } from "../../switch-first/src/index";
import { FACT_KEYS } from "./facts";
import { reportCount, type Place } from "./places";

/**
 * Ways to order the list of places. None of them ranks places by how
 * accessible they are: "name" is alphabetical, "newest" is by the date of the
 * latest note, and "reports" is by how many recorded answers there are.
 */
export type SortKey = "name" | "newest" | "reports";

export const SORT_KEYS: readonly SortKey[] = ["name", "newest", "reports"];

export function isSortKey(v: string | undefined): v is SortKey {
  return v !== undefined && (SORT_KEYS as readonly string[]).includes(v);
}

/** Total number of recorded Yes or No reports across all details. */
export function reportTotal(p: Place): number {
  return FACT_KEYS.reduce((n, k) => n + reportCount(p.resolutions[k]), 0);
}

/** Date of the newest note about the place. */
export function newestNote(p: Place): string {
  return p.notes.reduce((best, n) => (n.createdOn > best ? n.createdOn : best), "");
}

export function sortPlaces(places: readonly Place[], key: SortKey, locale: Locale): Place[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  const byName = (a: Place, b: Place): number => collator.compare(a.name, b.name) || a.id.localeCompare(b.id);
  const list = [...places];
  switch (key) {
    case "name":
      return list.sort(byName);
    case "newest":
      return list.sort((a, b) => (newestNote(a) === newestNote(b) ? byName(a, b) : newestNote(a) < newestNote(b) ? 1 : -1));
    case "reports":
      return list.sort((a, b) => reportTotal(b) - reportTotal(a) || byName(a, b));
  }
}

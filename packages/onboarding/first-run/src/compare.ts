import { FACT_KEYS, type FactKey } from "./facts";
import { hasRequirement, type Requirement } from "./filter";
import { statusOf, type PlanStatus } from "./plan";
import type { Place, Resolution } from "./places";
import { PLACE_ID } from "./shortlist";

/**
 * Side-by-side view of two or three places. Every cell shows what the notes
 * say, using the same rules as the places view: agreeing reports, reports that
 * differ (all listed), or Unknown. Nothing is scored and no place is ranked.
 */
export const MIN_COMPARE = 2;
export const MAX_COMPARE = 3;

export interface CompareCell {
  readonly placeId: string;
  readonly resolution: Resolution;
  /** Only set when the person asked for this detail. */
  readonly status: PlanStatus | undefined;
}

export interface CompareRow {
  readonly key: FactKey;
  readonly wanted: "yes" | "no" | undefined;
  readonly cells: readonly CompareCell[];
}

/** Rows for the requested details, or for every detail when nothing was requested. */
export function compareRows(places: readonly Place[], req: Requirement): CompareRow[] {
  const keys = hasRequirement(req) ? FACT_KEYS.filter((k) => req[k] !== undefined) : FACT_KEYS;
  return keys.map((key) => {
    const wanted = req[key];
    return {
      key,
      wanted,
      cells: places.map((p) => {
        const resolution = p.resolutions[key];
        return { placeId: p.id, resolution, status: wanted ? statusOf(resolution, wanted) : undefined };
      }),
    };
  });
}

export type CompareToggle = "added" | "removed" | "full";

export function toggleCompare(ids: readonly string[], id: string): { ids: string[]; result: CompareToggle } {
  if (ids.includes(id)) return { ids: ids.filter((x) => x !== id), result: "removed" };
  if (ids.length >= MAX_COMPARE) return { ids: [...ids], result: "full" };
  return { ids: [...ids, id], result: "added" };
}

/** Ids that still belong to a place, in the order they were chosen. */
export function pruneCompare(ids: readonly string[], places: readonly Place[]): string[] {
  const known = new Set(places.map((p) => p.id));
  return ids.filter((id) => known.has(id));
}

export function canCompare(ids: readonly string[]): boolean {
  return ids.length >= MIN_COMPARE && ids.length <= MAX_COMPARE;
}

/** "a,b,c" for the address. */
export function compareIdsToPath(ids: readonly string[]): string {
  return ids.join(",");
}

/** Returns undefined unless there are two or three distinct, well-formed ids. */
export function pathToCompareIds(path: string): string[] | undefined {
  const ids = path.split(",");
  if (ids.length < MIN_COMPARE || ids.length > MAX_COMPARE) return undefined;
  if (new Set(ids).size !== ids.length) return undefined;
  return ids.every((i) => PLACE_ID.test(i)) ? ids : undefined;
}

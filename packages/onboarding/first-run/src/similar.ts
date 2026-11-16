import { foldText } from "./filter";
import type { Place } from "./places";

/**
 * Notes about the same place can be saved under slightly different spellings,
 * or with and without an address, and then show up as two places. This module
 * suggests pairs that may be the same place. It only suggests: nothing is
 * merged, no note changes, and the person decides. It never says that two
 * places are the same.
 */
export type SimilarReason = "same-address" | "same-name" | "similar-name";

export interface Suggestion {
  readonly a: Place;
  readonly b: Place;
  readonly reason: SimilarReason;
  /** Stable key for the pair, the same whichever place comes first. */
  readonly key: string;
}

export const MAX_SUGGESTIONS = 40;
/** Shortest name that can count as "similar" rather than "the same". Short names differ by one letter too easily. */
export const MIN_SIMILAR_LENGTH = 5;

/** Letters and digits only, lower case, no accents, single spaces. */
export function squash(s: string | undefined): string {
  return foldText(s ?? "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Number of single-letter changes (add, remove, replace) between two strings. Stops early past `limit`. */
export function editDistance(a: string, b: string, limit = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const v = Math.min((prev[j] as number) + 1, (cur[j - 1] as number) + 1, (prev[j - 1] as number) + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return limit + 1;
    prev = cur;
  }
  return prev[b.length] as number;
}

/** One change for names under eight letters, two for longer ones. */
export function nameTolerance(name: string): number {
  return name.length >= 8 ? 2 : 1;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Reason two places may be the same, or undefined. Two different street addresses always mean different places. */
export function similarReason(a: Place, b: Place): SimilarReason | undefined {
  if (a.id === b.id) return undefined;
  const [na, nb] = [squash(a.name), squash(b.name)];
  const [aa, ab] = [squash(a.address), squash(b.address)];
  if (aa !== "" && ab !== "") {
    // Both have an address: the same address with another name is worth a look; different addresses are different places.
    return aa === ab && na !== nb ? "same-address" : undefined;
  }
  if (na === nb) return "same-name";
  if (na.length < MIN_SIMILAR_LENGTH || nb.length < MIN_SIMILAR_LENGTH) return undefined;
  return editDistance(na, nb, nameTolerance(na.length <= nb.length ? na : nb)) <= nameTolerance(na.length <= nb.length ? na : nb) ? "similar-name" : undefined;
}

const ORDER: Record<SimilarReason, number> = { "same-address": 0, "same-name": 1, "similar-name": 2 };

/** Pairs that may be the same place, strongest reason first, at most MAX_SUGGESTIONS. */
export function findSimilar(places: readonly Place[], dismissed: ReadonlySet<string> = new Set()): Suggestion[] {
  const out: Suggestion[] = [];
  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      const a = places[i] as Place;
      const b = places[j] as Place;
      const reason = similarReason(a, b);
      if (!reason) continue;
      const key = pairKey(a.id, b.id);
      if (dismissed.has(key)) continue;
      out.push({ a, b, reason, key });
    }
  }
  out.sort((x, y) => ORDER[x.reason] - ORDER[y.reason] || x.a.name.localeCompare(y.a.name) || x.key.localeCompare(y.key));
  return out.slice(0, MAX_SUGGESTIONS);
}

/** How many pairs were hidden because the person said they are different places. */
export function hiddenCount(places: readonly Place[], dismissed: ReadonlySet<string>): number {
  let n = 0;
  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      const a = places[i] as Place;
      const b = places[j] as Place;
      if (dismissed.has(pairKey(a.id, b.id)) && similarReason(a, b)) n++;
    }
  }
  return n;
}

/** Places with no address, which cannot be told apart from another place with the same name. */
export function withoutAddress(places: readonly Place[]): Place[] {
  return places.filter((p) => squash(p.address) === "");
}

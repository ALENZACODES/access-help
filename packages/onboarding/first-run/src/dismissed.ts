import { pairKey } from "./similar";
import type { Place } from "./places";
import type { KeyValueStore } from "./store";

/**
 * Pairs of places the person said are different places, so they stop being
 * suggested. Saved on this device only, as pairs of place ids.
 */
export const DISMISSED_KEY = "app.onboarding.not-the-same.v1";
export const MAX_DISMISSED = 100;

const ID = /^[a-z0-9-]{1,80}$/;
const PAIR = /^([a-z0-9-]{1,80})\|([a-z0-9-]{1,80})$/;

/** Accepts only well-formed pairs in the order pairKey() writes them, without repeats. */
export function parseDismissed(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: string[] = [];
  for (const v of data) {
    if (typeof v !== "string") continue;
    const m = PAIR.exec(v);
    if (!m || m[1] === m[2] || pairKey(m[1] as string, m[2] as string) !== v || out.includes(v)) continue;
    out.push(v);
    if (out.length >= MAX_DISMISSED) break;
  }
  return out;
}

export function loadDismissed(store: KeyValueStore | undefined): string[] {
  try {
    return parseDismissed(store?.getItem(DISMISSED_KEY));
  } catch {
    return [];
  }
}

export function saveDismissed(store: KeyValueStore | undefined, list: readonly string[]): "saved" | "unavailable" {
  if (!store) return "unavailable";
  try {
    const clean = parseDismissed(JSON.stringify(list));
    if (clean.length === 0) store.removeItem(DISMISSED_KEY);
    else store.setItem(DISMISSED_KEY, JSON.stringify(clean));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export type DismissResult = "added" | "full" | "invalid" | "same";

export function dismissPair(list: readonly string[], a: string, b: string): { list: string[]; result: DismissResult } {
  if (!ID.test(a) || !ID.test(b)) return { list: [...list], result: "invalid" };
  if (a === b) return { list: [...list], result: "invalid" };
  const key = pairKey(a, b);
  if (list.includes(key)) return { list: [...list], result: "same" };
  if (list.length >= MAX_DISMISSED) return { list: [...list], result: "full" };
  return { list: [...list, key], result: "added" };
}

/** Drops pairs where either place no longer has a note. */
export function pruneDismissed(list: readonly string[], places: readonly Place[]): string[] {
  const known = new Set(places.map((p) => p.id));
  return list.filter((k) => {
    const m = PAIR.exec(k);
    return m !== null && known.has(m[1] as string) && known.has(m[2] as string);
  });
}

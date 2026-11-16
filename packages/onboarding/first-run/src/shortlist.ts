import type { Place } from "./places";
import type { KeyValueStore } from "./store";

/**
 * A shortlist is a short list of places a person wants to keep handy, saved on
 * this device. It stores place ids only. It does not rank places or say that
 * one is better than another.
 */
export const SHORTLIST_KEY = "app.onboarding.shortlist.v1";
export const MAX_SHORTLIST = 20;

/** Same shape as the ids made by placeId(): a slug and an 8-character hash. */
export const PLACE_ID = /^[a-z0-9-]{1,80}$/;

export function parseShortlist(raw: string | null | undefined): string[] {
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
    if (typeof v === "string" && PLACE_ID.test(v) && !out.includes(v)) out.push(v);
    if (out.length >= MAX_SHORTLIST) break;
  }
  return out;
}

export function loadShortlist(store: KeyValueStore | undefined): string[] {
  try {
    return parseShortlist(store?.getItem(SHORTLIST_KEY));
  } catch {
    return [];
  }
}

export function saveShortlist(store: KeyValueStore | undefined, list: readonly string[]): "saved" | "unavailable" {
  if (!store) return "unavailable";
  try {
    const clean = parseShortlist(JSON.stringify(list));
    if (clean.length === 0) store.removeItem(SHORTLIST_KEY);
    else store.setItem(SHORTLIST_KEY, JSON.stringify(clean));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export type ToggleResult = "added" | "removed" | "full" | "invalid";

export function toggleShortlist(list: readonly string[], id: string): { list: string[]; result: ToggleResult } {
  if (!PLACE_ID.test(id)) return { list: [...list], result: "invalid" };
  if (list.includes(id)) return { list: list.filter((x) => x !== id), result: "removed" };
  if (list.length >= MAX_SHORTLIST) return { list: [...list], result: "full" };
  return { list: [...list, id], result: "added" };
}

/** Drops ids for places that no longer have any note, so the list never points at nothing. */
export function pruneShortlist(list: readonly string[], places: readonly Place[]): string[] {
  const known = new Set(places.map((p) => p.id));
  return list.filter((id) => known.has(id));
}

export function onlyShortlisted(places: readonly Place[], list: readonly string[]): Place[] {
  return places.filter((p) => list.includes(p.id));
}

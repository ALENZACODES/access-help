import type { Place } from "./places";
import { PLACE_ID } from "./shortlist";

/**
 * Putting the shortlist in the order a person wants. The order is the person's
 * own: the App never sorts it and never suggests an order. Pure functions; the
 * input list is never changed.
 */
export type MoveDirection = "up" | "down";

export type MoveResult = "moved" | "at-edge" | "not-found";

export function moveInShortlist(list: readonly string[], id: string, dir: MoveDirection): { list: string[]; result: MoveResult } {
  const i = list.indexOf(id);
  if (i === -1) return { list: [...list], result: "not-found" };
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return { list: [...list], result: "at-edge" };
  const out = [...list];
  const a = out[i] as string;
  out[i] = out[j] as string;
  out[j] = a;
  return { list: out, result: "moved" };
}

export function removeFromShortlist(list: readonly string[], id: string): { list: string[]; removed: boolean } {
  const out = list.filter((x) => x !== id);
  return { list: out, removed: out.length !== list.length };
}

export interface ShortlistRow {
  readonly id: string;
  readonly place: Place;
  /** 1-based position in the person's order. */
  readonly position: number;
}

/**
 * The rows of the shortlist, in the person's order. The shell already drops
 * ids whose place left the notes before drawing; any left here are skipped
 * too, so positions always count shown rows.
 */
export function shortlistRows(list: readonly string[], places: readonly Place[]): ShortlistRow[] {
  const byId = new Map(places.map((p) => [p.id, p] as const));
  const rows: ShortlistRow[] = [];
  for (const id of list) {
    const place = PLACE_ID.test(id) ? byId.get(id) : undefined;
    if (place) rows.push({ id, place, position: rows.length + 1 });
  }
  return rows;
}

/**
 * Where focus goes after a change: the same control on the same row when it
 * still exists, otherwise the nearest row, otherwise nothing (the page heading).
 */
export function focusAfter(before: readonly string[], after: readonly string[], id: string): string | undefined {
  if (after.includes(id)) return id;
  const i = before.indexOf(id);
  if (after.length === 0 || i === -1) return undefined;
  return after[Math.min(i, after.length - 1)];
}

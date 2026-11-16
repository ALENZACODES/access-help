import type { Place } from './places';

/** Saved place ids. Kept on this device only. */
export const MAX_SAVED = 200;

/** Removes the id if saved, otherwise adds it. The oldest are dropped past MAX_SAVED. */
export function toggleSaved(ids: readonly string[], id: string): readonly string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return [...ids, id].slice(-MAX_SAVED);
}

/** Drops ids that are not in the current places. */
export function pruneSaved(ids: readonly string[], places: readonly Place[]): readonly string[] {
  const known = new Set(places.map((p) => p.id));
  return ids.filter((id) => known.has(id));
}

export function serialiseSaved(ids: readonly string[]): string {
  return JSON.stringify(ids);
}

/** Null unless the text is a JSON array of strings. Duplicates are removed and the list is capped. */
export function parseSaved(json: string): readonly string[] | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw) || !raw.every((x) => typeof x === 'string')) return null;
    return [...new Set(raw as string[])].slice(-MAX_SAVED);
  } catch {
    return null;
  }
}

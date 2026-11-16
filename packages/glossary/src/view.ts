/** How the place list is arranged. Saved on this device; not put in shareable links. */

export const SORT_KEYS = ['best', 'name', 'newest'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface FinderView {
  readonly sort: SortKey;
  /** Only places with a sourced claim from the last year. */
  readonly recentOnly: boolean;
  readonly savedOnly: boolean;
}

export const DEFAULT_VIEW: FinderView = { sort: 'best', recentOnly: false, savedOnly: false };

/** Places shown per page. "Show more" adds this many. */
export const PAGE_SIZE = 25;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Field by field: anything invalid falls back to the default for that field. */
export function normaliseView(input: unknown): FinderView {
  if (!isRecord(input)) return DEFAULT_VIEW;
  const sort = SORT_KEYS.find((k) => k === input['sort']) ?? DEFAULT_VIEW.sort;
  return {
    sort,
    recentOnly: input['recentOnly'] === true,
    savedOnly: input['savedOnly'] === true,
  };
}

export function isDefaultView(view: FinderView): boolean {
  return view.sort === 'best' && !view.recentOnly && !view.savedOnly;
}

export function serialiseView(view: FinderView): string {
  return JSON.stringify(view);
}

/** Null when the text is not JSON or not an object. */
export function parseView(json: string): FinderView | null {
  try {
    const raw: unknown = JSON.parse(json);
    return isRecord(raw) ? normaliseView(raw) : null;
  } catch {
    return null;
  }
}

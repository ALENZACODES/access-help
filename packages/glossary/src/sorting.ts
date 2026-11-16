import { daysBetween, type Place, type PlaceMatch } from './places';
import { isIsoDate } from './provenance';
import { effectiveStatus } from './status';
import type { Lang } from './plainTerms';
import type { SortKey } from './view';

/** Newest source date (YYYY-MM-DD) among a place's sourced present/absent claims, or null. */
export function newestDate(place: Place): string | null {
  let newest: string | null = null;
  for (const c of place.claims) {
    if (effectiveStatus(c) === 'unknown' || c.provenance === undefined) continue;
    const d = c.provenance.date;
    if (isIsoDate(d) && (newest === null || d > newest)) newest = d;
  }
  return newest;
}

/** True when the newest sourced claim is no older than `days` and not dated in the future. */
export function isRecent(place: Place, today: string, days = 365): boolean {
  const d = newestDate(place);
  if (d === null) return false;
  const age = daysBetween(d, today);
  return age !== null && age >= 0 && age <= days;
}

/** "best" keeps the order it was given (ranked by chosen features). */
export function sortMatches(matches: readonly PlaceMatch[], key: SortKey, lang: Lang): readonly PlaceMatch[] {
  if (key === 'best') return matches;
  const byName = (a: PlaceMatch, b: PlaceMatch): number =>
    a.place.name.localeCompare(b.place.name, lang) || a.place.id.localeCompare(b.place.id);
  if (key === 'name') return [...matches].sort(byName);
  return [...matches].sort((a, b) => {
    const da = newestDate(a.place);
    const db = newestDate(b.place);
    if (da === db) return byName(a, b);
    if (da === null) return 1;
    if (db === null) return -1;
    return da < db ? 1 : -1;
  });
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly shown: number;
  readonly total: number;
  readonly remaining: number;
}

/** The first `limit` items. Non-finite or negative limits show nothing extra rather than throwing. */
export function firstPage<T>(items: readonly T[], limit: number): Page<T> {
  const n = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : items.length;
  const shown = Math.min(n, items.length);
  return { items: items.slice(0, shown), shown, total: items.length, remaining: items.length - shown };
}

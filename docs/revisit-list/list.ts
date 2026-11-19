/** Builds the list of places to revisit from the places on the device and the person's choices. */
import { haversineMetres, type Point } from '../presubmit/geo.js';
import { ageDays, reasonsFor, scoreOf, REASONS, type Reason, type RevisitPlace } from './reasons.js';

export const LIMIT_CHOICES = [10, 25, 50] as const;
export const WITHIN_KM_CHOICES = [1, 5, 25] as const;
export const DEFAULT_LIMIT = 25;
export const MAX_PLACES = 5000;

export interface RevisitOptions {
  /** Only places with at least one of these reasons. Empty means every reason. */
  reasons: readonly Reason[];
  /** Where the person starts. Null when they did not say. */
  origin: Point | null;
  /** Only places within this many kilometres of the origin. Ignored without an origin. */
  withinKm: number | null;
  limit: number;
}

export const DEFAULT_OPTIONS: RevisitOptions = { reasons: [], origin: null, withinKm: null, limit: DEFAULT_LIMIT };

export interface RevisitItem {
  place: RevisitPlace;
  /** Reasons that passed the person's filter, heaviest first. */
  reasons: Reason[];
  score: number;
  /** Kilometres from the origin. Null without an origin. */
  km: number | null;
  /** Null when the date is not a real day. */
  ageDays: number | null;
}

export interface RevisitList {
  items: RevisitItem[];
  /** Places with a reason before the limit was applied. */
  matched: number;
  /** Places looked at. */
  considered: number;
  byReason: Record<Reason, number>;
}

export function validOrigin(origin: Point | null): origin is Point {
  return origin !== null && Number.isFinite(origin.lat) && Number.isFinite(origin.lon) && Math.abs(origin.lat) <= 90 && Math.abs(origin.lon) <= 180;
}

function emptyByReason(): Record<Reason, number> {
  return { 'packs-disagree': 0, 'status-unknown': 0, 'very-old': 0, old: 0, 'date-unclear': 0, 'no-name': 0 };
}

export function buildRevisitList(places: readonly RevisitPlace[], today: string, options: RevisitOptions = DEFAULT_OPTIONS): RevisitList {
  const wanted = options.reasons.length === 0 ? REASONS : options.reasons;
  const origin = validOrigin(options.origin) ? options.origin : null;
  const considered = Math.min(places.length, MAX_PLACES);
  const byReason = emptyByReason();
  const all: RevisitItem[] = [];
  for (let i = 0; i < considered; i += 1) {
    const place = places[i];
    if (place === undefined) continue;
    const every = reasonsFor(place, today);
    for (const reason of every) byReason[reason] += 1;
    const reasons = every.filter((reason) => wanted.includes(reason));
    if (reasons.length === 0) continue;
    let km: number | null = null;
    if (origin !== null) {
      const metres = haversineMetres(origin, place.record);
      if (!Number.isFinite(metres)) continue;
      km = metres / 1000;
      if (options.withinKm !== null && km > options.withinKm) continue;
    }
    all.push({ place, reasons, score: scoreOf(reasons), km, ageDays: ageDays(place.record.observedOn, today) });
  }
  all.sort(
    (a, b) =>
      b.score - a.score ||
      (a.km ?? 0) - (b.km ?? 0) ||
      (a.place.record.name ?? '').localeCompare(b.place.record.name ?? '', 'en') ||
      a.place.record.id.localeCompare(b.place.record.id),
  );
  const limit = Math.max(1, Math.floor(options.limit));
  return { items: all.slice(0, limit), matched: all.length, considered, byReason };
}

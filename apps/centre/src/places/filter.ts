/**
 * Search, filter, and distance sorting for places held on this device.
 * A place whose status is UNKNOWN is never counted as a match for a positive
 * filter. It is returned in its own list so the person can still see it.
 */
import { freshness } from "./docs-bridge.js";
import type { PlaceRecord } from "./types.js";

export type AccessFilter = "any" | "yes" | "yes-or-limited";

export interface PlaceQuery {
  text: string;
  access: AccessFilter;
  /** Only places observed within this many days of today. null means no limit. */
  maxAgeDays: number | null;
  /** YYYY-MM-DD */
  today: string;
}

export interface PlaceSearchResult {
  matches: PlaceRecord[];
  /** Passed the text and age filters, but the status is UNKNOWN, so it is not a match. */
  unknown: PlaceRecord[];
  /** Passed the text and age filters, but the recorded status does not fit the filter. */
  excluded: number;
}

/** Lower case, accents removed, spaces collapsed. "Café" matches "cafe". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function textMatches(record: PlaceRecord, needle: string): boolean {
  if (needle === "") return true;
  const haystack = normalizeText(`${record.name ?? ""} ${record.id} ${record.source}`);
  return needle.split(" ").every((word) => haystack.includes(word));
}

function ageMatches(record: PlaceRecord, query: PlaceQuery): boolean {
  if (query.maxAgeDays === null) return true;
  return freshness(record.observedOn, query.today, query.maxAgeDays) === "recent";
}

function statusFits(record: PlaceRecord, access: AccessFilter): boolean {
  if (access === "any") return true;
  if (access === "yes") return record.wheelchair === "yes";
  return record.wheelchair === "yes" || record.wheelchair === "limited";
}

export function searchPlaces(records: readonly PlaceRecord[], query: PlaceQuery): PlaceSearchResult {
  const needle = normalizeText(query.text);
  const matches: PlaceRecord[] = [];
  const unknown: PlaceRecord[] = [];
  let excluded = 0;
  for (const record of records) {
    if (!textMatches(record, needle) || !ageMatches(record, query)) continue;
    if (query.access === "any") {
      matches.push(record);
    } else if (record.wheelchair === "UNKNOWN") {
      unknown.push(record);
    } else if (statusFits(record, query.access)) {
      matches.push(record);
    } else {
      excluded += 1;
    }
  }
  return { matches, unknown, excluded };
}

export function sortByName(records: readonly PlaceRecord[], language: "en" | "fr"): PlaceRecord[] {
  const locale = language === "fr" ? "fr-CA" : "en-CA";
  return [...records].sort((a, b) => {
    const left = a.name ?? "";
    const right = b.name ?? "";
    // Places without a name go last, in id order.
    if (left === "" && right !== "") return 1;
    if (right === "" && left !== "") return -1;
    return left.localeCompare(right, locale) || a.id.localeCompare(b.id);
  });
}

export interface Origin {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_KM = 6371.0088;

/** Straight-line (great-circle) distance in kilometres. It is not a route. */
export function distanceKm(a: Origin, b: Origin): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface PlaceWithDistance {
  record: PlaceRecord;
  km: number;
}

export function sortByDistance(records: readonly PlaceRecord[], origin: Origin): PlaceWithDistance[] {
  return records
    .map((record) => ({ record, km: distanceKm(origin, record) }))
    .sort((a, b) => a.km - b.km || a.record.id.localeCompare(b.record.id));
}

/** Places no further than km from the origin, as a straight line. The list order is kept. */
export function withinKm(records: readonly PlaceRecord[], origin: Origin, km: number): PlaceRecord[] {
  return records.filter((record) => distanceKm(origin, record) <= km);
}

export interface StatusCounts {
  yes: number;
  limited: number;
  no: number;
  UNKNOWN: number;
}

export function countByStatus(records: readonly PlaceRecord[]): StatusCounts {
  const counts: StatusCounts = { yes: 0, limited: 0, no: 0, UNKNOWN: 0 };
  for (const record of records) counts[record.wheelchair] += 1;
  return counts;
}

export interface FreshnessCounts {
  recent: number;
  older: number;
  unknown: number;
}

export function countByFreshness(records: readonly PlaceRecord[], today: string, recentDays = 365): FreshnessCounts {
  const counts: FreshnessCounts = { recent: 0, older: 0, unknown: 0 };
  for (const record of records) counts[freshness(record.observedOn, today, recentDays)] += 1;
  return counts;
}

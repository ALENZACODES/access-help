/**
 * A plain count of what a set of places holds: how many have a recorded status, how old the
 * records are, which have no name, which look like the same place twice, and which fall outside
 * the area the App is made for. It reports counts and ids. It does not rate a pack, and it never
 * turns UNKNOWN into anything else.
 */
import { countByFreshness, countByStatus, distanceKm, normalizeText, type FreshnessCounts, type StatusCounts } from "./filter.js";
import type { PlaceRecord } from "./types.js";

/** A rough box around Ontario. It is a coarse screen for typing mistakes, not a border. */
export const ONTARIO_BOX = { south: 41.6, north: 56.9, west: -95.2, east: -74.3 } as const;

/** Two records with the same name closer than this, with different ids, are listed as possible repeats. */
export const NEAR_DUPLICATE_METRES = 50;

export interface DuplicatePair {
  a: string;
  b: string;
  metres: number;
}

export interface QualityReport {
  total: number;
  status: StatusCounts;
  freshness: FreshnessCounts;
  unnamed: string[];
  nearDuplicates: DuplicatePair[];
  outsideArea: string[];
  /** Whole percent of places with status UNKNOWN. null when there are no places. */
  unknownPercent: number | null;
  /** Whole percent of places whose record is older than a year or has an UNKNOWN date. */
  olderPercent: number | null;
}

export function percent(part: number, total: number): number | null {
  return total === 0 ? null : Math.round((part / total) * 100);
}

export function insideOntarioBox(lat: number, lon: number): boolean {
  return lat >= ONTARIO_BOX.south && lat <= ONTARIO_BOX.north && lon >= ONTARIO_BOX.west && lon <= ONTARIO_BOX.east;
}

export function findNearDuplicates(records: readonly PlaceRecord[], maxMetres = NEAR_DUPLICATE_METRES): DuplicatePair[] {
  const byName = new Map<string, PlaceRecord[]>();
  for (const record of records) {
    const key = normalizeText(record.name ?? "");
    if (key === "") continue;
    const group = byName.get(key) ?? [];
    group.push(record);
    byName.set(key, group);
  }
  const pairs: DuplicatePair[] = [];
  for (const group of byName.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const first = group[i]!;
        const second = group[j]!;
        if (first.id === second.id) continue;
        const metres = distanceKm(first, second) * 1000;
        if (metres <= maxMetres) {
          const [a, b] = first.id < second.id ? [first.id, second.id] : [second.id, first.id];
          pairs.push({ a, b, metres: Math.round(metres) });
        }
      }
    }
  }
  return pairs.sort((x, y) => x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
}

export function qualityReport(records: readonly PlaceRecord[], today: string): QualityReport {
  const status = countByStatus(records);
  const freshness = countByFreshness(records, today);
  return {
    total: records.length,
    status,
    freshness,
    unnamed: records.filter((record) => (record.name ?? "").trim() === "").map((record) => record.id),
    nearDuplicates: findNearDuplicates(records),
    outsideArea: records.filter((record) => !insideOntarioBox(record.lat, record.lon)).map((record) => record.id),
    unknownPercent: percent(status.UNKNOWN, records.length),
    olderPercent: percent(freshness.older + freshness.unknown, records.length),
  };
}

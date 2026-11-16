/**
 * Compares two packs and lists what differs between them. It says what changed and
 * nothing about whether the change is good. A status that goes from UNKNOWN to a recorded
 * status is listed as a change of status, the same as any other.
 */
import { distanceKm } from "./filter.js";
import { LOCATION_TOLERANCE_KM } from "./packs.js";
import type { ParsedPack, PlaceRecord, Wheelchair } from "./types.js";

export type ChangeKind = "status" | "location" | "name" | "source" | "licence" | "date";

export interface ChangedPlace {
  id: string;
  before: PlaceRecord;
  after: PlaceRecord;
  kinds: ChangeKind[];
}

export interface Transition {
  from: Wheelchair;
  to: Wheelchair;
  count: number;
}

export interface PackDiff {
  /** In the newer pack only. */
  added: PlaceRecord[];
  /** In the older pack only. */
  removed: PlaceRecord[];
  changed: ChangedPlace[];
  unchanged: number;
  /** How many places went from each status to each other status, most first. */
  transitions: Transition[];
}

const STATUS_ORDER: readonly Wheelchair[] = ["yes", "limited", "no", "UNKNOWN"];

export function changeKinds(before: PlaceRecord, after: PlaceRecord): ChangeKind[] {
  const kinds: ChangeKind[] = [];
  if (before.wheelchair !== after.wheelchair) kinds.push("status");
  if (distanceKm(before, after) > LOCATION_TOLERANCE_KM) kinds.push("location");
  if ((before.name ?? "") !== (after.name ?? "")) kinds.push("name");
  if (before.source !== after.source) kinds.push("source");
  if (before.licence !== after.licence) kinds.push("licence");
  if (before.observedOn !== after.observedOn) kinds.push("date");
  return kinds;
}

export function diffPacks(older: ParsedPack, newer: ParsedPack): PackDiff {
  const before = new Map(older.records.map((record) => [record.id, record]));
  const after = new Map(newer.records.map((record) => [record.id, record]));
  const added = newer.records.filter((record) => !before.has(record.id));
  const removed = older.records.filter((record) => !after.has(record.id));
  const changed: ChangedPlace[] = [];
  const counts = new Map<string, Transition>();
  let unchanged = 0;
  for (const next of newer.records) {
    const previous = before.get(next.id);
    if (previous === undefined) continue;
    const kinds = changeKinds(previous, next);
    if (kinds.length === 0) {
      unchanged += 1;
      continue;
    }
    changed.push({ id: next.id, before: previous, after: next, kinds });
    if (kinds.includes("status")) {
      const key = `${previous.wheelchair}>${next.wheelchair}`;
      const entry = counts.get(key) ?? { from: previous.wheelchair, to: next.wheelchair, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
  }
  const transitions = [...counts.values()].sort(
    (a, b) => b.count - a.count || STATUS_ORDER.indexOf(a.from) - STATUS_ORDER.indexOf(b.from) || STATUS_ORDER.indexOf(a.to) - STATUS_ORDER.indexOf(b.to),
  );
  return { added, removed, changed, unchanged, transitions };
}

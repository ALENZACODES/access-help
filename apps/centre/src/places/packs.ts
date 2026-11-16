/**
 * Merges several packs into one view of the places on this device.
 *
 * Unknown stays Unknown: when two packs give different statuses for the same
 * place, or put the same id in different locations, the App does not pick a
 * winner. The place is shown as UNKNOWN and both reports stay visible.
 * UNKNOWN in one pack never overrides a recorded status in another: it means
 * nobody recorded it there, not that the other pack is wrong.
 */
import { distanceKm } from "./filter.js";
import type { ParsedPack, PlaceRecord } from "./types.js";

export type ConflictKind = "status" | "location";

export interface PackReport {
  packId: string;
  record: PlaceRecord;
}

export interface MergedPlace {
  id: string;
  /** What the App shows. For a conflict the status is UNKNOWN. */
  record: PlaceRecord;
  reports: PackReport[];
  conflict: ConflictKind | null;
}

export interface MergeResult {
  /** The records to search, filter, and plot, one per place id. */
  records: PlaceRecord[];
  places: MergedPlace[];
  conflicts: MergedPlace[];
}

/** Two reports for one id further apart than this are treated as different places. */
export const LOCATION_TOLERANCE_KM = 0.2;

function newest(reports: readonly PackReport[]): PackReport {
  let best = reports[0]!;
  for (const report of reports) {
    // Later pack wins a tie, because it was loaded after the earlier one.
    if (report.record.observedOn >= best.record.observedOn) best = report;
  }
  return best;
}

export function mergePacks(packs: readonly ParsedPack[]): MergeResult {
  const groups = new Map<string, PackReport[]>();
  for (const pack of packs) {
    for (const record of pack.records) {
      const group = groups.get(record.id) ?? [];
      group.push({ packId: pack.manifest.packId, record });
      groups.set(record.id, group);
    }
  }

  const places: MergedPlace[] = [];
  for (const [id, reports] of groups) {
    const first = reports[0]!.record;
    const apart = reports.some((r) => distanceKm(first, r.record) > LOCATION_TOLERANCE_KM);
    const known = reports.filter((r) => r.record.wheelchair !== "UNKNOWN");
    const distinct = new Set(known.map((r) => r.record.wheelchair));
    const conflict: ConflictKind | null = apart ? "location" : distinct.size > 1 ? "status" : null;

    let record: PlaceRecord;
    if (conflict !== null) {
      record = { ...newest(reports).record, wheelchair: "UNKNOWN" };
    } else if (known.length > 0) {
      record = newest(known).record;
    } else {
      record = newest(reports).record;
    }
    places.push({ id, record, reports, conflict });
  }

  return {
    records: places.map((place) => place.record),
    places,
    conflicts: places.filter((place) => place.conflict !== null),
  };
}

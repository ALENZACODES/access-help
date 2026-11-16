import { explainRecord } from "./docs-bridge.js";
import type { MergedPlace } from "./packs.js";
import { placesText, type PlacesKey } from "./strings.js";
import type { Language, PlaceRecord, Wheelchair } from "./types.js";

const LABEL_KEY: Record<Wheelchair, PlacesKey> = {
  yes: "labelYes",
  limited: "labelLimited",
  no: "labelNo",
  UNKNOWN: "labelUnknown",
};

export function statusLabel(status: Wheelchair, language: Language): string {
  return placesText(language, LABEL_KEY[status]);
}

/** One sentence per place. A conflict never reads as a recorded status. */
export function placeSentence(record: PlaceRecord, merged: MergedPlace | undefined, today: string, language: Language): string {
  if (merged?.conflict) {
    const key: PlacesKey = merged.conflict === "status" ? "conflictStatus" : "conflictLocation";
    const name = record.name ?? placesText(language, "unnamed");
    return `${name}${language === "fr" ? "\u00a0" : ""}: ${placesText(language, key)}`;
  }
  return explainRecord(record, today, language);
}

export function conflictReportLines(merged: MergedPlace, language: Language): string[] {
  return merged.reports.map((report) =>
    placesText(language, "conflictReport", {
      pack: report.packId,
      status: statusLabel(report.record.wheelchair, language),
      date: report.record.observedOn,
      source: report.record.source,
    }),
  );
}

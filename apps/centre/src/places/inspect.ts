/**
 * Reads a pack file and reports what is in it, without saving anything.
 * A person can see the counts, the licences, the dates, and every note about records
 * that were left out or changed to UNKNOWN before the pack is added to the device.
 */
import { parsePack } from "./pack.js";
import { qualityReport, type QualityReport } from "./quality.js";
import type { PackFailureCode, PackWarning, ParsedPack } from "./types.js";

export interface InspectReport {
  packId: string;
  generatedOn: string;
  /** Places in the file, before any were left out. */
  inFile: number;
  usable: number;
  /** Left out because they had no point, no source, no open licence, no real date, or a repeated id. */
  leftOut: number;
  /** Shown as UNKNOWN because their status was not one the App recognises. */
  madeUnknown: number;
  warnings: PackWarning[];
  licences: string[];
  sources: string[];
  oldest: string | null;
  newest: string | null;
  /** The pack says it was made after today. */
  dateInFuture: boolean;
  /** A pack with this id is already on the device, and adding this one would replace it. */
  replacesLoaded: boolean;
  quality: QualityReport;
}

export type InspectResult = { ok: true; pack: ParsedPack; report: InspectReport } | { ok: false; code: PackFailureCode; detail?: string };

function featureCount(raw: string): number {
  try {
    const features = (JSON.parse(raw) as { data?: { features?: unknown } }).data?.features;
    return Array.isArray(features) ? features.length : 0;
  } catch {
    return 0;
  }
}

export function inspectPack(raw: string, today: string, loadedPackIds: readonly string[]): InspectResult {
  const parsed = parsePack(raw);
  if (!parsed.ok) return parsed.detail === undefined ? { ok: false, code: parsed.code } : { ok: false, code: parsed.code, detail: parsed.detail };
  const { pack } = parsed;
  const inFile = featureCount(raw);
  return {
    ok: true,
    pack,
    report: {
      packId: pack.manifest.packId,
      generatedOn: pack.manifest.generatedOn,
      inFile,
      usable: pack.records.length,
      leftOut: Math.max(0, inFile - pack.records.length),
      madeUnknown: pack.warnings.filter((warning) => warning.code === "unrecognised-status").length,
      warnings: pack.warnings,
      licences: [...pack.manifest.licences],
      sources: [...pack.manifest.sources],
      oldest: pack.manifest.oldestObservation ?? null,
      newest: pack.manifest.newestObservation ?? null,
      dateInFuture: pack.manifest.generatedOn > today,
      replacesLoaded: loadedPackIds.includes(pack.manifest.packId),
      quality: qualityReport(pack.records, today),
    },
  };
}

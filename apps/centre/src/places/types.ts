import type { ExportRecord, PackManifest, Wheelchair } from "./docs-bridge.js";

export type Language = "en" | "fr";

/** One place as the App holds it. The shape is the mapping-day export record. */
export type PlaceRecord = ExportRecord;

export type { PackManifest, Wheelchair };

export type PackWarningCode = "unrecognised-status" | "skipped-record" | "duplicate-id";

export interface PackWarning {
  code: PackWarningCode;
  id: string;
  detail: string;
}

export interface ParsedPack {
  manifest: PackManifest;
  records: PlaceRecord[];
  warnings: PackWarning[];
}

export type PackFailureCode =
  | "too-large"
  | "not-json"
  | "not-a-pack"
  | "bad-manifest"
  | "count-mismatch"
  | "no-usable-records";

export type ParseResult =
  | { ok: true; pack: ParsedPack }
  | { ok: false; code: PackFailureCode; detail?: string };

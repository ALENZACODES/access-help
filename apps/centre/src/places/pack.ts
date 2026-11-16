/**
 * Reads an offline pack file (the JSON written by serializePack) and decides
 * what the App may show from it.
 *
 * Rules:
 * - The manifest is rebuilt from the records. A declared count that disagrees
 *   with the records is rejected, not trusted.
 * - A status that is not exactly yes, limited, no, or UNKNOWN becomes UNKNOWN
 *   and is reported. Nothing is ever promoted to a better status.
 * - Every record needs a source, an open licence, and a real observation date.
 *   A record without them is skipped and reported.
 */
import { buildExport, buildPackManifest, normalizeWheelchair, type Contribution } from "./docs-bridge.js";
import type { PackWarning, ParseResult, PlaceRecord } from "./types.js";

export const MAX_PACK_CHARACTERS = 2_000_000;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function coordinates(geometry: unknown): { lon: number; lat: number } | null {
  if (!isObject(geometry) || geometry.type !== "Point") return null;
  const pair = geometry.coordinates;
  if (!Array.isArray(pair) || pair.length < 2) return null;
  const [lon, lat] = pair as unknown[];
  if (typeof lon !== "number" || typeof lat !== "number") return null;
  return { lon, lat };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parsePack(raw: string): ParseResult {
  if (raw.length > MAX_PACK_CHARACTERS) return { ok: false, code: "too-large" };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, code: "not-json" };
  }
  if (!isObject(value) || !isObject(value.manifest) || !isObject(value.data)) {
    return { ok: false, code: "not-a-pack" };
  }
  const { manifest, data } = value;
  const packId = text(manifest.packId).trim();
  const generatedOn = text(manifest.generatedOn);
  if (packId === "" || !ISO_DATE.test(generatedOn)) {
    return { ok: false, code: "bad-manifest", detail: "packId and generatedOn (YYYY-MM-DD) are required" };
  }
  if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    return { ok: false, code: "not-a-pack" };
  }
  if (manifest.recordCount !== data.features.length) {
    return {
      ok: false,
      code: "count-mismatch",
      detail: `manifest says ${String(manifest.recordCount)}, file has ${data.features.length}`,
    };
  }

  const warnings: PackWarning[] = [];
  const seen = new Set<string>();
  const records: PlaceRecord[] = [];

  data.features.forEach((feature: unknown, index: number) => {
    const fallbackId = `feature-${index + 1}`;
    if (!isObject(feature) || !isObject(feature.properties)) {
      warnings.push({ code: "skipped-record", id: fallbackId, detail: "not a feature with properties" });
      return;
    }
    const props = feature.properties;
    const id = text(props.id).trim() || fallbackId;
    const point = coordinates(feature.geometry);
    if (point === null) {
      warnings.push({ code: "skipped-record", id, detail: "no point location" });
      return;
    }
    if (seen.has(id)) {
      warnings.push({ code: "duplicate-id", id, detail: "a record with this id was already read" });
      return;
    }
    const declared = props.wheelchair;
    const status = normalizeWheelchair(typeof declared === "string" ? declared : undefined);
    if (declared !== undefined && declared !== null && declared !== status) {
      warnings.push({
        code: "unrecognised-status",
        id,
        detail: `status ${JSON.stringify(declared)} was not recognised and is shown as UNKNOWN`,
      });
    }
    const name = typeof props.name === "string" ? props.name : undefined;
    const contribution: Contribution = {
      id,
      lat: point.lat,
      lon: point.lon,
      ...(name === undefined ? {} : { name }),
      wheelchair: status,
      source: text(props.source),
      licence: text(props.licence),
      observedOn: text(props.observedOn),
    };
    const built = buildExport([contribution]);
    const record = built.records[0];
    if (record === undefined) {
      warnings.push({
        code: "skipped-record",
        id,
        detail: built.rejected[0]?.errors.join("; ") ?? "rejected",
      });
      return;
    }
    seen.add(id);
    records.push(record);
  });

  if (records.length === 0) return { ok: false, code: "no-usable-records" };
  return { ok: true, pack: { manifest: buildPackManifest(packId, records, generatedOn), records, warnings } };
}

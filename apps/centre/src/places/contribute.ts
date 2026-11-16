/**
 * Turns the contribution form into a record, and records into download files.
 * The App never uploads: the files are for a person to review and submit to
 * OpenStreetMap themselves. An access status is accepted only when the person
 * chose it. The default is UNKNOWN, and UNKNOWN stays UNKNOWN.
 */
import {
  OPEN_LICENCES,
  buildExport,
  buildPackManifest,
  serializePack,
  toGeoJson,
  toOsmChange,
  type Wheelchair,
} from "./docs-bridge.js";
import type { PlaceRecord } from "./types.js";

export interface FormFields {
  name: string;
  lat: string;
  lon: string;
  wheelchair: string;
  source: string;
  licence: string;
  observedOn: string;
  consent: boolean;
}

export type FieldName = keyof FormFields;

export type FieldErrorCode =
  | "lat-invalid"
  | "lon-invalid"
  | "status-invalid"
  | "source-required"
  | "licence-invalid"
  | "date-invalid"
  | "date-future"
  | "consent-required";

export type FieldErrors = Partial<Record<FieldName, FieldErrorCode>>;

export type FormResult = { ok: true; record: PlaceRecord } | { ok: false; errors: FieldErrors };

export const STATUS_CHOICES: readonly Wheelchair[] = ["UNKNOWN", "yes", "limited", "no"];

export function emptyForm(today: string): FormFields {
  return {
    name: "",
    lat: "",
    lon: "",
    wheelchair: "UNKNOWN",
    source: "",
    licence: OPEN_LICENCES[0],
    observedOn: today,
    consent: false,
  };
}

/** Accepts "43.85" and, for French keyboards, "43,85". Anything else is not a number. */
export function parseCoordinate(value: string, limit: number): number | null {
  const trimmed = value.trim().replace(/^−/, "-");
  const normalised = /^-?\d+,\d+$/.test(trimmed) ? trimmed.replace(",", ".") : trimmed;
  if (!/^-?\d+(\.\d+)?$/.test(normalised)) return null;
  const number = Number(normalised);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseForm(fields: FormFields, today: string, id: string): FormResult {
  const errors: FieldErrors = {};
  const lat = parseCoordinate(fields.lat, 90);
  const lon = parseCoordinate(fields.lon, 180);
  if (lat === null) errors.lat = "lat-invalid";
  if (lon === null) errors.lon = "lon-invalid";
  if (!STATUS_CHOICES.includes(fields.wheelchair as Wheelchair)) errors.wheelchair = "status-invalid";
  if (fields.source.trim() === "") errors.source = "source-required";
  if (!(OPEN_LICENCES as readonly string[]).includes(fields.licence)) errors.licence = "licence-invalid";
  if (!isRealDate(fields.observedOn)) errors.observedOn = "date-invalid";
  else if (fields.observedOn > today) errors.observedOn = "date-future";
  if (!fields.consent) errors.consent = "consent-required";
  if (Object.keys(errors).length > 0 || lat === null || lon === null) return { ok: false, errors };

  const built = buildExport([
    {
      id,
      lat,
      lon,
      ...(fields.name.trim() === "" ? {} : { name: fields.name }),
      wheelchair: fields.wheelchair,
      source: fields.source,
      licence: fields.licence,
      observedOn: fields.observedOn,
    },
  ]);
  const record = built.records[0];
  if (record === undefined) return { ok: false, errors: { source: "source-required" } };
  return { ok: true, record };
}

export function newDraftId(nowMs: number, random: () => number): string {
  return `obs-${nowMs.toString(36)}-${Math.floor(random() * 36 ** 4).toString(36).padStart(4, "0")}`;
}

export interface ExportFile {
  filename: string;
  mime: string;
  content: string;
}

export type ExportKind = "osm" | "geojson" | "pack";

export function exportFile(kind: ExportKind, records: readonly PlaceRecord[], today: string): ExportFile {
  if (kind === "osm") {
    return { filename: `observations-${today}.osc`, mime: "application/xml", content: toOsmChange(records) };
  }
  if (kind === "geojson") {
    return {
      filename: `observations-${today}.geojson`,
      mime: "application/geo+json",
      content: JSON.stringify(toGeoJson(records), null, 2),
    };
  }
  const manifest = buildPackManifest("my-observations", records, today);
  return { filename: `observations-pack-${today}.json`, mime: "application/json", content: serializePack(records, manifest) };
}

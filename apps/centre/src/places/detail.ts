/**
 * Builds what the place details page shows, as plain data, so it can be tested
 * without a browser. Everything here reads from the merged packs. A place with
 * packs that disagree reads as UNKNOWN, and a place in no pack reads as UNKNOWN.
 */
import { freshness, type Freshness } from "./docs-bridge.js";
import { moreText, type MoreKey } from "./moreStrings.js";
import type { MergedPlace } from "./packs.js";
import { statusLabel } from "./statusText.js";
import type { Language, Wheelchair } from "./types.js";

const NBSP = " ";
const NNBSP = " ";

export function coordinatesText(lat: number, lon: number, language: Language): string {
  const locale = language === "fr" ? "fr-CA" : "en-CA";
  const format = (value: number) => value.toLocaleString(locale, { minimumFractionDigits: 5, maximumFractionDigits: 5, useGrouping: false });
  return language === "fr" ? `${format(lat)}${NNBSP}; ${format(lon)}` : `${format(lat)}, ${format(lon)}`;
}

/** A geo: link. It opens whatever maps app this device has. The App loads no map. */
export function geoUri(lat: number, lon: number): string {
  return `geo:${lat.toFixed(5)},${lon.toFixed(5)}`;
}

const FRESH_KEY: Record<Freshness, MoreKey> = {
  recent: "detailFreshRecent",
  older: "detailFreshOlder",
  unknown: "detailFreshUnknown",
};

export interface DetailView {
  id: string;
  name: string | null;
  status: Wheelchair;
  statusText: string;
  conflict: boolean;
  freshness: Freshness;
  freshnessText: string;
  reportLines: string[];
  coordinates: string;
  geoUri: string;
  summary: string;
}

export function buildDetail(place: MergedPlace, today: string, language: Language): DetailView {
  const record = place.record;
  const status: Wheelchair = place.conflict ? "UNKNOWN" : record.wheelchair;
  const fresh = freshness(record.observedOn, today);
  const coords = coordinatesText(record.lat, record.lon, language);
  const t = (key: MoreKey, vars?: Record<string, string | number>) => moreText(language, key, vars);
  const statusText = statusLabel(status, language);

  const reportLines = place.reports.map((report) =>
    t("detailReportLine", {
      pack: report.packId,
      status: statusLabel(report.record.wheelchair, language),
      date: report.record.observedOn,
      source: report.record.source,
      licence: report.record.licence,
    }),
  );

  const lines = [
    t("sumName", { name: record.name ?? (language === "fr" ? "sans nom" : "unnamed") }),
    t("sumStatus", { status: statusText }),
    t("sumObserved", { date: record.observedOn }),
    t("sumSource", { source: record.source }),
    t("sumLicence", { licence: record.licence }),
    t("sumCoords", { coords }),
  ];
  if (place.conflict) lines.push(t("sumConflict"));
  else if (status === "UNKNOWN") lines.push(t("sumUnknown"));

  return {
    id: place.id,
    name: record.name ?? null,
    status,
    statusText,
    conflict: place.conflict !== null,
    freshness: fresh,
    freshnessText: t(FRESH_KEY[fresh]),
    reportLines,
    coordinates: coords,
    geoUri: geoUri(record.lat, record.lon),
    summary: lines.join("\n"),
  };
}

/** The place id in a URL path. A malformed escape reads as no place, never as an error. */
export function decodePlaceId(segment: string | undefined): string | null {
  if (segment === undefined || segment === "") return null;
  try {
    const id = decodeURIComponent(segment);
    return id.length > 0 && id.length <= 200 ? id : null;
  } catch {
    return null;
  }
}

export function placePath(id: string): string {
  return `/places/${encodeURIComponent(id)}`;
}

export { NBSP };

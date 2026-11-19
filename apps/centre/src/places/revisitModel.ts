/**
 * Builds what the revisit screen shows from the merged places of the loaded packs and the
 * person's choices. Pure: the day and the language come in as arguments. It only reads.
 */
import { parseCoordinate } from "./contribute.js";
import {
  REVISIT_DEFAULT_LIMIT,
  REVISIT_KM_CHOICES,
  REVISIT_LIMIT_CHOICES,
  REVISIT_REASONS,
  buildRevisitList,
  cleanRevisitReasons,
  revisitCoordinatesText,
  revisitFieldSheet,
  revisitFilename,
  revisitFillInCsv,
  revisitLegText,
  revisitOrderNote,
  revisitReasonLabel,
  revisitReasonText,
  revisitRecordLine,
  revisitSummaryText,
  revisitVisitOrder,
  type RevisitList,
  type RevisitOrder,
  type RevisitReason,
} from "./docs-bridge.js";
import type { MergedPlace } from "./packs.js";
import type { Language } from "./types.js";

export interface RevisitChoices {
  reasons: readonly string[];
  startLat: string;
  startLon: string;
  /** "" for any distance, or a number of kilometres as text. */
  withinKm: string;
  limit: string;
}

export const DEFAULT_CHOICES: RevisitChoices = { reasons: [], startLat: "", startLon: "", withinKm: "", limit: String(REVISIT_DEFAULT_LIMIT) };

export type StartState = { kind: "none" } | { kind: "invalid" } | { kind: "ok"; lat: number; lon: number };

/** Both boxes empty is no start. Anything else must be a full pair of coordinates. */
export function readStart(startLat: string, startLon: string): StartState {
  if (startLat.trim() === "" && startLon.trim() === "") return { kind: "none" };
  const lat = parseCoordinate(startLat, 90);
  const lon = parseCoordinate(startLon, 180);
  return lat === null || lon === null ? { kind: "invalid" } : { kind: "ok", lat, lon };
}

export function readLimit(value: string): number {
  const n = Number(value);
  return (REVISIT_LIMIT_CHOICES as readonly number[]).includes(n) ? n : REVISIT_DEFAULT_LIMIT;
}

export function readWithinKm(value: string): number | null {
  const n = Number(value);
  return value !== "" && (REVISIT_KM_CHOICES as readonly number[]).includes(n) ? n : null;
}

export interface RevisitStop {
  order: number;
  id: string;
  name: string | null;
  coordinates: string;
  recordLine: string;
  leg: string;
  reasons: { label: string; text: string }[];
}

export interface ReasonChoice {
  value: RevisitReason;
  label: string;
  /** Places on the device with this reason, whatever is ticked. */
  count: number;
}

export interface RevisitView {
  list: RevisitList;
  order: RevisitOrder;
  start: StartState;
  summary: string;
  orderNote: string;
  stops: RevisitStop[];
  reasonChoices: ReasonChoice[];
}

export function buildRevisitView(places: readonly MergedPlace[], choices: RevisitChoices, today: string, language: Language): RevisitView {
  const start = readStart(choices.startLat, choices.startLon);
  const origin = start.kind === "ok" ? { lat: start.lat, lon: start.lon } : null;
  const list = buildRevisitList(
    places.map((place) => ({ record: place.record, conflict: place.conflict })),
    today,
    { reasons: cleanRevisitReasons(choices.reasons), origin, withinKm: readWithinKm(choices.withinKm), limit: readLimit(choices.limit) },
  );
  const order = revisitVisitOrder(list.items, origin);
  const stops: RevisitStop[] = order.stops.map((stop) => {
    const record = stop.item.place.record;
    return {
      order: stop.order,
      id: record.id,
      name: record.name,
      coordinates: revisitCoordinatesText(record, language),
      recordLine: revisitRecordLine(record, language),
      leg: revisitLegText(stop, language),
      reasons: stop.item.reasons.map((reason) => ({ label: revisitReasonLabel(reason, language), text: revisitReasonText(reason, language) })),
    };
  });
  return {
    list,
    order,
    start,
    summary: revisitSummaryText(list, language),
    orderNote: revisitOrderNote(order, language),
    stops,
    reasonChoices: REVISIT_REASONS.map((reason) => ({ value: reason, label: revisitReasonLabel(reason, language), count: list.byReason[reason] })),
  };
}

export function toggleReason(reasons: readonly string[], reason: string, on: boolean): string[] {
  const rest = reasons.filter((r) => r !== reason);
  return on ? [...rest, reason] : rest;
}

export type RevisitFileKind = "txt" | "csv";

export interface RevisitFile {
  filename: string;
  mime: string;
  content: string;
}

export function revisitFile(kind: RevisitFileKind, view: Pick<RevisitView, "list" | "order">, today: string, language: Language): RevisitFile {
  return kind === "csv"
    ? { filename: revisitFilename("csv", today), mime: "text/csv", content: revisitFillInCsv(view.order, language) }
    : { filename: revisitFilename("txt", today), mime: "text/plain", content: revisitFieldSheet(view.list, view.order, today, language) };
}

export { REVISIT_KM_CHOICES, REVISIT_LIMIT_CHOICES };

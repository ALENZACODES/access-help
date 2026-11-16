import { eventTiming, isIsoDate } from "./timing.js";
import { UNKNOWN, type Bilingual, type EventAccessRecord, type Unknown } from "./types.js";

export const JOURNEY_REQUEST_KIND = "event-journey-request";
export const JOURNEY_RESULT_KIND = "event-journey-result";
export const JOURNEY_FORMAT_VERSION = 1;

/**
 * What this package hands to a journey planner module: where the event is and when to arrive.
 * Data only. Building it plans nothing and makes no claim that any route exists or works.
 */
export interface JourneyRequest {
  kind: typeof JOURNEY_REQUEST_KIND;
  formatVersion: typeof JOURNEY_FORMAT_VERSION;
  eventId: string;
  demonstration: boolean;
  destination: {
    label: Bilingual | Unknown;
    placeId: string | Unknown;
    address: string | Unknown;
    /** The organiser's statement about the entrance in use, passed on as stated. */
    entranceInUse: Bilingual | Unknown;
    dropOff: Bilingual | Unknown;
  };
  arrival: {
    date: string | Unknown;
    earliest: string | Unknown;
    latest: string | Unknown;
  };
}

/** Why a request cannot be handed over, or what it lacks. */
export type JourneyGap = "virtual_event" | "no_place" | "no_event_date" | "event_past" | "no_arrival_window";

const BLOCKING: readonly JourneyGap[] = ["virtual_event", "no_place", "no_event_date", "event_past"];

export interface JourneyHandoff {
  request: JourneyRequest;
  gaps: JourneyGap[];
  /** True when a planner has a place and an upcoming date to work from. It is not a route. */
  ready: boolean;
}

export function buildJourneyHandoff(record: EventAccessRecord, today: string): JourneyHandoff {
  const gaps: JourneyGap[] = [];
  const timing = eventTiming(record, today);
  const place = record.place;
  const hasLocator = Boolean(place && (place.placeId || place.address));
  if (record.format === "virtual") gaps.push("virtual_event");
  if (!hasLocator) gaps.push("no_place");
  if (timing === "undated") gaps.push("no_event_date");
  if (timing === "past") gaps.push("event_past");
  if (!record.arrivalWindow) gaps.push("no_arrival_window");

  const text = (value: Bilingual | Unknown): Bilingual | Unknown => (value === UNKNOWN ? UNKNOWN : { en: value.en, fr: value.fr });
  const request: JourneyRequest = {
    kind: JOURNEY_REQUEST_KIND,
    formatVersion: JOURNEY_FORMAT_VERSION,
    eventId: record.eventId,
    demonstration: record.demonstration,
    destination: {
      label: place ? { en: place.label.en, fr: place.label.fr } : UNKNOWN,
      placeId: place?.placeId ?? UNKNOWN,
      address: place?.address ?? UNKNOWN,
      entranceInUse: text(record.entrance.inUse.value),
      dropOff: text(record.arrival.dropOff.value),
    },
    arrival: {
      date: isIsoDate(record.occurrenceDate) ? record.occurrenceDate : UNKNOWN,
      earliest: record.arrivalWindow?.earliest ?? UNKNOWN,
      latest: record.arrivalWindow?.latest ?? UNKNOWN,
    },
  };
  return { request, gaps, ready: !gaps.some((gap) => BLOCKING.includes(gap)) };
}

/** What a journey planner module may hand back. The wording is the planner's own. */
export interface JourneyPlannerResult {
  kind: typeof JOURNEY_RESULT_KIND;
  formatVersion: typeof JOURNEY_FORMAT_VERSION;
  eventId: string;
  outcome: "plan_found" | "no_plan_found";
  summary: Bilingual;
  /** Name of the planner module that produced the result. */
  planner: string;
  computedOn: string;
}

export type ResultProblem = "malformed" | "other_event";

const nonEmpty = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;

export function checkPlannerResult(
  value: unknown,
  request: Pick<JourneyRequest, "eventId">,
): { usable: true; result: JourneyPlannerResult } | { usable: false; problem: ResultProblem } {
  if (value === null || typeof value !== "object") return { usable: false, problem: "malformed" };
  const v = value as Record<string, unknown>;
  const summary = v.summary as Record<string, unknown> | null | undefined;
  const shapeOk =
    v.kind === JOURNEY_RESULT_KIND &&
    v.formatVersion === JOURNEY_FORMAT_VERSION &&
    nonEmpty(v.eventId, 300) &&
    (v.outcome === "plan_found" || v.outcome === "no_plan_found") &&
    summary !== null &&
    typeof summary === "object" &&
    nonEmpty(summary.en, 2000) &&
    nonEmpty(summary.fr, 2000) &&
    nonEmpty(v.planner, 200) &&
    isIsoDate(v.computedOn);
  if (!shapeOk) return { usable: false, problem: "malformed" };
  if (v.eventId !== request.eventId) return { usable: false, problem: "other_event" };
  const s = summary as { en: string; fr: string };
  return {
    usable: true,
    result: {
      kind: JOURNEY_RESULT_KIND,
      formatVersion: JOURNEY_FORMAT_VERSION,
      eventId: v.eventId as string,
      outcome: v.outcome as JourneyPlannerResult["outcome"],
      summary: { en: s.en, fr: s.fr },
      planner: v.planner as string,
      computedOn: v.computedOn as string,
    },
  };
}

export type JourneyView =
  | { state: "not_connected" }
  | { state: "result_refused"; problem: ResultProblem }
  | { state: "planner_result"; result: JourneyPlannerResult };

/**
 * What the screen may say. With no planner result there is exactly one answer: not connected.
 * A supplied result is shown as the planner's statement; this package never upgrades it.
 */
export function journeyView(handoff: JourneyHandoff, plannerResult?: unknown): JourneyView {
  if (plannerResult === undefined || plannerResult === null) return { state: "not_connected" };
  const checked = checkPlannerResult(plannerResult, handoff.request);
  return checked.usable ? { state: "planner_result", result: checked.result } : { state: "result_refused", problem: checked.problem };
}

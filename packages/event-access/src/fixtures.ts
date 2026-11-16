import { UNKNOWN, type EventAccessRecord, type Fact } from "./types.js";

/**
 * DEMONSTRATION DATA. These events are invented for testing. They describe no real venue,
 * organiser or occurrence. No door width, washroom measurement or distance has been measured
 * for any of them, so every measurement is Unknown. The eventId values are local to this package;
 * the journey engine and a real link to community event records are not part of this slice.
 */
const DEMO_DATE = "2026-11-15";
const DEMO_LICENCE = "Not a third-party dataset (demonstration text written for this prototype)";
const NOT_MEASURED_SOURCE = "No measurement or report recorded (demonstration record)";
const DEMO_STATEMENT_SOURCE = "Demonstration statement written for this prototype; describes no real place";

/** A fact nobody has measured or reported. Stays Unknown. */
function unknown<V>(): Fact<V> {
  return {
    value: UNKNOWN,
    source: NOT_MEASURED_SOURCE,
    licence: "Not applicable, no data",
    date: DEMO_DATE,
    tier: 0,
    prototypeLabel: "PROTOTYPE-UNVERIFIED",
  };
}

/** A qualitative statement about an invented event, labelled as an operator claim (tier 1). */
function claimed<V>(value: V): Fact<V> {
  return {
    value,
    source: DEMO_STATEMENT_SOURCE,
    licence: DEMO_LICENCE,
    date: DEMO_DATE,
    tier: 1,
    prototypeLabel: "PROTOTYPE-UNVERIFIED",
  };
}

/** As claimed(), for a statement made on a given day. */
function claimedOn<V>(value: V, date: string): Fact<V> {
  return { ...claimed(value), date };
}

const PAST_STATEMENT_DATE = "2026-09-20";

const allUnknown = {
  entrance: { inUse: unknown<{ en: string; fr: string }>(), stepFree: unknown<"yes" | "no">(), doorClearWidthMm: unknown<number>(), doorwayNotes: unknown<{ en: string; fr: string }>() },
  temporary: { ramp: unknown<"yes" | "no">(), stageAccess: unknown<"yes" | "no">(), layoutNotes: unknown<{ en: string; fr: string }>() },
  quiet: { space: unknown<"yes" | "no">(), notes: unknown<{ en: string; fr: string }>() },
  remote: { livestream: unknown<"yes" | "no">(), participation: unknown<"yes" | "no">(), link: unknown<string>() },
  washroom: { present: unknown<"yes" | "no">(), openDuringEvent: unknown<"yes" | "no">(), transferSpaceMm: unknown<number>(), adultChangeTable: unknown<"yes" | "no">(), hoist: unknown<"yes" | "no">() },
  parking: { type: unknown<"none" | "street" | "lot" | "garage">(), vanAccessible: unknown<"yes" | "no">(), distanceToEntranceM: unknown<number>() },
  seating: {
    wheelchairSpace: unknown<"yes" | "no">(),
    companionSeating: unknown<"yes" | "no">(),
    viewingPosition: unknown<{ en: string; fr: string }>(),
    sightlineWhenOthersStand: unknown<"yes" | "no">(),
  },
  arrival: { transitNotes: unknown<{ en: string; fr: string }>(), dropOff: unknown<{ en: string; fr: string }>() },
  supportPerson: { policy: unknown<"free" | "discounted" | "full_price">() },
};

/** An invented place label. It names no real location and has no address. */
const DEMO_PLACE = {
  label: { en: "Demonstration place (not a real location)", fr: "Lieu de démonstration (pas un vrai lieu)" },
  placeId: "demo-place-001",
};

export const DEMONSTRATION_RECORDS: readonly EventAccessRecord[] = [
  {
    // Nothing is known: shows every empty state.
    eventId: "demo-nothing-known",
    eventLabel: { en: "Demonstration event: nothing recorded yet", fr: "Événement de démonstration\u00a0: rien n'est encore noté" },
    format: "in_person",
    demonstration: true,
    confirmation: "unknown",
    inAppRegistration: false,
    ...allUnknown,
  },
  {
    // A venue-level note only: one qualitative claim, everything else Unknown.
    eventId: "demo-venue-note",
    eventLabel: { en: "Demonstration event: venue note only", fr: "Événement de démonstration\u00a0: note sur le lieu seulement" },
    format: "in_person",
    demonstration: true,
    confirmation: "not_confirmed_venue_note_only",
    inAppRegistration: false,
    ...allUnknown,
    entrance: {
      ...allUnknown.entrance,
      stepFree: claimed("yes"),
      doorwayNotes: claimed({
        en: "The venue note says the main entrance has no steps. Nobody measured the door.",
        fr: "La note sur le lieu dit que l'entrée principale n'a pas de marche. Personne n'a mesuré la porte.",
      }),
    },
  },
  {
    // Confirmed for one occurrence, hybrid, so captions are recorded. Measurements stay Unknown.
    eventId: "demo-hybrid-confirmed",
    eventLabel: { en: "Demonstration event: hybrid, confirmed", fr: "Événement de démonstration\u00a0: hybride, confirmé" },
    format: "hybrid",
    demonstration: true,
    confirmation: "confirmed_for_this_occurrence",
    occurrenceDate: "2026-12-01",
    inAppRegistration: false,
    ...allUnknown,
    entrance: { ...allUnknown.entrance, stepFree: claimed("yes") },
    parking: { ...allUnknown.parking, type: claimed("lot") },
    place: DEMO_PLACE,
    arrivalWindow: { earliest: "18:00", latest: "19:00" },
    seating: { ...allUnknown.seating, wheelchairSpace: claimed("yes"), companionSeating: claimed("yes") },
    remote: { ...allUnknown.remote, livestream: claimed("yes") },
    supportPerson: { policy: claimed("free") },
    arrival: {
      ...allUnknown.arrival,
      transitNotes: claimed({
        en: "The organiser says to ask about arrival by phone. No route has been checked.",
        fr: "L'organisateur dit de poser la question de l'arrivée par téléphone. Aucun trajet n'a été vérifié.",
      }),
    },
    captions: claimed("yes"),
  },
  {
    // Virtual: no venue fields apply in practice, so they stay Unknown; captions Unknown.
    eventId: "demo-virtual-captions-unknown",
    eventLabel: { en: "Demonstration event: virtual, captions not known", fr: "Événement de démonstration\u00a0: virtuel, sous-titres inconnus" },
    format: "virtual",
    demonstration: true,
    confirmation: "unknown",
    inAppRegistration: false,
    ...allUnknown,
    captions: unknown<"yes" | "no">(),
  },
];

/**
 * A demonstration record whose event date has passed, with statements that apply to that one
 * evening only. It exists so the page can show a past record as past.
 */
export const PAST_DEMONSTRATION_RECORD: EventAccessRecord = {
  eventId: "demo-past-evening",
  eventLabel: { en: "Demonstration event: past evening", fr: "Événement de démonstration\u00a0: soirée passée" },
  format: "in_person",
  demonstration: true,
  confirmation: "confirmed_for_this_occurrence",
  occurrenceDate: "2026-10-01",
  inAppRegistration: false,
  place: DEMO_PLACE,
  ...allUnknown,
  entrance: {
    ...allUnknown.entrance,
    inUse: claimedOn(
      {
        en: "The organiser says the side entrance is the one in use for this evening. Nobody measured it.",
        fr: "L'organisateur dit que l'entrée latérale est celle utilisée ce soir-là. Personne ne l'a mesurée.",
      },
      PAST_STATEMENT_DATE,
    ),
  },
  temporary: { ...allUnknown.temporary, ramp: claimedOn("yes", PAST_STATEMENT_DATE) },
  quiet: { ...allUnknown.quiet, space: claimedOn("no", PAST_STATEMENT_DATE) },
};

export const ALL_DEMONSTRATION_RECORDS: readonly EventAccessRecord[] = [...DEMONSTRATION_RECORDS, PAST_DEMONSTRATION_RECORD];

export function findRecord(eventId: string): EventAccessRecord | undefined {
  return ALL_DEMONSTRATION_RECORDS.find((r) => r.eventId === eventId);
}

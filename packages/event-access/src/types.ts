export type Lang = "en" | "fr";

/** The one spelling of "not known". A missing measurement is never 0, "", null, or "no". */
export const UNKNOWN = "Unknown" as const;
export type Unknown = typeof UNKNOWN;

/**
 * Canonical provenance tier. 0 open-data slot, 1 operator claim, 2 peer report.
 * This prototype does not produce tier 3 (survey), 4 (live feed) or E (desk check) evidence,
 * so the schema refuses them.
 */
export type Tier = 0 | 1 | 2;

/** Prototype label. VERIFIED is not storable here. */
export type PrototypeLabel = "PROTOTYPE-UNVERIFIED" | "SEEDED-OPEN-DATA" | "COMMUNITY-REPORTED";

export type EventFormat = "in_person" | "virtual" | "hybrid";

/**
 * The three states of the event record in the community package, plus one for a record an
 * organiser wrote themselves. An organiser statement is a claim about one occurrence that
 * nobody else has checked, so it is never stored or shown as confirmed.
 */
export type EventConfirmation =
  | "confirmed_for_this_occurrence"
  | "organiser_statement_unverified"
  | "not_confirmed_venue_note_only"
  | "unknown";

export type YesNo = "yes" | "no";
export type ParkingType = "none" | "street" | "lot" | "garage";
export type SupportPolicy = "free" | "discounted" | "full_price";

export interface Bilingual {
  en: string;
  fr: string;
}

/** Field-fact wrapper: every value carries its own source, licence, date, and tier. */
export interface Fact<V> {
  value: V | Unknown;
  source: string;
  licence: string;
  /** ISO date (YYYY-MM-DD) of the source statement or measurement. */
  date: string;
  tier: Tier;
  prototypeLabel: PrototypeLabel;
}

export interface EventPlace {
  label: Bilingual;
  /** Id of a place record, when one exists. This package never looks it up. */
  placeId?: string;
  address?: string;
}

/** Local 24-hour times, HH:MM. */
export interface ArrivalWindow {
  earliest: string;
  latest: string;
}

export interface EventAccessRecord {
  /** Links this record to an event record by id. */
  eventId: string;
  eventLabel: Bilingual;
  format: EventFormat;
  demonstration: boolean;
  confirmation: EventConfirmation;
  /** Required when confirmation is confirmed_for_this_occurrence or organiser_statement_unverified. */
  occurrenceDate?: string;
  /** The App does not sell tickets or take registrations. */
  inAppRegistration: false;
  /** Where the event is held. Identification only; it carries no accessibility claim. */
  place?: EventPlace;
  /** When people can arrive, in the event's local time. Needs occurrenceDate. */
  arrivalWindow?: ArrivalWindow;
  entrance: {
    /** Which entrance is in use for this event. It can differ from the venue's usual entrance. */
    inUse: Fact<Bilingual>;
    stepFree: Fact<YesNo>;
    doorClearWidthMm: Fact<number>;
    doorwayNotes: Fact<Bilingual>;
  };
  /** Things set up for this event only. */
  temporary: {
    ramp: Fact<YesNo>;
    stageAccess: Fact<YesNo>;
    layoutNotes: Fact<Bilingual>;
  };
  washroom: {
    present: Fact<YesNo>;
    /** Whether the accessible washroom stays open and reachable while the event runs. */
    openDuringEvent: Fact<YesNo>;
    transferSpaceMm: Fact<number>;
    adultChangeTable: Fact<YesNo>;
    hoist: Fact<YesNo>;
  };
  parking: {
    type: Fact<ParkingType>;
    vanAccessible: Fact<YesNo>;
    distanceToEntranceM: Fact<number>;
  };
  seating: {
    wheelchairSpace: Fact<YesNo>;
    companionSeating: Fact<YesNo>;
    viewingPosition: Fact<Bilingual>;
    sightlineWhenOthersStand: Fact<YesNo>;
  };
  quiet: {
    space: Fact<YesNo>;
    notes: Fact<Bilingual>;
  };
  arrival: { transitNotes: Fact<Bilingual>; dropOff: Fact<Bilingual> };
  supportPerson: { policy: Fact<SupportPolicy> };
  /** Taking part without travelling. Recorded for every format; Unknown when nobody has said. */
  remote: {
    livestream: Fact<YesNo>;
    participation: Fact<YesNo>;
    /** An https address given by the organiser. Shown as text, never fetched. */
    link: Fact<string>;
  };
  /** Present for virtual and hybrid events only. */
  captions?: Fact<YesNo>;
}

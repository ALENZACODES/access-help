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

/** Same three states as the event record in the community package. */
export type EventConfirmation = "confirmed_for_this_occurrence" | "not_confirmed_venue_note_only" | "unknown";

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

export interface EventAccessRecord {
  /** Links this record to an event record by id. */
  eventId: string;
  eventLabel: Bilingual;
  format: EventFormat;
  demonstration: boolean;
  confirmation: EventConfirmation;
  /** Required when confirmation is confirmed_for_this_occurrence. */
  occurrenceDate?: string;
  /** The App does not sell tickets or take registrations. */
  inAppRegistration: false;
  entrance: {
    stepFree: Fact<YesNo>;
    doorClearWidthMm: Fact<number>;
    doorwayNotes: Fact<Bilingual>;
  };
  washroom: {
    present: Fact<YesNo>;
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
  };
  arrival: { transitNotes: Fact<Bilingual> };
  supportPerson: { policy: Fact<SupportPolicy> };
  /** Present for virtual and hybrid events only. */
  captions?: Fact<YesNo>;
}

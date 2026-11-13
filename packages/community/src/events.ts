import type { CanonicalTier, Language, PrototypeLabel } from "./types.js";

export type EventFormat = "in_person" | "virtual" | "hybrid";
export type EventConfirmation = "confirmed_for_this_occurrence" | "not_confirmed_venue_note_only" | "unknown";

export interface EventRecord {
  id: string;
  title: Record<Language, string>;
  organiser: string;
  format: EventFormat;
  start: string;
  timeZone: "America/Toronto";
  city: string;
  demonstration: boolean;
  confirmation: EventConfirmation;
  entrance: string;
  seating: string;
  washrooms: string;
  arrival: string;
  support: string;
  platform?: string;
  captions?: string;
  registrationUrl: string;
  registrationPhone: string;
  cost: string;
  supportPersonAdmission: string;
  source: string;
  licence: string;
  sourceDate: string;
  recordDate: string;
  inAppRegistration: false;
  cancelled?: boolean;
  tier: CanonicalTier;
  prototypeLabel: PrototypeLabel;
}

const UNKNOWN = "Unknown. This demonstration record does not invent a measurement.";
const INCONNU = "Inconnu. Cette fiche de démonstration n'invente pas de mesure.";

function demo(partial: Pick<EventRecord, "id" | "title" | "format" | "start" | "city"> & Partial<EventRecord>): EventRecord {
  return {
    organiser: "Demonstration organiser. Not Spinal Cord Injury Ontario. SCIO has not supplied this listing.",
    demonstration: true,
    confirmation: "not_confirmed_venue_note_only",
    entrance: `${UNKNOWN} Venue note only: no entrance was checked for this date.`,
    seating: UNKNOWN,
    washrooms: UNKNOWN,
    arrival: UNKNOWN,
    support: UNKNOWN,
    registrationUrl: "https://sciontario.org/",
    registrationPhone: "Unknown — use the organisation's own site",
    cost: UNKNOWN,
    supportPersonAdmission: UNKNOWN,
    tier: 0,
    prototypeLabel: "PROTOTYPE-UNVERIFIED",
    source: "Original demonstration shape for the prototype. Not a real event and not an SCIO calendar entry.",
    licence: "Not a third-party dataset. Written for the prototype and labelled demonstration.",
    sourceDate: "2026-11-13",
    recordDate: "2026-11-13",
    inAppRegistration: false,
    timeZone: "America/Toronto",
    ...partial,
  };
}

/**
 * Three demonstration listings required by the Day 16 skeleton.
 * They are not a calendar. They do not claim SCIO is holding these events.
 */
export const DEMONSTRATION_EVENTS: readonly EventRecord[] = [
  demo({
    id: "demo-virtual-peer",
    title: {
      en: "Demonstration event: virtual peer workshop (not a real listing)",
      fr: "Événement de démonstration : atelier virtuel de pairs (pas une vraie fiche)",
    },
    format: "virtual",
    start: "2026-12-01T18:00:00-05:00",
    city: "Online — demonstration",
    platform: "Unknown. The App does not host the meeting and does not control the platform.",
    captions: "Unknown. Captioning was not confirmed for this demonstration.",
  }),
  demo({
    id: "demo-in-person",
    title: {
      en: "Demonstration event: in-person peer drop-in (not a real listing)",
      fr: "Événement de démonstration : rencontre en personne (pas une vraie fiche)",
    },
    format: "in_person",
    start: "2026-12-03T17:30:00-05:00",
    city: "Toronto — demonstration",
  }),
  demo({
    id: "demo-family",
    title: {
      en: "Demonstration event: family information session (not a real listing)",
      fr: "Événement de démonstration : séance d'information pour les familles (pas une vraie fiche)",
    },
    format: "hybrid",
    start: "2026-12-08T19:00:00-05:00",
    city: "Ottawa — demonstration",
    platform: "Unknown for the virtual part.",
    captions: INCONNU,
  }),
];

export interface EventView {
  id: string;
  title: string;
  demonstration: boolean;
  format: EventFormat;
  when: string;
  where: string;
  arrival: string;
  entrance: string;
  seating: string;
  washrooms: string;
  support: string;
  registrationUrl: string;
  registrationPhone: string;
  cost: string;
  supportPersonAdmission: string;
  confirmationNotice: string;
  platformNote: string | null;
  inAppRegistration: false;
  tier: CanonicalTier;
  prototypeLabel: PrototypeLabel;
  source: string;
  recordDate: string;
}

export function presentEvent(event: EventRecord, language: Language): EventView {
  const venueOnly =
    event.confirmation !== "confirmed_for_this_occurrence"
      ? language === "fr"
        ? "Les données de cet événement ne sont pas confirmées pour cette date. La note du bâtiment, s'il y en a une, n'est pas une preuve pour ce soir. Vérifiez auprès de l'organisateur."
        : "Per-event data is not confirmed for this date. A building note is not proof about this event. Check with the organiser."
      : language === "fr"
        ? "Les données ont été confirmées pour cette occurrence. La date de confirmation est la date de la fiche."
        : "Data was confirmed for this occurrence. The confirmation date is the record date.";
  return {
    id: event.id,
    title: event.title[language],
    demonstration: event.demonstration,
    format: event.format,
    when: `${event.start} (${event.timeZone})`,
    where: event.city,
    arrival: event.arrival,
    entrance: event.entrance,
    seating: event.seating,
    washrooms: event.washrooms,
    support: event.support,
    registrationUrl: event.registrationUrl,
    registrationPhone: event.registrationPhone,
    cost: event.cost,
    supportPersonAdmission: event.supportPersonAdmission,
    confirmationNotice: venueOnly,
    platformNote:
      event.format === "in_person"
        ? null
        : language === "fr"
          ? `Plateforme : ${event.platform ?? "Inconnu"}. Sous-titrage : ${event.captions ?? "Inconnu"}. L'application ne contrôle pas la plateforme.`
          : `Platform: ${event.platform ?? "Unknown"}. Captions: ${event.captions ?? "Unknown"}. The App does not control the platform.`,
    inAppRegistration: false,
    tier: event.tier,
    prototypeLabel: event.prototypeLabel,
    source: event.source,
    recordDate: event.recordDate,
  };
}

/** A listing must not be described as accessible from venue data alone. */
export function accessibleClaimAllowed(event: EventRecord): boolean {
  return event.confirmation === "confirmed_for_this_occurrence" && event.prototypeLabel !== "PROTOTYPE-UNVERIFIED" && event.tier !== 0;
}

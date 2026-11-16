import type { EventOutingSource } from "./types";

/**
 * SAMPLE DATA. These events are invented so the planner can be tried. They describe no real
 * event, venue or organiser, and every one is labelled as a demonstration.
 */
const PREPARED = "2026-11-15";

const item = (fieldId: string, en: string, fr: string) => ({ fieldId, label: { en, fr } });

export const SAMPLE_EVENT_SOURCES: readonly EventOutingSource[] = [
  {
    kind: "event-outing-source",
    formatVersion: 1,
    eventId: "sample-evening-some-unknown",
    label: {
      en: "Demonstration event: evening with some items Unknown",
      fr: "Événement de démonstration : soirée avec des éléments inconnus",
    },
    eventDate: "2026-12-01",
    demonstration: true,
    preparedOn: PREPARED,
    totalFields: 8,
    unknownItems: [
      item("entrance.inUse", "Entrance in use for this event", "Entrée utilisée pour cet événement"),
      item("washroom.openDuringEvent", "Accessible washroom open during the event", "Toilettes accessibles ouvertes pendant l’événement"),
      item("seating.viewingPosition", "Where the wheelchair viewing positions are", "Emplacement des places pour fauteuil roulant"),
      item("quiet.space", "Quiet space available", "Espace calme offert"),
      item("arrival.dropOff", "Drop-off point", "Point de débarquement"),
    ],
  },
  {
    kind: "event-outing-source",
    formatVersion: 1,
    eventId: "sample-nothing-recorded",
    label: {
      en: "Demonstration event: no date and nothing recorded",
      fr: "Événement de démonstration : sans date et rien de noté",
    },
    eventDate: "Unknown",
    demonstration: true,
    preparedOn: PREPARED,
    totalFields: 3,
    unknownItems: [
      item("entrance.stepFree", "Step-free entrance", "Entrée sans marche"),
      item("supportPerson.policy", "Support-person policy", "Politique pour la personne de soutien"),
      item("temporary.ramp", "Temporary ramp in place", "Rampe temporaire en place"),
    ],
  },
  {
    kind: "event-outing-source",
    formatVersion: 1,
    eventId: "sample-past-evening",
    label: {
      en: "Demonstration event: past evening",
      fr: "Événement de démonstration : soirée passée",
    },
    eventDate: "2026-10-01",
    demonstration: true,
    preparedOn: "2026-09-20",
    totalFields: 2,
    unknownItems: [item("temporary.stageAccess", "Step-free way onto the stage or platform", "Accès sans marche à la scène ou à l’estrade")],
  },
];

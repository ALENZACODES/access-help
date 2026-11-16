export interface Bilingual {
  en: string;
  fr: string;
}

export const UNKNOWN_DATE = "Unknown" as const;

/**
 * What the outing planner takes from a per-event accessibility record: which event, when, and
 * which items nobody has answered. Data only: it carries no values and no access claim.
 * The event-access package writes this shape as a file; this package only reads it.
 */
export interface EventOutingSource {
  kind: "event-outing-source";
  formatVersion: 1;
  eventId: string;
  label: Bilingual;
  eventDate: string | typeof UNKNOWN_DATE;
  /** True when the event is demonstration data. The plan keeps the label. */
  demonstration: boolean;
  /** Day the list of Unknown items was prepared from the record. */
  preparedOn: string;
  totalFields: number;
  unknownItems: { fieldId: string; label: Bilingual }[];
}

export type PlanItem =
  | { id: string; kind: "ask_organiser"; fieldId: string; label: Bilingual; done: boolean }
  | { id: string; kind: "own"; text: string; done: boolean };

/** A personal pre-departure checklist for one event. It lives on this device only. */
export interface EventPlan {
  id: string;
  eventId: string;
  eventLabel: Bilingual;
  eventDate: string | typeof UNKNOWN_DATE;
  demonstration: boolean;
  createdOn: string;
  sourcePreparedOn: string;
  /** How many items the event record has in all, so the plan can say how many were Unknown. */
  sourceTotalFields: number;
  items: PlanItem[];
}

export type PlanTiming = "upcoming" | "today" | "past" | "undated";

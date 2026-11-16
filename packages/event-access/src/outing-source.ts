import { messages } from "./i18n.js";
import { FIELD_DEFS } from "./project.js";
import { isIsoDate } from "./timing.js";
import { UNKNOWN, type Bilingual, type EventAccessRecord, type Unknown } from "./types.js";

export const OUTING_SOURCE_KIND = "event-outing-source";
export const OUTING_SOURCE_VERSION = 1;

/**
 * What an outing planner needs from a per-event record: which event, when, and which items
 * nobody has answered. Data only. It carries no values and no access claim.
 */
export interface EventOutingSource {
  kind: typeof OUTING_SOURCE_KIND;
  formatVersion: typeof OUTING_SOURCE_VERSION;
  eventId: string;
  label: Bilingual;
  eventDate: string | Unknown;
  demonstration: boolean;
  preparedOn: string;
  totalFields: number;
  unknownItems: { fieldId: string; label: Bilingual }[];
}

export function toOutingSource(record: EventAccessRecord, preparedOn: string): EventOutingSource {
  if (!isIsoDate(preparedOn)) throw new Error("preparedOn must be an ISO date");
  const present = FIELD_DEFS.filter((def) => def.read(record) !== undefined);
  return {
    kind: OUTING_SOURCE_KIND,
    formatVersion: OUTING_SOURCE_VERSION,
    eventId: record.eventId,
    label: { en: record.eventLabel.en, fr: record.eventLabel.fr },
    eventDate: isIsoDate(record.occurrenceDate) ? record.occurrenceDate : UNKNOWN,
    demonstration: record.demonstration,
    preparedOn,
    totalFields: present.length,
    unknownItems: present
      .filter((def) => def.read(record)?.value === UNKNOWN)
      .map((def) => ({ fieldId: def.id, label: { en: messages.en[def.label], fr: messages.fr[def.label] } })),
  };
}

export function serializeOutingSource(source: EventOutingSource): string {
  return `${JSON.stringify(source, null, 2)}\n`;
}

export function outingSourceFileName(source: Pick<EventOutingSource, "eventId">): string {
  const safe = source.eventId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "event";
  return `event-questions-${safe}.json`;
}

import { interpolate, messages, type MessageKey } from "./i18n.js";
import {
  UNKNOWN,
  type EventAccessRecord,
  type EventConfirmation,
  type EventFormat,
  type Fact,
  type Lang,
  type PrototypeLabel,
  type Tier,
} from "./types.js";

export type SectionId = "entrance" | "washroom" | "parking" | "seating" | "arrival" | "support" | "captions";
type Kind = "yesno" | "mm" | "m" | "text" | "parking" | "support";

interface FieldDef {
  id: string;
  section: SectionId;
  label: MessageKey;
  kind: Kind;
  read: (record: EventAccessRecord) => Fact<unknown> | undefined;
}

/** Every field the page shows, in order. One place, so the page and the tests cannot drift. */
export const FIELD_DEFS: readonly FieldDef[] = [
  { id: "entrance.stepFree", section: "entrance", label: "field_entrance_stepFree", kind: "yesno", read: (r) => r.entrance.stepFree },
  { id: "entrance.doorClearWidthMm", section: "entrance", label: "field_entrance_doorClearWidthMm", kind: "mm", read: (r) => r.entrance.doorClearWidthMm },
  { id: "entrance.doorwayNotes", section: "entrance", label: "field_entrance_doorwayNotes", kind: "text", read: (r) => r.entrance.doorwayNotes },
  { id: "washroom.present", section: "washroom", label: "field_washroom_present", kind: "yesno", read: (r) => r.washroom.present },
  { id: "washroom.transferSpaceMm", section: "washroom", label: "field_washroom_transferSpaceMm", kind: "mm", read: (r) => r.washroom.transferSpaceMm },
  { id: "washroom.adultChangeTable", section: "washroom", label: "field_washroom_adultChangeTable", kind: "yesno", read: (r) => r.washroom.adultChangeTable },
  { id: "washroom.hoist", section: "washroom", label: "field_washroom_hoist", kind: "yesno", read: (r) => r.washroom.hoist },
  { id: "parking.type", section: "parking", label: "field_parking_type", kind: "parking", read: (r) => r.parking.type },
  { id: "parking.vanAccessible", section: "parking", label: "field_parking_vanAccessible", kind: "yesno", read: (r) => r.parking.vanAccessible },
  { id: "parking.distanceToEntranceM", section: "parking", label: "field_parking_distanceToEntranceM", kind: "m", read: (r) => r.parking.distanceToEntranceM },
  { id: "seating.wheelchairSpace", section: "seating", label: "field_seating_wheelchairSpace", kind: "yesno", read: (r) => r.seating.wheelchairSpace },
  { id: "seating.companionSeating", section: "seating", label: "field_seating_companionSeating", kind: "yesno", read: (r) => r.seating.companionSeating },
  { id: "arrival.transitNotes", section: "arrival", label: "field_arrival_transitNotes", kind: "text", read: (r) => r.arrival.transitNotes },
  { id: "supportPerson.policy", section: "support", label: "field_support_policy", kind: "support", read: (r) => r.supportPerson.policy },
  { id: "captions.live", section: "captions", label: "field_captions_live", kind: "yesno", read: (r) => r.captions },
];

const SECTION_ORDER: readonly SectionId[] = ["entrance", "washroom", "parking", "seating", "arrival", "support", "captions"];

export interface ProjectedField {
  id: string;
  label: string;
  /** True when the stored value is Unknown. Then value and display are null, never 0, "no" or "". */
  unknown: boolean;
  /** The stored value, untouched. Null only for Unknown. */
  value: unknown;
  /** Text to show for a known value. Null for Unknown, so the caller must show the empty state. */
  display: string | null;
  date: string;
  source: string;
  licence: string;
  tier: Tier;
  tierLabel: string;
  prototypeLabel: PrototypeLabel;
  prototypeLabelText: string;
}

export interface ProjectedSection {
  id: SectionId;
  heading: string;
  fields: ProjectedField[];
  /** True for captions on an in-person event. The section is shown with an explanation, not hidden. */
  notApplicable: boolean;
}

export interface ProjectedRecord {
  eventId: string;
  label: string;
  format: EventFormat;
  formatLabel: string;
  demonstration: boolean;
  confirmation: EventConfirmation;
  confirmationLabel: string;
  occurrenceDate: string | null;
  sections: ProjectedSection[];
  totalFields: number;
  unknownFields: number;
  summary: string;
}

function formatValue(kind: Kind, value: unknown, lang: Lang): string {
  const m = messages[lang];
  switch (kind) {
    case "yesno":
      return value === "yes" ? m.value_yes : m.value_no;
    case "mm":
    case "m": {
      const unit = kind === "mm" ? m.unit_mm : m.unit_m;
      return `${new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA").format(Number(value))} ${unit}`;
    }
    case "text":
      return (value as { en: string; fr: string })[lang];
    case "parking":
      return m[`value_parking_${String(value)}` as MessageKey];
    case "support":
      return m[`value_support_${String(value)}` as MessageKey];
  }
}

/** Project one fact. Unknown stays Unknown: no default, no coercion. */
export function projectFact(def: FieldDef, fact: Fact<unknown>, lang: Lang): ProjectedField {
  const m = messages[lang];
  const unknown = fact.value === UNKNOWN;
  return {
    id: def.id,
    label: m[def.label],
    unknown,
    value: unknown ? null : fact.value,
    display: unknown ? null : formatValue(def.kind, fact.value, lang),
    date: fact.date,
    source: fact.source,
    licence: fact.licence,
    tier: fact.tier,
    tierLabel: m[`tier_${fact.tier}` as MessageKey],
    prototypeLabel: fact.prototypeLabel,
    prototypeLabelText: m[`proto_${fact.prototypeLabel.replace(/-/g, "_")}` as MessageKey],
  };
}

export function projectRecord(record: EventAccessRecord, lang: Lang): ProjectedRecord {
  const m = messages[lang];
  const sections: ProjectedSection[] = SECTION_ORDER.map((id) => {
    const fields: ProjectedField[] = [];
    for (const def of FIELD_DEFS.filter((d) => d.section === id)) {
      const fact = def.read(record);
      if (fact) fields.push(projectFact(def, fact, lang));
    }
    return { id, heading: m[`section_${id}` as MessageKey], fields, notApplicable: id === "captions" && fields.length === 0 };
  });
  const all = sections.flatMap((s) => s.fields);
  const unknownFields = all.filter((f) => f.unknown).length;
  return {
    eventId: record.eventId,
    label: record.eventLabel[lang],
    format: record.format,
    formatLabel: m[`format_${record.format}` as MessageKey],
    demonstration: record.demonstration,
    confirmation: record.confirmation,
    confirmationLabel: m[`confirmation_${record.confirmation}` as MessageKey],
    occurrenceDate: record.occurrenceDate ?? null,
    sections,
    totalFields: all.length,
    unknownFields,
    summary: interpolate(m.summaryUnknown, { unknown: unknownFields, total: all.length }),
  };
}

/** Ids of fields whose value is Unknown. Used for honest empty states and for tests. */
export function unknownFieldIds(record: EventAccessRecord): string[] {
  return FIELD_DEFS.filter((d) => d.read(record)?.value === UNKNOWN).map((d) => d.id);
}

/**
 * An accessible-for-everyone headline is never derived. The only claim this package allows is the
 * stored confirmation state itself, and a confirmed state still says nothing about fields left Unknown.
 */
export function mayStateConfirmed(record: EventAccessRecord): boolean {
  return record.confirmation === "confirmed_for_this_occurrence" && typeof record.occurrenceDate === "string";
}

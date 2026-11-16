import { messages, interpolate } from "./i18n.js";
import { FIELD_DEFS, type FieldDef, type SectionId, SECTION_ORDER } from "./project.js";
import { isIsoDate } from "./timing.js";
import { UNKNOWN, type Bilingual, type EventAccessRecord, type EventConfirmation, type EventFormat, type Fact, type Lang } from "./types.js";
import { validateEventAccessRecord } from "./validate.js";

/** The confirmation state of every record built from an organiser's answers. */
export const ORGANISER_CONFIRMATION = "organiser_statement_unverified" as const satisfies EventConfirmation;

/**
 * What an organiser typed into the checklist. Everything is a string, as it comes from the form.
 * An empty answer means Unknown. It never means no.
 */
export interface OrganiserFormInput {
  eventLabelEn: string;
  eventLabelFr: string;
  format: EventFormat;
  occurrenceDate: string;
  placeLabelEn: string;
  placeLabelFr: string;
  address: string;
  arrivalEarliest: string;
  arrivalLatest: string;
  /** Who is making the statement. A role is enough. */
  statedBy: string;
  statementDate: string;
  /** Reuse terms the organiser sets for their own statement. Empty means none stated. */
  licence: string;
  /** Answer per field id. For text fields this is the English text. */
  answers: Record<string, string>;
  /** French text per text-field id. */
  answersFr: Record<string, string>;
}

export function emptyOrganiserForm(statementDate = ""): OrganiserFormInput {
  return {
    eventLabelEn: "",
    eventLabelFr: "",
    format: "in_person",
    occurrenceDate: "",
    placeLabelEn: "",
    placeLabelFr: "",
    address: "",
    arrivalEarliest: "",
    arrivalLatest: "",
    statedBy: "",
    statementDate,
    licence: "",
    answers: {},
    answersFr: {},
  };
}

export type IssueCode =
  | "label_required"
  | "too_long"
  | "format_invalid"
  | "date_required"
  | "date_invalid"
  | "stated_by_required"
  | "statement_date_required"
  | "statement_date_future"
  | "time_invalid"
  | "window_needs_both"
  | "window_needs_date"
  | "window_order"
  | "choice_invalid"
  | "number_invalid"
  | "link_invalid"
  | "record_invalid";

export interface FormIssue {
  /** A form field name or a record field id. */
  field: string;
  code: IssueCode;
}

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const LINK = /^https:\/\/[^\s<>"']+$/;
const NUMBER = /^\d+(\.\d+)?$/;
export const MAX_LABEL = 200;
export const MAX_TEXT = 1000;
export const MAX_NUMBER = 100_000;

const CHOICES: Partial<Record<FieldDef["kind"], readonly string[]>> = {
  yesno: ["yes", "no"],
  parking: ["none", "street", "lot", "garage"],
  support: ["free", "discounted", "full_price"],
};

/** The values a choice field accepts, without Unknown. Empty for free-entry fields. */
export function choicesFor(kind: FieldDef["kind"]): readonly string[] {
  return CHOICES[kind] ?? [];
}

/** Fields the checklist asks about for a format. Captions apply to virtual and hybrid events only. */
export function formFields(format: EventFormat): readonly FieldDef[] {
  return FIELD_DEFS.filter((def) => def.section !== "captions" || format !== "in_person");
}

const trimmed = (value: string | undefined): string => (value ?? "").trim();

/** Check the form. `today` is the day on this device, so a statement cannot be dated in the future. */
export function validateOrganiserForm(input: OrganiserFormInput, today: string): FormIssue[] {
  const issues: FormIssue[] = [];
  const add = (field: string, code: IssueCode) => issues.push({ field, code });

  const labelEn = trimmed(input.eventLabelEn);
  const labelFr = trimmed(input.eventLabelFr);
  if (!labelEn && !labelFr) add("eventLabel", "label_required");
  else if (labelEn.length > MAX_LABEL || labelFr.length > MAX_LABEL) add("eventLabel", "too_long");

  if (!["in_person", "virtual", "hybrid"].includes(input.format)) add("format", "format_invalid");

  const date = trimmed(input.occurrenceDate);
  if (!date) add("occurrenceDate", "date_required");
  else if (!isIsoDate(date)) add("occurrenceDate", "date_invalid");

  if (trimmed(input.placeLabelEn).length > MAX_LABEL || trimmed(input.placeLabelFr).length > MAX_LABEL) add("placeLabel", "too_long");
  if (trimmed(input.address).length > 300) add("address", "too_long");

  const earliest = trimmed(input.arrivalEarliest);
  const latest = trimmed(input.arrivalLatest);
  if (earliest || latest) {
    if (!earliest || !latest) add("arrivalWindow", "window_needs_both");
    else if (!TIME.test(earliest) || !TIME.test(latest)) add("arrivalWindow", "time_invalid");
    else if (earliest >= latest) add("arrivalWindow", "window_order");
    else if (!isIsoDate(date)) add("arrivalWindow", "window_needs_date");
  }

  const statedBy = trimmed(input.statedBy);
  if (!statedBy) add("statedBy", "stated_by_required");
  else if (statedBy.length > MAX_LABEL) add("statedBy", "too_long");

  const statementDate = trimmed(input.statementDate);
  if (!statementDate) add("statementDate", "statement_date_required");
  else if (!isIsoDate(statementDate)) add("statementDate", "date_invalid");
  else if (isIsoDate(today) && statementDate > today) add("statementDate", "statement_date_future");

  if (trimmed(input.licence).length > MAX_LABEL) add("licence", "too_long");

  for (const def of formFields(input.format)) {
    const answer = trimmed(input.answers[def.id]);
    const answerFr = trimmed(input.answersFr[def.id]);
    switch (def.kind) {
      case "yesno":
      case "parking":
      case "support":
        if (answer && !choicesFor(def.kind).includes(answer)) add(def.id, "choice_invalid");
        break;
      case "mm":
      case "m":
        if (answer && (!NUMBER.test(answer) || Number(answer) <= 0 || Number(answer) > MAX_NUMBER)) add(def.id, "number_invalid");
        break;
      case "link":
        if (answer && (!LINK.test(answer) || answer.length > 500)) add(def.id, "link_invalid");
        break;
      case "text":
        if (answer.length > MAX_TEXT || answerFr.length > MAX_TEXT) add(def.id, "too_long");
        break;
    }
  }
  return issues;
}

function slug(text: string): string {
  const base = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return base || "event";
}

/** Text typed in one language is kept exactly as written in both slots. Nothing is translated. */
function bilingual(en: string, fr: string): Bilingual | null {
  if (!en && !fr) return null;
  return { en: en || fr, fr: fr || en };
}

function setFact(record: EventAccessRecord, id: string, fact: Fact<unknown>): void {
  if (id === "captions.live") {
    record.captions = fact as Fact<"yes" | "no">;
    return;
  }
  const [group, key] = id.split(".");
  const target = (record as unknown as Record<string, Record<string, unknown>>)[group ?? ""];
  if (!target || !key) throw new Error(`no record slot for field ${id}`);
  target[key] = fact;
}

export type BuildResult = { ok: true; record: EventAccessRecord } | { ok: false; issues: FormIssue[] };

/**
 * Turn the checklist into a per-event record. Every answer becomes an organiser claim: tier 1,
 * labelled unverified. Every blank becomes Unknown at tier 0. Nothing is ever marked verified.
 * `lang` only chooses the language of the source and licence wording stored with each fact.
 */
export function buildOrganiserRecord(input: OrganiserFormInput, lang: Lang, today: string): BuildResult {
  const issues = validateOrganiserForm(input, today);
  if (issues.length > 0) return { ok: false, issues };
  const m = messages[lang];
  const statementDate = trimmed(input.statementDate);
  const claimSource = interpolate(m.organiserSource, { who: trimmed(input.statedBy) });
  const claimLicence = trimmed(input.licence) || m.organiserLicenceNone;

  const claim = (value: unknown): Fact<unknown> => ({
    value,
    source: claimSource,
    licence: claimLicence,
    date: statementDate,
    tier: 1,
    prototypeLabel: "PROTOTYPE-UNVERIFIED",
  });
  const blank = (): Fact<unknown> => ({
    value: UNKNOWN,
    source: m.organiserNotAnswered,
    licence: m.organiserNoData,
    date: statementDate,
    tier: 0,
    prototypeLabel: "PROTOTYPE-UNVERIFIED",
  });

  const label = bilingual(trimmed(input.eventLabelEn), trimmed(input.eventLabelFr));
  if (!label) return { ok: false, issues: [{ field: "eventLabel", code: "label_required" }] };
  const date = trimmed(input.occurrenceDate);

  const record = {
    eventId: `organiser-${date}-${slug(label.en)}`,
    eventLabel: label,
    format: input.format,
    demonstration: false,
    confirmation: ORGANISER_CONFIRMATION,
    occurrenceDate: date,
    inAppRegistration: false,
    entrance: {},
    temporary: {},
    washroom: {},
    parking: {},
    seating: {},
    quiet: {},
    arrival: {},
    supportPerson: {},
    remote: {},
  } as unknown as EventAccessRecord;

  const placeLabel = bilingual(trimmed(input.placeLabelEn), trimmed(input.placeLabelFr));
  if (placeLabel) {
    record.place = { label: placeLabel };
    if (trimmed(input.address)) record.place.address = trimmed(input.address);
  }
  if (trimmed(input.arrivalEarliest) && trimmed(input.arrivalLatest)) {
    record.arrivalWindow = { earliest: trimmed(input.arrivalEarliest), latest: trimmed(input.arrivalLatest) };
  }

  for (const def of formFields(input.format)) {
    const answer = trimmed(input.answers[def.id]);
    const answerFr = trimmed(input.answersFr[def.id]);
    let fact: Fact<unknown>;
    if (def.kind === "text") {
      const text = bilingual(answer, answerFr);
      fact = text ? claim(text) : blank();
    } else if (!answer) {
      fact = blank();
    } else if (def.kind === "mm" || def.kind === "m") {
      fact = claim(Number(answer));
    } else {
      fact = claim(answer);
    }
    setFact(record, def.id, fact);
  }

  const report = validateEventAccessRecord(record, record.eventId);
  if (!report.valid || organiserClaimViolations(record).length > 0) {
    return { ok: false, issues: [{ field: "record", code: "record_invalid" }] };
  }
  return { ok: true, record };
}

export interface SectionCompleteness {
  id: SectionId;
  total: number;
  unknown: number;
}

export interface Completeness {
  total: number;
  answered: number;
  unknown: number;
  unknownIds: string[];
  /** Text answers that carry the same wording in English and French, so one language was not supplied. */
  sameTextBothLanguages: string[];
  sections: SectionCompleteness[];
  /** True only when no field is Unknown. It says the checklist is filled in, nothing about access. */
  complete: boolean;
}

/** Count answers and Unknowns as they are. Fields that do not apply to the format are not counted. */
export function completeness(record: EventAccessRecord): Completeness {
  const unknownIds: string[] = [];
  const sameTextBothLanguages: string[] = [];
  const perSection = new Map<SectionId, SectionCompleteness>();
  let total = 0;
  for (const def of FIELD_DEFS) {
    const fact = def.read(record);
    if (!fact) continue;
    total += 1;
    const section = perSection.get(def.section) ?? { id: def.section, total: 0, unknown: 0 };
    section.total += 1;
    if (fact.value === UNKNOWN) {
      unknownIds.push(def.id);
      section.unknown += 1;
    } else if (def.kind === "text") {
      const text = fact.value as Bilingual;
      if (text.en === text.fr) sameTextBothLanguages.push(def.id);
    }
    perSection.set(def.section, section);
  }
  return {
    total,
    answered: total - unknownIds.length,
    unknown: unknownIds.length,
    unknownIds,
    sameTextBothLanguages,
    sections: SECTION_ORDER.flatMap((id) => {
      const section = perSection.get(id);
      return section ? [section] : [];
    }),
    complete: unknownIds.length === 0,
  };
}

/**
 * Rules for a record that came from an organiser. Every fact must be labelled unverified;
 * a stated value is an organiser claim (tier 1) and an Unknown sits at tier 0. The record
 * as a whole is never confirmed.
 */
export function organiserClaimViolations(record: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown, path: string): void => {
    if (node === null || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if ("value" in obj && "prototypeLabel" in obj) {
      if (obj.prototypeLabel !== "PROTOTYPE-UNVERIFIED") out.push(`${path} label ${String(obj.prototypeLabel)}`);
      const expected = obj.value === UNKNOWN ? 0 : 1;
      if (obj.tier !== expected) out.push(`${path} tier ${String(obj.tier)}`);
      return;
    }
    for (const [key, child] of Object.entries(obj)) walk(child, `${path}/${key}`);
  };
  walk(record, "");
  if (record !== null && typeof record === "object" && (record as { confirmation?: unknown }).confirmation === "confirmed_for_this_occurrence") {
    out.push("/confirmation confirmed_for_this_occurrence");
  }
  return out;
}

/**
 * A record that reached the App as an organiser's own statement. An earlier build wrote
 * such records as confirmed; they are read as an unverified organiser statement instead.
 * The weaker states (venue note only, Unknown) are left as written.
 */
export function asOrganiserStatement(record: EventAccessRecord): EventAccessRecord {
  return record.confirmation === "confirmed_for_this_occurrence" ? { ...record, confirmation: ORGANISER_CONFIRMATION } : record;
}

export const ORGANISER_FILE_KIND = "event-access-organiser-statement";
export const ORGANISER_FILE_VERSION = 1;
export const MAX_FILE_CHARS = 262_144;

/** The file an organiser saves and shares themselves. The App sends it nowhere. */
export interface OrganiserFile {
  kind: typeof ORGANISER_FILE_KIND;
  formatVersion: typeof ORGANISER_FILE_VERSION;
  /** Always this value: the content is the organiser's own claim and nobody has verified it. */
  statement: "organiser_claim_unverified";
  exportedOn: string;
  record: EventAccessRecord;
}

export function serializeOrganiserFile(record: EventAccessRecord, exportedOn: string): string {
  if (!isIsoDate(exportedOn)) throw new Error("exportedOn must be an ISO date");
  const file: OrganiserFile = {
    kind: ORGANISER_FILE_KIND,
    formatVersion: ORGANISER_FILE_VERSION,
    statement: "organiser_claim_unverified",
    exportedOn,
    record,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function organiserFileName(record: Pick<EventAccessRecord, "eventId">): string {
  return `event-access-${slug(record.eventId)}.json`;
}

export type FileErrorCode = "too_large" | "not_json" | "wrong_kind" | "wrong_version" | "record_invalid" | "claim_rule";

export type ParseResult =
  | { ok: true; file: OrganiserFile }
  | { ok: false; error: FileErrorCode; details: string[] };

/** Read a shared organiser file. Anything that is not a valid, unverified organiser statement is refused. */
export function parseOrganiserFile(text: string): ParseResult {
  if (text.length > MAX_FILE_CHARS) return { ok: false, error: "too_large", details: [] };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "not_json", details: [] };
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "wrong_kind", details: [] };
  const obj = data as Record<string, unknown>;
  if (obj.kind !== ORGANISER_FILE_KIND || obj.statement !== "organiser_claim_unverified") {
    return { ok: false, error: "wrong_kind", details: [] };
  }
  if (obj.formatVersion !== ORGANISER_FILE_VERSION) return { ok: false, error: "wrong_version", details: [] };
  const report = validateEventAccessRecord(obj.record, "organiser-file");
  if (!report.valid) return { ok: false, error: "record_invalid", details: report.errors };
  if (!isIsoDate(obj.exportedOn)) return { ok: false, error: "record_invalid", details: ["/exportedOn must be a date"] };
  const record = asOrganiserStatement(obj.record as EventAccessRecord);
  const violations = organiserClaimViolations(record);
  if (violations.length > 0) return { ok: false, error: "claim_rule", details: violations };
  return {
    ok: true,
    file: {
      kind: ORGANISER_FILE_KIND,
      formatVersion: ORGANISER_FILE_VERSION,
      statement: "organiser_claim_unverified",
      exportedOn: obj.exportedOn,
      record,
    },
  };
}

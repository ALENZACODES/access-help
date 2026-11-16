import Ajv2020 from "ajv/dist/2020.js";
import type { EventOutingSource } from "./types";

const bilingual = {
  type: "object",
  additionalProperties: false,
  required: ["en", "fr"],
  properties: {
    en: { type: "string", minLength: 1, maxLength: 300 },
    fr: { type: "string", minLength: 1, maxLength: 300 },
  },
} as const;

const DATE = "^\\d{4}-\\d{2}-\\d{2}$";

/** JSON Schema draft 2020-12 for an event questions file. */
export const eventSourceSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["kind", "formatVersion", "eventId", "label", "eventDate", "demonstration", "preparedOn", "totalFields", "unknownItems"],
  properties: {
    kind: { const: "event-outing-source" },
    formatVersion: { const: 1 },
    eventId: { type: "string", minLength: 1, maxLength: 300 },
    label: bilingual,
    eventDate: { anyOf: [{ const: "Unknown" }, { type: "string", pattern: DATE }] },
    demonstration: { type: "boolean" },
    preparedOn: { type: "string", pattern: DATE },
    totalFields: { type: "integer", minimum: 0, maximum: 500 },
    unknownItems: {
      type: "array",
      maxItems: 500,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fieldId", "label"],
        properties: {
          fieldId: { type: "string", minLength: 1, maxLength: 100 },
          label: bilingual,
        },
      },
    },
  },
} as const;

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateShape = ajv.compile(eventSourceSchema);

export const MAX_SOURCE_CHARS = 131_072;

/** True for a real calendar day written YYYY-MM-DD. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Problems with a source; empty means it can be planned from. */
export function eventSourceProblems(source: unknown): string[] {
  if (!validateShape(source)) return (validateShape.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`);
  const s = source as unknown as EventOutingSource;
  const problems: string[] = [];
  if (s.eventDate !== "Unknown" && !isIsoDate(s.eventDate)) problems.push("/eventDate is not a real date");
  if (!isIsoDate(s.preparedOn)) problems.push("/preparedOn is not a real date");
  if (s.unknownItems.length > s.totalFields) problems.push("/unknownItems has more items than totalFields");
  const ids = s.unknownItems.map((item) => item.fieldId);
  if (new Set(ids).size !== ids.length) problems.push("/unknownItems repeats a fieldId");
  return problems;
}

export type SourceFileError = "too_large" | "not_json" | "not_a_questions_file";

export type SourceParseResult = { ok: true; source: EventOutingSource } | { ok: false; error: SourceFileError };

/** Read an event questions file saved from an event record. Anything else is refused. */
export function parseEventSource(text: string): SourceParseResult {
  if (text.length > MAX_SOURCE_CHARS) return { ok: false, error: "too_large" };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "not_json" };
  }
  if (eventSourceProblems(data).length > 0) return { ok: false, error: "not_a_questions_file" };
  return { ok: true, source: data as EventOutingSource };
}

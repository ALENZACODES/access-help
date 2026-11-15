import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../schemas/event-access.schema.json" with { type: "json" };

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validator = ajv.compile(schema);

export interface ValidationReport {
  file: string;
  valid: boolean;
  errors: string[];
}

export function validateEventAccessRecord(record: unknown, file = "event-access"): ValidationReport {
  const valid = validator(record) as boolean;
  const errors = valid
    ? []
    : (validator.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`.trim());
  return { file, valid, errors };
}

/** Prototype fixtures may only carry these two labels. Never VERIFIED, never tier 3. */
const FIXTURE_LABELS = new Set(["PROTOTYPE-UNVERIFIED", "SEEDED-OPEN-DATA"]);

/** Walk a record and list every fact (object with a value and a tier) outside the fixture rule. */
export function fixtureRuleViolations(record: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown, path: string): void => {
    if (node === null || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if ("value" in obj && "prototypeLabel" in obj) {
      if (!FIXTURE_LABELS.has(String(obj.prototypeLabel))) out.push(`${path} label ${String(obj.prototypeLabel)}`);
      if (obj.tier !== 0 && obj.tier !== 1) out.push(`${path} tier ${String(obj.tier)}`);
      return;
    }
    for (const [key, child] of Object.entries(obj)) walk(child, `${path}/${key}`);
  };
  walk(record, "");
  return out;
}

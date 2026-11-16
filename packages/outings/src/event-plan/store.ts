import Ajv2020 from "ajv/dist/2020.js";
import { isIsoDate } from "./source";
import type { EventPlan } from "./types";

/** The part of the Web Storage interface the store needs. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const PLANS_KEY = "access.outings.event-plans.v1";
export const MAX_PLANS = 50;

const bilingual = {
  type: "object",
  additionalProperties: false,
  required: ["en", "fr"],
  properties: { en: { type: "string", minLength: 1, maxLength: 300 }, fr: { type: "string", minLength: 1, maxLength: 300 } },
} as const;
const DATE = "^\\d{4}-\\d{2}-\\d{2}$";

const planSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "eventId", "eventLabel", "eventDate", "demonstration", "createdOn", "sourcePreparedOn", "sourceTotalFields", "items"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 310 },
    eventId: { type: "string", minLength: 1, maxLength: 300 },
    eventLabel: bilingual,
    eventDate: { anyOf: [{ const: "Unknown" }, { type: "string", pattern: DATE }] },
    demonstration: { type: "boolean" },
    createdOn: { type: "string", pattern: DATE },
    sourcePreparedOn: { type: "string", pattern: DATE },
    sourceTotalFields: { type: "integer", minimum: 0, maximum: 500 },
    items: {
      type: "array",
      maxItems: 600,
      items: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["id", "kind", "fieldId", "label", "done"],
            properties: {
              id: { type: "string", minLength: 1, maxLength: 110 },
              kind: { const: "ask_organiser" },
              fieldId: { type: "string", minLength: 1, maxLength: 100 },
              label: bilingual,
              done: { type: "boolean" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["id", "kind", "text", "done"],
            properties: {
              id: { type: "string", minLength: 1, maxLength: 110 },
              kind: { const: "own" },
              text: { type: "string", minLength: 1, maxLength: 200 },
              done: { type: "boolean" },
            },
          },
        ],
      },
    },
  },
} as const;

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validPlan = ajv.compile(planSchema);

function isPlan(value: unknown): value is EventPlan {
  if (!validPlan(value)) return false;
  const plan = value as unknown as EventPlan;
  return isIsoDate(plan.createdOn) && new Set(plan.items.map((item) => item.id)).size === plan.items.length;
}

export interface LoadResult {
  plans: EventPlan[];
  /** "unavailable": storage could not be read. "damaged": some saved content was not a plan and was left out. */
  problem: "unavailable" | "damaged" | null;
}

/** Read saved plans. Content that is not a valid plan is left out, never repaired by guessing. */
export function loadPlans(storage: StorageLike | null | undefined): LoadResult {
  if (!storage) return { plans: [], problem: "unavailable" };
  let raw: string | null;
  try {
    raw = storage.getItem(PLANS_KEY);
  } catch {
    return { plans: [], problem: "unavailable" };
  }
  if (raw === null) return { plans: [], problem: null };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { plans: [], problem: "damaged" };
  }
  const list = data && typeof data === "object" && (data as { version?: unknown }).version === 1 ? (data as { plans?: unknown }).plans : null;
  if (!Array.isArray(list)) return { plans: [], problem: "damaged" };
  const plans: EventPlan[] = [];
  const seen = new Set<string>();
  let dropped = false;
  for (const entry of list) {
    if (isPlan(entry) && !seen.has(entry.id) && plans.length < MAX_PLANS) {
      seen.add(entry.id);
      plans.push(entry);
    } else {
      dropped = true;
    }
  }
  return { plans, problem: dropped ? "damaged" : null };
}

/** Write the whole list. Returns false when the device refused, so the screen can say so. */
export function writePlans(storage: StorageLike | null | undefined, plans: readonly EventPlan[]): boolean {
  if (!storage) return false;
  try {
    if (plans.length === 0) storage.removeItem(PLANS_KEY);
    else storage.setItem(PLANS_KEY, JSON.stringify({ version: 1, plans }));
    return true;
  } catch {
    return false;
  }
}

/** Add a plan, or replace the one with the same id. */
export function upsertPlan(plans: readonly EventPlan[], plan: EventPlan): EventPlan[] {
  return plans.some((p) => p.id === plan.id) ? plans.map((p) => (p.id === plan.id ? plan : p)) : [...plans, plan];
}

export function withoutPlan(plans: readonly EventPlan[], planId: string): EventPlan[] {
  return plans.filter((p) => p.id !== planId);
}

/** Remove every saved plan from this device. */
export function deleteAllPlans(storage: StorageLike | null | undefined): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(PLANS_KEY);
    return true;
  } catch {
    return false;
  }
}

/** The browser's local storage, or null where it is missing or blocked. */
export function deviceStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

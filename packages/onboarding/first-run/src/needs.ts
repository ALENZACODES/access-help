import { FACT_KEYS, type FactKey } from "./facts";
import type { Requirement } from "./filter";
import type { KeyValueStore } from "./store";

/**
 * "My must-haves": the place details a person needs, saved on this device.
 * Each is a detail and the answer wanted (Yes or No). It describes places,
 * not people, and says nothing about anyone's health or eligibility.
 */
export const NEEDS_KEY = "app.onboarding.needs.v1";

export function parseNeeds(raw: string | null | undefined): Requirement {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const o = data as Record<string, unknown>;
  const out: Partial<Record<FactKey, "yes" | "no">> = {};
  for (const k of FACT_KEYS) {
    const v = o[k];
    if (v === "yes" || v === "no") out[k] = v;
  }
  return out;
}

export function loadNeeds(store: KeyValueStore | undefined): Requirement {
  try {
    return parseNeeds(store?.getItem(NEEDS_KEY));
  } catch {
    return {};
  }
}

export function saveNeeds(store: KeyValueStore | undefined, needs: Requirement): "saved" | "unavailable" {
  if (!store) return "unavailable";
  try {
    const clean = parseNeeds(JSON.stringify(needs));
    if (Object.keys(clean).length === 0) store.removeItem(NEEDS_KEY);
    else store.setItem(NEEDS_KEY, JSON.stringify(clean));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function hasNeeds(needs: Requirement): boolean {
  return FACT_KEYS.some((k) => needs[k] !== undefined);
}

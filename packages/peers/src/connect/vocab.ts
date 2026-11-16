/**
 * Closed lists for a peer-connection request. Every entry is a life or functional
 * context. None is a diagnosis label, an injury level or a health condition, and no
 * such entry may be added.
 */
export const LIFE_CONTEXTS = [
  "new_injury",
  "returning_home",
  "parenting",
  "work",
  "school",
  "sport_recreation",
  "family_or_caregiver",
  "community_life",
] as const;
export type LifeContext = (typeof LIFE_CONTEXTS)[number];

/** Broad parts of Ontario only: never a city, street, postal code or neighbourhood. */
export const REGIONS = [
  "greater_toronto_area",
  "central_ontario",
  "eastern_ontario",
  "southwestern_ontario",
  "northern_ontario",
] as const;
export type Region = (typeof REGIONS)[number];

export const FOR_WHOM = ["myself", "someone_i_support"] as const;
export type ForWhom = (typeof FOR_WHOM)[number];

/** A request names at least one and at most three contexts. */
export const CONTEXTS_MIN = 1;
export const CONTEXTS_MAX = 3;

export function isLifeContext(value: unknown): value is LifeContext {
  return typeof value === "string" && (LIFE_CONTEXTS as readonly string[]).includes(value);
}
export function isRegion(value: unknown): value is Region {
  return typeof value === "string" && (REGIONS as readonly string[]).includes(value);
}
export function isForWhom(value: unknown): value is ForWhom {
  return typeof value === "string" && (FOR_WHOM as readonly string[]).includes(value);
}

/** Contexts in closed-list order with duplicates removed, so input order never matters. */
export function orderContexts(contexts: readonly LifeContext[]): LifeContext[] {
  return LIFE_CONTEXTS.filter((context) => contexts.includes(context));
}

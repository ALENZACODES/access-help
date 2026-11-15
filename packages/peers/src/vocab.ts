export const LANGUAGES = ["en", "fr"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Fixed topic list. Every topic is practical and non-clinical. */
export const PEER_TOPICS = [
  "getting_around",
  "public_transit",
  "travel",
  "work_and_school",
  "sport_and_recreation",
  "technology",
  "community_life",
  "using_the_app",
] as const;
export type PeerTopic = (typeof PEER_TOPICS)[number];

/** Coarse locations only: a city or city region, never a street, postal code or neighbourhood. */
export const COARSE_CITIES = [
  "toronto",
  "ottawa",
  "hamilton",
  "london",
  "windsor",
  "kingston",
  "sudbury",
  "thunder_bay",
  "barrie",
  "waterloo_region",
] as const;
export type CoarseCity = (typeof COARSE_CITIES)[number];

export const NOTE_MAX = 280;

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}
export function isTopic(value: unknown): value is PeerTopic {
  return typeof value === "string" && (PEER_TOPICS as readonly string[]).includes(value);
}
export function isCoarseCity(value: unknown): value is CoarseCity {
  return typeof value === "string" && (COARSE_CITIES as readonly string[]).includes(value);
}

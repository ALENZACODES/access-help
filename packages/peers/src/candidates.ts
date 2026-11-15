import type { PeerCandidate } from "./types.js";

type Shape = Pick<PeerCandidate, "topic" | "language" | "city">;

const SHAPES: readonly Shape[] = [
  { topic: "public_transit", language: "en", city: "toronto" },
  { topic: "public_transit", language: "en", city: "ottawa" },
  { topic: "public_transit", language: "fr", city: "ottawa" },
  { topic: "travel", language: "en" },
  { topic: "sport_and_recreation", language: "en", city: "hamilton" },
  { topic: "technology", language: "fr" },
  { topic: "community_life", language: "en", city: "toronto" },
  { topic: "using_the_app", language: "en" },
];

/**
 * Made-up demonstration profiles. They are not people: no name, no contact, no story.
 * They exist only so the matching flow can be shown and tested.
 */
export const DEMONSTRATION_PEERS: readonly PeerCandidate[] = SHAPES.map((shape, index) => ({
  id: `demo-profile-${String(index + 1).padStart(2, "0")}`,
  ordinal: index + 1,
  ...shape,
  demonstration: true as const,
  tier: 0 as const,
  prototypeLabel: "PROTOTYPE-UNVERIFIED" as const,
  source: "demonstration profile written for this prototype",
  licence: "not a third-party dataset",
  sourceDate: "2026-11-15",
  recordDate: "2026-11-15",
}));

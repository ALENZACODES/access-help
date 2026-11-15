import { FIXTURE_SOURCE } from "../fixtures";
import type { OutingList } from "../types";

export const changeTable: OutingList = {
  id: "places-adult-change-table",
  titleEn: "Places with a known adult change table",
  titleFr: "Lieux avec une table \u00e0 langer pour adulte connue",
  summaryEn:
    "Example places that each have an adult change table fact recorded as yes in a named source. Other facts for these places may be Unknown.",
  summaryFr:
    "Lieux d’exemple dont la table \u00e0 langer pour adulte est enregistr\u00e9e comme oui dans une source nomm\u00e9e. Les autres faits de ces lieux peuvent \u00eatre inconnus.",
  placeIds: ["synth-park-003", "synth-cc-001", "synth-lib-001"],
  sources: [FIXTURE_SOURCE],
  retrieved_at: "2026-11-15",
  licence: "CC0",
  factKey: "adultChangeTable",
};

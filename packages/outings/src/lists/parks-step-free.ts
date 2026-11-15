import { FIXTURE_SOURCE } from "../fixtures";
import type { OutingList } from "../types";

export const parksStepFree: OutingList = {
  id: "parks-step-free-entrance",
  titleEn: "Parks with a known step-free entrance",
  titleFr: "Parcs avec une entr\u00e9e sans marche connue",
  summaryEn:
    "Example parks that each have a step-free entrance fact recorded as yes in a named source. Other facts for these places may be Unknown.",
  summaryFr:
    "Parcs d’exemple dont l’entr\u00e9e sans marche est enregistr\u00e9e comme oui dans une source nomm\u00e9e. Les autres faits de ces lieux peuvent \u00eatre inconnus.",
  placeIds: ["synth-park-001", "synth-park-002", "synth-park-003"],
  sources: [FIXTURE_SOURCE],
  retrieved_at: "2026-11-15",
  licence: "CC0",
  factKey: "stepFreeEntrance",
};

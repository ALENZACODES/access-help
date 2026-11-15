export type Lang = "en" | "fr";
export type Tier = 0 | 1 | 2 | 3;
export type Licence = "ODbL" | "OGL-Ontario" | "OGL-Canada" | "CC-BY" | "CC0";
export const OPEN_LICENCES: readonly Licence[] = ["ODbL", "OGL-Ontario", "OGL-Canada", "CC-BY", "CC0"];

/** Accessibility field shape shared across the App. */
export interface Fact {
  value: boolean | "UNKNOWN";
  source_id: string;
  licence: Licence;
  retrieved_at: string;
  tier: Tier;
  source_key?: string;
  raw?: unknown;
  derived?: boolean;
}

export const FACT_KEYS = ["stepFreeEntrance", "adultChangeTable"] as const;
export type FactKey = (typeof FACT_KEYS)[number];

export interface Place {
  id: string;
  name: string;
  municipality: string;
  synthetic?: boolean;
  provenance: { source_id: string; licence: Licence; retrieved_at: string };
  facts: Record<FactKey, Fact>;
}

export interface ListSource {
  source_id: string;
  name: string;
  licence: Licence;
}

export interface OutingList {
  id: string;
  titleEn: string;
  titleFr: string;
  summaryEn: string;
  summaryFr: string;
  placeIds: string[];
  sources: ListSource[];
  retrieved_at: string;
  licence: Licence;
  /** Fact every place on the list must have recorded as a known yes (tier >= 1). */
  factKey?: FactKey;
}

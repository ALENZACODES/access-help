import type { Fact, ListSource, Place } from "./types";

// Synthetic fixtures: invented places, not real locations and not a pack extract.
export const FIXTURE_SOURCE: ListSource = {
  source_id: "synthetic-fixture-2026",
  name: "Synthetic test fixture (invented places)",
  licence: "CC0",
};

const DATE = "2026-11-15";
const f = (value: Fact["value"], tier: Fact["tier"] = 1): Fact => ({
  value,
  source_id: FIXTURE_SOURCE.source_id,
  licence: "CC0",
  retrieved_at: DATE,
  tier,
});
const place = (id: string, name: string, step: Fact, change: Fact): Place => ({
  id,
  name,
  municipality: "Example City",
  synthetic: true,
  provenance: { source_id: FIXTURE_SOURCE.source_id, licence: "CC0", retrieved_at: DATE },
  facts: { stepFreeEntrance: step, adultChangeTable: change },
});

export const PLACES: Place[] = [
  place("synth-park-001", "Example Lakeshore Park", f(true), f("UNKNOWN", 0)),
  place("synth-park-002", "Example Ravine Park", f(true), f("UNKNOWN", 0)),
  place("synth-park-003", "Example Harbour Green", f(true), f(true)),
  place("synth-park-004", "Example Hillside Park", f(false), f("UNKNOWN", 0)),
  place("synth-park-005", "Example Meadow Park", f("UNKNOWN", 0), f("UNKNOWN", 0)),
  place("synth-cc-001", "Example Community Centre", f("UNKNOWN", 0), f(true)),
  place("synth-lib-001", "Example Library Branch", f(true), f(true)),
];

export const placeById = (places: readonly Place[]) => new Map(places.map((p) => [p.id, p]));

import type { Provenance } from "../types.js";
import type { RoutingTable } from "../connect/routing.js";

const FIXTURE_PROVENANCE: Provenance = {
  tier: 0,
  prototypeLabel: "PROTOTYPE-UNVERIFIED",
  source: "sample data written for tests; not a real programme, stream or organisation",
  licence: "not a third-party dataset",
  sourceDate: "2026-11-16",
  recordDate: "2026-11-16",
};

/**
 * SAMPLE DATA for tests and the test harness only. These streams are made up. They do
 * not describe any real programme, and the App does not ship this table.
 */
export const SAMPLE_ROUTING_TABLE: RoutingTable = {
  id: "routing-table-sample",
  streams: [
    {
      id: "sample-stream-a",
      label: { en: "Sample stream A", fr: "Volet d'exemple A" },
      sample: true,
      ...FIXTURE_PROVENANCE,
    },
    {
      id: "sample-stream-b",
      label: { en: "Sample stream B", fr: "Volet d'exemple B" },
      sample: true,
      ...FIXTURE_PROVENANCE,
    },
  ],
  rules: [
    { id: "sample-rule-01", context: "new_injury", region: "any", streamId: "sample-stream-a" },
    { id: "sample-rule-02", context: "parenting", region: "eastern_ontario", streamId: "sample-stream-b" },
    { id: "sample-rule-03", context: "work", region: "eastern_ontario", streamId: "sample-stream-a" },
    { id: "sample-rule-04", context: "work", region: "any", streamId: "sample-stream-b" },
    { id: "sample-rule-05", context: "family_or_caregiver", region: "any", streamId: "sample-stream-b" },
  ],
  ...FIXTURE_PROVENANCE,
};

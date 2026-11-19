import { FACT_KEYS, type FactKey } from "./facts";
import { parseNote, type Note } from "./model";

/** A recorded Yes or No for test notes. Dates default to a recent day. */
export interface TestRecord {
  readonly key: FactKey;
  readonly value: "yes" | "no";
  readonly source?: string;
  readonly on?: string;
  readonly licence?: string;
}

export const TEST_SOURCE = "City survey";

/** Builds a valid note through the App's own parser, so tests never hold a note the App would refuse. Pass null for no address. */
export function testNote(id: string, name: string, records: readonly TestRecord[] = [], address: string | null = "1 Main St"): Note {
  const facts = FACT_KEYS.map((key) => {
    const r = records.find((x) => x.key === key);
    return r
      ? { key, value: r.value, provenance: { source: r.source ?? TEST_SOURCE, licence: r.licence ?? "CC0-1.0", recordedOn: r.on ?? "2026-10-01" } }
      : { key, value: "unknown" };
  });
  const n = parseNote({ id, placeName: name, address: address ?? undefined, createdOn: "2026-10-01", licence: "CC0-1.0", facts });
  if (!n) throw new Error(`test note ${id} is not valid`);
  return n;
}

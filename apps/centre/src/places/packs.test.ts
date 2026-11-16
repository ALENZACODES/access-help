import { describe, expect, it } from "vitest";
import { LOCATION_TOLERANCE_KM, mergePacks } from "./packs.js";
import { parsePack } from "./pack.js";
import { samplePackText } from "./testing.js";
import type { ParsedPack } from "./types.js";

function pack(packId: string, mutate: (raw: any) => void = () => {}): ParsedPack {
  const raw = JSON.parse(samplePackText());
  raw.manifest.packId = packId;
  mutate(raw);
  const parsed = parsePack(JSON.stringify(raw));
  if (!parsed.ok) throw new Error("sample pack must parse");
  return parsed.pack;
}

const set = (id: string, props: Record<string, unknown>) => (raw: any) => {
  const feature = raw.data.features.find((f: any) => f.properties.id === id);
  Object.assign(feature.properties, props);
};

describe("mergePacks", () => {
  it("returns one record per place and no conflicts for a single pack", () => {
    const result = mergePacks([pack("a")]);
    expect(result.records).toHaveLength(5);
    expect(result.conflicts).toEqual([]);
    expect(result.places.every((p) => p.reports.length === 1)).toBe(true);
  });

  it("returns nothing for no packs", () => {
    expect(mergePacks([])).toEqual({ records: [], places: [], conflicts: [] });
  });

  it("keeps identical reports from two packs as one place with the newest observation", () => {
    const later = pack("b", (raw) => raw.data.features.forEach((f: any) => { f.properties.observedOn = "2026-11-10"; }));
    const result = mergePacks([pack("a"), later]);
    expect(result.records).toHaveLength(5);
    expect(result.conflicts).toEqual([]);
    const s1 = result.places.find((p) => p.id === "s1")!;
    expect(s1.reports.map((r) => r.packId)).toEqual(["a", "b"]);
    expect(s1.record.observedOn).toBe("2026-11-10");
  });

  it("shows UNKNOWN, not a winner, when packs give different statuses", () => {
    const result = mergePacks([pack("a"), pack("b", set("s1", { wheelchair: "no" }))]);
    expect(result.conflicts.map((p) => [p.id, p.conflict])).toEqual([["s1", "status"]]);
    const s1 = result.places.find((p) => p.id === "s1")!;
    expect(s1.record.wheelchair).toBe("UNKNOWN");
    expect(result.records.find((r) => r.id === "s1")?.wheelchair).toBe("UNKNOWN");
    expect(s1.reports.map((r) => r.record.wheelchair)).toEqual(["yes", "no"]);
  });

  it("does not let UNKNOWN in one pack erase a recorded status in another", () => {
    const result = mergePacks([pack("a"), pack("b", set("s1", { wheelchair: "UNKNOWN" }))]);
    expect(result.conflicts).toEqual([]);
    expect(result.records.find((r) => r.id === "s1")?.wheelchair).toBe("yes");
  });

  it("uses the newest recorded status when packs agree it is recorded but dates differ", () => {
    const older = pack("a", set("s2", { observedOn: "2020-01-01" }));
    const newer = pack("b", set("s2", { observedOn: "2026-10-01" }));
    const s2 = mergePacks([older, newer]).places.find((p) => p.id === "s2")!;
    expect(s2.record.observedOn).toBe("2026-10-01");
    expect(s2.conflict).toBeNull();
  });

  it("treats the same id in different locations as a conflict and shows UNKNOWN", () => {
    const far = pack("b", (raw) => {
      raw.data.features.find((f: any) => f.properties.id === "s3").geometry.coordinates = [-79.4, 43.9];
    });
    const result = mergePacks([pack("a"), far]);
    expect(result.conflicts.map((p) => [p.id, p.conflict])).toEqual([["s3", "location"]]);
    expect(result.records.find((r) => r.id === "s3")?.wheelchair).toBe("UNKNOWN");
  });

  it("allows small coordinate differences", () => {
    expect(LOCATION_TOLERANCE_KM).toBeGreaterThan(0);
    const near = pack("b", (raw) => {
      raw.data.features.find((f: any) => f.properties.id === "s1").geometry.coordinates = [-79.4301, 43.8501];
    });
    expect(mergePacks([pack("a"), near]).conflicts).toEqual([]);
  });

  it("keeps places that appear in only one pack", () => {
    const extra = pack("b", (raw) => {
      raw.data.features.push({ type: "Feature", geometry: { type: "Point", coordinates: [-80, 44] }, properties: { id: "x9", name: "Only B", wheelchair: "yes", source: "sample", licence: "CC0-1.0", observedOn: "2026-11-01" } });
      raw.manifest.recordCount = 6;
    });
    const result = mergePacks([pack("a"), extra]);
    expect(result.records).toHaveLength(6);
    expect(result.places.find((p) => p.id === "x9")?.reports.map((r) => r.packId)).toEqual(["b"]);
  });
});

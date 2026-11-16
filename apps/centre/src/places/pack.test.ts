import { describe, expect, it } from "vitest";
import { MAX_PACK_CHARACTERS, parsePack } from "./pack.js";
import { sampleRecords, samplePackText } from "./testing.js";

function edit(mutate: (pack: any) => void): string {
  const pack = JSON.parse(samplePackText());
  mutate(pack);
  return JSON.stringify(pack);
}

describe("parsePack", () => {
  it("reads a pack and keeps source, licence, date, and UNKNOWN for every place", () => {
    const result = parsePack(samplePackText());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.records).toHaveLength(5);
    expect(result.pack.warnings).toEqual([]);
    expect(result.pack.manifest).toMatchObject({ packId: "sample-pack", recordCount: 5, unknownCount: 1 });
    const clinic = result.pack.records.find((r) => r.id === "s4");
    expect(clinic).toMatchObject({ wheelchair: "UNKNOWN", licence: "ODbL-1.0", source: "sample data for tests" });
    expect(result.pack.records.find((r) => r.id === "s5")?.name).toBeNull();
  });

  it("rejects text that is not JSON, not a pack, or too large", () => {
    expect(parsePack("{nope")).toEqual({ ok: false, code: "not-json" });
    expect(parsePack("[]")).toEqual({ ok: false, code: "not-a-pack" });
    expect(parsePack(JSON.stringify({ manifest: {}, data: { type: "Nope" } })).ok).toBe(false);
    expect(parsePack("x".repeat(MAX_PACK_CHARACTERS + 1))).toEqual({ ok: false, code: "too-large" });
  });

  it("rejects a manifest without an id or a real date format", () => {
    expect(parsePack(edit((p) => { p.manifest.packId = " "; }))).toMatchObject({ ok: false, code: "bad-manifest" });
    expect(parsePack(edit((p) => { p.manifest.generatedOn = "15/11/2026"; }))).toMatchObject({ ok: false, code: "bad-manifest" });
  });

  it("does not trust a declared count that disagrees with the places", () => {
    const result = parsePack(edit((p) => { p.manifest.recordCount = 99; }));
    expect(result).toMatchObject({ ok: false, code: "count-mismatch" });
  });

  it("turns an unrecognised status into UNKNOWN and says so, never a better status", () => {
    const text = edit((p) => {
      p.data.features[0].properties.wheelchair = "Yes";
      p.data.features[1].properties.wheelchair = "accessible";
      p.data.features[2].properties.wheelchair = 7;
    });
    const result = parsePack(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byId = Object.fromEntries(result.pack.records.map((r) => [r.id, r.wheelchair]));
    expect(byId).toMatchObject({ s1: "UNKNOWN", s2: "UNKNOWN", s3: "UNKNOWN" });
    expect(result.pack.warnings.filter((w) => w.code === "unrecognised-status").map((w) => w.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("treats a missing status as UNKNOWN without a warning", () => {
    const result = parsePack(edit((p) => { delete p.data.features[0].properties.wheelchair; }));
    expect(result.ok && result.pack.records[0]?.wheelchair).toBe("UNKNOWN");
    expect(result.ok && result.pack.warnings).toEqual([]);
  });

  it("skips places with a closed licence, no source, a bad date, or no location", () => {
    const text = edit((p) => {
      p.data.features[0].properties.licence = "All rights reserved";
      p.data.features[1].properties.source = "";
      p.data.features[2].properties.observedOn = "2026-02-31";
      p.data.features[3].geometry = { type: "Point", coordinates: ["x", 1] };
    });
    const result = parsePack(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.records.map((r) => r.id)).toEqual(["s5"]);
    expect(result.pack.warnings.map((w) => w.code)).toEqual(Array(4).fill("skipped-record"));
    expect(result.pack.manifest.recordCount).toBe(1);
  });

  it("keeps only the first of two places with the same id", () => {
    const result = parsePack(edit((p) => { p.data.features[1].properties.id = "s1"; }));
    expect(result.ok && result.pack.records.map((r) => r.id)).toEqual(["s1", "s3", "s4", "s5"]);
    expect(result.ok && result.pack.warnings).toEqual([expect.objectContaining({ code: "duplicate-id", id: "s1" })]);
  });

  it("fails when no place is usable", () => {
    const text = edit((p) => { for (const f of p.data.features) f.properties.licence = "nope"; });
    expect(parsePack(text)).toEqual({ ok: false, code: "no-usable-records" });
  });

  it("round-trips what serializePack wrote", () => {
    const records = sampleRecords();
    const result = parsePack(samplePackText(records));
    expect(result.ok && result.pack.records).toEqual(records);
  });
});

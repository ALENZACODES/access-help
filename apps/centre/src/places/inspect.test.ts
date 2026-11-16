import { describe, expect, it } from "vitest";
import { inspectPack } from "./inspect.js";
import { SAMPLE_TODAY, samplePackText, sampleRecords } from "./testing.js";

const edit = (mutate: (pack: any) => void) => {
  const pack = JSON.parse(samplePackText());
  mutate(pack);
  pack.manifest.recordCount = pack.data.features.length;
  return JSON.stringify(pack);
};

describe("inspectPack", () => {
  it("reports a good pack without changing anything", () => {
    const result = inspectPack(samplePackText(), SAMPLE_TODAY, []);
    if (!result.ok) throw new Error("expected a pack");
    expect(result.report).toMatchObject({ packId: "sample-pack", inFile: 5, usable: 5, leftOut: 0, madeUnknown: 0, dateInFuture: false, replacesLoaded: false });
    expect(result.report.licences).toEqual(["CC0-1.0", "ODbL-1.0"]);
    expect(result.report.quality.total).toBe(5);
    expect(result.report.oldest).toBe("2023-01-20");
  });
  it("counts places left out, with the reason in the warnings", () => {
    const result = inspectPack(edit((p) => { p.data.features[0].properties.source = ""; p.data.features[1].geometry = null; }), SAMPLE_TODAY, []);
    if (!result.ok) throw new Error("expected a pack");
    expect(result.report).toMatchObject({ inFile: 5, usable: 3, leftOut: 2 });
    expect(result.report.warnings.map((w) => w.code)).toEqual(["skipped-record", "skipped-record"]);
  });
  it("counts a made-up status as shown UNKNOWN, and never as a status", () => {
    const result = inspectPack(edit((p) => { p.data.features[0].properties.wheelchair = "definitely"; }), SAMPLE_TODAY, []);
    if (!result.ok) throw new Error("expected a pack");
    expect(result.report.madeUnknown).toBe(1);
    expect(result.pack.records.find((r) => r.id === "s1")?.wheelchair).toBe("UNKNOWN");
    expect(result.report.quality.status.UNKNOWN).toBe(2);
  });
  it("says when the pack replaces one already on the device, and when its date is in the future", () => {
    const result = inspectPack(samplePackText(), "2026-01-01", ["sample-pack"]);
    if (!result.ok) throw new Error("expected a pack");
    expect(result.report.replacesLoaded).toBe(true);
    expect(result.report.dateInFuture).toBe(true);
  });
  it("passes the failure code and detail through for a file that is not a pack", () => {
    expect(inspectPack("{nope", SAMPLE_TODAY, [])).toEqual({ ok: false, code: "not-json" });
    expect(inspectPack(JSON.stringify({ manifest: { packId: "", generatedOn: "x" }, data: { type: "FeatureCollection", features: [] } }), SAMPLE_TODAY, [])).toMatchObject({ ok: false, code: "bad-manifest" });
  });
  it("rejects a pack whose declared count does not match, as the load step does", () => {
    const pack = JSON.parse(samplePackText());
    pack.manifest.recordCount = 99;
    expect(inspectPack(JSON.stringify(pack), SAMPLE_TODAY, [])).toMatchObject({ ok: false, code: "count-mismatch" });
  });
  it("matches the records the load step would keep", () => {
    const result = inspectPack(samplePackText(), SAMPLE_TODAY, []);
    if (!result.ok) throw new Error("expected a pack");
    expect(result.pack.records).toEqual(sampleRecords());
  });
});

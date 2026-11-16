import { describe, expect, it } from "vitest";
import { findNearDuplicates, insideOntarioBox, ONTARIO_BOX, percent, qualityReport } from "./quality.js";
import { SAMPLE_TODAY, sampleRecords } from "./testing.js";
import type { PlaceRecord } from "./types.js";

const rec = (id: string, extra: Partial<PlaceRecord> = {}): PlaceRecord => ({ ...sampleRecords()[0]!, id, ...extra });

describe("percent", () => {
  it("rounds to a whole number and is null for no places", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
    expect(percent(0, 0)).toBeNull();
  });
});

describe("insideOntarioBox", () => {
  it("includes the edges and excludes outside", () => {
    expect(insideOntarioBox(ONTARIO_BOX.south, ONTARIO_BOX.west)).toBe(true);
    expect(insideOntarioBox(43.85, -79.43)).toBe(true);
    expect(insideOntarioBox(51.05, -114.07)).toBe(false);
    expect(insideOntarioBox(-43.85, -79.43)).toBe(false);
    expect(insideOntarioBox(43.85, 79.43)).toBe(false);
  });
});

describe("findNearDuplicates", () => {
  it("lists the same name, a different id, and a short distance", () => {
    const pairs = findNearDuplicates([rec("b", { name: "Cafe Uno", lat: 43.85, lon: -79.43 }), rec("a", { name: "Café  uno", lat: 43.85001, lon: -79.43 })]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ a: "a", b: "b" });
    expect(pairs[0]!.metres).toBeLessThanOrEqual(50);
  });
  it("leaves out the same name that is far apart, and different names that are close", () => {
    expect(findNearDuplicates([rec("a", { name: "Uno", lat: 43.85 }), rec("b", { name: "Uno", lat: 43.86 })])).toEqual([]);
    expect(findNearDuplicates([rec("a", { name: "Uno" }), rec("b", { name: "Dos" })])).toEqual([]);
  });
  it("never pairs a place with itself or an unnamed place", () => {
    expect(findNearDuplicates([rec("a", { name: "Uno" }), rec("a", { name: "Uno" })])).toEqual([]);
    expect(findNearDuplicates([rec("a", { name: undefined }), rec("b", { name: undefined })])).toEqual([]);
  });
  it("orders pairs the same way every time", () => {
    const list = [rec("z", { name: "Uno" }), rec("y", { name: "Uno" }), rec("x", { name: "Uno" })];
    expect(findNearDuplicates(list)).toEqual(findNearDuplicates([...list].reverse()));
  });
});

describe("qualityReport", () => {
  const report = qualityReport(sampleRecords(), SAMPLE_TODAY);
  it("counts every place once under one status", () => {
    expect(report.total).toBe(5);
    expect(Object.values(report.status).reduce((a, b) => a + b, 0)).toBe(5);
    expect(report.status.UNKNOWN).toBe(1);
  });
  it("lists unnamed places and reports the share that is UNKNOWN and the share that is old", () => {
    expect(report.unnamed).toEqual(["s5"]);
    expect(report.unknownPercent).toBe(20);
    expect(report.olderPercent).toBe(40);
  });
  it("lists places outside the Ontario box", () => {
    expect(qualityReport([rec("far", { lat: 51.05, lon: -114.07 })], SAMPLE_TODAY).outsideArea).toEqual(["far"]);
  });
  it("is empty and null for no places", () => {
    expect(qualityReport([], SAMPLE_TODAY)).toMatchObject({ total: 0, unknownPercent: null, olderPercent: null, unnamed: [] });
  });
});

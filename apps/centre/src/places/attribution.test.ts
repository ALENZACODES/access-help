import { describe, expect, it } from "vitest";
import { attributionText, licenceNotes, summarizeSources } from "./attribution.js";
import { buildPackManifest } from "./docs-bridge.js";
import { SAMPLE_TODAY, sampleRecords } from "./testing.js";

const records = sampleRecords();
const packOf = (id: string, list = records) => ({ manifest: buildPackManifest(id, list, SAMPLE_TODAY), records: list, warnings: [] });

describe("summarizeSources", () => {
  const summary = summarizeSources([packOf("a")]);
  it("counts places by licence and by source, most first", () => {
    expect(summary.licences).toEqual([{ name: "CC0-1.0", count: 4 }, { name: "ODbL-1.0", count: 1 }]);
    expect(summary.sources[0]).toEqual({ name: "sample data for tests", count: 4 });
    expect(summary.sources[1]).toEqual({ name: "sample field notes", count: 1 });
  });
  it("reports the oldest and newest observation date", () => {
    expect(summary.oldest).toBe("2023-01-20");
    expect(summary.newest).toBe("2026-11-01");
  });
  it("counts a place that is in two packs once", () => {
    const twice = summarizeSources([packOf("a"), packOf("b")]);
    expect(twice.licences.reduce((sum, item) => sum + item.count, 0)).toBe(records.length);
    expect(twice.packs).toHaveLength(2);
  });
  it("has no dates and no counts for no packs", () => {
    expect(summarizeSources([])).toEqual({ packs: [], licences: [], sources: [], oldest: null, newest: null });
  });
});

describe("attributionText", () => {
  it("writes one block per pack with licences, sources, and the data date, in each language", () => {
    expect(attributionText([packOf("a")], "en")).toContain("Licences: CC0-1.0, ODbL-1.0. Sources:");
    expect(attributionText([packOf("a")], "fr")).toContain("Licences : CC0-1.0, ODbL-1.0.");
  });
  it("is empty for no packs", () => {
    expect(attributionText([], "en")).toBe("");
  });
});

describe("licenceNotes", () => {
  it("adds the ODbL and CC0 notes only for licences in use", () => {
    expect(licenceNotes(summarizeSources([packOf("a")]), "en")).toHaveLength(2);
    const onlyCc0 = records.filter((r) => r.licence === "CC0-1.0");
    const notes = licenceNotes(summarizeSources([packOf("a", onlyCc0)]), "en");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("CC0-1.0");
  });
  it("does not give legal advice beyond pointing to the licence text", () => {
    const [odbl] = licenceNotes(summarizeSources([packOf("a")]), "en");
    expect(odbl).toContain("Read the full licence text");
  });
});

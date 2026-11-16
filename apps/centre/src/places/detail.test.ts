import { describe, expect, it } from "vitest";
import { buildDetail, coordinatesText, decodePlaceId, geoUri, placePath } from "./detail.js";
import { buildPackManifest } from "./docs-bridge.js";
import { mergePacks } from "./packs.js";
import { SAMPLE_TODAY, sampleRecords } from "./testing.js";

const records = sampleRecords();
const pack = (id: string, mutate: (r: (typeof records)[number]) => (typeof records)[number] = (r) => r) => {
  const list = records.map(mutate);
  return { manifest: buildPackManifest(id, list, SAMPLE_TODAY), records: list, warnings: [] };
};
const place = (id: string, packs = [pack("a")]) => mergePacks(packs).places.find((p) => p.id === id)!;

describe("coordinates", () => {
  it("uses a decimal point and a comma in English, and a decimal comma with a narrow space before the semicolon in French", () => {
    expect(coordinatesText(43.85, -79.43, "en")).toBe("43.85000, -79.43000");
    expect(coordinatesText(43.85, -79.43, "fr")).toBe("43,85000 ; -79,43000");
  });
  it("writes a geo link with five decimals and no map server", () => {
    expect(geoUri(43.85, -79.43)).toBe("geo:43.85000,-79.43000");
    expect(geoUri(43.85, -79.43)).not.toMatch(/https?:/);
  });
});

describe("buildDetail", () => {
  it("reports a recorded status, its age, and one line per pack", () => {
    const view = buildDetail(place("s1"), SAMPLE_TODAY, "en");
    expect(view.status).toBe("yes");
    expect(view.freshness).toBe("recent");
    expect(view.reportLines).toHaveLength(1);
    expect(view.reportLines[0]).toContain("Source: sample data for tests. Licence: CC0-1.0.");
    expect(view.summary).toContain("Access status: Step-free access reported");
  });
  it("says an old record is old", () => {
    const view = buildDetail(place("s3"), SAMPLE_TODAY, "en");
    expect(view.freshness).toBe("older");
    expect(view.freshnessText).toContain("may be out of date");
  });
  it("says UNKNOWN out loud for a place with no recorded status", () => {
    const view = buildDetail(place("s4"), SAMPLE_TODAY, "en");
    expect(view.status).toBe("UNKNOWN");
    expect(view.summary).toContain("UNKNOWN means no loaded pack records a status");
  });
  it("shows UNKNOWN, not either side, when packs disagree, and keeps both reports", () => {
    const view = buildDetail(place("s1", [pack("a"), pack("b", (r) => (r.id === "s1" ? { ...r, wheelchair: "no" } : r))]), SAMPLE_TODAY, "en");
    expect(view.status).toBe("UNKNOWN");
    expect(view.conflict).toBe(true);
    expect(view.reportLines).toHaveLength(2);
    expect(view.summary).toContain("The packs disagree");
  });
  it("writes the French summary with a non-breaking space before each colon", () => {
    const view = buildDetail(place("s1"), SAMPLE_TODAY, "fr");
    for (const line of view.summary.split("\n")) expect(line).toMatch(/^[^:]* :/);
    expect(view.summary).toContain("sans nom".length ? "Lieu : Sample Library" : "");
  });
  it("names an unnamed place without inventing a name", () => {
    expect(buildDetail(place("s5"), SAMPLE_TODAY, "en").summary).toContain("Place: unnamed");
  });
});

describe("place ids in paths", () => {
  it("round trips ids that need escaping", () => {
    for (const id of ["s1", "a b/c", "café?1", "100%"]) expect(decodePlaceId(placePath(id).slice("/places/".length))).toBe(id);
  });
  it("reads a broken escape or an empty or very long id as no place", () => {
    expect(decodePlaceId("%E0%A4%A")).toBeNull();
    expect(decodePlaceId("")).toBeNull();
    expect(decodePlaceId(undefined)).toBeNull();
    expect(decodePlaceId("x".repeat(201))).toBeNull();
  });
});

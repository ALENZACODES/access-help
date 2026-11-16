import { describe, expect, it } from "vitest";
import {
  countByFreshness,
  countByStatus,
  distanceKm,
  normalizeText,
  searchPlaces,
  sortByDistance,
  sortByName,
  type PlaceQuery,
} from "./filter.js";
import { SAMPLE_TODAY, sampleRecords } from "./testing.js";

const all: PlaceQuery = { text: "", access: "any", maxAgeDays: null, today: SAMPLE_TODAY };
const ids = (records: readonly { id: string }[]) => records.map((r) => r.id);

describe("normalizeText", () => {
  it("ignores case, accents, and extra spaces", () => {
    expect(normalizeText("  CAFÉ   Été ")).toBe("cafe ete");
  });
});

describe("searchPlaces", () => {
  const records = sampleRecords();

  it("returns every place with its recorded status for the default filter", () => {
    const result = searchPlaces(records, all);
    expect(ids(result.matches)).toEqual(["s1", "s2", "s3", "s4", "s5"]);
    expect(result.unknown).toEqual([]);
  });

  it("matches words in any order, without accents, and also by source", () => {
    expect(ids(searchPlaces(records, { ...all, text: "cafe sample" }).matches)).toEqual(["s2"]);
    expect(ids(searchPlaces(records, { ...all, text: "field notes" }).matches)).toEqual(["s5"]);
    expect(searchPlaces(records, { ...all, text: "no such place" }).matches).toEqual([]);
  });

  it("never counts UNKNOWN as a match for a step-free filter", () => {
    const result = searchPlaces(records, { ...all, access: "yes" });
    expect(ids(result.matches)).toEqual(["s1", "s5"]);
    expect(ids(result.unknown)).toEqual(["s4"]);
    expect(result.excluded).toBe(2);
  });

  it("adds partly accessible places for the wider filter and still keeps UNKNOWN apart", () => {
    const result = searchPlaces(records, { ...all, access: "yes-or-limited" });
    expect(ids(result.matches)).toEqual(["s1", "s2", "s5"]);
    expect(ids(result.unknown)).toEqual(["s4"]);
    expect(result.excluded).toBe(1);
  });

  it("limits by age of the observation", () => {
    const result = searchPlaces(records, { ...all, maxAgeDays: 365 });
    expect(ids(result.matches)).toEqual(["s1", "s4", "s5"]);
    expect(ids(searchPlaces(records, { ...all, maxAgeDays: 730 }).matches)).toEqual(["s1", "s2", "s4", "s5"]);
  });

  it("applies the text filter before the status filter", () => {
    const result = searchPlaces(records, { ...all, text: "clinic", access: "yes" });
    expect(result.matches).toEqual([]);
    expect(ids(result.unknown)).toEqual(["s4"]);
    expect(result.excluded).toBe(0);
  });
});

describe("sorting", () => {
  it("sorts by name with unnamed places last", () => {
    expect(ids(sortByName(sampleRecords(), "en"))).toEqual(["s3", "s2", "s4", "s1", "s5"]);
  });

  it("computes straight-line distance", () => {
    const toronto = { lat: 43.6532, lon: -79.3832 };
    const ottawa = { lat: 45.4215, lon: -75.6972 };
    expect(distanceKm(toronto, ottawa)).toBeGreaterThan(345);
    expect(distanceKm(toronto, ottawa)).toBeLessThan(360);
    expect(distanceKm(toronto, toronto)).toBe(0);
  });

  it("orders by distance from a given point, nearest first", () => {
    const rows = sortByDistance(sampleRecords(), { lat: 45.4, lon: -75.7 });
    expect(rows[0]?.record.id).toBe("s5");
    expect(rows.map((r) => r.km)).toEqual([...rows.map((r) => r.km)].sort((a, b) => a - b));
  });
});

describe("counts", () => {
  it("counts each status, with UNKNOWN as its own bucket", () => {
    expect(countByStatus(sampleRecords())).toEqual({ yes: 2, limited: 1, no: 1, UNKNOWN: 1 });
  });

  it("counts recent and older observations", () => {
    expect(countByFreshness(sampleRecords(), SAMPLE_TODAY)).toEqual({ recent: 3, older: 2, unknown: 0 });
  });
});

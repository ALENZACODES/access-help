import { describe, expect, it } from "vitest";
import { emptyForm, exportFile, newDraftId, parseCoordinate, parseForm, type FormFields } from "./contribute.js";
import { parsePack } from "./pack.js";
import { SAMPLE_TODAY, sampleRecords } from "./testing.js";

const valid: FormFields = {
  name: "  Sample Hall  ",
  lat: "43,8561",
  lon: "-79.3370",
  wheelchair: "yes",
  source: "my own visit",
  licence: "CC0-1.0",
  observedOn: "2026-11-14",
  consent: true,
};

describe("parseCoordinate", () => {
  it("accepts decimal points and French decimal commas", () => {
    expect(parseCoordinate("43.85", 90)).toBe(43.85);
    expect(parseCoordinate("43,85", 90)).toBe(43.85);
    expect(parseCoordinate(" −79.3 ", 180)).toBe(-79.3);
  });

  it("rejects text, empty values, mixed separators, and values out of range", () => {
    for (const bad of ["", "abc", "43.8.5", "1,234.5", "91", "-91", "NaN", "1e3"]) {
      expect(parseCoordinate(bad, 90)).toBeNull();
    }
    expect(parseCoordinate("181", 180)).toBeNull();
  });
});

describe("parseForm", () => {
  it("builds a record and trims the name", () => {
    const result = parseForm(valid, SAMPLE_TODAY, "obs-1");
    expect(result).toEqual({
      ok: true,
      record: {
        id: "obs-1",
        lat: 43.8561,
        lon: -79.337,
        name: "Sample Hall",
        wheelchair: "yes",
        source: "my own visit",
        licence: "CC0-1.0",
        observedOn: "2026-11-14",
      },
    });
  });

  it("starts with UNKNOWN selected and keeps UNKNOWN as UNKNOWN", () => {
    expect(emptyForm(SAMPLE_TODAY).wheelchair).toBe("UNKNOWN");
    const result = parseForm({ ...valid, wheelchair: "UNKNOWN", name: "" }, SAMPLE_TODAY, "obs-2");
    expect(result.ok && result.record).toMatchObject({ wheelchair: "UNKNOWN", name: null });
  });

  it("reports every problem by field", () => {
    const result = parseForm(
      { name: "", lat: "x", lon: "999", wheelchair: "maybe", source: " ", licence: "CC-BY-NC-4.0", observedOn: "2026-02-30", consent: false },
      SAMPLE_TODAY,
      "obs-3",
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        lat: "lat-invalid",
        lon: "lon-invalid",
        wheelchair: "status-invalid",
        source: "source-required",
        licence: "licence-invalid",
        observedOn: "date-invalid",
        consent: "consent-required",
      },
    });
  });

  it("rejects a date in the future but allows today", () => {
    expect(parseForm({ ...valid, observedOn: "2026-11-16" }, SAMPLE_TODAY, "x")).toMatchObject({ ok: false, errors: { observedOn: "date-future" } });
    expect(parseForm({ ...valid, observedOn: SAMPLE_TODAY }, SAMPLE_TODAY, "x").ok).toBe(true);
  });
});

describe("newDraftId", () => {
  it("is stable for the same inputs and differs when the random part differs", () => {
    expect(newDraftId(1_700_000_000_000, () => 0.5)).toBe(newDraftId(1_700_000_000_000, () => 0.5));
    expect(newDraftId(1, () => 0.1)).not.toBe(newDraftId(1, () => 0.9));
    expect(newDraftId(1, () => 0.999999)).toMatch(/^obs-[0-9a-z]+-[0-9a-z]{4}$/);
  });
});

describe("exportFile", () => {
  const records = sampleRecords();

  it("writes an editing file with source, licence, and date, and no access tag for UNKNOWN", () => {
    const file = exportFile("osm", records, SAMPLE_TODAY);
    expect(file.filename).toBe("observations-2026-11-15.osc");
    expect(file.content).toContain("licence ODbL-1.0");
    expect(file.content).toContain('k="source" v="sample data for tests"');
    expect(file.content.match(/k="wheelchair"/g)).toHaveLength(4);
  });

  it("writes GeoJSON that keeps UNKNOWN", () => {
    const parsed = JSON.parse(exportFile("geojson", records, SAMPLE_TODAY).content);
    expect(parsed.features.map((f: any) => f.properties.wheelchair)).toContain("UNKNOWN");
  });

  it("writes a pack file that this App can load again", () => {
    const file = exportFile("pack", records, SAMPLE_TODAY);
    expect(file.mime).toBe("application/json");
    const loaded = parsePack(file.content);
    expect(loaded.ok && loaded.pack.manifest.packId).toBe("my-observations");
    expect(loaded.ok && loaded.pack.records).toEqual(records);
  });
});

import { prefillFromQuery } from "./contribute.js";

describe("prefillFromQuery", () => {
  it("uses a valid location and name, and leaves status UNKNOWN and consent empty", () => {
    const fields = prefillFromQuery("?lat=43.85&lon=-79.43&name=Sample%20Library", "2026-11-15");
    expect(fields).toMatchObject({ lat: "43.85", lon: "-79.43", name: "Sample Library", wheelchair: "UNKNOWN", consent: false, observedOn: "2026-11-15" });
  });
  it("ignores a coordinate that is not a number or is out of range", () => {
    const fields = prefillFromQuery("?lat=99&lon=abc", "2026-11-15");
    expect(fields.lat).toBe("");
    expect(fields.lon).toBe("");
  });
  it("cannot set the status, the source, the licence, or consent from a link", () => {
    const fields = prefillFromQuery("?wheelchair=yes&source=me&licence=CC0-1.0&consent=true&observedOn=2020-01-01", "2026-11-15");
    expect(fields).toEqual({ ...prefillFromQuery("", "2026-11-15") });
    expect(fields.wheelchair).toBe("UNKNOWN");
    expect(fields.consent).toBe(false);
  });
  it("cuts a very long name and drops control characters", () => {
    const fields = prefillFromQuery(`?name=${"a".repeat(500)}%0Ab`, "2026-11-15");
    expect(fields.name.length).toBeLessThanOrEqual(200);
    expect(fields.name).not.toMatch(/[\n]/);
  });
});

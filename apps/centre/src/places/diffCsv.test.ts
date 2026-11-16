import { describe, expect, it } from "vitest";
import { buildPackManifest } from "./docs-bridge.js";
import { diffPacks } from "./diff.js";
import { DIFF_CSV_COLUMNS, diffCsvFilename, diffToCsv } from "./diffCsv.js";
import { SAMPLE_TODAY, sampleRecords } from "./testing.js";
import type { PlaceRecord } from "./types.js";

const pack = (id: string, records: PlaceRecord[]) => ({ manifest: buildPackManifest(id, records, SAMPLE_TODAY), records, warnings: [] });
const base = sampleRecords();
const lines = (text: string) => text.slice(1).split("\r\n").filter(Boolean);

describe("diffToCsv", () => {
  const newer = [...base.slice(1).map((r) => (r.id === "s4" ? { ...r, wheelchair: "yes" as const, name: "=Annex" } : r)), { ...base[0]!, id: "n1", name: "New place" }];
  const text = diffToCsv(diffPacks(pack("a", base), pack("b", newer)));
  it("starts with a byte order mark and the header", () => {
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(lines(text)[0]).toBe(DIFF_CSV_COLUMNS.join(","));
  });
  it("writes one row per added, removed, and changed place", () => {
    const rows = lines(text).slice(1);
    expect(rows.map((r) => r.split(",")[2]).sort()).toEqual(["added", "changed", "removed"]);
  });
  it("writes statuses before and after, with UNKNOWN as UNKNOWN", () => {
    const changed = lines(text).find((r) => r.includes(",changed,"))!;
    expect(changed).toContain(",status; name,UNKNOWN,yes,");
  });
  it("neutralises a name that a spreadsheet could read as a formula", () => {
    expect(text).toContain("'=Annex");
  });
  it("is only the header for identical packs", () => {
    expect(lines(diffToCsv(diffPacks(pack("a", base), pack("b", base))))).toHaveLength(1);
  });
  it("names the file with the date", () => {
    expect(diffCsvFilename("2026-11-15")).toBe("pack-differences-2026-11-15.csv");
  });
});

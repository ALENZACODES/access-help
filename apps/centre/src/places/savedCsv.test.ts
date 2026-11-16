import { describe, expect, it } from "vitest";
import { buildPackManifest } from "./docs-bridge.js";
import { mergePacks } from "./packs.js";
import { resolveSaved, type SavedPlace } from "./saved.js";
import { SAVED_CSV_COLUMNS, savedCsvFilename, savedToCsv } from "./savedCsv.js";
import { SAMPLE_TODAY, sampleRecords } from "./testing.js";

const records = sampleRecords();
const pack = (id: string, list = records) => ({ manifest: buildPackManifest(id, list, SAMPLE_TODAY), records: list, warnings: [] });
const saved = (id: string, extra: Partial<SavedPlace> = {}): SavedPlace => ({ id, name: `Saved ${id}`, note: "", labels: [], savedOn: SAMPLE_TODAY, ...extra });
const csv = (ids: SavedPlace[], packs = [pack("a")]) => savedToCsv(resolveSaved(ids, mergePacks(packs).places));
const lines = (text: string) => text.slice(1).split("\r\n").filter(Boolean);

describe("savedToCsv", () => {
  it("starts with a byte order mark and the header, and ends each line with CRLF", () => {
    const text = csv([saved("s1")]);
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(lines(text)[0]).toBe(SAVED_CSV_COLUMNS.join(","));
    expect(text.endsWith("\r\n")).toBe(true);
  });
  it("writes the current status, source, licence, and date from the packs", () => {
    expect(lines(csv([saved("s1", { labels: ["weekend", "work"], note: "side door" })]))[1]).toBe(
      `s1,Sample Library,yes,weekend; work,side door,43.85,-79.43,sample data for tests,CC0-1.0,2026-11-01,yes,${SAMPLE_TODAY}`,
    );
  });
  it("writes UNKNOWN and empty cells for a place that is in no loaded pack", () => {
    expect(lines(csv([saved("gone")]))[1]).toBe(`gone,Saved gone,UNKNOWN,,,,,,,,no,${SAMPLE_TODAY}`);
  });
  it("writes UNKNOWN for a place whose packs disagree", () => {
    const other = pack("b", records.map((r) => (r.id === "s1" ? { ...r, wheelchair: "no" as const } : r)));
    expect(lines(csv([saved("s1")], [pack("a"), other]))[1]).toContain(",UNKNOWN,");
  });
  it("neutralises a note or name that a spreadsheet could read as a formula, and quotes commas", () => {
    const text = csv([saved("x", { name: "=SUM(A1)", note: "a, b" })]);
    expect(text).toContain("'=SUM(A1)");
    expect(text).toContain('"a, b"');
  });
  it("has one row per saved place and no row for places that were not saved", () => {
    expect(lines(csv([saved("s1"), saved("s2")]))).toHaveLength(3);
    expect(lines(csv([]))).toHaveLength(1);
  });
  it("names the file with the date", () => {
    expect(savedCsvFilename("2026-11-15")).toBe("saved-places-2026-11-15.csv");
  });
});

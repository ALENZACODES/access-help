import { describe, expect, it } from "vitest";
import { groupPlaces, placeId } from "./index";
import { testNote } from "./testnotes";
import { VISIT_CSV_COLUMNS, visitsCsvFilename, visitsToCsv, visitsToRows } from "./visits-csv";
import type { Visit } from "./visits";

const places = groupPlaces([testNote("a", "Library", [{ key: "elevator", value: "yes" }])], "en");
const LIB = placeId({ placeName: "Library", address: "1 Main St" });
const v = (more: Partial<Visit> = {}): Visit => ({
  id: "v-one",
  placeId: LIB,
  placeName: "Library",
  address: "1 Main St",
  visitedOn: "2026-11-18",
  found: { elevator: "no", "step-free-entry": "yes" },
  words: "Lift, \"again\"",
  writtenOn: "2026-11-19",
  ...more,
});

describe("visits as a spreadsheet", () => {
  it("writes one row per visit and detail, comparing with the notes as they are now", () => {
    const rows = visitsToRows([v()], places);
    expect(rows[0]).toEqual([...VISIT_CSV_COLUMNS]);
    expect(rows.slice(1).map((r) => [r[4], r[5], r[6]])).toEqual([
      ["step-free-entry", "yes", "UNKNOWN"],
      ["accessible-washroom", "not_looked", ""],
      ["automatic-door", "not_looked", ""],
      ["elevator", "no", "different"],
    ]);
    expect(rows[1]).toEqual(["v-one", "Library", "1 Main St", "2026-11-18", "step-free-entry", "yes", "UNKNOWN", "Lift, \"again\"", "2026-11-19"]);
  });

  it("says same, and notes_differ, and treats a place that left the notes as UNKNOWN", () => {
    const differ = groupPlaces([testNote("a", "Library", [{ key: "elevator", value: "yes" }]), testNote("b", "Library", [{ key: "elevator", value: "no" }])], "en");
    expect(visitsToRows([v({ found: { elevator: "yes" } })], places)[4]?.[6]).toBe("same");
    expect(visitsToRows([v()], differ)[4]?.[6]).toBe("notes_differ");
    expect(visitsToRows([v()], [])[4]?.[6]).toBe("UNKNOWN");
  });

  it("orders visits newest first and guards typed text against formulas", () => {
    const rows = visitsToRows([v({ id: "v-old", visitedOn: "2026-01-01" }), v({ id: "v-new", placeName: "=SUM(A1)", address: undefined, words: "+1" })], places);
    expect(rows.slice(1).map((r) => r[0])).toEqual(["v-new", "v-new", "v-new", "v-new", "v-old", "v-old", "v-old", "v-old"]);
    expect([rows[1]?.[1], rows[1]?.[2], rows[1]?.[7]]).toEqual(["'=SUM(A1)", "", "'+1"]);
  });

  it("is a CSV file with a byte order mark, quoted fields and CRLF line ends", () => {
    const csv = visitsToCsv([v()], places);
    expect(csv.startsWith("\uFEFFvisit_id,place_name,")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.split("\r\n")).toHaveLength(1 + 4 + 1);
    expect(csv).toContain(',"Lift, ""again""",');
    expect(visitsToCsv([], places)).toBe(`\uFEFF${VISIT_CSV_COLUMNS.join(",")}\r\n`);
    expect(visitsCsvFilename(new Date(Date.UTC(2026, 10, 20)))).toBe("visits-2026-11-20.csv");
  });
});

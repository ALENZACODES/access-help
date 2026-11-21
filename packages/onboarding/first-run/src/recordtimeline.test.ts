import { describe, expect, it } from "vitest";
import { exportNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import type { Note } from "./model";
import {
  MAX_PERIODS,
  TIMELINE_CSV_COLUMNS,
  TIME_STEPS,
  fileTimeline,
  isTimeStep,
  nextPeriod,
  percentRecorded,
  periodOf,
  periodsBetween,
  timelineCsv,
  totalRecords,
} from "./recordtimeline";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const BOM = String.fromCharCode(0xfeff);

function fileOf(notes: Note[]): StreetFile {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

/**
 * Library: elevator 2026-01-10, washroom 2026-03-05.
 * Bank: elevator yes 2026-01-20, then a second note saying no on 2026-03-15.
 * Cart: nothing recorded.
 */
function notes(): Note[] {
  return [
    testNote("a", "Library", [
      { key: "elevator", value: "yes", on: "2026-01-10" },
      { key: "accessible-washroom", value: "yes", on: "2026-03-05" },
    ], "100 King St W"),
    testNote("b1", "Bank", [{ key: "elevator", value: "yes", on: "2026-01-20" }], "40 Queen St E"),
    testNote("b2", "Bank", [{ key: "elevator", value: "no", on: "2026-03-15", source: "Visit" }], "40 Queen St E"),
    testNote("c", "Cart", [], null),
  ];
}

describe("periods", () => {
  it("knows its two steps", () => {
    expect(TIME_STEPS).toEqual(["month", "year"]);
    expect(isTimeStep("year")).toBe(true);
    for (const x of ["week", "", undefined, null]) expect(isTimeStep(x)).toBe(false);
  });

  it("names the period of a date and the period after one, across a year's end", () => {
    expect(periodOf("2026-03-05", "month")).toBe("2026-03");
    expect(periodOf("2026-03-05", "year")).toBe("2026");
    expect(nextPeriod("2026-12", "month")).toBe("2027-01");
    expect(nextPeriod("2026-09", "month")).toBe("2026-10");
    expect(nextPeriod("2026", "year")).toBe("2027");
  });

  it("lists every period between two, gaps included", () => {
    expect(periodsBetween("2025-11", "2026-02", "month")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(periodsBetween("2024", "2024", "year")).toEqual(["2024"]);
  });
});

describe("the timeline by month", () => {
  const tl = () => fileTimeline(fileOf(notes()), "month", "", TODAY);

  it("counts places and every detail of every place, places with no record included", () => {
    expect(tl().places).toBe(3);
    expect(tl().details).toBe(12);
  });

  it("has a row for each month from the oldest record to the newest, a quiet month as zeros", () => {
    expect(tl().rows.map((r) => r.period)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(tl().rows[1]).toEqual({ period: "2026-02", records: 0, firstRecords: 0, placesStarted: 0, recorded: 2, differing: 0 });
  });

  it("counts records, first records, places started and the running total", () => {
    const [jan, , mar] = tl().rows;
    expect(jan).toEqual({ period: "2026-01", records: 2, firstRecords: 2, placesStarted: 2, recorded: 2, differing: 0 });
    // March: the Library's washroom is a first record; the Bank's second elevator report is not.
    expect(mar).toEqual({ period: "2026-03", records: 2, firstRecords: 1, placesStarted: 0, recorded: 3, differing: 1 });
    expect(totalRecords(tl())).toBe(4);
  });

  it("counts reports that differ only from the period the second report is dated in", () => {
    expect(tl().rows.map((r) => r.differing)).toEqual([0, 0, 1]);
  });

  it("gives each detail its records, places and dates", () => {
    const elevator = tl().byDetail.find((d) => d.key === "elevator");
    expect(elevator).toEqual({ key: "elevator", records: 3, places: 2, oldest: "2026-01-10", newest: "2026-03-15" });
    expect(tl().byDetail.find((d) => d.key === "automatic-door")).toEqual({ key: "automatic-door", records: 0, places: 0, oldest: undefined, newest: undefined });
  });
});

describe("the timeline by year and by area", () => {
  it("puts a year's records in one row", () => {
    const tl = fileTimeline(fileOf([...notes(), testNote("d", "Deli", [{ key: "elevator", value: "yes", on: "2024-06-01" }], "7 Elm St")]), "year", "", TODAY);
    expect(tl.rows.map((r) => [r.period, r.records, r.recorded])).toEqual([
      ["2024", 1, 1],
      ["2025", 0, 1],
      ["2026", 4, 4],
    ]);
  });

  it("keeps only the places whose address holds the area text", () => {
    const tl = fileTimeline(fileOf(notes()), "month", "queen", TODAY);
    expect(tl.places).toBe(1);
    expect(tl.details).toBe(4);
    expect(tl.rows.map((r) => r.records)).toEqual([1, 0, 1]);
    expect(tl.rows.at(-1)?.differing).toBe(1);
  });

  it("has no rows when no place is in the area, or none has a record", () => {
    expect(fileTimeline(fileOf(notes()), "month", "nowhere", TODAY)).toMatchObject({ places: 0, details: 0, rows: [] });
    expect(fileTimeline(fileOf([testNote("c", "Cart", [], null)]), "month", "", TODAY)).toMatchObject({ places: 1, rows: [], hidden: 0, future: 0 });
  });
});

describe("dates the App cannot place", () => {
  it("leaves records dated after today out of every count, and counts them apart", () => {
    const tl = fileTimeline(fileOf([testNote("x", "Kiosk", [{ key: "elevator", value: "yes", on: "2026-12-25" }, { key: "automatic-door", value: "no", on: "2026-10-02" }], "5 Elm St")]), "month", "", TODAY);
    expect(tl.future).toBe(1);
    expect(tl.rows.map((r) => r.period)).toEqual(["2026-10"]);
    expect(totalRecords(tl)).toBe(1);
  });
});

describe(`more than ${MAX_PERIODS} periods`, () => {
  it("lists the last ones and keeps the earlier records in the running total", () => {
    const tl = fileTimeline(
      fileOf([testNote("old", "Old", [{ key: "elevator", value: "yes", on: "2010-01-15" }], "1 Elm St"), testNote("new", "New", [{ key: "elevator", value: "no", on: "2026-11-02" }], "2 Elm St")]),
      "month",
      "",
      TODAY,
    );
    expect(tl.rows).toHaveLength(MAX_PERIODS);
    expect(tl.hidden).toBe(203 - MAX_PERIODS);
    expect(tl.rows[0]).toMatchObject({ period: "2016-12", records: 0, recorded: 1 });
    expect(tl.rows.at(-1)).toMatchObject({ period: "2026-11", records: 1, recorded: 2 });
    expect(totalRecords(tl)).toBe(2);
  });
});

describe("percent and CSV", () => {
  it("rounds the share down, and gives 0 of nothing", () => {
    expect(percentRecorded(3, 12)).toBe(25);
    expect(percentRecorded(199, 200)).toBe(99);
    expect(percentRecorded(0, 0)).toBe(0);
  });

  it("downloads one row per period with the share of details", () => {
    const csv = timelineCsv(fileTimeline(fileOf(notes()), "month", "", TODAY));
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([TIMELINE_CSV_COLUMNS.join(","), "2026-01,2,2,2,2,16,0", "2026-02,0,0,0,2,16,0", "2026-03,2,1,0,3,25,1"]);
  });
});

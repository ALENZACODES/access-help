import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import {
  DATES_CSV_COLUMNS,
  KEEP,
  applyDates,
  bySource,
  commonSlip,
  copyChanges,
  dateProblem,
  datesCsv,
  fixedFile,
  futureRecords,
  recordId,
  suggestDates,
  type DateChoice,
} from "./recorddates";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function read(text: string): StreetFile {
  const r = readStreetFile(text, TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const FILE = exportNotes(
  [
    testNote("lib", "Library", [
      { key: "elevator", value: "yes", on: "2062-03-01", source: "Branch walk", licence: "CC-BY-4.0" },
      { key: "automatic-door", value: "no", on: "2026-10-01" },
    ], "100 King St W"),
    testNote("cafe", "Café", [{ key: "elevator", value: "no", on: "2026-12-05" }], null),
    testNote("zoo", "Zoo", [{ key: "automatic-door", value: "yes", on: "2099-01-01" }, { key: "elevator", value: "yes", on: "2027-11-20" }], "1 Zoo Rd"),
    testNote("park", "Park", [], "5 Park Ave"),
  ],
  "2026-11-01",
);

describe("suggestDates", () => {
  it("offers each plain slip that gives a real day on or before today, in order", () => {
    expect(suggestDates("2062-03-01", TODAY)).toEqual([{ date: "2026-03-01", slip: "year-digits" }]);
    expect(suggestDates("2026-12-05", TODAY)).toEqual([
      { date: "2026-05-12", slip: "day-month" },
      { date: "2025-12-05", slip: "year-high" },
    ]);
    expect(suggestDates("2027-11-20", TODAY)).toEqual([{ date: "2026-11-20", slip: "year-high" }]);
  });

  it("offers nothing when no slip lands on or before today", () => {
    // 2099 swapped is still 2099; 2098 is after today; month 01 and day 01 swapped is the same day.
    expect(suggestDates("2099-01-01", TODAY)).toEqual([]);
    // 2072 swapped is 2027, after today; 25 is not a month; 2071 is after today.
    expect(suggestDates("2072-02-25", TODAY)).toEqual([]);
  });

  it("keeps today itself, leaves out days that do not exist, and lists a day once", () => {
    expect(suggestDates("2027-11-21", TODAY)).toEqual([{ date: "2026-11-21", slip: "year-high" }]);
    // 2026-02-30 is not a day, so swapping day and month is not offered.
    expect(suggestDates("2062-30-02", TODAY)).toEqual([]);
    // Year 2077 swapped is itself; one too high is 2076, after today.
    expect(suggestDates("2077-05-05", TODAY)).toEqual([]);
    // 2026-06-06 dated 2062: the swapped year is offered once, though day and month swapped give the same date as the original.
    expect(suggestDates("2062-06-06", TODAY)).toEqual([{ date: "2026-06-06", slip: "year-digits" }]);
  });

  it("returns nothing for text that is not shaped like a date", () => {
    expect(suggestDates("soon", TODAY)).toEqual([]);
    expect(suggestDates("", TODAY)).toEqual([]);
  });
});

describe("futureRecords", () => {
  it("lists the records dated after today, places by name and details in the App's order", () => {
    const r = futureRecords(read(FILE), TODAY);
    expect(r.places).toBe(4);
    expect(r.records).toBe(5);
    // Automatic door comes before elevator in the App's order.
    expect(r.future.map((f) => [f.place.name, f.key, f.recordedOn])).toEqual([
      ["Café", "elevator", "2026-12-05"],
      ["Library", "elevator", "2062-03-01"],
      ["Zoo", "automatic-door", "2099-01-01"],
      ["Zoo", "elevator", "2027-11-20"],
    ]);
  });

  it("carries the record's value, source, licence, id and suggestions", () => {
    const lib = futureRecords(read(FILE), TODAY).future.find((f) => f.place.name === "Library");
    expect(lib).toMatchObject({
      id: recordId("lib", "elevator"),
      value: "yes",
      source: "Branch walk",
      licence: "CC-BY-4.0",
      recordedOn: "2062-03-01",
      suggestions: [{ date: "2026-03-01", slip: "year-digits" }],
    });
  });

  it("counts a record dated today as fine", () => {
    const r = futureRecords(read(exportNotes([testNote("t", "Today", [{ key: "elevator", value: "yes", on: "2026-11-21" }])], "2026-11-01")), TODAY);
    expect(r.records).toBe(1);
    expect(r.future).toEqual([]);
  });
});

describe("dateProblem", () => {
  it("names what is wrong with a typed date", () => {
    expect(dateProblem("", TODAY)).toBe("empty");
    expect(dateProblem("   ", TODAY)).toBe("empty");
    expect(dateProblem("March 1", TODAY)).toBe("not-date");
    expect(dateProblem("2026-02-30", TODAY)).toBe("not-date");
    expect(dateProblem("2026-11-22", TODAY)).toBe("after-today");
    expect(dateProblem(" 2026-11-21 ", TODAY)).toBeUndefined();
    expect(dateProblem("2001-01-01", TODAY)).toBeUndefined();
  });
});

describe("applyDates", () => {
  const file = read(FILE);
  const r = futureRecords(file, TODAY);
  const fact = (notes: readonly { id: string; facts: readonly { key: string }[] }[], id: string, key: string) =>
    notes.find((n) => n.id === id)?.facts.find((f) => f.key === key);

  it("changes only the dates chosen and keeps value, source and licence", () => {
    const choices = new Map<string, DateChoice>([[recordId("lib", "elevator"), { kind: "date", date: "2026-03-01" }]]);
    const c = applyDates(file, r, choices, TODAY);
    expect(c).toMatchObject({ redated: 1, cleared: 0, kept: 3 });
    expect(fact(c.notes, "lib", "elevator")).toEqual({
      key: "elevator",
      value: "yes",
      provenance: { source: "Branch walk", licence: "CC-BY-4.0", recordedOn: "2026-03-01" },
    });
    // The note's other record and the other notes are untouched.
    expect(fact(c.notes, "lib", "automatic-door")).toEqual(fact(file.places.flatMap((p) => p.notes), "lib", "automatic-door"));
    expect(c.notes).toHaveLength(4);
  });

  it("sets a detail back to Unknown with its value and provenance gone together", () => {
    const c = applyDates(file, r, new Map<string, DateChoice>([[recordId("zoo", "automatic-door"), { kind: "unknown" }]]), TODAY);
    expect(c).toMatchObject({ redated: 0, cleared: 1, kept: 3 });
    expect(fact(c.notes, "zoo", "automatic-door")).toEqual({ key: "automatic-door", value: "unknown" });
    expect(fact(c.notes, "zoo", "elevator")).toMatchObject({ value: "yes", provenance: { recordedOn: "2027-11-20" } });
  });

  it("handles two choices in one note and keeps the rest", () => {
    const choices = new Map<string, DateChoice>([
      [recordId("zoo", "automatic-door"), { kind: "unknown" }],
      [recordId("zoo", "elevator"), { kind: "date", date: "2026-11-20" }],
      [recordId("cafe", "elevator"), KEEP],
    ]);
    const c = applyDates(file, r, choices, TODAY);
    expect(c).toMatchObject({ redated: 1, cleared: 1, kept: 2 });
    expect(futureRecords(read(fixedFile(c, TODAY)), TODAY).future.map((f) => f.id)).toEqual([recordId("cafe", "elevator"), recordId("lib", "elevator")]);
  });

  it("keeps everything when nothing is chosen", () => {
    const c = applyDates(file, r, new Map(), TODAY);
    expect(c).toMatchObject({ redated: 0, cleared: 0, kept: 4 });
    expect(c.notes).toEqual(file.places.flatMap((p) => p.notes));
  });

  it("ignores a choice for a record that is not dated after today", () => {
    const c = applyDates(file, r, new Map<string, DateChoice>([[recordId("lib", "automatic-door"), { kind: "unknown" }]]), TODAY);
    expect(c).toMatchObject({ redated: 0, cleared: 0, kept: 4 });
    expect(fact(c.notes, "lib", "automatic-door")).toMatchObject({ value: "no" });
  });

  it("keeps a record whose chosen date is not a real day, rather than letting the reader turn it into Unknown", () => {
    const c = applyDates(file, r, new Map<string, DateChoice>([[recordId("cafe", "elevator"), { kind: "date", date: "not a day" }]]), TODAY);
    expect(c).toMatchObject({ redated: 0, cleared: 0, kept: 4 });
    expect(fact(c.notes, "cafe", "elevator")).toMatchObject({ value: "no", provenance: { recordedOn: "2026-12-05" } });
  });

  it("keeps a record whose chosen date is after today", () => {
    const c = applyDates(file, r, new Map<string, DateChoice>([[recordId("lib", "elevator"), { kind: "date", date: "2026-11-22" }]]), TODAY);
    expect(c).toMatchObject({ redated: 0, kept: 4 });
    expect(fact(c.notes, "lib", "elevator")).toMatchObject({ provenance: { recordedOn: "2062-03-01" } });
  });

  it("still applies the other choices in the note when one is no fix", () => {
    const choices = new Map<string, DateChoice>([
      [recordId("zoo", "automatic-door"), { kind: "date", date: "2026-13-01" }],
      [recordId("zoo", "elevator"), { kind: "date", date: "2026-11-21" }],
    ]);
    const c = applyDates(file, r, choices, TODAY);
    expect(c).toMatchObject({ redated: 1, cleared: 0, kept: 3 });
    expect(fact(c.notes, "zoo", "automatic-door")).toMatchObject({ provenance: { recordedOn: "2099-01-01" } });
    expect(fact(c.notes, "zoo", "elevator")).toMatchObject({ provenance: { recordedOn: "2026-11-21" } });
  });
});

describe("copyChanges", () => {
  const file = read(FILE);
  const r = futureRecords(file, TODAY);

  it("lists each change the copy holds, in the list's order", () => {
    const choices = new Map<string, DateChoice>([
      [recordId("zoo", "automatic-door"), { kind: "unknown" }],
      [recordId("lib", "elevator"), { kind: "date", date: "2026-03-01" }],
      [recordId("cafe", "elevator"), KEEP],
    ]);
    expect(copyChanges(r, applyDates(file, r, choices, TODAY)).map((c) => [c.record.id, c.to])).toEqual([
      [recordId("lib", "elevator"), "2026-03-01"],
      [recordId("zoo", "automatic-door"), "unknown"],
    ]);
  });

  it("does not show a choice the App did not apply", () => {
    const choices = new Map<string, DateChoice>([[recordId("cafe", "elevator"), { kind: "date", date: "2026-11-30" }]]);
    expect(copyChanges(r, applyDates(file, r, choices, TODAY))).toEqual([]);
  });

  it("is empty when the copy keeps everything", () => {
    expect(copyChanges(r, applyDates(file, r, new Map(), TODAY))).toEqual([]);
  });
});

describe("fixedFile", () => {
  it("is a notes export the App reads back, dated today", () => {
    const file = read(FILE);
    const r = futureRecords(file, TODAY);
    const c = applyDates(file, r, new Map<string, DateChoice>([[recordId("lib", "elevator"), { kind: "date", date: "2026-03-01" }]]), TODAY);
    const text = fixedFile(c, TODAY);
    expect(JSON.parse(text)).toMatchObject({ exportedOn: "2026-11-21" });
    const back = importNotes(text);
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    expect(back.notes).toHaveLength(4);
  });
});

describe("bySource", () => {
  const survey = (id: string, on: string) => testNote(id, `Place ${id}`, [{ key: "elevator", value: "yes", on, source: "Spring survey" }], null);

  it("groups the records by source, most first, then by name, with the slips each could explain", () => {
    const text = exportNotes(
      [survey("a", "2062-03-01"), survey("b", "2062-04-01"), survey("c", "2026-12-05"), testNote("d", "Other", [{ key: "elevator", value: "no", on: "2099-01-01" }], null)],
      "2026-11-01",
    );
    expect(bySource(futureRecords(read(text), TODAY))).toEqual([
      { source: "Spring survey", records: 3, suggested: 3, slips: { "year-digits": 2, "day-month": 1, "year-high": 1 } },
      { source: "City survey", records: 1, suggested: 0, slips: { "year-digits": 0, "day-month": 0, "year-high": 0 } },
    ]);
  });

  it("orders sources with the same count by name", () => {
    const text = exportNotes(
      [
        testNote("z", "Z", [{ key: "elevator", value: "yes", on: "2030-01-01", source: "Zed walk" }], null),
        testNote("a", "A", [{ key: "elevator", value: "yes", on: "2030-01-01", source: "Alpha walk" }], null),
      ],
      "2026-11-01",
    );
    expect(bySource(futureRecords(read(text), TODAY)).map((s) => s.source)).toEqual(["Alpha walk", "Zed walk"]);
  });

  it("is empty when nothing is dated after today", () => {
    expect(bySource({ places: 0, records: 0, future: [] })).toEqual([]);
  });
});

describe("commonSlip", () => {
  const s = (slips: Record<"year-digits" | "day-month" | "year-high", number>) => ({ source: "x", records: 5, suggested: 5, slips });

  it("names the slip that explains the most, when it explains more than one", () => {
    expect(commonSlip(s({ "year-digits": 1, "day-month": 3, "year-high": 2 }))).toBe("day-month");
    expect(commonSlip(s({ "year-digits": 2, "day-month": 0, "year-high": 0 }))).toBe("year-digits");
  });

  it("gives a tie to the earlier slip, and names none when no slip explains two", () => {
    expect(commonSlip(s({ "year-digits": 2, "day-month": 2, "year-high": 2 }))).toBe("year-digits");
    expect(commonSlip(s({ "year-digits": 1, "day-month": 1, "year-high": 1 }))).toBeUndefined();
    expect(commonSlip(s({ "year-digits": 0, "day-month": 0, "year-high": 0 }))).toBeUndefined();
  });
});

describe("datesCsv", () => {
  it("has a header, one row per record with the suggestions, a BOM and CRLF", () => {
    const csv = datesCsv(futureRecords(read(FILE), TODAY));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe(DATES_CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(5);
    expect(lines).toContain("Library,100 King St W,lib,elevator,yes,Branch walk,CC-BY-4.0,2062-03-01,2026-03-01");
    expect(lines).toContain("Café,,cafe,elevator,no,City survey,CC0-1.0,2026-12-05,2026-05-12 2025-12-05");
  });

  it("guards cells that a spreadsheet would run as a formula", () => {
    const text = exportNotes([testNote("x", "=HYPERLINK(1)", [{ key: "elevator", value: "yes", on: "2030-01-01", source: "+source" }])], "2026-11-01");
    const csv = datesCsv(futureRecords(read(text), TODAY));
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain("'+source");
    expect(csv).not.toMatch(/(^|,)[=+]/m);
  });
});

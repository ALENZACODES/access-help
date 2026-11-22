import { describe, expect, it } from "vitest";
import {
  ASOF_CSV_COLUMNS,
  CHANGES_CSV_COLUMNS,
  changesCsv,
  answeredCount,
  compare,
  comparisonCsv,
  countsFor,
  quickDay,
  dayProblem,
  reading,
  snapshot,
  snapshotFile,
  sourcesSince,
  toProblem,
} from "./asof";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { parseNote, type Note } from "./model";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function read(text: string): StreetFile {
  const r = readStreetFile(text, TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

/** A test note made on another day, through the App's own reader. */
function madeOn(n: Note, day: string): Note {
  const out = parseNote({ ...n, createdOn: day });
  if (!out) throw new Error("bad note");
  return out;
}

// The library had an elevator record in March; a second report in June disagrees.
// The café's note is from March, but its door record was added in May.
// The park was first noted in August. The kiosk never had a record.
const FILE = exportNotes(
  [
    madeOn(testNote("lib1", "Library", [{ key: "elevator", value: "yes", on: "2026-03-10" }], "1 King St W"), "2026-03-10"),
    madeOn(testNote("lib2", "Library", [{ key: "elevator", value: "no", on: "2026-06-01" }], "1 King St W"), "2026-06-01"),
    madeOn(testNote("cafe", "Café", [
      { key: "elevator", value: "no", on: "2026-03-15" },
      { key: "automatic-door", value: "yes", on: "2026-05-02" },
    ], "2 King St W"), "2026-03-15"),
    madeOn(testNote("park", "Park", [{ key: "elevator", value: "yes", on: "2026-08-01" }], "3 King St W"), "2026-08-01"),
    madeOn(testNote("kiosk", "Kiosk", [], "4 King St W"), "2026-02-01"),
  ],
  "2026-11-01",
);

const valueOf = (notes: readonly Note[], id: string, key: string) => notes.find((n) => n.id === id)?.facts.find((f) => f.key === key);

describe("dayProblem", () => {
  it("names what is wrong with the day", () => {
    expect(dayProblem("", TODAY)).toBe("empty");
    expect(dayProblem("  ", TODAY)).toBe("empty");
    expect(dayProblem("March 31", TODAY)).toBe("bad");
    expect(dayProblem("2026-02-30", TODAY)).toBe("bad");
    expect(dayProblem("2026-11-22", TODAY)).toBe("future");
    expect(dayProblem(" 2026-11-21 ", TODAY)).toBeUndefined();
  });
});

describe("quickDay", () => {
  it("works out the days often looked back to", () => {
    expect(quickDay("month", TODAY)).toBe("2026-10-31");
    expect(quickDay("quarter", TODAY)).toBe("2026-09-30");
    expect(quickDay("year", TODAY)).toBe("2025-12-31");
    expect(quickDay("year-ago", TODAY)).toBe("2025-11-21");
  });

  it("crosses year ends and handles 29 February", () => {
    const jan = new Date(Date.UTC(2027, 0, 15));
    expect(quickDay("month", jan)).toBe("2026-12-31");
    expect(quickDay("quarter", jan)).toBe("2026-12-31");
    const apr = new Date(Date.UTC(2026, 3, 1));
    expect(quickDay("quarter", apr)).toBe("2026-03-31");
    expect(quickDay("month", new Date(Date.UTC(2028, 2, 10)))).toBe("2028-02-29");
    expect(quickDay("year-ago", new Date(Date.UTC(2028, 1, 29)))).toBe("2027-02-28");
  });

  it("always gives a day that the day check accepts", () => {
    for (const k of ["month", "quarter", "year", "year-ago"] as const) expect(dayProblem(quickDay(k, TODAY), TODAY), k).toBeUndefined();
  });
});

describe("toProblem", () => {
  it("allows no second day, and names what is wrong with one", () => {
    expect(toProblem("", "2026-03-31", TODAY)).toBeUndefined();
    expect(toProblem("June", "2026-03-31", TODAY)).toBe("bad");
    expect(toProblem("2026-12-01", "2026-03-31", TODAY)).toBe("future");
    expect(toProblem("2026-03-31", "2026-03-31", TODAY)).toBe("not-after");
    expect(toProblem("2026-01-01", "2026-03-31", TODAY)).toBe("not-after");
    expect(toProblem(" 2026-06-30 ", "2026-03-31", TODAY)).toBeUndefined();
  });
});

describe("snapshot", () => {
  const file = read(FILE);

  it("leaves out notes made after the day and sets later records back to Unknown", () => {
    const s = snapshot(file, "2026-03-31");
    expect(s.notes.map((n) => n.id).sort()).toEqual(["cafe", "kiosk", "lib1"]);
    expect(s.leftOut).toBe(2);
    // The café's door record, made in May, was not known yet.
    expect(s.hidden).toBe(1);
    const may = snapshot(file, "2026-05-01");
    expect(may.hidden).toBe(1);
    expect(valueOf(may.notes, "cafe", "automatic-door")).toEqual({ key: "automatic-door", value: "unknown", provenance: undefined });
    expect(valueOf(may.notes, "cafe", "elevator")).toMatchObject({ value: "no", provenance: { recordedOn: "2026-03-15" } });
  });

  it("counts the day itself as known", () => {
    const s = snapshot(file, "2026-05-02");
    expect(s.hidden).toBe(0);
    expect(valueOf(s.notes, "cafe", "automatic-door")?.value).toBe("yes");
  });

  it("keeps everything on today, and nothing before the first note", () => {
    expect(snapshot(file, "2026-11-21")).toMatchObject({ leftOut: 0, hidden: 0 });
    expect(snapshot(file, "2026-11-21").notes).toEqual(file.places.flatMap((p) => p.notes));
    expect(snapshot(file, "2025-01-01")).toMatchObject({ notes: [], leftOut: 5, hidden: 0 });
  });
});

describe("countsFor", () => {
  it("counts places by their reading of a detail", () => {
    expect(countsFor(read(FILE).places, "elevator")).toEqual({ yes: 1, no: 1, differ: 1, unknown: 1 });
    expect(answeredCount({ yes: 1, no: 2, differ: 3, unknown: 4 })).toBe(6);
  });
});

describe("compare", () => {
  const file = read(FILE);

  it("gives the places then and now, and each detail's counts", () => {
    const c = compare(file, snapshot(file, "2026-03-31"), "en");
    expect([c.placesThen, c.placesNow]).toEqual([3, 4]);
    const elevator = c.details.find((d) => d.key === "elevator")!;
    expect(elevator.then).toEqual({ yes: 1, no: 1, differ: 0, unknown: 1 });
    expect(elevator.now).toEqual({ yes: 1, no: 1, differ: 1, unknown: 1 });
  });

  it("lists the places with an answer since, including places made since, by name", () => {
    const c = compare(file, snapshot(file, "2026-03-31"), "en");
    expect(c.details.find((d) => d.key === "elevator")!.answered.map((p) => p.name)).toEqual(["Park"]);
    expect(c.details.find((d) => d.key === "automatic-door")!.answered.map((p) => p.name)).toEqual(["Café"]);
    expect(c.details.find((d) => d.key === "step-free-entry")!.answered).toEqual([]);
  });

  it("counts places that read differently now, including reports that now differ", () => {
    const c = compare(file, snapshot(file, "2026-03-31"), "en");
    // The library now has reports that differ, and the park is new with a Yes.
    expect(c.details.find((d) => d.key === "elevator")!.changed).toBe(2);
    expect(c.details.find((d) => d.key === "automatic-door")!.changed).toBe(1);
    // A place made since with no record for the detail reads Unknown then and now.
    expect(c.details.find((d) => d.key === "step-free-entry")!.changed).toBe(0);
  });

  it("finds no change against today", () => {
    const c = compare(file, snapshot(file, "2026-11-21"), "en");
    for (const d of c.details) {
      expect(d.answered, d.key).toEqual([]);
      expect(d.changed, d.key).toBe(0);
      expect(d.then, d.key).toEqual(d.now);
    }
  });
});

describe("places that read differently", () => {
  const file = read(FILE);

  it("lists each place whose reading changed, with then and now, by name", () => {
    const c = compare(file, snapshot(file, "2026-03-31"), "en");
    expect(c.details.find((d) => d.key === "elevator")!.differently.map((x) => [x.place.name, x.then, x.now])).toEqual([
      ["Library", "yes", "differ"],
      ["Park", "absent", "yes"],
    ]);
    expect(c.details.find((d) => d.key === "automatic-door")!.differently.map((x) => [x.place.name, x.then, x.now])).toEqual([["Café", "unknown", "yes"]]);
  });

  it("reads a place's detail, or says it is not in the file", () => {
    const lib = file.places.find((p) => p.name === "Library")!;
    expect(reading(lib, "elevator")).toBe("differ");
    expect(reading(lib, "automatic-door")).toBe("unknown");
    expect(reading(file.places.find((p) => p.name === "Park"), "elevator")).toBe("yes");
    expect(reading(undefined, "elevator")).toBe("absent");
  });
});

describe("comparing two days", () => {
  const file = read(FILE);

  it("compares the file on the day with the file on a later day, not with now", () => {
    const c = compare(file, snapshot(file, "2026-03-31"), "en", snapshot(file, "2026-05-31"));
    expect(c.to).toBe("2026-05-31");
    // Library, Café and Kiosk on both days; the park comes later.
    expect([c.placesThen, c.placesNow]).toEqual([3, 3]);
    const elevator = c.details.find((d) => d.key === "elevator")!;
    expect(elevator.now).toEqual({ yes: 1, no: 1, differ: 0, unknown: 1 });
    expect(elevator.differently).toEqual([]);
    expect(c.details.find((d) => d.key === "automatic-door")!.answered.map((p) => p.name)).toEqual(["Café"]);
  });

  it("has no second day when comparing with now", () => {
    expect(compare(file, snapshot(file, "2026-03-31"), "en").to).toBeUndefined();
  });
});

describe("sourcesSince", () => {
  const SOURCES = exportNotes(
    [
      madeOn(testNote("a", "Library", [{ key: "elevator", value: "yes", source: "Old survey", on: "2026-01-10" }], "1 King St W"), "2026-01-10"),
      madeOn(testNote("b", "Library", [{ key: "automatic-door", value: "yes", source: "Walk", on: "2026-04-01" }], "1 King St W"), "2026-04-01"),
      madeOn(testNote("c", "Café", [
        { key: "elevator", value: "no", source: "Walk", on: "2026-04-02" },
        { key: "automatic-door", value: "no", source: "City list", on: "2026-07-01" },
      ], "2 King St W"), "2026-07-01"),
    ],
    "2026-11-01",
  );
  const file = read(SOURCES);

  it("counts the records made after the day by source, most first", () => {
    expect(sourcesSince(file, "2026-03-31")).toEqual([
      { source: "Walk", records: 2, places: 2 },
      { source: "City list", records: 1, places: 1 },
    ]);
  });

  it("stops at the second day, leaving out notes made after it", () => {
    // The café's note was made on 2026-07-01, so its April record was not in the file on 2026-06-30.
    expect(sourcesSince(file, "2026-03-31", "2026-06-30")).toEqual([{ source: "Walk", records: 1, places: 1 }]);
  });

  it("is empty when nothing was made since", () => {
    expect(sourcesSince(file, "2026-11-21")).toEqual([]);
  });
});

describe("snapshotFile", () => {
  it("is a notes export the App reads back, holding only what was known on the day", () => {
    const file = read(FILE);
    const text = snapshotFile(snapshot(file, "2026-05-01"), TODAY);
    expect(JSON.parse(text)).toMatchObject({ exportedOn: "2026-11-21" });
    const back = importNotes(text);
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    expect(back.notes).toHaveLength(3);
    for (const n of back.notes) for (const f of n.facts) if (f.provenance) expect(f.provenance.recordedOn <= "2026-05-01").toBe(true);
  });
});

describe("changesCsv", () => {
  it("has one row for each place and detail whose reading changed", () => {
    const file = read(FILE);
    const csv = changesCsv(compare(file, snapshot(file, "2026-03-31"), "en"));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([
      CHANGES_CSV_COLUMNS.join(","),
      "automatic-door,Café,2 King St W,unknown,yes",
      "elevator,Library,1 King St W,yes,differ",
      "elevator,Park,3 King St W,absent,yes",
    ]);
  });

  it("has only the header when nothing changed, and guards formulas", () => {
    const file = read(FILE);
    expect(changesCsv(compare(file, snapshot(file, "2026-11-21"), "en")).trimEnd().split("\r\n")).toHaveLength(1);
    const f = read(exportNotes([madeOn(testNote("x", "=X", [{ key: "elevator", value: "yes", on: "2026-05-01" }], null), "2026-05-01")], "2026-11-01"));
    expect(changesCsv(compare(f, snapshot(f, "2026-01-01"), "en"))).toContain("'=X");
  });
});

describe("comparisonCsv", () => {
  it("has a header and one row for each detail, with a BOM and CRLF", () => {
    const file = read(FILE);
    const csv = comparisonCsv(compare(file, snapshot(file, "2026-03-31"), "en"));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe(ASOF_CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(5);
    expect(lines).toContain("elevator,2,3,1,1,1,1,0,1,1,1,2");
    expect(lines).toContain("automatic-door,0,1,0,1,0,0,0,0,3,3,1");
  });
});

import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import type { Note } from "./model";
import { DAY_STATES, dayProblem, fileOnDay, notesOnDay, placesOnDay, stateOn } from "./recordasof";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function notes(): Note[] {
  return [
    testNote("a", "Library", [
      { key: "elevator", value: "yes", on: "2026-01-10" },
      { key: "accessible-washroom", value: "no", on: "2026-03-05" },
    ], "100 King St W"),
    testNote("b1", "Bank", [{ key: "elevator", value: "yes", on: "2026-01-20" }], "40 Queen St E"),
    testNote("b2", "Bank", [{ key: "elevator", value: "no", on: "2026-03-15", source: "Visit" }], "40 Queen St E"),
    testNote("c", "Cart", [], null),
  ];
}

function fileOf(list: Note[]): StreetFile {
  const r = readStreetFile(exportNotes(list, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const place = (f: StreetFile, name: string) => {
  const p = f.places.find((x) => x.name === name);
  if (!p) throw new Error(name);
  return p;
};

const observations = (f: StreetFile, name: string, key: "elevator" | "accessible-washroom") => {
  const r = place(f, name).resolutions[key];
  return r.kind === "unknown" ? [] : r.observations;
};

describe("the typed day", () => {
  it("takes a real day up to today", () => {
    expect(dayProblem("2026-03-31", TODAY)).toBeUndefined();
    expect(dayProblem(" 2026-11-21 ", TODAY)).toBeUndefined();
  });

  it("names what is wrong with it", () => {
    expect(dayProblem("  ", TODAY)).toBe("empty");
    expect(dayProblem("31/03/2026", TODAY)).toBe("not-date");
    expect(dayProblem("2026-02-30", TODAY)).toBe("not-date");
    expect(dayProblem("2026-11-22", TODAY)).toBe("after-today");
  });
});

describe("one detail on one day", () => {
  it("is Unknown before its first record, then what the records say", () => {
    const f = fileOf(notes());
    expect(stateOn(observations(f, "Library", "elevator"), "2026-01-09")).toBe("unknown");
    expect(stateOn(observations(f, "Library", "elevator"), "2026-01-10")).toBe("yes");
    expect(stateOn(observations(f, "Library", "accessible-washroom"), "2026-12-31")).toBe("no");
  });

  it("differs only from the day the second, different record is dated", () => {
    const f = fileOf(notes());
    expect(stateOn(observations(f, "Bank", "elevator"), "2026-03-14")).toBe("yes");
    expect(stateOn(observations(f, "Bank", "elevator"), "2026-03-15")).toBe("differ");
  });
});

describe("the file on a day", () => {
  it("counts places in each state for each detail, and the records left out", () => {
    const d = placesOnDay(fileOf(notes()).places, "2026-02-01");
    expect(d).toMatchObject({ day: "2026-02-01", places: 3, details: 12, recorded: 2, differing: 0, later: 2 });
    expect(d.byDetail.find((x) => x.key === "elevator")?.counts).toEqual({ yes: 2, no: 0, differ: 0, unknown: 1 });
    expect(d.byDetail.find((x) => x.key === "accessible-washroom")?.counts).toEqual({ yes: 0, no: 0, differ: 0, unknown: 3 });
  });

  it("matches the whole file on the newest record's day", () => {
    const d = placesOnDay(fileOf(notes()).places, "2026-03-15");
    expect(d).toMatchObject({ recorded: 3, differing: 1, later: 0 });
    expect(d.byDetail.find((x) => x.key === "elevator")?.counts).toEqual({ yes: 1, no: 0, differ: 1, unknown: 1 });
  });

  it("has every place in exactly one state for each detail", () => {
    const d = placesOnDay(fileOf(notes()).places, "2026-03-01");
    for (const x of d.byDetail) expect(DAY_STATES.reduce((n, s) => n + x.counts[s], 0)).toBe(3);
  });
});

describe("the notes on a day", () => {
  it("keeps every note and sets answers recorded later back to Unknown", () => {
    const r = notesOnDay(fileOf(notes()).places, "2026-02-01");
    expect(r.cleared).toBe(2);
    expect(r.notes.map((n) => n.id).sort()).toEqual(["a", "b1", "b2", "c"]);
    const a = r.notes.find((n) => n.id === "a");
    expect(a?.facts.find((f) => f.key === "elevator")?.value).toBe("yes");
    expect(a?.facts.find((f) => f.key === "accessible-washroom")).toEqual({ key: "accessible-washroom", value: "unknown", provenance: undefined });
    expect(a?.placeName).toBe("Library");
    expect(a?.licence).toBe("CC0-1.0");
  });

  it("changes nothing on or after the newest record's day", () => {
    const places = fileOf(notes()).places;
    expect(notesOnDay(places, "2026-03-15").cleared).toBe(0);
  });

  it("gives a notes file the App reads back, saying on that day what the day view says", () => {
    const back = importNotes(fileOnDay(fileOf(notes()).places, "2026-02-01", TODAY));
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    const again = placesOnDay(fileOf([...back.notes]).places, "2026-11-21");
    expect(again).toMatchObject({ recorded: 2, differing: 0, later: 0 });
  });
});

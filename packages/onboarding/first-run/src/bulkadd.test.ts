import { describe, expect, it } from "vitest";
import {
  ADDED_CSV_COLUMNS,
  EMPTY_ADD,
  addProblems,
  addedCsv,
  addedFile,
  applyAdds,
  hasNoRecord,
  holdsRecord,
  matchingPlaces,
  newIds,
  planAdds,
  sourceOf,
  type AddOptions,
} from "./bulkadd";
import { exportNotes, importNotes } from "./exchange";
import { CONTRIBUTOR_SOURCE, FACT_KEYS } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function read(text: string): StreetFile {
  const r = readStreetFile(text, TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const FILE = exportNotes(
  [
    testNote("a", "Bay Station", [], "1 Bay St"),
    testNote("b", "King Station", [{ key: "elevator", value: "yes" }], "2 King St W"),
    testNote("c", "Queen Station", [{ key: "elevator", value: "no" }], "3 Queen St E"),
    testNote("d1", "Union Station", [{ key: "elevator", value: "yes" }], "65 Front St W"),
    testNote("d2", "Union Station", [{ key: "elevator", value: "no", on: "2026-09-01" }], "65 Front St W"),
    testNote("e", "Café", [], null),
  ],
  "2026-11-01",
);

const RECORD: AddOptions = { key: "elevator", value: "yes", who: "source", source: "City transit list", licence: "OGL-Canada-2.0", recordedOn: "2026-11-01" };
const opts = (over: Partial<AddOptions>): AddOptions => ({ ...RECORD, ...over });

describe("addProblems", () => {
  it("lists every problem with an empty record, in order", () => {
    expect(addProblems(EMPTY_ADD, TODAY)).toEqual(["no-key", "no-value", "no-who", "no-licence", "date-empty"]);
  });

  it("checks a named source, the licence and the date", () => {
    expect(addProblems(opts({ source: "  " }), TODAY)).toEqual(["source-empty"]);
    expect(addProblems(opts({ source: "x".repeat(121) }), TODAY)).toEqual(["source-long"]);
    expect(addProblems(opts({ source: "City\tlist" }), TODAY)).toEqual(["source-control"]);
    expect(addProblems(opts({ source: CONTRIBUTOR_SOURCE }), TODAY)).toEqual(["source-contributor"]);
    expect(addProblems(opts({ licence: "All rights reserved" }), TODAY)).toEqual(["no-licence"]);
    expect(addProblems(opts({ recordedOn: "2026-02-30" }), TODAY)).toEqual(["date-bad"]);
    expect(addProblems(opts({ recordedOn: "2026-11-22" }), TODAY)).toEqual(["date-future"]);
    expect(addProblems(opts({ recordedOn: " 2026-11-21 " }), TODAY)).toEqual([]);
  });

  it("needs no source name when the person checked it themselves", () => {
    expect(addProblems(opts({ who: "me", source: "" }), TODAY)).toEqual([]);
    expect(sourceOf(opts({ who: "me", source: "ignored" }))).toBe(CONTRIBUTOR_SOURCE);
    expect(sourceOf(opts({ source: "  City transit list " }))).toBe("City transit list");
  });
});

describe("choosing places", () => {
  const file = read(FILE);

  it("finds places by text in their name or address, ignoring case and accents", () => {
    expect(matchingPlaces(file, "station").map((p) => p.name)).toEqual(["Bay Station", "King Station", "Queen Station", "Union Station"]);
    expect(matchingPlaces(file, "FRONT").map((p) => p.name)).toEqual(["Union Station"]);
    expect(matchingPlaces(file, "cafe").map((p) => p.name)).toEqual(["Café"]);
    expect(matchingPlaces(file, "  ")).toHaveLength(5);
  });

  it("counts a place whose reports differ as having a record", () => {
    const union = file.places.find((p) => p.name === "Union Station")!;
    expect(union.resolutions.elevator.kind).toBe("differ");
    expect(hasNoRecord(union, "elevator")).toBe(false);
    expect(hasNoRecord(union, "automatic-door")).toBe(true);
  });

  it("knows which places have no record for a detail", () => {
    expect(file.places.filter((p) => hasNoRecord(p, "elevator")).map((p) => p.name)).toEqual(["Bay Station", "Café"]);
  });
});

describe("planAdds", () => {
  const file = read(FILE);

  it("says what the record would do at each place", () => {
    expect(planAdds(file.places, RECORD, TODAY).map((a) => [a.place.name, a.before.kind, a.outcome, a.after.kind])).toEqual([
      ["Bay Station", "unknown", "new", "agree"],
      ["Café", "unknown", "new", "agree"],
      ["King Station", "agree", "same", "agree"],
      ["Queen Station", "agree", "differs", "differ"],
      ["Union Station", "differ", "already-differ", "differ"],
    ]);
  });

  it("plans nothing for a record with a problem", () => {
    expect(planAdds(file.places, opts({ licence: "" }), TODAY)).toEqual([]);
  });
});

describe("a record a place already holds", () => {
  const SAME = exportNotes(
    [
      testNote("x", "Bay Station", [{ key: "elevator", value: "yes", source: "City transit list", licence: "OGL-Canada-2.0", on: "2026-11-01" }], "1 Bay St"),
      testNote("y", "King Station", [], "2 King St W"),
    ],
    "2026-11-01",
  );
  const file = read(SAME);
  const provenance = { source: "City transit list", licence: "OGL-Canada-2.0", recordedOn: "2026-11-01" };

  it("is found only when answer, source, licence and date are all the same", () => {
    const bay = file.places[0]!;
    expect(holdsRecord(bay, "elevator", "yes", provenance)).toBe(true);
    expect(holdsRecord(bay, "elevator", "no", provenance)).toBe(false);
    expect(holdsRecord(bay, "elevator", "yes", { ...provenance, recordedOn: "2026-10-31" })).toBe(false);
    expect(holdsRecord(bay, "elevator", "yes", { ...provenance, licence: "CC0-1.0" })).toBe(false);
    expect(holdsRecord(bay, "automatic-door", "yes", provenance)).toBe(false);
  });

  it("is planned as a repeat, and never added again", () => {
    expect(planAdds(file.places, RECORD, TODAY).map((a) => [a.place.name, a.outcome])).toEqual([
      ["Bay Station", "repeat"],
      ["King Station", "new"],
    ]);
    const c = applyAdds(file, file.places, RECORD, TODAY);
    expect(c.added.map((a) => [a.note.id, a.place.name])).toEqual([["add-20261121-1", "King Station"]]);
    expect(applyAdds(file, [file.places[0]!], RECORD, TODAY).added).toEqual([]);
  });

  it("stops a second run with the same record from adding anything", () => {
    const first = addedFile(applyAdds(file, file.places, RECORD, TODAY), TODAY);
    const again = read(first);
    expect(planAdds(again.places, RECORD, TODAY).every((a) => a.outcome === "repeat")).toBe(true);
    expect(applyAdds(again, again.places, RECORD, TODAY).added).toEqual([]);
  });
});

describe("newIds", () => {
  it("makes ids for the day, skipping ids already used", () => {
    expect(newIds(new Set(), 2, TODAY)).toEqual(["add-20261121-1", "add-20261121-2"]);
    expect(newIds(new Set(["add-20261121-1", "add-20261121-3"]), 3, TODAY)).toEqual(["add-20261121-2", "add-20261121-4", "add-20261121-5"]);
    expect(newIds(new Set(), 0, TODAY)).toEqual([]);
  });
});

describe("applyAdds", () => {
  const file = read(FILE);
  const pick = (...names: string[]) => file.places.filter((p) => names.includes(p.name));

  it("adds a new note for each place with only the record, keeping every note there was", () => {
    const c = applyAdds(file, pick("Bay Station", "Café"), RECORD, TODAY);
    expect(c.added.map((a) => [a.note.id, a.note.placeName, a.note.address, a.place.name])).toEqual([
      ["add-20261121-1", "Bay Station", "1 Bay St", "Bay Station"],
      ["add-20261121-2", "Café", undefined, "Café"],
    ]);
    const n = c.added[0]!.note;
    expect(n.createdOn).toBe("2026-11-21");
    expect(n.licence).toBe("OGL-Canada-2.0");
    expect(n.note).toBeUndefined();
    expect(n.facts).toEqual(
      FACT_KEYS.map((k) =>
        k === "elevator"
          ? { key: k, value: "yes", provenance: { source: "City transit list", licence: "OGL-Canada-2.0", recordedOn: "2026-11-01" } }
          : { key: k, value: "unknown", provenance: undefined },
      ),
    );
    expect(c.notes).toHaveLength(8);
    expect(c.notes.slice(0, 6)).toEqual(file.places.flatMap((p) => p.notes));
  });

  it("saves the person's own check under the App's contributor label", () => {
    const c = applyAdds(file, pick("Bay Station"), opts({ who: "me", source: "" }), TODAY);
    expect(c.added[0]?.note.facts.find((f) => f.key === "elevator")?.provenance?.source).toBe(CONTRIBUTOR_SOURCE);
  });

  it("adds nothing for a record with a problem, or no places", () => {
    expect(applyAdds(file, pick("Bay Station"), opts({ recordedOn: "" }), TODAY).added).toEqual([]);
    expect(applyAdds(file, [], RECORD, TODAY).added).toEqual([]);
  });

  it("keeps earlier records and lets the App show where reports now differ", () => {
    const text = addedFile(applyAdds(file, pick("Queen Station", "Bay Station"), RECORD, TODAY), TODAY);
    const again = read(text);
    expect(again.places.find((p) => p.name === "Queen Station")?.resolutions.elevator.kind).toBe("differ");
    expect(again.places.find((p) => p.name === "Queen Station")?.notes).toHaveLength(2);
    expect(again.places.find((p) => p.name === "Bay Station")?.resolutions.elevator).toMatchObject({ kind: "agree", value: "yes" });
    expect(again.places).toHaveLength(5);
  });
});

describe("addedFile", () => {
  it("is a notes export the App reads back, dated today", () => {
    const file = read(FILE);
    const text = addedFile(applyAdds(file, file.places, RECORD, TODAY), TODAY);
    expect(JSON.parse(text)).toMatchObject({ exportedOn: "2026-11-21" });
    const back = importNotes(text);
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    expect(back.notes).toHaveLength(11);
  });
});

describe("addedCsv", () => {
  it("lists each record added with the place's reading before and after", () => {
    const file = read(FILE);
    const places = file.places.filter((p) => ["Queen Station", "Café"].includes(p.name));
    const plan = planAdds(places, RECORD, TODAY);
    const csv = addedCsv(applyAdds(file, places, RECORD, TODAY), plan);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([
      ADDED_CSV_COLUMNS.join(","),
      "Café,,add-20261121-1,elevator,yes,City transit list,OGL-Canada-2.0,2026-11-01,unknown,yes",
      "Queen Station,3 Queen St E,add-20261121-2,elevator,yes,City transit list,OGL-Canada-2.0,2026-11-01,no,differ",
    ]);
  });

  it("guards a cell a spreadsheet would run as a formula", () => {
    const file = read(exportNotes([testNote("x", "=X", [], null)], "2026-11-01"));
    const o = opts({ source: "+List" });
    const csv = addedCsv(applyAdds(file, file.places, o, TODAY), planAdds(file.places, o, TODAY));
    expect(csv).toContain("'=X");
    expect(csv).toContain("'+List");
  });
});

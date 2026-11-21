import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import {
  PARTS_CSV_COLUMNS,
  checkParts,
  inPart,
  openPlaces,
  partNotesFile,
  partsCsv,
  partsReport,
  postalAreasIn,
  recordedPercent,
  streetsIn,
  summarize,
  writtenStreet,
} from "./partsummary";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

/**
 * King: Library (elevator yes 2026-01-05), Bank (elevator no, door yes 2025-02-01).
 * Queen: Café (elevator yes and no: reports differ), Shop (nothing).
 * Elm: Kiosk (nothing), with postal code M5H on the King places and K7L on Queen's Café.
 */
function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("l", "Library", [{ key: "elevator", value: "yes", on: "2026-01-05" }], "100 King St W, Toronto ON M5H 2N2"),
        testNote("b", "Bank", [{ key: "elevator", value: "no", on: "2025-02-01" }, { key: "automatic-door", value: "yes", on: "2025-02-01" }], "40 King St W, Toronto ON M5H 1A1"),
        testNote("c1", "Café", [{ key: "elevator", value: "yes", on: "2026-03-01" }], "12 Queen St E, K7L 3N6"),
        testNote("c2", "Café", [{ key: "elevator", value: "no", on: "2026-04-01" }], "12 Queen St E, K7L 3N6"),
        testNote("s", "Shop", [], "9 Queen St E"),
        testNote("k", "Kiosk", [], "1 Elm Ave"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

describe("checkParts", () => {
  it("keeps texts that some address holds, in the order typed, skipping empty boxes", () => {
    expect(checkParts(file(), [" king st ", "", "QUEEN", ""])).toEqual({ texts: ["king st", "QUEEN"], problems: {}, empty: false });
  });

  it("names a problem for each box: too long, the same as an earlier part, or held by no address", () => {
    const c = checkParts(file(), ["King", "king.", "x".repeat(61), "Maple"]);
    expect(c.problems).toEqual({ 1: "repeat", 2: "long", 3: "none-match" });
    expect(c.texts).toEqual(["King"]);
  });

  it("says when every box is empty, and reads only the first four", () => {
    expect(checkParts(file(), ["", " ", "", ""]).empty).toBe(true);
    expect(checkParts(file(), ["", "", "", "", "King"]).texts).toEqual([]);
  });

  it("refuses text that is only punctuation", () => {
    expect(checkParts(file(), ["King", "..."]).problems).toEqual({ 1: "repeat" });
  });
});

describe("inPart", () => {
  it("matches address text ignoring case, accents and punctuation, and never matches a place with no address", () => {
    const [lib] = file().places.filter((p) => p.name === "Library");
    if (!lib) throw new Error("no library");
    expect(inPart(lib, "king st. w")).toBe(true);
    expect(inPart(lib, "m5h")).toBe(true);
    expect(inPart(lib, "Queen")).toBe(false);
    expect(inPart({ ...lib, address: undefined }, "King")).toBe(false);
    expect(inPart(lib, "  ")).toBe(false);
  });
});

describe("matching on the address only", () => {
  it("never puts a place in a part because of its name", () => {
    const r = readStreetFile(exportNotes([testNote("q", "King's Café", [], "5 Queen St E")], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    const [cafe] = r.file.places;
    if (!cafe) throw new Error("no place");
    expect(inPart(cafe, "King")).toBe(false);
    expect(checkParts(r.file, ["King"]).problems).toEqual({ 0: "none-match" });
  });
});

describe("partsReport", () => {
  it("counts Yes, No, Unknown and differing reports per detail for each part and the rest", () => {
    const r = partsReport(file(), ["King", "Queen"], TODAY);
    expect(r.parts.map((p) => [p.text, p.places.length])).toEqual([
      ["King", 2],
      ["Queen", 2],
    ]);
    expect(r.parts[0]?.perDetail.elevator).toEqual({ yes: 1, no: 1, unknown: 0, differ: 0 });
    expect(r.parts[0]?.perDetail["automatic-door"]).toEqual({ yes: 1, no: 0, unknown: 1, differ: 0 });
    expect(r.parts[1]?.perDetail.elevator).toEqual({ yes: 0, no: 0, unknown: 1, differ: 1 });
    expect(r.rest.places.map((p) => p.name)).toEqual(["Kiosk"]);
    expect(r.rest.perDetail["step-free-entry"]).toEqual({ yes: 0, no: 0, unknown: 1, differ: 0 });
    expect(r.inSeveral).toBe(0);
  });

  it("counts a place in two parts in each, and says how many such places there are", () => {
    const r = partsReport(file(), ["King", "M5H"], TODAY);
    expect(r.parts.map((p) => p.places.length)).toEqual([2, 2]);
    expect(r.inSeveral).toBe(2);
    // Five places in all: Café's two notes are one place.
    expect(r.rest.places).toHaveLength(3);
  });

  it("finds each part's newest and oldest report, and counts what is recorded", () => {
    const king = partsReport(file(), ["King"], TODAY).parts[0];
    if (!king) throw new Error("no part");
    expect([king.oldest, king.newest]).toEqual(["2025-02-01", "2026-01-05"]);
    expect(king.recorded).toBe(3);
    expect(recordedPercent(king)).toBe(37);
  });

  it("counts recorded details a year old or more, and not reports that differ", () => {
    const r = partsReport(file(), ["King", "Queen"], TODAY);
    // Bank's elevator and door records are both from 2025-02-01; Café's elevator reports differ, so they are not counted.
    expect(r.parts.map((p) => p.yearOld)).toEqual([2, 0]);
    expect(partsReport(file(), ["King"], new Date(Date.UTC(2025, 5, 1))).parts[0]?.yearOld).toBe(0);
  });

  it("counts who recorded each part, most records first", () => {
    const r = readStreetFile(
      exportNotes(
        [
          testNote("a", "A", [{ key: "elevator", value: "yes", source: "Walk" }, { key: "automatic-door", value: "no", source: "City" }], "1 Oak St"),
          testNote("b", "B", [{ key: "elevator", value: "no", source: "City" }], "2 Oak St"),
        ],
        "2026-11-01",
      ),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    expect(partsReport(r.file, ["Oak"], TODAY).parts[0]?.sources).toEqual([
      { source: "City", records: 2 },
      { source: "Walk", records: 1 },
    ]);
  });

  it("has nothing recorded and no dates for places with no record", () => {
    const s = summarize(undefined, file().places.filter((p) => p.name === "Kiosk"), TODAY);
    expect([s.recorded, s.newest, s.oldest, recordedPercent(s)]).toEqual([0, undefined, undefined, 0]);
    expect(recordedPercent(summarize(undefined, [], TODAY))).toBe(0);
  });

  it("adds up: every detail of every place is counted once in each part it is in", () => {
    const r = partsReport(file(), ["Queen"], TODAY);
    for (const s of [...r.parts, r.rest])
      for (const k of FACT_KEYS) {
        const c = s.perDetail[k];
        expect(c.yes + c.no + c.unknown + c.differ).toBe(s.places.length);
      }
  });
});

describe("postalAreasIn", () => {
  it("lists the postal areas written in addresses, most places first", () => {
    expect(postalAreasIn(file(), "en")).toEqual([
      { area: "M5H", places: 2 },
      { area: "K7L", places: 1 },
    ]);
  });
});

describe("streets in the file", () => {
  it("reads the street as an address writes it, without the house number or unit", () => {
    expect(writtenStreet("100 King St W, Toronto ON M5H 2N2")).toBe("King St W");
    expect(writtenStreet("12-345 Queen St E")).toBe("Queen St E");
    expect(writtenStreet("7B rue Principale, Gatineau")).toBe("rue Principale");
    expect(writtenStreet("Toronto")).toBeUndefined();
    expect(writtenStreet(undefined)).toBeUndefined();
  });

  it("lists each street as most of its places write it, with how many addresses hold that text", () => {
    expect(streetsIn(file(), "en")).toEqual([
      { street: "King St W", places: 2 },
      { street: "Queen St E", places: 2 },
      { street: "Elm Ave", places: 1 },
    ]);
  });

  it("groups spellings of one street, and counts only the places whose address holds the text typed", () => {
    const r = readStreetFile(
      exportNotes([testNote("a", "A", [], "1 King St W"), testNote("b", "B", [], "2 King St W"), testNote("c", "C", [], "3 King Street West")], "2026-11-01"),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    // "King Street West" is the same street, but its address does not hold "King St W", so the part has 2 places.
    expect(streetsIn(r.file, "en")).toEqual([{ street: "King St W", places: 2 }]);
    expect(partsReport(r.file, ["King St W"], TODAY).parts[0]?.places).toHaveLength(2);
  });
});

describe("openPlaces", () => {
  it("keeps the places of a part with a detail with no record or reports that differ", () => {
    const r = readStreetFile(
      exportNotes(
        [
          testNote("d", "Done", FACT_KEYS.map((key) => ({ key, value: "yes" as const })), "1 Oak St"),
          testNote("o", "Open", [], "2 Oak St"),
        ],
        "2026-11-01",
      ),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    const oak = partsReport(r.file, ["Oak"], TODAY).parts[0];
    if (!oak) throw new Error("no part");
    expect(openPlaces(oak).map((p) => p.name)).toEqual(["Open"]);
  });
});

describe("downloads", () => {
  it("gives a part's notes, every note of each place", () => {
    const queen = partsReport(file(), ["Queen"], TODAY).parts[0];
    if (!queen) throw new Error("no part");
    expect(importNotes(partNotesFile(queen, TODAY)).notes.map((n) => n.placeName).sort()).toEqual(["Café", "Café", "Shop"]);
  });

  it("gives one CSV row per part and detail, the rest of the file last, guarded", () => {
    const lines = partsCsv(partsReport(file(), ["=King"], TODAY), TODAY).replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines[0]).toBe(PARTS_CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(1 + 2 * FACT_KEYS.length);
    // Bank's elevator record (2025-02-01) is a year old or more.
    expect(lines[4]).toBe("'=King,2,elevator,1,1,0,0,1");
    expect(lines[8]).toBe(",3,elevator,0,0,2,1,0");
  });
});

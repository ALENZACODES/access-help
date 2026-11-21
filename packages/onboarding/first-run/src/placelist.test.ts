import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import { readSheet, type Sheet } from "./filesheet";
import { readStreetFile, type StreetFile } from "./filestreets";
import {
  LIST_CHECK_COLUMNS,
  applyDecisions,
  checkList,
  columnsProblems,
  countBy,
  foundFile,
  guessColumns,
  listCheckCsv,
  notInListFile,
  readEntries,
  recordedDetails,
  starterFile,
  starterNotes,
  type ListColumns,
} from "./placelist";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const COLS: ListColumns = { name: 0, address: 1 };

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("l1", "Library", [{ key: "elevator", value: "yes" }], "100 King St W"),
        testNote("c1", "Café Rouge", [], "12 King St W"),
        testNote("x1", "Old Shop", [], "40 King Street West"),
        testNote("k1", "Kiosk", [], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

function sheet(text: string): Sheet {
  const r = readSheet(text);
  if (!r.ok) throw new Error(r.error);
  return r.sheet;
}

const LIST = ["Name,Address", "library,100 King St. W", "Café Rouge,12 King St W", "New Bakery,40 King St W", "Pharmacy,7 Elm Ave", ",9 Elm Ave", "LIBRARY,100 King St W"].join("\n");

describe("guessColumns", () => {
  it("finds the name and address columns by their names, in English or French", () => {
    expect(guessColumns(["Name", "Address"])).toEqual({ name: 0, address: 1 });
    expect(guessColumns(["Ville", "Adresse", "Nom"])).toEqual({ name: 2, address: 1 });
    expect(guessColumns(["place_name", "phone", "address"])).toEqual({ name: 0, address: 2 });
  });

  it("reads the App's own French column names", () => {
    expect(guessColumns(["Nom du lieu", "Téléphone", "Adresse"])).toEqual({ name: 0, address: 2 });
  });

  it("falls back to the first column for the name and no address column", () => {
    expect(guessColumns(["A", "B"])).toEqual({ name: 0, address: -1 });
  });
});

describe("columnsProblems", () => {
  const s = sheet(LIST);

  it("accepts a name column, an address column or none, and an open licence", () => {
    expect(columnsProblems(s, COLS, "CC0-1.0")).toEqual([]);
    expect(columnsProblems(s, { name: 1, address: -1 }, "CC-BY-4.0")).toEqual([]);
  });

  it("refuses a missing name column, the same column twice and a closed licence", () => {
    expect(columnsProblems(s, { name: 5, address: -1 }, "CC0-1.0")).toEqual(["name"]);
    expect(columnsProblems(s, { name: 1, address: 1 }, "All rights reserved")).toEqual(["same", "licence"]);
  });
});

describe("readEntries", () => {
  it("keeps rows with a name, counting empty names and repeated places", () => {
    const r = readEntries(sheet(LIST), COLS);
    expect(r.entries.map((e) => [e.row, e.name, e.address])).toEqual([
      [2, "library", "100 King St. W"],
      [3, "Café Rouge", "12 King St W"],
      [4, "New Bakery", "40 King St W"],
      [5, "Pharmacy", "7 Elm Ave"],
    ]);
    expect(r.blank).toBe(1);
    expect(r.repeats).toEqual([7]);
    expect(r.unusable).toEqual([]);
  });

  it("sets aside names and addresses the App cannot keep, and reads without an address column", () => {
    const r = readEntries(sheet(`Name,Address\n${"x".repeat(121)},1 A St\nOk,"line\u0007"\nKiosk,`), COLS);
    expect(r.unusable).toEqual([2, 3]);
    expect(r.entries.map((e) => [e.name, e.address])).toEqual([["Kiosk", undefined]]);
    expect(readEntries(sheet(LIST), { name: 0, address: -1 }).entries[0]?.address).toBeUndefined();
  });
});

describe("checkList", () => {
  const check = checkList(readEntries(sheet(LIST), COLS), file());

  it("finds places by name and address the way the App groups notes", () => {
    expect(check.matches.map((m) => [m.entry.name, m.status, m.places.map((p) => p.name)])).toEqual([
      ["library", "found", ["Library"]],
      ["Café Rouge", "found", ["Café Rouge"]],
      ["New Bakery", "same-address", ["Old Shop"]],
      ["Pharmacy", "missing", []],
    ]);
    expect(countBy(check)).toEqual({ found: 2, "same-address": 1, missing: 1 });
  });

  it("finds a place whose name differs only by accents, case or punctuation", () => {
    const c = checkList(readEntries(sheet("Name,Address\nCAFE ROUGE!,12 King St. W."), COLS), file());
    expect(c.matches[0]).toMatchObject({ status: "found" });
    expect(c.matches[0]?.places[0]?.name).toBe("Café Rouge");
  });

  it("lists places in the file that nothing on the list matches", () => {
    expect(check.notInList.map((p) => p.name)).toEqual(["Kiosk"]);
  });

  it("matches an address with no street by its whole text, and never matches a place with no address by address", () => {
    const r = readStreetFile(exportNotes([testNote("a", "Stall", [], "Market Square"), testNote("b", "Cart", [], null)], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    const c = checkList(readEntries(sheet("Name,Address\nFruit stand,market square\nCart two,"), COLS), r.file);
    expect(c.matches.map((m) => m.status)).toEqual(["same-address", "missing"]);
    expect(c.notInList.map((p) => p.name)).toEqual(["Cart"]);
  });

  it("counts how many details are recorded at a found place", () => {
    const lib = check.matches[0]?.places[0];
    if (!lib) throw new Error("no place");
    expect(recordedDetails(lib)).toBe(1);
  });
});

describe("downloads", () => {
  const f = file();
  const check = checkList(readEntries(sheet(LIST), COLS), f);

  it("makes starter notes for the missing places, every detail Unknown, and the App reads them back", () => {
    const notes = starterNotes(check, f, "CC-BY-4.0", TODAY);
    expect(notes.map((n) => [n.placeName, n.address, n.licence, n.createdOn])).toEqual([["Pharmacy", "7 Elm Ave", "CC-BY-4.0", "2026-11-21"]]);
    expect(notes[0]?.facts.every((x) => x.value === "unknown" && x.provenance === undefined)).toBe(true);
    expect(notes[0]?.id).toMatch(/^list-[0-9a-f]{8}$/);
    const back = importNotes(starterFile(notes, TODAY));
    expect(back.error).toBeUndefined();
    expect(back.notes).toEqual(notes);
  });

  it("never reuses an id in the file", () => {
    const first = starterNotes(check, f, "CC0-1.0", TODAY)[0];
    if (!first) throw new Error("no note");
    const r = readStreetFile(exportNotes([...f.places.flatMap((p) => [...p.notes]), { ...first, placeName: "Other", address: "99 Far Rd" }], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    expect(starterNotes(checkList(readEntries(sheet(LIST), COLS), r.file), r.file, "CC0-1.0", TODAY)[0]?.id).toBe(`${first.id}-2`);
  });

  it("gives the notes of the places in the file that are not on the list", () => {
    expect(importNotes(notInListFile(check, TODAY)).notes.map((n) => n.placeName)).toEqual(["Kiosk"]);
  });

  it("gives the notes of the places on the list, in the list's order", () => {
    expect(importNotes(foundFile(check, TODAY)).notes.map((n) => n.placeName)).toEqual(["Library", "Café Rouge"]);
  });

  it("gives every entry as a guarded CSV, one row per place at the same address", () => {
    const lines = listCheckCsv(check).replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines).toEqual([
      LIST_CHECK_COLUMNS.join(","),
      "2,library,100 King St. W,found,,Library,100 King St W,1",
      "3,Café Rouge,12 King St W,found,,Café Rouge,12 King St W,0",
      "4,New Bakery,40 King St W,same-address,,Old Shop,40 King Street West,0",
      "5,Pharmacy,7 Elm Ave,missing,,,,",
    ]);
    const evil = checkList(readEntries(sheet("Name\n=HYPERLINK(1)"), { name: 0, address: -1 }), f);
    expect(listCheckCsv(evil)).toContain("'=HYPERLINK(1)");
  });
});

describe("applyDecisions", () => {
  const f = file();
  const raw = checkList(readEntries(sheet(LIST), COLS), f);

  it("counts the entry as found when the person says it is the same place", () => {
    const c = applyDecisions(raw, f, { 4: "same" });
    expect(c.matches[2]).toMatchObject({ status: "found", decided: "same" });
    expect(c.matches[2]?.places.map((p) => p.name)).toEqual(["Old Shop"]);
    expect(countBy(c)).toEqual({ found: 3, "same-address": 0, missing: 1 });
    expect(importNotes(foundFile(c, TODAY)).notes.map((n) => n.placeName)).toEqual(["Library", "Café Rouge", "Old Shop"]);
  });

  it("gives a starter note and frees the file's place when the person says they are different", () => {
    const c = applyDecisions(raw, f, { 4: "different" });
    expect(c.matches[2]).toMatchObject({ status: "missing", decided: "different", places: [] });
    expect(starterNotes(c, f, "CC0-1.0", TODAY).map((n) => n.placeName)).toEqual(["New Bakery", "Pharmacy"]);
    expect(c.notInList.map((p) => p.name)).toEqual(["Kiosk", "Old Shop"]);
  });

  it("leaves the pair as it is when the person is not sure or has not answered, and ignores answers for other rows", () => {
    for (const d of [{ 4: "unsure" as const }, {}, { 2: "different" as const, 5: "same" as const }]) {
      const c = applyDecisions(raw, f, d);
      expect(c.matches.map((m) => m.status)).toEqual(["found", "found", "same-address", "missing"]);
      expect(c.matches.every((m) => m.decided === undefined)).toBe(true);
    }
  });

  it("says in the CSV which statuses come from the person's answer", () => {
    const lines = listCheckCsv(applyDecisions(raw, f, { 4: "same" })).split("\r\n");
    expect(lines[3]).toBe("4,New Bakery,40 King St W,found,same,Old Shop,40 King Street West,0");
  });
});

import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import {
  DEFAULT_LIST_OPTIONS,
  LIST_CSV_COLUMNS,
  batchPlaces,
  batchesComplete,
  differingDetails,
  groupFile,
  hasOpenDetail,
  listsCsv,
  placesExport,
  readStreetFile,
  shareGroups,
  unknownDetails,
  type Grouped,
  type StreetFile,
} from "./filestreets";
import {
  FILE_STREETS_COPY,
  allSheets,
  batchHeading,
  batchName,
  fileStreetsStrings,
  groupHeading,
  groupLinkText,
  leftOutDoneText,
  placeLines,
  sortedText,
  streetsFilename,
  visitSheet,
} from "./filestreets-copy";
import { groupPlaces } from "./places";
import { testNote } from "./testnotes";
import { peopleFrom, sharedText } from "./views-filestreets";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 20));

const notes = [
  testNote("k1", "Library", [{ key: "elevator", value: "yes" }], "100 King St W"),
  testNote("k2", "Café", [], "12 King Street West"),
  testNote("k3", "Bank", [{ key: "elevator", value: "no", on: "2026-11-02" }], "Unit 2, 12 King St W"),
  testNote("k4", "Bank", [{ key: "elevator", value: "yes" }], "Unit 2, 12 King St W"),
  testNote("e1", "Bakery", [], "5 Elm Ave"),
  testNote("r1", "Pharmacie", [], "1 rue Principale"),
  testNote("r2", "Boulangerie", [], "3 rue principale"),
  testNote("n1", "Market", [], "Toronto"),
  testNote("n2", "Kiosk", [], null),
];

function file(locale: "en" | "fr" = "en"): StreetFile {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, locale);
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

function grouped(locale: "en" | "fr" = "en"): Grouped {
  return groupFile(file(locale), DEFAULT_LIST_OPTIONS, locale);
}

const shareStreets = (f: StreetFile, n: number, locale: "en" | "fr" = "en") => shareGroups(groupFile(f, DEFAULT_LIST_OPTIONS, locale), n);

const names = (list: readonly { name: string }[]): string[] => list.map((x) => x.name);

describe("groupFile by street", () => {
  it("groups places by street in name order, each street in house-number order", () => {
    const g = grouped();
    expect(names(g.groups)).toEqual(["Elm Avenue", "King Street West", "rue Principale"]);
    const king = g.groups.find((s) => s.name === "King Street West");
    expect(king?.places.map((p) => p.name)).toEqual(["Bank", "Café", "Library"]);
  });

  it("puts places with no street in their own group, never on a street", () => {
    expect(names(grouped().ungrouped)).toEqual(["Kiosk", "Market"]);
  });

  it("keeps several notes about one place as one place", () => {
    const bank = grouped().groups.flatMap((s) => s.places).find((p) => p.name === "Bank");
    expect(bank?.notes).toHaveLength(2);
    expect(bank?.resolutions.elevator.kind).toBe("differ");
  });

  it("refuses text that is not an export and files with no readable note", () => {
    expect(readStreetFile("x", TODAY, "en")).toEqual({ ok: false, error: "not-json" });
    expect(readStreetFile(exportNotes([], "2026-11-01"), TODAY, "en")).toEqual({ ok: false, error: "no-notes" });
  });

  it("orders streets by the language's alphabet, numbers in number order", () => {
    const places = groupPlaces([testNote("a", "A", [], "1 10th Line"), testNote("b", "B", [], "1 2nd Line"), testNote("c", "C", [], "1 Éclair St")], "fr");
    expect(names(groupFile({ notes: 3, leftOut: 0, places }, DEFAULT_LIST_OPTIONS, "fr").groups)).toEqual(["2nd Line", "10th Line", "Éclair Street"]);
  });

  it("can walk one side of a street, then come back on the other", () => {
    const places = groupPlaces(["1", "2", "3", "4", "5", "8"].map((n) => testNote(`p${n}`, `Shop ${n}`, [], `${n} Elm Ave`)), "en");
    const f = { notes: 6, leftOut: 0, places };
    expect(groupFile(f, { ...DEFAULT_LIST_OPTIONS, bothSides: false }, "en").groups[0]?.places.map((p) => p.name)).toEqual(["Shop 1", "Shop 2", "Shop 3", "Shop 4", "Shop 5", "Shop 8"]);
    expect(groupFile(f, { ...DEFAULT_LIST_OPTIONS, bothSides: true }, "en").groups[0]?.places.map((p) => p.name)).toEqual(["Shop 1", "Shop 3", "Shop 5", "Shop 8", "Shop 4", "Shop 2"]);
  });
});

describe("only places with something to look at", () => {
  const done = testNote("d", "Done", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }, { key: "automatic-door", value: "no" }, { key: "accessible-washroom", value: "yes" }], "2 Elm Ave");
  const open = testNote("o", "Open", [{ key: "elevator", value: "yes" }], "4 Elm Ave");
  const f = (): StreetFile => {
    const r = readStreetFile(exportNotes([done, open], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    return r.file;
  };

  it("knows when a place has nothing to look at", () => {
    const places = f().places;
    expect(places.map((p) => [p.name, hasOpenDetail(p)])).toEqual([
      ["Done", false],
      ["Open", true],
    ]);
  });

  it("leaves those places out when asked, and counts them", () => {
    const all = groupFile(f(), DEFAULT_LIST_OPTIONS, "en");
    expect(all.leftOutDone).toBe(0);
    expect(all.groups[0]?.places.map((p) => p.name)).toEqual(["Done", "Open"]);
    const some = groupFile(f(), { ...DEFAULT_LIST_OPTIONS, onlyOpen: true }, "en");
    expect(some.leftOutDone).toBe(1);
    expect(some.groups[0]?.places.map((p) => p.name)).toEqual(["Open"]);
    expect(batchesComplete(f(), shareGroups(some, 1), true)).toBe(true);
    expect(batchesComplete(f(), shareGroups(some, 1))).toBe(false);
  });

  it("keeps a place whose reports differ, even with every detail recorded", () => {
    const differ = testNote("x", "Done", [{ key: "elevator", value: "no", on: "2026-11-02" }], "2 Elm Ave");
    const r = readStreetFile(exportNotes([done, differ], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    expect(groupFile(r.file, { ...DEFAULT_LIST_OPTIONS, onlyOpen: true }, "en").groups[0]?.places.map((p) => p.name)).toEqual(["Done"]);
  });

  it("says how many were left out, in both languages", () => {
    expect(leftOutDoneText(1, "en")).toBe("1 place with nothing to look at is left out.");
    expect(leftOutDoneText(3, "fr")).toBe("3 lieux sans rien à regarder sont laissés de côté.");
  });
});

describe("groupFile by postal area", () => {
  const postal = [
    testNote("a", "Library", [], "100 King St W, Toronto, ON M5H 2N2"),
    testNote("b", "Café", [], "12 Queen St W, Toronto ON M5H3M9"),
    testNote("c", "Pool", [], "9 Lake Rd, Kingston, ON K7L 3N6"),
    testNote("d", "Kiosk", [], "5 Rink Rd"),
  ];
  const f = (): StreetFile => {
    const r = readStreetFile(exportNotes(postal, "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    return r.file;
  };

  it("groups by the first three characters of the postal code, streets in order inside each area", () => {
    const g = groupFile(f(), { ...DEFAULT_LIST_OPTIONS, by: "postal" }, "en");
    expect(g.groups.map((x) => [x.name, x.places.map((p) => p.name)])).toEqual([
      ["K7L", ["Pool"]],
      ["M5H", ["Library", "Café"]],
    ]);
    expect(names(g.ungrouped)).toEqual(["Kiosk"]);
    expect(g.by).toBe("postal");
  });

  it("says it in the summary in both languages", () => {
    expect(sortedText(4, 2, 1, "en", "postal")).toBe("4 places in 2 postal areas; 1 place with no postal code.");
    expect(frenchTypographyIssues(sortedText(4, 2, 1, "fr", "postal"))).toEqual([]);
  });
});

describe("shareGroups", () => {
  it("with one person, gives every street and every place with no street", () => {
    const [b] = shareStreets(file(), 1);
    expect(b?.size).toBe(8);
    expect(names(b?.groups ?? [])).toEqual(["Elm Avenue", "King Street West", "rue Principale"]);
  });

  it("keeps streets whole and balances the places", () => {
    const batches = shareStreets(file(), 2);
    // King (3) goes first, then rue Principale (2) and Elm (1) to the lighter one; at 3 each, the places
    // with no street are dealt in name order, a tie going to the lower batch.
    expect(batches.map((b) => [names(b.groups), b.ungrouped.map((p) => p.name), b.size])).toEqual([
      [["King Street West"], ["Kiosk"], 4],
      [["Elm Avenue", "rue Principale"], ["Market"], 4],
    ]);
    expect(batchesComplete(file(), batches)).toBe(true);
  });

  it("leaves a batch empty only when there are fewer streets and places than people", () => {
    const batches = shareStreets(file(), 6);
    expect(batches.filter((b) => b.size === 0)).toHaveLength(1);
    expect(batchesComplete(file(), batches)).toBe(true);
  });

  it("stays within 1 to 20 people and deals every place once for any count", () => {
    expect(shareStreets(file(), 0)).toHaveLength(1);
    expect(shareStreets(file(), 99)).toHaveLength(20);
    for (let n = 1; n <= 12; n++) expect(batchesComplete(file(), shareStreets(file(), n)), String(n)).toBe(true);
  });

  it("lists a batch's places street by street, then those with no street", () => {
    const [, second] = shareStreets(file(), 2);
    expect(second && batchPlaces(second).map((p) => p.name)).toEqual(["Bakery", "Pharmacie", "Boulangerie", "Market"]);
  });
});

describe("files and sheets", () => {
  it("exports the notes of a list, which the App reads in full", () => {
    const king = grouped().groups.find((s) => s.name === "King Street West");
    const back = importNotes(placesExport(king?.places ?? [], TODAY));
    expect(back.rejected).toBe(0);
    expect(back.notes.map((n) => n.id).sort()).toEqual(["k1", "k2", "k3", "k4"]);
  });

  it("lists what to look at for each place: UNKNOWN details and reports that differ", () => {
    const bank = grouped().groups.flatMap((s) => s.places).find((p) => p.name === "Bank");
    if (!bank) throw new Error("no bank");
    expect(unknownDetails(bank)).toEqual(["step-free-entry", "accessible-washroom", "automatic-door"]);
    expect(differingDetails(bank)).toEqual(["elevator"]);
    expect(placeLines(bank, "en")).toEqual([
      "[ ] Bank",
      "    Unit 2, 12 King St W",
      "    To look at: Step-free entrance, Accessible washroom, Automatic door (Unknown); Elevator (reports differ)",
      "    Found: ________",
    ]);
  });

  it("says when a place has a record for every detail", () => {
    const full = groupPlaces([testNote("f", "Full", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }, { key: "automatic-door", value: "no" }, { key: "accessible-washroom", value: "yes" }], "1 Elm Ave")], "en")[0];
    if (!full) throw new Error("no place");
    expect(placeLines(full, "en")[2]).toBe(`    To look at: ${FILE_STREETS_COPY.nothingOpen.en}`);
  });

  it("writes a visit sheet with a heading, the street and each place to tick", () => {
    const king = grouped().groups.find((s) => s.name === "King Street West");
    if (!king) throw new Error("no street");
    const text = visitSheet(groupHeading(king, "en"), [{ name: king.name, places: king.places }], "en", TODAY);
    expect(text.startsWith("Visit sheet: King Street West (3 places)\nMade on 2026-11-20\n")).toBe(true);
    expect(text).toContain("King Street West\n----------------\n[ ] Bank\n");
    expect(text).toContain(FILE_STREETS_COPY.sheetNote.en);
  });

  it("writes every batch's sheet in one text, skipping empty batches", () => {
    const text = allSheets(shareStreets(file(), 6), "street", "en", TODAY);
    expect(text.match(/^Visit sheet: /gm)).toHaveLength(5);
    expect(text).toContain("Places with no street in the address");
  });

  it("writes French sheets with French typography and the UNKNOWN token", () => {
    const text = allSheets(shareStreets(file("fr"), 2, "fr"), "street", "fr", TODAY);
    expect(text).toContain("(UNKNOWN)");
    expect(text).not.toMatch(/inconnu/i);
    for (const line of text.split("\n")) if (!line.startsWith("[ ]") && !/^ {4}\d|^ {4}Unit|^ {4}Toronto/.test(line)) expect(frenchTypographyIssues(line), line).toEqual([]);
  });
});

describe("listsCsv", () => {
  it("writes one row per place in walking order, with the list, the group and what to look at", () => {
    const csv = listsCsv(shareStreets(file(), 2), "No street");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe(LIST_CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(9);
    expect(lines[1]).toBe("1,King Street West,12,Bank,\"Unit 2, 12 King St W\",step-free-entry accessible-washroom automatic-door,elevator");
    expect(lines[4]).toBe("1,No street,,Kiosk,,step-free-entry accessible-washroom automatic-door elevator,");
  });

  it("guards cells that start like a formula", () => {
    const places = groupPlaces([testNote("x", "=SUM(A1)", [], "1 Elm Ave")], "en");
    const csv = listsCsv(shareGroups(groupFile({ notes: 1, leftOut: 0, places }, DEFAULT_LIST_OPTIONS, "en"), 1), "No street");
    expect(csv).toContain(",'=SUM(A1),");
  });
});

describe("copy and small helpers", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileStreetsStrings())).toEqual([]);
  });

  it("builds sentences with French typography and no banned words", () => {
    const f = file();
    const all = (l: "en" | "fr"): string[] => [sortedText(8, 3, 2, l), sortedText(1, 1, 1, l), sortedText(2, 1, 0, l), sharedText(shareStreets(f, 3), l), groupLinkText(FILE_STREETS_COPY.downloadNotes, "rue King", l)];
    for (const s of all("fr")) expect(frenchTypographyIssues(s), s).toEqual([]);
    for (const l of ["en", "fr"] as const) for (const s of all(l)) expect(findBanned(s), s).toBeUndefined();
    expect(sortedText(8, 3, 2, "en")).toBe("8 places on 3 streets; 2 places with no street.");
    const [first] = shareStreets(f, 2);
    if (!first) throw new Error("no batch");
    expect(batchName(first, "fr")).toBe("Personne 1");
    expect(batchHeading(first, "en")).toBe("Person 1 (4 places)");
  });

  it("reads the number of people as a whole number from 1 to 20", () => {
    expect(peopleFrom(" 3 ")).toBe(3);
    expect(peopleFrom("20")).toBe(20);
    for (const bad of ["0", "21", "2.5", "two", "", "-1", "100"]) expect(peopleFrom(bad), bad).toBeUndefined();
  });

  it("gives ASCII file names, numbered per list", () => {
    expect(streetsFilename("notes", 0, TODAY, "en")).toBe("notes-list-01-2026-11-20.json");
    expect(streetsFilename("sheet", 11, TODAY, "fr")).toBe("fiche-liste-12-2026-11-20.txt");
    expect(streetsFilename("all", 0, TODAY, "fr")).toBe("fiches-de-visite-2026-11-20.txt");
  });

  it("names the removal on the remove button", () => {
    expect(FILE_STREETS_COPY.clear.en).toMatch(/^Remove /);
    expect(FILE_STREETS_COPY.clear.fr).toMatch(/^Retirer /);
  });
});

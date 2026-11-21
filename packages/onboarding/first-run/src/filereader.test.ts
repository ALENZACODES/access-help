import { describe, expect, it } from "vitest";
import { exportNotes } from "./exchange";
import {
  GROUPS,
  PAGE_SIZE,
  START_VIEW,
  groupFound,
  hasMustHaves,
  isGroup,
  pageOf,
  readNotesFile,
  searchPlaces,
  setMustHave,
  shownPlaces,
  toggleOpen,
  viewPages,
  withFilter,
  withPage,
  type ReaderFile,
} from "./filereader";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));

const notes = [
  testNote("a1", "Central Library", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }], "1 King St W"),
  testNote("a2", "Central Library", [{ key: "elevator", value: "no", on: "2026-11-02" }], "1 King St W"),
  testNote("b1", "Pool", [{ key: "elevator", value: "no" }], "9 Lake Rd"),
  testNote("c1", "Café Rivière", [{ key: "elevator", value: "yes" }], "12 King St E"),
  testNote("d1", "Arena", [], "5 Rink Rd"),
];

function file(): ReaderFile {
  const r = readNotesFile(exportNotes(notes, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const names = (list: readonly { name: string }[]): string[] => list.map((p) => p.name);

describe("readNotesFile", () => {
  it("combines notes about one place, in name order, without picking an answer", () => {
    const f = file();
    expect(names(f.places)).toEqual(["Arena", "Café Rivière", "Central Library", "Pool"]);
    const lib = f.places.find((p) => p.name === "Central Library");
    expect(lib?.notes).toHaveLength(2);
    expect(lib?.resolutions.elevator.kind).toBe("differ");
    expect(f.exportedOn).toBe("2026-11-01");
  });

  it("refuses text that is not an export and files with no readable note", () => {
    expect(readNotesFile("x", TODAY, "en")).toEqual({ ok: false, error: "not-json" });
    expect(readNotesFile(exportNotes([], "2026-11-01"), TODAY, "en")).toEqual({ ok: false, error: "no-notes" });
  });

  it("orders places by the language's alphabet", () => {
    const r = readNotesFile(exportNotes([testNote("x", "Zoo"), testNote("y", "Éclair", [], "2 Rue"), testNote("z", "Eau", [], "3 Rue")], "2026-11-01"), TODAY, "fr");
    expect(r.ok && names(r.file.places)).toEqual(["Eau", "Éclair", "Zoo"]);
  });
});

describe("must-haves", () => {
  it("sets and clears one must-have at a time", () => {
    let req = setMustHave({}, "elevator", "yes");
    expect(req).toEqual({ elevator: "yes" });
    req = setMustHave(req, "automatic-door", "no");
    expect(req).toEqual({ "automatic-door": "no", elevator: "yes" });
    req = setMustHave(req, "elevator", "");
    expect(req).toEqual({ "automatic-door": "no" });
    expect(hasMustHaves(req)).toBe(true);
    expect(hasMustHaves({})).toBe(false);
  });
});

describe("searchPlaces", () => {
  it("needs every word in the name or address, ignoring case and accents", () => {
    const f = file();
    expect(names(searchPlaces(f.places, "king"))).toEqual(["Café Rivière", "Central Library"]);
    expect(names(searchPlaces(f.places, "RIVIERE king"))).toEqual(["Café Rivière"]);
    expect(names(searchPlaces(f.places, "  "))).toEqual(names(f.places));
  });
});

describe("groupFound", () => {
  it("puts every place in one group when no must-have is set", () => {
    const g = groupFound(file().places, {});
    expect(g.match).toHaveLength(4);
    expect(g.unknown).toEqual([]);
    expect(g.excluded).toEqual([]);
  });

  it("sorts places into match, Unknown or differing, and the other way, never treating Unknown as No", () => {
    const g = groupFound(file().places, { elevator: "yes" });
    expect(names(g.match)).toEqual(["Café Rivière"]);
    expect(names(g.unknown)).toEqual(["Arena", "Central Library"]);
    expect(names(g.excluded)).toEqual(["Pool"]);
  });

  it("puts a place with one must-have the other way out, even if another is Unknown", () => {
    const g = groupFound(file().places, { elevator: "yes", "automatic-door": "yes" });
    expect(names(g.excluded)).toEqual(["Pool"]);
    expect(g.match).toEqual([]);
  });
});

describe("pages", () => {
  const many = Array.from({ length: PAGE_SIZE * 2 + 3 }, (_, i) => testNote(`n${i}`, `Place ${String(i).padStart(3, "0")}`, [], `${i} Main St`));
  const big = readNotesFile(exportNotes(many, "2026-11-01"), TODAY, "en");
  const places = big.ok ? big.file.places : [];

  it("shows PAGE_SIZE places a page and keeps the page in range", () => {
    expect(pageOf(places, "match", 0).places).toHaveLength(PAGE_SIZE);
    expect(pageOf(places, "match", 2).places).toHaveLength(3);
    expect(pageOf(places, "match", 9).page).toBe(2);
    expect(pageOf(places, "match", -4).page).toBe(0);
    expect(pageOf(places, "match", 0).pageCount).toBe(3);
    expect(pageOf([], "unknown", 3)).toEqual({ group: "unknown", total: 0, page: 0, pageCount: 1, places: [] });
  });

  it("goes back to the first page when the search or must-haves change, and keeps open places", () => {
    let v = withPage(START_VIEW, "match", 2);
    v = toggleOpen(v, "x");
    v = withFilter(v, "king", { elevator: "yes" });
    expect(v.pages).toEqual({ match: 0, unknown: 0, excluded: 0 });
    expect(v.open).toEqual(["x"]);
    expect(toggleOpen(v, "x").open).toEqual([]);
  });

  it("gives one page per group, in group order", () => {
    const pages = viewPages(file(), withFilter(START_VIEW, "", { elevator: "yes" }));
    expect(pages.map((p) => [p.group, p.total])).toEqual([
      ["match", 1],
      ["unknown", 2],
      ["excluded", 1],
    ]);
  });
});

describe("shownPlaces and isGroup", () => {
  it("lists every shown place in group order, across pages", () => {
    expect(names(shownPlaces(file(), withFilter(START_VIEW, "", { elevator: "yes" })))).toEqual(["Café Rivière", "Arena", "Central Library", "Pool"]);
    expect(names(shownPlaces(file(), withFilter(START_VIEW, "lake", {})))).toEqual(["Pool"]);
  });

  it("knows the groups", () => {
    for (const g of GROUPS) expect(isGroup(g)).toBe(true);
    expect(isGroup("best")).toBe(false);
    expect(isGroup(undefined)).toBe(false);
  });
});

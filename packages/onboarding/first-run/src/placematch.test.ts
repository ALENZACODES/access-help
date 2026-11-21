import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { LIMITS, type Note } from "./model";
import {
  MATCH_CSV_COLUMNS,
  MAX_GROUPS,
  TYPED,
  fileMatches,
  joinCount,
  joinedCopy,
  joinedFile,
  joinedPlaces,
  joinsTooFew,
  matchCsv,
  matchGroups,
  matchLinks,
  newestRecord,
  recordedCount,
  targetOf,
  typedProblems,
} from "./placematch";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const BOM = String.fromCharCode(0xfeff);

function fileOf(list: Note[]): StreetFile {
  const r = readStreetFile(exportNotes(list, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const byName = (f: StreetFile, name: string, address?: string) => {
  const p = f.places.find((x) => x.name === name && (address === undefined || x.address === address));
  if (!p) throw new Error(name);
  return p;
};

/**
 * "Central Library" with and without an address, and "Centrel Library" with no address: one group of three.
 * "Bank" and "Royal Bank" at the same address: a group of two.
 * Two cafés at different addresses: never a group.
 */
function notes(): Note[] {
  return [
    testNote("l1", "Central Library", [{ key: "elevator", value: "yes", on: "2026-03-01" }], "100 King St W"),
    testNote("l2", "Central Library", [{ key: "elevator", value: "no", on: "2026-04-01", source: "Visit" }], null),
    testNote("l3", "Centrel Library", [{ key: "automatic-door", value: "yes", on: "2026-05-01" }], null),
    testNote("b1", "Bank", [], "40 Queen St E"),
    testNote("b2", "Royal Bank", [{ key: "step-free-entry", value: "yes" }], "40 Queen St E"),
    testNote("c1", "Café", [], "1 Elm St"),
    testNote("c2", "Café", [], "2 Elm St"),
  ];
}

describe("pairs", () => {
  it("links places by the App's rule, never two different addresses", () => {
    const links = matchLinks(fileOf(notes()).places).map((l) => [l.a.name, l.a.address ?? "-", l.b.name, l.b.address ?? "-", l.reason]);
    expect(links).toContainEqual(["Bank", "40 Queen St E", "Royal Bank", "40 Queen St E", "same-address"]);
    expect(links).toContainEqual(["Central Library", "-", "Central Library", "100 King St W", "same-name"]);
    expect(links).toContainEqual(["Central Library", "100 King St W", "Centrel Library", "-", "similar-name"]);
    expect(links.some((l) => l[0] === "Café")).toBe(false);
  });
});

describe("groups", () => {
  it("joins chains of pairs into one group, strongest reason first, places in name order", () => {
    const r = fileMatches(fileOf(notes()));
    // Two cafés at different addresses are two places.
    expect(r.places).toBe(7);
    expect(r.over).toBe(0);
    expect(r.groups.map((g) => [g.reason, g.places.map((p) => `${p.name}|${p.address ?? ""}`)])).toEqual([
      ["same-address", ["Bank|40 Queen St E", "Royal Bank|40 Queen St E"]],
      ["same-name", ["Central Library|", "Central Library|100 King St W", "Centrel Library|"]],
    ]);
    expect(r.groups[1]?.links.map((l) => l.reason)).toEqual(["same-name", "similar-name", "similar-name"]);
  });

  it("gives a group the same id whatever the order of the file", () => {
    const a = fileMatches(fileOf(notes())).groups.map((g) => g.id);
    const b = fileMatches(fileOf([...notes()].reverse())).groups.map((g) => g.id);
    expect(b).toEqual(a);
  });

  it("has no group when no two places match", () => {
    expect(matchGroups(fileOf([testNote("x", "Kiosk", [], "1 Elm St"), testNote("y", "Arena", [], null)]).places)).toEqual({ places: 2, groups: [], over: 0 });
  });

  it(`shows at most ${MAX_GROUPS} groups and counts the rest`, () => {
    const list: Note[] = [];
    for (let i = 0; i < MAX_GROUPS + 2; i++) list.push(testNote(`a${i}`, `Place ${i}`, [], `${i + 1} Elm St`), testNote(`b${i}`, `Other ${i}`, [], `${i + 1} Elm St`));
    const r = fileMatches(fileOf(list));
    expect(r.groups).toHaveLength(MAX_GROUPS);
    expect(r.over).toBe(2);
  });

  it("finds groups in a file near the App's largest import in good time", () => {
    const list = Array.from({ length: 1000 }, (_, i) => testNote(`p${i}`, `Place number ${i}`, [], i % 2 === 0 ? `${i + 1} Elm St` : null));
    expect(exportNotes(list, "2026-11-01").length).toBeGreaterThan(LIMITS.importChars / 2);
    const start = performance.now();
    fileMatches(fileOf(list));
    expect(performance.now() - start).toBeLessThan(4000);
  });
});

describe("a place's figures", () => {
  it("counts recorded details and finds the newest record", () => {
    const f = fileOf(notes());
    const lib = byName(f, "Central Library", "100 King St W");
    expect(recordedCount(lib)).toBe(1);
    expect(newestRecord(lib)).toBe("2026-03-01");
    expect(newestRecord(byName(f, "Bank"))).toBeUndefined();
  });
});

describe("joining", () => {
  it("counts only groups set to one of their own places", () => {
    const r = fileMatches(fileOf(notes()));
    const [bank, lib] = r.groups;
    if (!bank || !lib) throw new Error("no groups");
    expect(joinCount(r, new Map())).toBe(0);
    expect(joinCount(r, new Map([[bank.id, "not-a-place"], [lib.id, undefined]]))).toBe(0);
    expect(joinCount(r, new Map([[bank.id, bank.places[1]?.id]]))).toBe(1);
  });

  it("gives the joined notes the chosen place's name and address, and changes nothing else", () => {
    const f = fileOf(notes());
    const r = fileMatches(f);
    const lib = r.groups[1];
    const into = lib ? byName(f, "Central Library", "100 King St W") : undefined;
    if (!lib || !into) throw new Error("no group");
    const copy = joinedCopy(f, r, new Map([[lib.id, into.id]]));
    expect(copy).toMatchObject({ groups: 1, changed: 2, kept: 0, placesBefore: 7, placesAfter: 5 });
    expect(copy.joined).toEqual([{ group: 2, name: "Central Library", address: "100 King St W", places: 3 }]);
    expect(copy.notes).toHaveLength(7);
    const l3 = copy.notes.find((n) => n.id === "l3");
    expect([l3?.placeName, l3?.address]).toEqual(["Central Library", "100 King St W"]);
    const before = notes().find((n) => n.id === "l3");
    expect(l3?.facts).toEqual(before?.facts);
    expect(copy.notes.find((n) => n.id === "b1")?.placeName).toBe("Bank");
  });

  it("makes the joined notes one place when the copy is read back, keeping reports that differ", () => {
    const f = fileOf(notes());
    const r = fileMatches(f);
    const choices = new Map(r.groups.map((g) => [g.id, g.places[g.places.length - 1]?.id]));
    const back = importNotes(joinedFile(joinedCopy(f, r, choices), TODAY));
    expect(back.error).toBeUndefined();
    const again = fileOf([...back.notes]);
    expect(again.places.map((p) => p.name).sort()).toEqual(["Café", "Café", "Centrel Library", "Royal Bank"]);
    const lib = byName(again, "Centrel Library");
    expect(lib.notes).toHaveLength(3);
    expect(lib.resolutions.elevator.kind).toBe("differ");
    expect(fileMatches(again).groups).toEqual([]);
  });

  it("can join under a place with no address", () => {
    const f = fileOf(notes());
    const r = fileMatches(f);
    const lib = r.groups[1];
    const into = byName(f, "Central Library", undefined);
    const noAddress = f.places.find((p) => p.name === "Central Library" && p.address === undefined);
    if (!lib || !noAddress || !into) throw new Error("no group");
    const copy = joinedCopy(f, r, new Map([[lib.id, noAddress.id]]));
    expect(copy.notes.filter((n) => n.placeName === "Central Library" && n.address === undefined).map((n) => n.id).sort()).toEqual(["l1", "l2", "l3"]);
  });
});

describe("CSV", () => {
  it("lists each place of each group, numbered as on the page", () => {
    const csv = matchCsv(fileMatches(fileOf(notes())));
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([
      MATCH_CSV_COLUMNS.join(","),
      "1,Bank,40 Queen St E,1,0,,same-address",
      "1,Royal Bank,40 Queen St E,1,1,2026-10-01,same-address",
      "2,Central Library,,1,1,2026-04-01,same-name",
      "2,Central Library,100 King St W,1,1,2026-03-01,same-name",
      "2,Centrel Library,,1,1,2026-05-01,same-name",
    ]);
  });

  it("guards a cell a spreadsheet would run as a formula", () => {
    const csv = matchCsv(fileMatches(fileOf([testNote("x", "=Kiosk", [], "1 Elm St"), testNote("y", "+Kiosk Shop", [], "1 Elm St")])));
    expect(csv.split("\r\n").slice(1, 3)).toEqual(["1,'+Kiosk Shop,1 Elm St,1,0,,same-address", "1,'=Kiosk,1 Elm St,1,0,,same-address"]);
  });
});

describe("joining under a typed name", () => {
  it("checks the typed name and address like any note's", () => {
    expect(typedProblems({ name: " Central Library ", address: "" })).toEqual([]);
    expect(typedProblems({ name: "  ", address: "x".repeat(201) })).toEqual(["name-empty", "address-long"]);
    expect(typedProblems({ name: "x".repeat(121), address: "1 Elm St\nUnit 2" })).toEqual(["name-long", "address-control"]);
    expect(typedProblems({ name: "Desk\tA", address: "" })).toEqual(["name-control"]);
    expect(typedProblems({ name: "Library", address: "call 416 555 0100" })).toEqual(["personal"]);
    expect(typedProblems({ name: "ask@library.ca", address: "" })).toEqual(["personal"]);
  });

  it("uses a typed name only when it has no problem", () => {
    const r = fileMatches(fileOf(notes()));
    const g = r.groups[1];
    if (!g) throw new Error("no group");
    const choices = new Map([[g.id, TYPED]]);
    expect(targetOf(g, choices)).toBeUndefined();
    expect(targetOf(g, choices, new Map([[g.id, { name: "", address: "" }]]))).toBeUndefined();
    expect(targetOf(g, choices, new Map([[g.id, { name: " Central Library ", address: " 100 King Street West " }]]))).toEqual({ name: "Central Library", address: "100 King Street West", place: undefined });
    expect(targetOf(g, choices, new Map([[g.id, { name: "Central Library", address: "  " }]]))?.address).toBeUndefined();
    expect(joinCount(r, choices, new Map([[g.id, { name: "Central Library", address: "" }]]))).toBe(1);
  });

  it("gives every note of the group the typed name and address, leaving a note that already has them as it is", () => {
    const f = fileOf(notes());
    const r = fileMatches(f);
    const g = r.groups[1];
    if (!g) throw new Error("no group");
    const copy = joinedCopy(f, r, new Map([[g.id, TYPED]]), new Map([[g.id, { name: "Central Library", address: "" }]]));
    // l2 already has this name and no address, so only l1 and l3 change.
    expect(copy).toMatchObject({ groups: 1, changed: 2, kept: 0 });
    expect(copy.notes.filter((n) => n.placeName === "Central Library" && n.address === undefined).map((n) => n.id).sort()).toEqual(["l1", "l2", "l3"]);
  });
});

describe("leaving places out of a join", () => {
  it("joins only the places left ticked, and always the place whose name is kept", () => {
    const f = fileOf(notes());
    const r = fileMatches(f);
    const g = r.groups[1];
    const keep = g?.places.find((p) => p.address === "100 King St W");
    const centrel = g?.places.find((p) => p.name === "Centrel Library");
    if (!g || !keep || !centrel) throw new Error("no group");
    const choices = new Map([[g.id, keep.id]]);
    const left = new Map([[g.id, new Set([centrel.id, keep.id])]]);
    expect(joinedPlaces(g, choices, left).map((p) => p.name)).toEqual(["Central Library", "Central Library"]);
    const copy = joinedCopy(f, r, choices, new Map(), left);
    expect(copy).toMatchObject({ groups: 1, changed: 1 });
    expect(copy.notes.find((n) => n.id === "l3")?.placeName).toBe("Centrel Library");
    expect(copy.notes.find((n) => n.id === "l2")?.address).toBe("100 King St W");
  });

  it("does not join a group with fewer than two places ticked", () => {
    const f = fileOf(notes());
    const r = fileMatches(f);
    const g = r.groups[0];
    const [bank, royal] = g?.places ?? [];
    if (!g || !bank || !royal) throw new Error("no group");
    const choices = new Map([[g.id, bank.id]]);
    const left = new Map([[g.id, new Set([royal.id])]]);
    expect(joinsTooFew(g, choices, left)).toBe(true);
    expect(joinsTooFew(g, new Map(), left)).toBe(false);
    expect(joinCount(r, choices, new Map(), left)).toBe(0);
    expect(joinedCopy(f, r, choices, new Map(), left)).toMatchObject({ groups: 0, changed: 0 });
  });

  it("with a typed name, needs two places ticked too", () => {
    const f = fileOf(notes());
    const r = fileMatches(f);
    const g = r.groups[1];
    if (!g) throw new Error("no group");
    const choices = new Map([[g.id, TYPED]]);
    const left = new Map([[g.id, new Set(g.places.slice(1).map((p) => p.id))]]);
    expect(joinsTooFew(g, choices, left)).toBe(true);
    const two = new Map([[g.id, new Set([g.places[2]?.id ?? ""])]]);
    const copy = joinedCopy(f, r, choices, new Map([[g.id, { name: "Main Library", address: "" }]]), two);
    expect(copy.notes.filter((n) => n.placeName === "Main Library").map((n) => n.id).sort()).toEqual(["l1", "l2"]);
  });
});

import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { parseNote, type Note } from "./model";
import { testNote } from "./testnotes";
import {
  DEFAULT_REPLACE,
  REPLACE_CSV_COLUMNS,
  applyReplace,
  copyPlaces,
  findHits,
  hitProblem,
  matchesIn,
  optionProblems,
  replaceChanges,
  replaceCsv,
  replaceIn,
  replacedFile,
  type ReplaceOptions,
} from "./textreplace";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function read(text: string): StreetFile {
  const r = readStreetFile(text, TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

function withText(n: Note, note: string): Note {
  const out = parseNote({ ...n, note });
  if (!out) throw new Error("bad note");
  return out;
}

const FILE = exportNotes(
  [
    withText(testNote("a", "Kng Street Café", [{ key: "elevator", value: "yes", source: "Kng survey" }], "12 Kng St W"), "Ramp on Kng side."),
    testNote("b", "Library", [], "100 King St W"),
    withText(testNote("c", "Station", [], "1 Front St"), "Elevator at St. George entrance"),
    testNote("d", "Kng", [], null),
  ],
  "2026-11-01",
);

const opts = (over: Partial<ReplaceOptions>): ReplaceOptions => ({ ...DEFAULT_REPLACE, ...over });
const note = (notes: readonly Note[], id: string): Note | undefined => notes.find((n) => n.id === id);

describe("optionProblems", () => {
  it("lists every problem in order", () => {
    expect(optionProblems(opts({ find: "" }))).toEqual(["find-empty"]);
    expect(optionProblems(opts({ find: "x".repeat(101), replace: "y".repeat(201), fields: [] }))).toEqual(["find-long", "replace-long", "no-fields"]);
    expect(optionProblems(opts({ find: "a\tb", replace: "c\nd" }))).toEqual(["find-control", "replace-control"]);
    expect(optionProblems(opts({ find: "x".repeat(100), replace: "y".repeat(200) }))).toEqual([]);
    expect(optionProblems(opts({ find: "Kng", replace: "" }))).toEqual([]);
  });
});

describe("finding and replacing in one text", () => {
  it("ignores capitals unless asked", () => {
    expect(matchesIn("kng KNG Kng", { find: "Kng", matchCase: false, wholeWords: false })).toHaveLength(3);
    expect(matchesIn("kng KNG Kng", { find: "Kng", matchCase: true, wholeWords: false })).toEqual([{ start: 8, end: 11 }]);
  });

  it("finds whole words only when asked, counting letters with accents as letters", () => {
    const o = { find: "St", matchCase: false, wholeWords: true };
    expect(matchesIn("12 King St W", o)).toEqual([{ start: 8, end: 10 }]);
    expect(matchesIn("Station", o)).toEqual([]);
    expect(matchesIn("St. George", o)).toHaveLength(1);
    expect(matchesIn("Stéphane", o)).toEqual([]);
    expect(matchesIn("St2", o)).toEqual([]);
    expect(matchesIn("Station", { ...o, wholeWords: false })).toHaveLength(1);
  });

  it("counts accents", () => {
    expect(matchesIn("Café", { find: "cafe", matchCase: false, wholeWords: false })).toEqual([]);
    expect(matchesIn("Café", { find: "café", matchCase: false, wholeWords: false })).toHaveLength(1);
  });

  it("treats every character to find as itself", () => {
    expect(matchesIn("a.b axb", { find: ".", matchCase: false, wholeWords: false })).toEqual([{ start: 1, end: 2 }]);
    expect(matchesIn("(1) [2] $3 ^4 a|b", { find: "(1)", matchCase: false, wholeWords: false })).toHaveLength(1);
    expect(replaceIn("St. St", { find: "St.", replace: "Saint", matchCase: false, wholeWords: false })).toBe("Saint St");
  });

  it("uses the replacement as written", () => {
    expect(replaceIn("Kng St", { find: "Kng", replace: "$1 $& King", matchCase: false, wholeWords: false })).toBe("$1 $& King St");
    expect(replaceIn("Kng St", { find: "Kng ", replace: "", matchCase: false, wholeWords: false })).toBe("St");
    expect(replaceIn("Kng St", { find: "", replace: "x", matchCase: false, wholeWords: false })).toBe("Kng St");
  });

  it("does not leave a doubled space where words are taken out, and changes no other spacing", () => {
    const out = (text: string, find: string) => replaceIn(text, { find, replace: "", matchCase: false, wholeWords: true });
    expect(out("12 Kng St W", "Kng")).toBe("12 St W");
    expect(out("Kng St", "Kng")).toBe("St");
    expect(out("Old  St Kng", "Kng")).toBe("Old  St");
    expect(out("a Kng, b", "Kng")).toBe("a , b");
    expect(replaceIn("12 Kng St", { find: "Kng", replace: "", matchCase: false, wholeWords: false })).toBe("12 St");
  });
});

describe("hitProblem", () => {
  it("names a field the App would not keep", () => {
    expect(hitProblem("name", "  ")).toBe("name-empty");
    expect(hitProblem("name", "x".repeat(121))).toBe("too-long");
    expect(hitProblem("address", "")).toBeUndefined();
    expect(hitProblem("address", "x".repeat(201))).toBe("too-long");
    expect(hitProblem("note", "")).toBeUndefined();
    expect(hitProblem("note", "x".repeat(501))).toBe("too-long");
  });
});

describe("findHits", () => {
  const file = read(FILE);

  it("lists each field with a match, in place order then name, address and note text", () => {
    const r = findHits(file, opts({ find: "Kng", replace: "King" }));
    expect(r.notes).toBe(4);
    expect(r.hits.map((h) => [h.id, h.before, h.after, h.matches.length])).toEqual([
      ["name|d", "Kng", "King", 1],
      ["name|a", "Kng Street Café", "King Street Café", 1],
      ["address|a", "12 Kng St W", "12 King St W", 1],
      ["note|a", "Ramp on Kng side.", "Ramp on King side.", 1],
    ]);
    expect(r.matches).toBe(4);
  });

  it("never looks at sources, and only in the fields chosen", () => {
    const r = findHits(file, opts({ find: "survey" }));
    expect(r.hits).toEqual([]);
    expect(findHits(file, opts({ find: "Kng", replace: "King", fields: ["address"] })).hits.map((h) => h.id)).toEqual(["address|a"]);
  });

  it("marks a change the App would not keep", () => {
    const r = findHits(file, opts({ find: "Kng", replace: "", fields: ["name"] }));
    expect(r.hits.map((h) => [h.id, h.after, h.problem])).toEqual([
      ["name|d", "", "name-empty"],
      ["name|a", "Street Café", undefined],
    ]);
  });

  it("finds nothing for options with a problem, or a replacement that changes nothing", () => {
    expect(findHits(file, opts({ find: "" })).hits).toEqual([]);
    expect(findHits(file, opts({ find: "Kng", replace: "Kng", matchCase: true })).hits).toEqual([]);
  });
});

describe("applyReplace", () => {
  const file = read(FILE);
  const r = findHits(file, opts({ find: "Kng", replace: "King" }));
  const all = new Set(r.hits.map((h) => h.id));

  it("makes the ticked changes and nothing else, keeping every record", () => {
    const c = applyReplace(file, r, all);
    expect(c).toMatchObject({ fields: 4, replaced: 4, notesChanged: 2 });
    const a = note(c.notes, "a");
    expect([a?.placeName, a?.address, a?.note]).toEqual(["King Street Café", "12 King St W", "Ramp on King side."]);
    expect(a?.facts).toEqual(note(file.places.flatMap((p) => p.notes), "a")?.facts);
    expect(a?.facts.find((f) => f.key === "elevator")?.provenance?.source).toBe("Kng survey");
    expect(note(c.notes, "b")).toBe(file.places.flatMap((p) => p.notes).find((n) => n.id === "b"));
  });

  it("leaves out the unticked changes", () => {
    const c = applyReplace(file, r, new Set(["address|a"]));
    expect(c).toMatchObject({ fields: 1, replaced: 1, notesChanged: 1 });
    expect(note(c.notes, "a")?.placeName).toBe("Kng Street Café");
    expect(note(c.notes, "a")?.address).toBe("12 King St W");
  });

  it("never makes a change with a problem, and trims what is left", () => {
    const empty = findHits(file, opts({ find: "Kng", replace: "", fields: ["name", "address"] }));
    const c = applyReplace(file, empty, new Set(empty.hits.map((h) => h.id)));
    expect(note(c.notes, "d")?.placeName).toBe("Kng");
    expect(note(c.notes, "a")?.placeName).toBe("Street Café");
    expect(note(c.notes, "a")?.address).toBe("12 St W");
  });

  it("removes an address or note text left empty", () => {
    const f = read(exportNotes([withText(testNote("x", "X", [], "Kng"), "Kng")], "2026-11-01"));
    const hits = findHits(f, opts({ find: "Kng", replace: "" }));
    const c = applyReplace(f, hits, new Set(hits.hits.map((h) => h.id)));
    expect(note(c.notes, "x")?.address).toBeUndefined();
    expect(note(c.notes, "x")?.note).toBeUndefined();
  });

  it("changes nothing when nothing is ticked", () => {
    const c = applyReplace(file, r, new Set());
    expect(c).toMatchObject({ fields: 0, replaced: 0, notesChanged: 0 });
    expect(c.notes).toEqual(file.places.flatMap((p) => p.notes));
  });

  it("counts every match in a field", () => {
    const f = read(exportNotes([withText(testNote("x", "X", []), "St and St and St")], "2026-11-01"));
    const hits = findHits(f, opts({ find: "St", replace: "Street", wholeWords: true, fields: ["note"] }));
    expect(applyReplace(f, hits, new Set(hits.hits.map((h) => h.id)))).toMatchObject({ fields: 1, replaced: 3 });
  });
});

describe("replaceChanges", () => {
  const file = read(FILE);
  const r = findHits(file, opts({ find: "Kng", replace: "King" }));

  it("lists what the copy holds now, in the list's order", () => {
    const c = applyReplace(file, r, new Set(["note|a", "name|d"]));
    expect(replaceChanges(r, c).map((x) => [x.hit.id, x.to])).toEqual([
      ["name|d", "King"],
      ["note|a", "Ramp on King side."],
    ]);
  });

  it("is empty when nothing changed", () => {
    expect(replaceChanges(r, applyReplace(file, r, new Set()))).toEqual([]);
  });

  it("says when a new name and address make a note the same place as another, given the file", () => {
    const f = read(exportNotes([testNote("x", "Kng Café", [], "1 King St"), testNote("y", "King Café", [], "1 King St"), testNote("z", "Kng Bar", [], "9 Bay St")], "2026-11-01"));
    const hits = findHits(f, opts({ find: "Kng", replace: "King", fields: ["name"] }));
    const c = applyReplace(f, hits, new Set(hits.hits.map((h) => h.id)));
    expect(replaceChanges(hits, c, f).map((x) => [x.hit.id, x.joins])).toEqual([
      ["name|z", false],
      ["name|x", true],
    ]);
    expect(replaceChanges(hits, c).map((x) => x.joins)).toEqual([false, false]);
    expect(copyPlaces(c, "en")).toBe(2);
    expect(f.places).toHaveLength(3);
  });
});

describe("replacedFile", () => {
  it("is a notes export the App reads back, dated today", () => {
    const file = read(FILE);
    const r = findHits(file, opts({ find: "Kng", replace: "King" }));
    const text = replacedFile(applyReplace(file, r, new Set(r.hits.map((h) => h.id))), TODAY);
    expect(JSON.parse(text)).toMatchObject({ exportedOn: "2026-11-21" });
    const back = importNotes(text);
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    expect(findHits(read(text), opts({ find: "Kng", fields: ["name", "address", "note"] })).hits).toEqual([]);
  });
});

describe("replaceCsv", () => {
  it("has a header, one row per change, a BOM and CRLF, and says which cannot be made", () => {
    const r = findHits(read(FILE), opts({ find: "Kng", replace: "", fields: ["name"] }));
    const csv = replaceCsv(r);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([REPLACE_CSV_COLUMNS.join(","), "Kng,d,name,1,Kng,,name-empty", "Kng Street Café,a,name,1,Kng Street Café,Street Café,yes"]);
  });

  it("guards text a spreadsheet would run as a formula", () => {
    const f = read(exportNotes([testNote("x", "=Kng", [])], "2026-11-01"));
    const csv = replaceCsv(findHits(f, opts({ find: "Kng", replace: "King" })));
    expect(csv).toContain("'=Kng");
    expect(csv).toContain("'=King");
  });
});

import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import {
  NO_FILTERS,
  NO_PICKS,
  detailCounts,
  filterErrors,
  matches,
  noFilterSet,
  partExport,
  prunePicks,
  readSplitFile,
  searchWords,
  splitNotes,
  togglePick,
  type SplitFile,
  type SplitFilters,
} from "./filesplit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));

const library = testNote("n1", "Central Library", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes", source: "Owner", on: "2025-03-01" }], "1 King St W");
const pool = testNote("n2", "Pool", [{ key: "elevator", value: "no", licence: "ODbL-1.0", on: "2026-06-15" }], "9 Lake Rd");
const cafe = testNote("n3", "Café Rivière", [], "12 King St E");
const notes = [library, pool, cafe];

const f = (over: Partial<SplitFilters>): SplitFilters => ({ ...NO_FILTERS, ...over });
const ids = (list: readonly { id: string }[]): string[] => list.map((n) => n.id);

function read(): SplitFile {
  const r = readSplitFile(exportNotes(notes, "2026-11-01"), TODAY);
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

describe("readSplitFile", () => {
  it("reads the notes with the App's rules and lists the file's sources and licences", () => {
    const file = read();
    expect(ids(file.notes)).toEqual(["n1", "n2", "n3"]);
    expect(file.sources).toEqual(["City survey", "Owner"]);
    expect(file.licences).toEqual(["CC0-1.0", "ODbL-1.0"]);
    expect(file.leftOut).toBe(0);
  });

  it("refuses text that is not an export, and a file with no readable note", () => {
    expect(readSplitFile("nope", TODAY)).toEqual({ ok: false, error: "not-json" });
    expect(readSplitFile(exportNotes([], "2026-11-01"), TODAY)).toEqual({ ok: false, error: "no-notes" });
  });

  it("counts entries it leaves out", () => {
    const text = JSON.stringify({ format: "app-notes", version: 1, notes: [library, { id: "x" }] });
    const r = readSplitFile(text, TODAY);
    expect(r.ok && r.file.leftOut).toBe(1);
  });
});

describe("filterErrors", () => {
  it("accepts empty and valid filters", () => {
    expect(filterErrors(NO_FILTERS)).toEqual([]);
    expect(filterErrors(f({ from: "2026-01-01", to: "2026-12-31", detail: "elevator", answer: "no", licence: "CC0-1.0" }))).toEqual([]);
  });

  it("names each problem", () => {
    expect(filterErrors(f({ from: "2026-02-30" }))).toEqual(["bad-from"]);
    expect(filterErrors(f({ to: "tomorrow" }))).toEqual(["bad-to"]);
    expect(filterErrors(f({ from: "2026-12-01", to: "2026-01-01" }))).toEqual(["from-after-to"]);
    expect(filterErrors(f({ detail: "parking" as "elevator" }))).toEqual(["bad-detail"]);
    expect(filterErrors(f({ answer: "maybe" as "any" }))).toEqual(["bad-answer"]);
    expect(filterErrors(f({ licence: "MIT" }))).toEqual(["bad-licence"]);
  });
});

describe("matches", () => {
  it("needs every word in the name or address, ignoring case and accents", () => {
    expect(searchWords("  KING, st ")).toEqual(["king", "st"]);
    expect(notes.filter((n) => matches(n, f({ words: "king" }))).map((n) => n.id)).toEqual(["n1", "n3"]);
    expect(notes.filter((n) => matches(n, f({ words: "riviere king" }))).map((n) => n.id)).toEqual(["n3"]);
    expect(notes.filter((n) => matches(n, f({ words: "king lake" }))).map((n) => n.id)).toEqual([]);
  });

  it("filters a detail by its answer, keeping UNKNOWN apart from No", () => {
    const by = (answer: SplitFilters["answer"]): string[] => notes.filter((n) => matches(n, f({ detail: "elevator", answer }))).map((n) => n.id);
    expect(by("yes")).toEqual(["n1"]);
    expect(by("no")).toEqual(["n2"]);
    expect(by("any")).toEqual(["n1", "n2"]);
    expect(by("unknown")).toEqual(["n3"]);
  });

  it("filters by a record's source and by licence", () => {
    expect(notes.filter((n) => matches(n, f({ source: "Owner" }))).map((n) => n.id)).toEqual(["n1"]);
    expect(notes.filter((n) => matches(n, f({ licence: "ODbL-1.0" }))).map((n) => n.id)).toEqual(["n2"]);
    // Every test note's own licence is CC0-1.0.
    expect(notes.filter((n) => matches(n, f({ licence: "CC0-1.0" }))).map((n) => n.id)).toEqual(["n1", "n2", "n3"]);
  });

  it("filters by the dates of records, inclusive, and leaves out notes with no record", () => {
    expect(notes.filter((n) => matches(n, f({ from: "2026-01-01" }))).map((n) => n.id)).toEqual(["n1", "n2"]);
    expect(notes.filter((n) => matches(n, f({ to: "2025-12-31" }))).map((n) => n.id)).toEqual(["n1"]);
    expect(notes.filter((n) => matches(n, f({ from: "2026-06-15", to: "2026-06-15" }))).map((n) => n.id)).toEqual(["n2"]);
  });

  it("combines filters with and", () => {
    expect(notes.filter((n) => matches(n, f({ words: "king", detail: "elevator", answer: "any" }))).map((n) => n.id)).toEqual(["n1"]);
  });
});

describe("splitNotes and hand picks", () => {
  it("chooses nothing when no filter is set", () => {
    expect(noFilterSet(NO_FILTERS)).toBe(true);
    expect(noFilterSet(f({ words: " , " }))).toBe(true);
    const s = splitNotes(notes, NO_FILTERS, NO_PICKS);
    expect(s.chosen).toEqual([]);
    expect(ids(s.rest)).toEqual(["n1", "n2", "n3"]);
  });

  it("chooses what the filters choose, in file order", () => {
    const s = splitNotes(notes, f({ words: "king" }), NO_PICKS);
    expect(ids(s.chosen)).toEqual(["n1", "n3"]);
    expect(ids(s.rest)).toEqual(["n2"]);
    expect([...s.byFilters]).toEqual(["n1", "n3"]);
  });

  it("lets hand picks add and take out notes over the filters", () => {
    const s = splitNotes(notes, f({ words: "king" }), { add: ["n2"], remove: ["n3"] });
    expect(ids(s.chosen)).toEqual(["n1", "n2"]);
    expect(ids(s.rest)).toEqual(["n3"]);
  });

  it("keeps hand picks small: a pick that agrees with the filters is dropped", () => {
    const by = new Set(["n1"]);
    let p = togglePick(NO_PICKS, "n2", true, by);
    expect(p).toEqual({ add: ["n2"], remove: [] });
    p = togglePick(p, "n2", false, by);
    expect(p).toEqual({ add: [], remove: [] });
    p = togglePick(p, "n1", false, by);
    expect(p).toEqual({ add: [], remove: ["n1"] });
    p = togglePick(p, "n1", true, by);
    expect(p).toEqual(NO_PICKS);
  });

  it("drops picks for notes not in the file", () => {
    expect(prunePicks({ add: ["n1", "gone"], remove: ["old"] }, notes)).toEqual({ add: ["n1"], remove: [] });
  });

  it("puts every note in exactly one part", () => {
    for (const filters of [NO_FILTERS, f({ words: "king" }), f({ detail: "elevator", answer: "unknown" }), f({ from: "2026-01-01" })]) {
      const s = splitNotes(notes, filters, { add: ["n2"], remove: ["n1"] });
      expect([...ids(s.chosen), ...ids(s.rest)].sort()).toEqual(["n1", "n2", "n3"]);
    }
  });
});

describe("partExport and detailCounts", () => {
  it("makes a notes export the App reads in full, with notes unchanged", () => {
    const s = splitNotes(notes, f({ words: "king" }), NO_PICKS);
    const back = importNotes(partExport(s.chosen, TODAY));
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    expect(back.notes).toEqual(s.chosen);
  });

  it("counts Yes, No and no record for each detail", () => {
    const c = detailCounts(notes);
    expect(c.elevator).toEqual({ yes: 1, no: 1, unknown: 1 });
    expect(c["step-free-entry"]).toEqual({ yes: 1, no: 0, unknown: 2 });
    for (const k of FACT_KEYS) expect(c[k].yes + c[k].no + c[k].unknown).toBe(3);
  });
});

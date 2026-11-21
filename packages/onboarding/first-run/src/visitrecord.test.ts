import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import { CONTRIBUTOR_SOURCE, FACT_KEYS } from "./facts";
import { readStreetFile, type StreetFile } from "./filestreets";
import { groupPlaces } from "./places";
import { testNote } from "./testnotes";
import {
  ROUND_CSV_COLUMNS,
  ROUND_MAX_PLACES,
  beforeValue,
  buildRound,
  changeKind,
  defaultSettings,
  detailsToAsk,
  makeRound,
  roundCounts,
  roundCsv,
  roundNoteId,
  roundOnlyFile,
  roundProblems,
  roundWithFile,
  settingsProblems,
  type Entries,
  type RoundSettings,
} from "./visitrecord";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const SETTINGS: RoundSettings = { visitedOn: "2026-11-19", source: "Accessibility walk group", licence: "CC-BY-4.0" };

const ALL_YES = FACT_KEYS.map((key) => ({ key, value: "yes" as const }));

function file(notes = [
  testNote("k1", "Library", [{ key: "elevator", value: "yes" }], "100 King St W"),
  testNote("k2", "Café", [], "12 King St W"),
  testNote("d1", "Done", ALL_YES, "5 Elm Ave"),
  testNote("n1", "Kiosk", [], null),
]): StreetFile {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const idOf = (f: StreetFile, name: string): string => {
  const p = f.places.find((x) => x.name === name);
  if (!p) throw new Error(name);
  return p.id;
};

describe("makeRound", () => {
  it("lists the places in walking order and leaves off places where every detail has a record", () => {
    const r = makeRound(file(), "open", "en");
    expect(r.places.map((rp) => rp.place.name)).toEqual(["Café", "Library", "Kiosk"]);
    expect(r.leftOutDone).toBe(1);
    expect(r.over).toBe(0);
  });

  it("asks only about open details, or every detail", () => {
    const f = file();
    const library = makeRound(f, "open", "en").places.find((rp) => rp.place.name === "Library");
    expect(library?.ask).toEqual(["step-free-entry", "accessible-washroom", "automatic-door"]);
    const all = makeRound(f, "all", "en");
    expect(all.places.map((rp) => rp.place.name)).toEqual(["Done", "Café", "Library", "Kiosk"]);
    expect(all.places.every((rp) => rp.ask.length === FACT_KEYS.length)).toBe(true);
    expect(all.leftOutDone).toBe(0);
  });

  it("asks about details whose reports differ", () => {
    const f = file([testNote("a", "Shop", [{ key: "elevator", value: "yes" }], "1 Oak St"), testNote("b", "Shop", [{ key: "elevator", value: "no" }], "1 Oak St")]);
    expect(makeRound(f, "open", "en").places[0]?.ask).toContain("elevator");
    const place = f.places[0];
    if (!place) throw new Error("no place");
    expect(detailsToAsk(place, "open")).toEqual(FACT_KEYS);
  });

  it("keeps a round to the page's limit and counts the rest", () => {
    const many = file(Array.from({ length: ROUND_MAX_PLACES + 5 }, (_, i) => testNote(`p${i}`, `Place ${i}`, [], `${i + 1} Oak St`)));
    const r = makeRound(many, "open", "en");
    expect(r.places).toHaveLength(ROUND_MAX_PLACES);
    expect(r.over).toBe(5);
  });
});

describe("settings", () => {
  it("starts with today, the contributor source and CC0", () => {
    expect(defaultSettings(TODAY)).toEqual({ visitedOn: "2026-11-20", source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0" });
    expect(settingsProblems(defaultSettings(TODAY), TODAY)).toEqual([]);
  });

  it("refuses a day that is not a date or is after today", () => {
    expect(settingsProblems({ ...SETTINGS, visitedOn: "2026-11-31" }, TODAY)).toEqual(["date"]);
    expect(settingsProblems({ ...SETTINGS, visitedOn: "20/11/2026" }, TODAY)).toEqual(["date"]);
    expect(settingsProblems({ ...SETTINGS, visitedOn: "2026-11-21" }, TODAY)).toEqual(["future"]);
    expect(settingsProblems({ ...SETTINGS, visitedOn: "2026-11-20" }, TODAY)).toEqual([]);
  });

  it("asks for a one-line source of 1 to 120 characters and an open licence, listing every problem", () => {
    expect(settingsProblems({ visitedOn: "x", source: "  ", licence: "All rights reserved" }, TODAY)).toEqual(["date", "source", "licence"]);
    expect(settingsProblems({ ...SETTINGS, source: "a".repeat(121) }, TODAY)).toEqual(["source"]);
    expect(settingsProblems({ ...SETTINGS, source: "line\nbreak" }, TODAY)).toEqual(["source"]);
    expect(settingsProblems({ ...SETTINGS, source: "a".repeat(120) }, TODAY)).toEqual([]);
  });
});

describe("roundProblems", () => {
  it("says when nothing is recorded yet", () => {
    const f = file();
    const r = makeRound(f, "open", "en");
    expect(roundProblems(r, {}, SETTINGS, TODAY)).toEqual([{ kind: "empty" }]);
    const skipped: Entries = { [idOf(f, "Café")]: { answers: { elevator: "skip" }, note: "  " } };
    expect(roundProblems(r, skipped, SETTINGS, TODAY)).toEqual([{ kind: "empty" }]);
  });

  it("accepts a note alone or one answer", () => {
    const f = file();
    const r = makeRound(f, "open", "en");
    expect(roundProblems(r, { [idOf(f, "Kiosk")]: { answers: {}, note: "Closed for renovation." } }, SETTINGS, TODAY)).toEqual([]);
    expect(roundProblems(r, { [idOf(f, "Kiosk")]: { answers: { elevator: "no" }, note: "" } }, SETTINGS, TODAY)).toEqual([]);
  });

  it("does not count an answer for a detail that was not asked about", () => {
    const f = file();
    const r = makeRound(f, "open", "en");
    expect(roundProblems(r, { [idOf(f, "Library")]: { answers: { elevator: "no" }, note: "" } }, SETTINGS, TODAY)).toEqual([{ kind: "empty" }]);
  });

  it("refuses a note that is too long or holds control characters", () => {
    const f = file();
    const r = makeRound(f, "open", "en");
    const cafe = idOf(f, "Café");
    const kiosk = idOf(f, "Kiosk");
    expect(
      roundProblems(r, { [cafe]: { answers: {}, note: "x".repeat(501) }, [kiosk]: { answers: { elevator: "yes" }, note: "bell\u0007" } }, { ...SETTINGS, licence: "nope" }, TODAY),
    ).toEqual([
      { kind: "settings", code: "licence" },
      { kind: "note", placeId: cafe, code: "note-long" },
      { kind: "note", placeId: kiosk, code: "note-control" },
    ]);
  });
});

describe("buildRound", () => {
  it("makes one note per place with something recorded, with provenance on each Yes and No only", () => {
    const f = file();
    const r = makeRound(f, "open", "en");
    const result = buildRound(r, { [idOf(f, "Café")]: { answers: { "step-free-entry": "yes", elevator: "no", "automatic-door": "skip" }, note: " Ramp at the side. " } }, SETTINGS);
    expect(result.notes).toHaveLength(1);
    const n = result.notes[0];
    expect(n?.placeName).toBe("Café");
    expect(n?.address).toBe("12 King St W");
    expect(n?.note).toBe("Ramp at the side.");
    expect(n?.createdOn).toBe("2026-11-19");
    expect(n?.licence).toBe("CC-BY-4.0");
    expect(n?.facts.map((x) => [x.key, x.value, x.provenance?.source ?? "-"])).toEqual([
      ["step-free-entry", "yes", "Accessibility walk group"],
      ["accessible-washroom", "unknown", "-"],
      ["automatic-door", "unknown", "-"],
      ["elevator", "no", "Accessibility walk group"],
    ]);
    expect(n?.facts.find((x) => x.key === "elevator")?.provenance).toEqual({ source: "Accessibility walk group", licence: "CC-BY-4.0", recordedOn: "2026-11-19" });
    // 4 asked at Café, 2 answered; 3 asked at Library and 4 at Kiosk, none answered.
    expect(result.notChecked).toBe(2 + 3 + 4);
  });

  it("never carries a value over from the file, and leaves out places with nothing recorded", () => {
    const f = file();
    const result = buildRound(makeRound(f, "all", "en"), { [idOf(f, "Done")]: { answers: { elevator: "no" }, note: "" } }, SETTINGS);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]?.facts.filter((x) => x.value !== "unknown").map((x) => x.key)).toEqual(["elevator"]);
  });

  it("says how each answer sits beside the file", () => {
    const f = file([
      testNote("a", "Shop", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "no" }], "1 Oak St"),
      testNote("b", "Shop", [{ key: "accessible-washroom", value: "yes" }], "1 Oak St"),
      testNote("c", "Shop", [{ key: "accessible-washroom", value: "no" }], "1 Oak St"),
    ]);
    const result = buildRound(makeRound(f, "all", "en"), { [idOf(f, "Shop")]: { answers: { "step-free-entry": "yes", elevator: "yes", "automatic-door": "yes", "accessible-washroom": "no" }, note: "" } }, SETTINGS);
    expect(result.changes.map((c) => `${c.key}:${c.kind}`)).toEqual(["step-free-entry:new", "accessible-washroom:differ", "automatic-door:different", "elevator:same"]);
    expect(roundCounts(result)).toEqual({ notes: 1, yes: 3, no: 1, new: 1, same: 1, different: 1, differ: 1, notChecked: 0 });
  });

  it("gives the same ids for the same round, and never reuses an id in the file", () => {
    const f = file();
    const r = makeRound(f, "open", "en");
    const entries: Entries = { [idOf(f, "Café")]: { answers: { elevator: "yes" }, note: "" }, [idOf(f, "Kiosk")]: { answers: { elevator: "no" }, note: "" } };
    const a = buildRound(r, entries, SETTINGS).notes.map((n) => n.id);
    expect(buildRound(r, entries, SETTINGS).notes.map((n) => n.id)).toEqual(a);
    expect(new Set(a).size).toBe(2);
    for (const id of a) expect(id).toMatch(/^round-20261119-[0-9a-f]{8}$/);
    const place = r.places[0]?.place;
    if (!place) throw new Error("no place");
    const first = roundNoteId(place, "2026-11-19", new Set());
    expect(roundNoteId(place, "2026-11-19", new Set([first]))).toBe(`${first}-2`);
    expect(roundNoteId(place, "2026-11-19", new Set([first, `${first}-2`]))).toBe(`${first}-3`);
  });
});

describe("changeKind", () => {
  it("compares an answer with what the file says", () => {
    expect(changeKind({ kind: "unknown" }, "yes")).toBe("new");
    expect(changeKind({ kind: "differ", observations: [] }, "no")).toBe("differ");
    expect(changeKind({ kind: "agree", value: "yes", observations: [] }, "yes")).toBe("same");
    expect(changeKind({ kind: "agree", value: "yes", observations: [] }, "no")).toBe("different");
  });
});

describe("files", () => {
  const f = file();
  const r = makeRound(f, "open", "en");
  const result = buildRound(r, { [idOf(f, "Café")]: { answers: { elevator: "no" }, note: "" } }, SETTINGS);

  it("exports only the new notes, and the App reads them back unchanged", () => {
    const back = importNotes(roundOnlyFile(result, TODAY));
    expect(back.error).toBeUndefined();
    expect(back.notes).toEqual(result.notes);
  });

  it("exports the file's notes with the new ones added, and the reports then show what changed", () => {
    const back = importNotes(roundWithFile(f, result, TODAY));
    expect(back.notes.map((n) => n.id).sort()).toEqual(["d1", "k1", "k2", "n1", ...result.notes.map((n) => n.id)].sort());
    const cafe = groupPlaces(back.notes, "en").find((p) => p.name === "Café");
    expect(cafe?.resolutions.elevator).toMatchObject({ kind: "agree", value: "no" });
    expect(cafe?.notes).toHaveLength(2);
  });
});

describe("roundCsv", () => {
  it("has a row per answer with what the file said before, the change, the provenance and the new note's id", () => {
    const f = file([
      testNote("a", "=Shop", [{ key: "elevator", value: "yes" }], "12 King St W"),
      testNote("b", "Kiosk", [], null),
    ]);
    const result = buildRound(
      makeRound(f, "all", "en"),
      { [idOf(f, "=Shop")]: { answers: { elevator: "no", "step-free-entry": "yes" }, note: "" }, [idOf(f, "Kiosk")]: { answers: {}, note: "Only a note" } },
      SETTINGS,
    );
    const lines = roundCsv(result, SETTINGS).replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    const shop = result.notes.find((n) => n.placeName === "=Shop")?.id;
    expect(lines).toEqual([
      ROUND_CSV_COLUMNS.join(","),
      `2026-11-19,'=Shop,12 King St W,12,step-free-entry,yes,unknown,new,Accessibility walk group,CC-BY-4.0,${shop}`,
      `2026-11-19,'=Shop,12 King St W,12,elevator,no,yes,different,Accessibility walk group,CC-BY-4.0,${shop}`,
    ]);
  });

  it("names what the file said before in the App's words", () => {
    expect(beforeValue({ kind: "unknown" })).toBe("unknown");
    expect(beforeValue({ kind: "differ", observations: [] })).toBe("differ");
    expect(beforeValue({ kind: "agree", value: "no", observations: [] })).toBe("no");
  });

  it("links every answer to the note that holds it", () => {
    const f = file();
    const result = buildRound(makeRound(f, "open", "en"), { [idOf(f, "Café")]: { answers: { elevator: "yes" }, note: "" }, [idOf(f, "Kiosk")]: { answers: { elevator: "no" }, note: "" } }, SETTINGS);
    for (const c of result.changes) expect(result.notes.find((n) => n.id === c.noteId)?.placeName).toBe(c.place.name);
  });
});

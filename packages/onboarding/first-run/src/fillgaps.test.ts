import { describe, expect, it } from "vitest";
import { exportNotes } from "./exchange";
import { DEFAULT_FILL, FILL_CSV_COLUMNS, checkFill, fillCopy, fillPlan, filledCsv, filledFile, planCounts, sinceOk, type FillOptions, type FillPlan } from "./fillgaps";
import { parseNote, type Note } from "./model";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

/** The person's file: Café has an elevator answer; Bakery has nothing; Kiosk has no address. */
const MINE: Note[] = [
  testNote("m1", "Café", [{ key: "elevator", value: "yes" }], "1 A St"),
  testNote("m2", "Bakery", [], "2 A St"),
  testNote("m3", "Kiosk", [{ key: "step-free-entry", value: "no" }], null),
];

/** The other file. */
const OTHER: Note[] = [
  // Fills Café's door, and only that.
  testNote("o1", "cafe", [{ key: "automatic-door", value: "yes", source: "Visit" }], "1 A St."),
  // Fills two of Bakery's gaps.
  testNote("o2", "Bakery", [{ key: "accessible-washroom", value: "no", source: "Visit" }, { key: "elevator", value: "yes", source: "Visit" }], "2 A St"),
  // Answers Café's elevator, which already has an answer: nothing missing.
  testNote("o3", "Café", [{ key: "elevator", value: "no", source: "Visit" }], "1 A St"),
  // Fills Café's step-free entrance, but also answers its elevator.
  testNote("o4", "Café", [{ key: "step-free-entry", value: "yes", source: "Visit" }, { key: "elevator", value: "yes", source: "Visit" }], "1 A St"),
  // A place not in the person's file.
  testNote("o5", "Diner", [{ key: "elevator", value: "yes", source: "Visit" }], "9 Z St"),
  // Already in the person's file.
  MINE[1] as Note,
  // The id of one of the person's notes, saying something else.
  testNote("m3", "Kiosk", [{ key: "elevator", value: "yes", source: "Visit" }], null),
];

const plan = (o: Partial<FillOptions> = {}, mine = MINE, other = OTHER): FillPlan => fillPlan(mine, other, { ...DEFAULT_FILL, ...o }, "en");
const shape = (p: FillPlan): Array<[string, string[], string[], string[]]> => p.places.map((x) => [x.place.name, x.notes.map((n) => n.note.id), [...x.fills], [...x.also]]);

describe("fillPlan", () => {
  it("brings in only notes about places in the file that answer a gap and nothing else", () => {
    const p = plan();
    expect(shape(p)).toEqual([
      ["Bakery", ["o2"], ["accessible-washroom", "elevator"], []],
      ["Café", ["o1"], ["automatic-door"], []],
    ]);
    expect([p.otherPlaces, p.nothingMissing, p.alreadyIn, p.sameId, p.alsoOther]).toEqual([1, 1, 1, 1, 1]);
  });

  it("brings in notes that also answer another detail when asked, and names those details", () => {
    const p = plan({ onlyGaps: false });
    expect(shape(p)).toEqual([
      ["Bakery", ["o2"], ["accessible-washroom", "elevator"], []],
      ["Café", ["o1", "o4"], ["step-free-entry", "automatic-door"], ["elevator"]],
    ]);
    expect(p.alsoOther).toBe(0);
  });

  it("fills only the chosen details, counting a note that answers another gap as also answering another detail", () => {
    const p = plan({ keys: ["accessible-washroom"] });
    expect(shape(p)).toEqual([]);
    expect([p.alsoOther, p.nothingMissing]).toEqual([1, 3]);
    const open = plan({ keys: ["accessible-washroom"], onlyGaps: false });
    expect(shape(open)).toEqual([["Bakery", ["o2"], ["accessible-washroom"], ["elevator"]]]);
  });

  it("leaves out notes with a record older than the day chosen, counting them", () => {
    const mine = [testNote("m", "Shop", [], "1 A St")];
    const other = [
      testNote("new", "Shop", [{ key: "elevator", value: "yes", on: "2026-06-01" }], "1 A St"),
      testNote("old", "Shop", [{ key: "automatic-door", value: "yes", on: "2026-01-15" }], "1 A St"),
      testNote("mixed", "Shop", [{ key: "step-free-entry", value: "yes", on: "2026-06-01" }, { key: "accessible-washroom", value: "no", on: "2025-12-31" }], "1 A St"),
    ];
    const p = fillPlan(mine, other, { ...DEFAULT_FILL, since: "2026-02-01" }, "en");
    expect(p.places[0]?.notes.map((n) => n.note.id)).toEqual(["new"]);
    expect(p.older).toBe(2);
    // A record made on the day itself comes in.
    expect(fillPlan(mine, other, { ...DEFAULT_FILL, since: "2026-01-15" }, "en").places[0]?.notes.map((n) => n.note.id)).toEqual(["new", "old"]);
    expect(fillPlan(mine, other, DEFAULT_FILL, "en").older).toBe(0);
  });

  it("takes an empty day or a real date", () => {
    expect(sinceOk("")).toBe(true);
    expect(sinceOk("2026-02-28")).toBe(true);
    expect(sinceOk("2026-02-30")).toBe(false);
    expect(sinceOk("31/01/2026")).toBe(false);
  });

  it("finds nothing to bring in from a file about other places", () => {
    const p = plan({}, MINE, [OTHER[4] as Note]);
    expect(p.places).toEqual([]);
    expect(p.otherPlaces).toBe(1);
  });

  it("orders places by name in the person's language, and notes oldest first", () => {
    const mine = [testNote("e", "Éclair", [], "1 B St"), testNote("d", "Dôme", [], "2 B St")];
    const late = parseNote({ ...testNote("x2", "Éclair", [{ key: "elevator", value: "yes" }], "1 B St"), createdOn: "2026-11-01" }) as Note;
    const early = parseNote({ ...testNote("x1", "Éclair", [{ key: "elevator", value: "yes" }], "1 B St"), createdOn: "2026-09-01" }) as Note;
    const other = [late, early, testNote("y", "Dôme", [{ key: "elevator", value: "no" }], "2 B St")];
    const p = fillPlan(mine, other, DEFAULT_FILL, "fr");
    expect(p.places.map((x) => [x.place.name, x.notes.map((n) => n.note.id)])).toEqual([
      ["Dôme", ["y"]],
      ["Éclair", ["x1", "x2"]],
    ]);
  });

  it("counts the notes and gaps across places", () => {
    expect(planCounts(plan().places)).toEqual({ notes: 2, gaps: 3 });
    expect(planCounts([])).toEqual({ notes: 0, gaps: 0 });
  });
});

describe("filledCsv", () => {
  it("has a row for each note added with its gaps, other details and sources, a BOM and CRLF", () => {
    const p = plan({ onlyGaps: false });
    const csv = filledCsv(fillCopy(MINE, p, p.places.map((x) => x.place.id)));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([
      FILL_CSV_COLUMNS.join(","),
      "Bakery,2 A St,o2,2026-10-01,accessible-washroom elevator,,Visit",
      "Café,1 A St,o1,2026-10-01,automatic-door,,Visit",
      "Café,1 A St,o4,2026-10-01,step-free-entry,elevator,Visit",
    ]);
  });

  it("guards and quotes cells a spreadsheet would read as a formula or split", () => {
    const mine = [testNote("m", "=Shop, Inc", [], "1 A St")];
    const other = [testNote("x", "=Shop, Inc", [{ key: "elevator", value: "yes", source: "+Visit" }], "1 A St")];
    const p = fillPlan(mine, other, DEFAULT_FILL, "en");
    const rows = filledCsv(fillCopy(mine, p, p.places.map((x) => x.place.id))).trimEnd().split("\r\n");
    expect(rows[1]).toBe(`"'=Shop, Inc",1 A St,x,2026-10-01,elevator,,'+Visit`);
  });
});

describe("fillCopy and checkFill", () => {
  it("adds the notes of the chosen places after the person's notes, unchanged", () => {
    const p = plan();
    const f = fillCopy(MINE, p, [p.places[1]?.place.id ?? ""]);
    expect(f.notes.map((n) => n.id)).toEqual(["m1", "m2", "m3", "o1"]);
    expect(f.added).toEqual([OTHER[0]]);
    expect(f.places.map((x) => x.place.name)).toEqual(["Café"]);
  });

  it("reads back a copy where every gap filled has an answer and nothing else changed", () => {
    const p = plan();
    const f = fillCopy(MINE, p, p.places.map((x) => x.place.id));
    const copy = filledFile(f, TODAY);
    expect(checkFill(copy, MINE, f, "en")).toEqual({ ok: true, notes: 5, filled: 3 });
    expect(JSON.parse(copy).exportedOn).toBe("2026-11-21");
  });

  it("reads back a copy with notes that also answer another detail", () => {
    const p = plan({ onlyGaps: false });
    const f = fillCopy(MINE, p, p.places.map((x) => x.place.id));
    expect(checkFill(filledFile(f, TODAY), MINE, f, "en")).toEqual({ ok: true, notes: 6, filled: 4 });
  });

  it("refuses a copy the App cannot read, or with a note missing or changed", () => {
    const p = plan();
    const f = fillCopy(MINE, p, p.places.map((x) => x.place.id));
    expect(checkFill("{", MINE, f, "en")).toEqual({ ok: false, reason: "unreadable" });
    expect(checkFill(exportNotes(f.notes.slice(1), "2026-11-21"), MINE, f, "en")).toEqual({ ok: false, reason: "count" });
    const changed = f.notes.map((n) => (n.id === "m2" ? { ...n, note: "changed" } : n));
    expect(checkFill(exportNotes(changed, "2026-11-21"), MINE, f, "en")).toEqual({ ok: false, reason: "changed" });
  });

  it("refuses a copy with a new place", () => {
    const p = plan();
    const f = fillCopy(MINE, p, p.places.map((x) => x.place.id));
    const bad = { ...f, added: [...f.added.slice(1), OTHER[4] as Note] };
    expect(checkFill(exportNotes([...MINE, ...bad.added], "2026-11-21"), MINE, bad, "en")).toEqual({ ok: false, reason: "new-place" });
  });

  it("refuses a copy where a gap it was meant to fill has no answer", () => {
    const p = plan();
    const f = fillCopy(MINE, p, p.places.map((x) => x.place.id));
    // The note for Café's door, swapped for one that answers nothing.
    const empty = testNote("o1", "cafe", [], "1 A St.");
    const bad = { ...f, added: f.added.map((n) => (n.id === "o1" ? empty : n)) };
    expect(checkFill(exportNotes([...MINE, ...bad.added], "2026-11-21"), MINE, bad, "en")).toEqual({ ok: false, reason: "still-unknown" });
  });

  it("refuses a copy where an answer outside the gaps changed when only gaps were to be filled", () => {
    const p = plan();
    const f = fillCopy(MINE, p, p.places.map((x) => x.place.id));
    const sneaky = testNote("o1", "cafe", [{ key: "automatic-door", value: "yes", source: "Visit" }, { key: "elevator", value: "no", source: "Visit" }], "1 A St.");
    const bad = { ...f, added: f.added.map((n) => (n.id === "o1" ? sneaky : n)) };
    expect(checkFill(exportNotes([...MINE, ...bad.added], "2026-11-21"), MINE, bad, "en")).toEqual({ ok: false, reason: "other-answer" });
  });

  it("counts only the gaps of the places chosen as filled", () => {
    const p = plan();
    const bakery = p.places.find((x) => x.place.name === "Bakery");
    if (!bakery) throw new Error("no place");
    const f = fillCopy(MINE, p, [bakery.place.id]);
    expect(f.added.map((n) => n.id)).toEqual(["o2"]);
    expect(checkFill(filledFile(f, TODAY), MINE, f, "en")).toEqual({ ok: true, notes: 4, filled: 2 });
  });

  it("adds nothing for no place chosen", () => {
    const f = fillCopy(MINE, plan(), []);
    expect(f.added).toEqual([]);
    expect(checkFill(filledFile(f, TODAY), MINE, f, "en")).toEqual({ ok: true, notes: 3, filled: 0 });
  });
});

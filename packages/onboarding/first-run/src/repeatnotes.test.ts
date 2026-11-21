import { describe, expect, it } from "vitest";
import { exportNotes } from "./exchange";
import { parseNote, type Note } from "./model";
import { placeId } from "./places";
import {
  DEFAULT_REPEATS,
  REPEAT_CSV_COLUMNS,
  checkRepeats,
  contentKey,
  findRepeats,
  groupId,
  isWithin,
  removeRepeats,
  repeatCount,
  repeatFiles,
  repeatsCsv,
  sortGroups,
  type RepeatGroup,
} from "./repeatnotes";
import { testNote, type TestRecord } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

/** A note like testNote, with another id, day made or note text. */
function note(id: string, name: string, records: readonly TestRecord[], address: string | null, over: { createdOn?: string; note?: string } = {}): Note {
  const base = testNote(id, name, records, address);
  const n = parseNote({ ...base, ...over });
  if (!n) throw new Error(`note ${id} is not valid`);
  return n;
}

const ELEVATOR: TestRecord[] = [{ key: "elevator", value: "yes" }];
const NOTES: Note[] = [
  note("a1", "Café A", ELEVATOR, "10 King St W"),
  note("b1", "Bakery", [], "20 King St W", { note: "Side door" }),
  note("a2", "Café A", ELEVATOR, "10 King St W"),
  note("b2", "Bakery", [], "20 King St W", { note: "Side door" }),
  note("a3", "Café A", ELEVATOR, "10 King St W"),
  note("k1", "Kiosk", [], null),
];

const ids = (ns: readonly Note[]): string[] => ns.map((n) => n.id);
const shape = (gs: readonly RepeatGroup[]): Array<[string, string[]]> => gs.map((g) => [g.kept.id, ids(g.repeats)]);

describe("contentKey", () => {
  it("ignores the note's id", () => {
    expect(contentKey(NOTES[0] as Note, DEFAULT_REPEATS)).toBe(contentKey(NOTES[2] as Note, DEFAULT_REPEATS));
  });

  it("tells notes apart by any record, the note text, the licence, the name and the address", () => {
    const base = note("x", "Café A", ELEVATOR, "10 King St W");
    const key = contentKey(base, DEFAULT_REPEATS);
    const others = [
      note("x", "Café A", [{ key: "elevator", value: "no" }], "10 King St W"),
      note("x", "Café A", [{ key: "elevator", value: "yes", source: "Visit" }], "10 King St W"),
      note("x", "Café A", [{ key: "elevator", value: "yes", licence: "CC-BY-4.0" }], "10 King St W"),
      note("x", "Café A", [{ key: "elevator", value: "yes", on: "2026-09-01" }], "10 King St W"),
      note("x", "Café A", [...ELEVATOR, { key: "automatic-door", value: "yes" }], "10 King St W"),
      note("x", "Café A", ELEVATOR, "10 King St W", { note: "Ramp at back" }),
      note("x", "Cafe A", ELEVATOR, "10 King St W"),
      note("x", "Café A", ELEVATOR, "10 King St. W."),
      note("x", "Café A", ELEVATOR, null),
      parseNote({ ...base, licence: "CC-BY-4.0" }) as Note,
    ];
    for (const o of others) expect(contentKey(o, DEFAULT_REPEATS)).not.toBe(key);
  });

  it("tells notes made on different days apart unless asked not to", () => {
    const a = note("x", "A", ELEVATOR, "1 A St");
    const b = note("y", "A", ELEVATOR, "1 A St", { createdOn: "2026-11-02" });
    expect(contentKey(a, DEFAULT_REPEATS)).not.toBe(contentKey(b, DEFAULT_REPEATS));
    expect(contentKey(a, { ...DEFAULT_REPEATS, anyDay: true })).toBe(contentKey(b, { ...DEFAULT_REPEATS, anyDay: true }));
  });
});

describe("findRepeats", () => {
  it("groups notes that say the same thing, keeping the first by id when made the same day", () => {
    const gs = findRepeats(NOTES, DEFAULT_REPEATS);
    expect(shape(gs)).toEqual([
      ["a1", ["a2", "a3"]],
      ["b1", ["b2"]],
    ]);
    expect(repeatCount(gs)).toBe(3);
  });

  it("keeps the oldest note of a group", () => {
    const ns = [note("z", "A", [], "1 A St", { createdOn: "2026-11-05" }), note("y", "A", [], "1 A St", { createdOn: "2026-10-02" }), note("x", "A", [], "1 A St", { createdOn: "2026-10-30" })];
    expect(shape(findRepeats(ns, { ...DEFAULT_REPEATS, anyDay: true }))).toEqual([["y", ["x", "z"]]]);
    expect(findRepeats(ns, DEFAULT_REPEATS)).toEqual([]);
  });

  it("finds nothing when every note says something of its own", () => {
    expect(findRepeats([NOTES[0] as Note, NOTES[1] as Note, NOTES[5] as Note], DEFAULT_REPEATS)).toEqual([]);
    expect(findRepeats([], DEFAULT_REPEATS)).toEqual([]);
  });

  it("finds notes with no record and no text as repeats of one another", () => {
    const ns = [note("p", "Kiosk", [], null), note("q", "Kiosk", [], null)];
    expect(shape(findRepeats(ns, DEFAULT_REPEATS))).toEqual([["p", ["q"]]]);
  });
});

describe("notes held in a fuller note", () => {
  const WITHIN = { ...DEFAULT_REPEATS, within: true };
  const two: TestRecord[] = [...ELEVATOR, { key: "automatic-door", value: "no" }];
  const three: TestRecord[] = [...two, { key: "step-free-entry", value: "yes" }];

  it("takes a note whose records are all in a fuller note only when asked", () => {
    const ns = [note("s", "Shop", ELEVATOR, "1 A St"), note("f", "Shop", two, "1 A St", { createdOn: "2026-11-02" })];
    expect(findRepeats(ns, DEFAULT_REPEATS)).toEqual([]);
    const gs = findRepeats(ns, WITHIN);
    expect(gs.map((g) => [g.kind, g.kept.id, ids(g.repeats)])).toEqual([["within", "f", ["s"]]]);
    expect(gs[0]?.key).toBe("within:f");
  });

  it("groups under the fullest note, so a note held by another held note goes with it", () => {
    const ns = [note("s", "Shop", ELEVATOR, "1 A St"), note("m", "Shop", two, "1 A St"), note("f", "Shop", three, "1 A St")];
    expect(findRepeats(ns, WITHIN).map((g) => [g.kept.id, ids(g.repeats)])).toEqual([["f", ["m", "s"]]]);
  });

  it("counts a note with no record and no text as held in any note with a record", () => {
    const ns = [note("e", "Shop", [], "1 A St", { createdOn: "2026-09-01" }), note("f", "Shop", ELEVATOR, "1 A St")];
    expect(findRepeats(ns, WITHIN).map((g) => [g.kept.id, ids(g.repeats)])).toEqual([["f", ["e"]]]);
  });

  it("never takes out a note with text of its own, a note about another place, or one under another licence", () => {
    const full = note("f", "Shop", two, "1 A St");
    expect(isWithin(note("t", "Shop", ELEVATOR, "1 A St", { note: "Bell at door" }), full)).toBe(false);
    expect(isWithin(note("p", "Shop", ELEVATOR, "2 A St"), full)).toBe(false);
    expect(isWithin(note("q", "SHOP", ELEVATOR, "1 A St"), full)).toBe(false);
    const other = parseNote({ ...note("l", "Shop", ELEVATOR, "1 A St"), licence: "CC-BY-4.0" }) as Note;
    expect(isWithin(other, full)).toBe(false);
  });

  it("needs every record the same, from the same source on the same day", () => {
    const full = note("f", "Shop", two, "1 A St");
    expect(isWithin(note("a", "Shop", [{ key: "elevator", value: "no" }], "1 A St"), full)).toBe(false);
    expect(isWithin(note("b", "Shop", [{ key: "elevator", value: "yes", on: "2026-09-01" }], "1 A St"), full)).toBe(false);
    expect(isWithin(note("c", "Shop", [{ key: "elevator", value: "yes", source: "Visit" }], "1 A St"), full)).toBe(false);
    expect(isWithin(note("d", "Shop", ELEVATOR, "1 A St"), full)).toBe(true);
  });

  it("does not take a note as held in one that holds no more, or in itself", () => {
    const a = note("a", "Shop", two, "1 A St");
    expect(isWithin(a, note("b", "Shop", two, "1 A St"))).toBe(false);
    expect(isWithin(a, a)).toBe(false);
  });

  it("finds repeats first, then notes held in the notes left", () => {
    const ns = [note("f1", "Shop", two, "1 A St"), note("f2", "Shop", two, "1 A St"), note("s", "Shop", ELEVATOR, "1 A St")];
    const gs = findRepeats(ns, WITHIN);
    expect(gs.map((g) => [g.kind, g.kept.id, ids(g.repeats)])).toEqual([
      ["same", "f1", ["f2"]],
      ["within", "f1", ["s"]],
    ]);
    expect(new Set(gs.map(groupId)).size).toBe(2);
    const r = removeRepeats(ns, gs, gs.map((g) => g.key));
    expect(ids(r.kept)).toEqual(["f1"]);
    expect(checkRepeats(repeatFiles(r, TODAY).copy, ns, r).ok).toBe(true);
  });
});

describe("repeatsCsv", () => {
  it("has a row for each note taken out with the note kept, a BOM and CRLF", () => {
    const gs = findRepeats(NOTES, DEFAULT_REPEATS);
    const csv = repeatsCsv(removeRepeats(NOTES, gs, gs.map((g) => g.key)));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.slice(1).trimEnd().split("\r\n")).toEqual([
      REPEAT_CSV_COLUMNS.join(","),
      "Café A,10 King St W,same,a1,2026-10-01,a2,2026-10-01",
      "Café A,10 King St W,same,a1,2026-10-01,a3,2026-10-01",
      "Bakery,20 King St W,same,b1,2026-10-01,b2,2026-10-01",
    ]);
  });

  it("guards and quotes cells a spreadsheet would read as a formula or split", () => {
    const ns = [note("x1", "=SUM(A1), Inc", [], null), note("x2", "=SUM(A1), Inc", [], null)];
    const gs = findRepeats(ns, DEFAULT_REPEATS);
    const rows = repeatsCsv(removeRepeats(ns, gs, gs.map((g) => g.key))).trimEnd().split("\r\n");
    expect(rows[1]).toBe(`"'=SUM(A1), Inc",,same,x1,2026-10-01,x2,2026-10-01`);
  });

  it("has only the header when nothing is taken out", () => {
    expect(repeatsCsv(removeRepeats(NOTES, [], []))).toBe(`\uFEFF${REPEAT_CSV_COLUMNS.join(",")}\r\n`);
  });
});

describe("sortGroups and groupId", () => {
  it("orders groups by place name in the person's language", () => {
    const ns = [note("e1", "Éclair", [], "1 A St"), note("e2", "Éclair", [], "1 A St"), note("z1", "Zebra", [], "2 A St"), note("z2", "Zebra", [], "2 A St"), note("d1", "Dôme", [], "3 A St"), note("d2", "Dôme", [], "3 A St")];
    expect(sortGroups(findRepeats(ns, DEFAULT_REPEATS), "fr").map((g) => g.kept.placeName)).toEqual(["Dôme", "Éclair", "Zebra"]);
  });

  it("orders groups for one place by the day their kept note was made", () => {
    const ns = [
      note("y1", "Shop", [], "1 A St", { createdOn: "2026-11-02" }),
      note("y2", "Shop", [], "1 A St", { createdOn: "2026-11-02" }),
      note("x1", "Shop", [], "1 A St", { createdOn: "2026-10-05" }),
      note("x2", "Shop", [], "1 A St", { createdOn: "2026-10-05" }),
    ];
    expect(sortGroups(findRepeats(ns, DEFAULT_REPEATS), "en").map((g) => g.kept.id)).toEqual(["x1", "y1"]);
  });

  it("gives each group an id from its place and its kept note", () => {
    const g = findRepeats(NOTES, DEFAULT_REPEATS)[0] as RepeatGroup;
    expect(groupId(g)).toBe(`${placeId(g.kept)}-a1`);
    expect(groupId(g)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("removeRepeats and checkRepeats", () => {
  const groups = (): RepeatGroup[] => findRepeats(NOTES, DEFAULT_REPEATS);

  it("takes out the repeats of the chosen groups only, keeping the file's order", () => {
    const gs = groups();
    const r = removeRepeats(NOTES, gs, [gs[0]?.key ?? ""]);
    expect(ids(r.kept)).toEqual(["a1", "b1", "b2", "k1"]);
    expect(ids(r.removed)).toEqual(["a2", "a3"]);
    expect(r.groups).toHaveLength(1);
  });

  it("takes out nothing when no group is chosen", () => {
    const r = removeRepeats(NOTES, groups(), []);
    expect(r.kept).toEqual(NOTES);
    expect(r.removed).toEqual([]);
  });

  it("reads back a copy with every kept note and the same answers", () => {
    const gs = groups();
    const r = removeRepeats(NOTES, gs, gs.map((g) => g.key));
    const files = repeatFiles(r, TODAY);
    expect(checkRepeats(files.copy, NOTES, r)).toEqual({ ok: true, notes: 3 });
    expect(JSON.parse(files.removed).notes.map((n: Note) => n.id)).toEqual(["a2", "b2", "a3"]);
    expect(JSON.parse(files.copy).exportedOn).toBe("2026-11-21");
  });

  it("refuses a copy the App cannot read, or with notes missing", () => {
    const gs = groups();
    const r = removeRepeats(NOTES, gs, gs.map((g) => g.key));
    expect(checkRepeats("{", NOTES, r)).toEqual({ ok: false, reason: "unreadable" });
    expect(checkRepeats(exportNotes(r.kept.slice(1), "2026-11-21"), NOTES, r)).toEqual({ ok: false, reason: "count" });
  });

  it("refuses a copy that still holds a repeat taken out", () => {
    const gs = groups();
    const r = removeRepeats(NOTES, gs, gs.map((g) => g.key));
    const swapped = [...r.kept.slice(1), r.removed[0] as Note];
    expect(checkRepeats(exportNotes(swapped, "2026-11-21"), NOTES, r)).toEqual({ ok: false, reason: "left-in" });
  });

  it("refuses a copy where a kept note changed", () => {
    const gs = groups();
    const r = removeRepeats(NOTES, gs, gs.map((g) => g.key));
    const changed = r.kept.map((n) => (n.id === "k1" ? { ...n, note: "changed" } : n));
    expect(checkRepeats(exportNotes(changed, "2026-11-21"), NOTES, r)).toEqual({ ok: false, reason: "changed" });
  });

  it("refuses a removal that would change a place's answers", () => {
    // A note that is not a repeat, taken out by hand, leaves its place with no answer.
    const ns = [note("c1", "Clinic", ELEVATOR, "5 B St"), note("c2", "Clinic", [], "5 B St")];
    const bad = { kept: [ns[1] as Note], removed: [ns[0] as Note], groups: [] };
    expect(checkRepeats(exportNotes(bad.kept, "2026-11-21"), ns, bad)).toEqual({ ok: false, reason: "answers" });
  });

  it("keeps answers when the repeats taken out held records too", () => {
    const ns = [note("r1", "Rink", [{ key: "elevator", value: "no" }], "9 C St"), note("r2", "Rink", [{ key: "elevator", value: "no" }], "9 C St"), note("r3", "Rink", [{ key: "elevator", value: "yes", on: "2026-09-01" }], "9 C St")];
    const gs = findRepeats(ns, DEFAULT_REPEATS);
    const r = removeRepeats(ns, gs, gs.map((g) => g.key));
    expect(ids(r.removed)).toEqual(["r2"]);
    expect(checkRepeats(repeatFiles(r, TODAY).copy, ns, r).ok).toBe(true);
  });
});

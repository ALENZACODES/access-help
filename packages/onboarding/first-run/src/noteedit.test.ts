import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, auditCopy, memoryStore, parseNote, type Note } from "./index";
import {
  CORRECTIONS_KEY,
  EDIT_COPY,
  MAX_CORRECTIONS,
  changeText,
  changeValue,
  correctNote,
  correctionDetails,
  correctionLine,
  correctionsOf,
  diffNotes,
  editStrings,
  editable,
  formFromNote,
  lastCorrection,
  loadCorrections,
  logCorrection,
  parseCorrections,
  partLabel,
  pruneCorrections,
  saveCorrections,
  type Correction,
} from "./noteedit";
import { testNote, type TestRecord } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
/** A note the person made: every Yes or No says "Contributor report". */
const mine = (id: string, name: string, records: TestRecord[]): Note => testNote(id, name, records.map((r) => ({ source: CONTRIBUTOR_SOURCE, ...r })));
const own = (): Note => ({
  ...mine("n1", "Library", [{ key: "elevator", value: "yes", on: "2026-11-10" }, { key: "step-free-entry", value: "no", on: "2026-11-10" }]),
  note: "Ramp at the side",
  createdOn: "2026-11-10",
});

describe("which notes can be corrected", () => {
  it("allows the person's own notes, with one date and one licence", () => {
    expect(editable(own())).toBe("editable");
  });

  it("refuses notes from another source, even partly", () => {
    const other = testNote("o1", "Arena", [{ key: "elevator", value: "yes", source: "City open data" }]);
    expect(editable(other)).toBe("not-own");
    const half = mine("o2", "Arena", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "no", source: "City open data" }]);
    expect(editable(half)).toBe("not-own");
    expect(formFromNote(other)).toBeUndefined();
  });

  it("refuses own notes whose details have different dates or licences", () => {
    expect(editable(mine("m1", "Pool", [{ key: "elevator", value: "yes", on: "2026-01-01" }, { key: "automatic-door", value: "no", on: "2026-02-01" }]))).toBe("mixed");
    expect(editable(mine("m2", "Pool", [{ key: "elevator", value: "yes", licence: "CC0-1.0" }, { key: "automatic-door", value: "no", licence: "ODbL-1.0" }]))).toBe("mixed");
  });

  it("refuses a note with nothing but UNKNOWN, which has no provenance to keep", () => {
    expect(editable({ ...own(), facts: own().facts.map((f) => ({ key: f.key, value: "unknown" as const, provenance: undefined })) })).toBe("not-own");
  });
});

describe("the form values", () => {
  it("carry the note's place, details, date, licence and text", () => {
    expect(formFromNote(own())).toEqual({
      placeName: "Library",
      address: "1 Main St",
      details: { "step-free-entry": "no", "accessible-washroom": "unknown", "automatic-door": "unknown", elevator: "yes" },
      observedOn: "2026-11-10",
      licence: "CC0-1.0",
      note: "Ramp at the side",
    });
  });
});

describe("correctNote", () => {
  it("keeps the id and the day first added, and rebuilds provenance by the form's rules", () => {
    const values = { ...(formFromNote(own()) ?? ({} as never)), details: { ...(formFromNote(own())?.details ?? ({} as never)), elevator: "no" as const }, observedOn: "2026-11-18" };
    const after = correctNote(own(), values, TODAY);
    expect(after.id).toBe("n1");
    expect(after.createdOn).toBe("2026-11-10");
    expect(after.facts.find((f) => f.key === "elevator")).toEqual({ key: "elevator", value: "no", provenance: { source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0", recordedOn: "2026-11-18" } });
    expect(parseNote(JSON.parse(JSON.stringify(after)))).toEqual(after);
  });

  it("refuses values the form would refuse", () => {
    const values = { ...(formFromNote(own()) ?? ({} as never)), licence: "" };
    expect(() => correctNote(own(), values, TODAY)).toThrow(/licence-required/);
  });
});

describe("diffNotes", () => {
  it("lists what changed, in a fixed order, and nothing when nothing changed", () => {
    const before = own();
    expect(diffNotes(before, before)).toEqual([]);
    const values = formFromNote(before);
    if (!values) throw new Error("not editable");
    const after = correctNote(before, { ...values, placeName: "Main Library", address: "", details: { ...values.details, elevator: "unknown", "automatic-door": "yes" }, note: "" }, TODAY);
    expect(diffNotes(before, after)).toEqual([
      { part: "placeName", from: "Library", to: "Main Library" },
      { part: "address", from: "1 Main St", to: "" },
      { part: "automatic-door", from: "unknown", to: "yes" },
      { part: "elevator", from: "yes", to: "unknown" },
      { part: "note", from: "Ramp at the side", to: "" },
    ]);
  });

  it("names the parts in both languages", () => {
    expect(partLabel("elevator", "en")).toBe("Elevator");
    expect(partLabel("address", "fr")).toBe("adresse");
    expect(partLabel("observedOn", "fr")).toBe("date d’observation");
  });
});

describe("the corrections log", () => {
  const changes = [{ part: "elevator" as const, from: "yes", to: "no" }, { part: "address" as const, from: "a", to: "b" }];

  it("adds newest first, ignores corrections that changed nothing, and keeps at most 500", () => {
    let log: Correction[] = logCorrection([], "n1", changes, new Date(Date.UTC(2026, 10, 1)));
    log = logCorrection(log, "n1", [], TODAY);
    log = logCorrection(log, "n2", changes.slice(0, 1), TODAY);
    expect(log).toEqual([
      { noteId: "n2", on: "2026-11-19", parts: ["elevator"], changes: [{ part: "elevator", from: "yes", to: "no" }] },
      { noteId: "n1", on: "2026-11-01", parts: ["elevator", "address"], changes },
    ]);
    expect(lastCorrection(log, "n1")?.on).toBe("2026-11-01");
    expect(lastCorrection(log, "nx")).toBeUndefined();
    let big: Correction[] = [];
    for (let i = 0; i < MAX_CORRECTIONS + 20; i++) big = logCorrection(big, `n${i}`, changes, TODAY);
    expect(big).toHaveLength(MAX_CORRECTIONS);
    expect(big[0]?.noteId).toBe(`n${MAX_CORRECTIONS + 19}`);
  });

  it("drops corrections of notes that no longer exist", () => {
    const log = logCorrection(logCorrection([], "n1", changes, TODAY), "n2", changes, TODAY);
    expect(pruneCorrections(log, new Set(["n2"])).map((c) => c.noteId)).toEqual(["n2"]);
  });

  it("says when and what, in both languages", () => {
    const c: Correction = { noteId: "n1", on: "2026-11-19", parts: ["elevator", "address"] };
    expect(correctionLine(c, "en")).toBe("Corrected on 2026-11-19: Elevator, address");
    expect(correctionLine(c, "fr")).toBe("Corrigée le 2026-11-19\u00A0: Ascenseur, adresse");
  });

  it("saves, reads back, removes the key when empty, and says when the device will not keep it", () => {
    const store = memoryStore();
    const log = logCorrection([], "n1", changes, TODAY);
    expect(saveCorrections(store, log)).toBe("saved");
    expect(loadCorrections(store)).toEqual(log);
    expect(saveCorrections(store, [])).toBe("saved");
    expect(store.getItem(CORRECTIONS_KEY)).toBeNull();
    expect(saveCorrections(undefined, log)).toBe("unavailable");
    expect(saveCorrections({ getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => undefined }, log)).toBe("unavailable");
    expect(loadCorrections({ getItem: () => { throw new Error("no"); }, setItem: () => undefined, removeItem: () => undefined })).toEqual([]);
  });

  it("reads saved text defensively", () => {
    const raw = JSON.stringify([
      { noteId: "n1", on: "2026-11-19", parts: ["elevator", "elevator", "nonsense"] },
      { noteId: "bad id!", on: "2026-11-19", parts: ["elevator"] },
      { noteId: "n2", on: "2026-13-01", parts: ["elevator"] },
      { noteId: "n3", on: "2026-11-19", parts: [] },
      "junk",
    ]);
    expect(parseCorrections(raw)).toEqual([{ noteId: "n1", on: "2026-11-19", parts: ["elevator"] }]);
    expect(parseCorrections("{")).toEqual([]);
    expect(parseCorrections('{"a":1}')).toEqual([]);
    expect(parseCorrections(null)).toEqual([]);
  });
});

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(editStrings())).toEqual([]);
    expect(EDIT_COPY.mixed.fr).toContain("\u00A0:");
  });
});

describe("the history of a note", () => {
  const log = (): Correction[] =>
    logCorrection(
      logCorrection([], "n1", [{ part: "elevator", from: "unknown", to: "yes" }], new Date(Date.UTC(2026, 10, 1))),
      "n1",
      [
        { part: "elevator", from: "yes", to: "no" },
        { part: "note", from: "", to: "Ramp at the side" },
        { part: "address", from: "x".repeat(300), to: "1 Main St" },
      ],
      TODAY,
    );

  it("lists every correction of one note, newest first", () => {
    expect(correctionsOf(log(), "n1").map((c) => c.on)).toEqual(["2026-11-19", "2026-11-01"]);
    expect(correctionsOf(log(), "n2")).toEqual([]);
  });

  it("says what each part was and became, with UNKNOWN in French", () => {
    const [newest, oldest] = correctionsOf(log(), "n1");
    if (!newest || !oldest) throw new Error("no log");
    expect(correctionDetails(newest, "en")).toEqual([
      "Elevator: Yes → No",
      "extra note: (none) → “Ramp at the side”",
      `address: “${"x".repeat(200)}” → “1 Main St”`,
    ]);
    expect(correctionDetails(oldest, "fr")).toEqual(["Ascenseur\u00A0: UNKNOWN → Oui"]);
    expect(changeText({ part: "placeName", from: "Bibli", to: "Bibliothèque" }, "fr")).toBe("nom du lieu\u00A0: «\u202FBibli\u202F» → «\u202FBibliothèque\u202F»");
    expect(changeValue("note", "", "fr")).toBe("(aucune)");
  });

  it("shows only the parts for an older log with no values, and reads such logs back", () => {
    const old = parseCorrections(JSON.stringify([{ noteId: "n1", on: "2026-11-19", parts: ["elevator", "address"] }]));
    expect(old[0]?.changes).toBeUndefined();
    expect(correctionDetails(old[0] as Correction, "en")).toEqual(["Elevator", "address"]);
  });

  it("keeps values through saving and drops values it cannot trust", () => {
    expect(parseCorrections(JSON.stringify(log()))).toEqual(log());
    const raw = JSON.stringify([
      { noteId: "n1", on: "2026-11-19", parts: ["elevator"], changes: [{ part: "elevator", from: "yes", to: "no" }, { part: "nope", from: "a", to: "b" }, { part: "address", from: 3, to: "b" }, { part: "note", from: "y".repeat(201), to: "" }] },
    ]);
    expect(parseCorrections(raw)[0]?.changes).toEqual([{ part: "elevator", from: "yes", to: "no" }]);
  });
});

describe("licence changes", () => {
  it("compares the licence on the details, not the note's own field", () => {
    const n = { ...own(), licence: "ODbL-1.0" };
    const values = formFromNote(n);
    if (!values) throw new Error("not editable");
    expect(diffNotes(n, correctNote(n, values, TODAY))).toEqual([]);
    expect(diffNotes(n, correctNote(n, { ...values, licence: "CC-BY-4.0" }, TODAY))).toEqual([{ part: "licence", from: "CC0-1.0", to: "CC-BY-4.0" }]);
  });
});

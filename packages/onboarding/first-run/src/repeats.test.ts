import { describe, expect, it } from "vitest";
import {
  CONTRIBUTOR_SOURCE,
  COPY,
  distinctRecords,
  extraCopies,
  findBanned,
  findRepeats,
  frenchTypographyIssues,
  groupPlaces,
  hasAllParts,
  placeRepeats,
  recordKey,
  repeatGroups,
  repeatLine,
  repeatsFilename,
  repeatsToText,
  reportCount,
  timesSaved,
  type Note,
  type Place,
} from "./index";
import { testNote, type TestRecord } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 15));
const LIFT: TestRecord = { key: "elevator", value: "yes", on: "2026-05-05" };

const NOTES = (): Note[] => [
  // Library: the same elevator record three times, and a different one once.
  testNote("l1", "Library", [LIFT, { key: "automatic-door", value: "no", on: "2026-06-06" }]),
  testNote("l2", "Library", [LIFT]),
  testNote("l3", "Library", [LIFT, { key: "automatic-door", value: "no", on: "2026-06-07" }]),
  testNote("l4", "Library", [{ key: "elevator", value: "yes", on: "2026-05-06" }]),
  // Bakery: two reports that agree but are not the same record.
  testNote("b1", "Bakery", [{ key: "elevator", value: "no", on: "2026-01-01" }], "2 Main St"),
  testNote("b2", "Bakery", [{ key: "elevator", value: "no", on: "2026-01-01", source: CONTRIBUTOR_SOURCE }], "2 Main St"),
  // Annex: one record twice.
  testNote("x2", "Annex", [{ key: "accessible-washroom", value: "no", on: "2025-02-02" }], "3 Main St"),
  testNote("x1", "Annex", [{ key: "accessible-washroom", value: "no", on: "2025-02-02" }], "3 Main St"),
  testNote("d1", "Dojo", [], "4 Main St"),
];

const places = (notes: Note[] = NOTES()): Place[] => groupPlaces(notes, "en");
const byName = (name: string, list: Place[] = places()): Place => {
  const p = list.find((x) => x.name === name);
  if (!p) throw new Error(`no place ${name}`);
  return p;
};
const prov = (over: Partial<{ source: string; licence: string; recordedOn: string }> = {}) => ({
  source: "City survey",
  licence: "CC0-1.0",
  recordedOn: "2026-05-05",
  ...over,
});

describe("when two records are the same record", () => {
  it("needs the same answer, source, licence and date", () => {
    const base = recordKey({ value: "yes", provenance: prov() });
    expect(recordKey({ value: "yes", provenance: prov() })).toBe(base);
    expect(recordKey({ value: "no", provenance: prov() })).not.toBe(base);
    expect(recordKey({ value: "yes", provenance: prov({ source: "Town open data" }) })).not.toBe(base);
    expect(recordKey({ value: "yes", provenance: prov({ licence: "CC-BY-4.0" }) })).not.toBe(base);
    expect(recordKey({ value: "yes", provenance: prov({ recordedOn: "2026-05-06" }) })).not.toBe(base);
  });

  it("is exact about the source: case and spaces count", () => {
    const base = recordKey({ value: "yes", provenance: prov() });
    expect(recordKey({ value: "yes", provenance: prov({ source: "city survey" }) })).not.toBe(base);
    expect(recordKey({ value: "yes", provenance: prov({ source: "City  survey" }) })).not.toBe(base);
  });

  it("cannot be confused by a source that contains the separator of another field", () => {
    const a = recordKey({ value: "yes", provenance: prov({ source: 'A","CC0-1.0', licence: "CC-BY-4.0" }) });
    const b = recordKey({ value: "yes", provenance: prov({ source: "A", licence: "CC0-1.0" }) });
    expect(a).not.toBe(b);
  });
});

describe("repeats in one place", () => {
  it("groups the notes that hold the same record, sorted by note id", () => {
    expect(placeRepeats(byName("Library"))).toEqual([
      { key: "elevator", value: "yes", provenance: prov(), noteIds: ["l1", "l2", "l3"] },
    ]);
    expect(placeRepeats(byName("Annex"))[0]?.noteIds).toEqual(["x1", "x2"]);
  });

  it("does not treat reports that agree as repeats when the source or the day differs", () => {
    expect(placeRepeats(byName("Bakery"))).toEqual([]);
    expect(placeRepeats(byName("Dojo"))).toEqual([]);
  });

  it("counts different records, so a record saved three times counts once", () => {
    const library = byName("Library");
    expect(reportCount(library.resolutions.elevator)).toBe(4);
    expect(distinctRecords(library, "elevator")).toBe(2);
    expect(distinctRecords(library, "automatic-door")).toBe(2);
    expect(distinctRecords(library, "step-free-entry")).toBe(0);
    expect(distinctRecords(byName("Bakery"), "elevator")).toBe(2);
  });

  it("finds repeats among reports that differ too", () => {
    const list = places([
      testNote("a", "Hall", [{ key: "elevator", value: "yes", on: "2026-01-01" }]),
      testNote("b", "Hall", [{ key: "elevator", value: "no", on: "2026-02-02" }]),
      testNote("c", "Hall", [{ key: "elevator", value: "no", on: "2026-02-02" }]),
    ]);
    expect(byName("Hall", list).resolutions.elevator.kind).toBe("differ");
    expect(placeRepeats(byName("Hall", list)).map((g) => [g.value, g.noteIds])).toEqual([["no", ["b", "c"]]]);
  });

  it("orders groups by detail, then newest first, the same way whatever the stored order", () => {
    const notes = [
      testNote("a", "Hall", [{ key: "elevator", value: "yes", on: "2025-01-01" }, { key: "step-free-entry", value: "no", on: "2024-01-01" }]),
      testNote("b", "Hall", [{ key: "elevator", value: "yes", on: "2025-01-01" }, { key: "step-free-entry", value: "no", on: "2024-01-01" }]),
      testNote("c", "Hall", [{ key: "elevator", value: "no", on: "2026-01-01" }]),
      testNote("d", "Hall", [{ key: "elevator", value: "no", on: "2026-01-01" }]),
    ];
    const want = placeRepeats(byName("Hall", places(notes)));
    expect(want.map((g) => `${g.key}|${g.provenance.recordedOn}`)).toEqual(["step-free-entry|2024-01-01", "elevator|2026-01-01", "elevator|2025-01-01"]);
    expect(placeRepeats(byName("Hall", places([...notes].reverse())))).toEqual(want);
  });
});

describe("repeats across places", () => {
  it("lists only places with a repeat, by name", () => {
    expect(findRepeats(places()).map((p) => p.place.name)).toEqual(["Annex", "Library"]);
  });

  it("counts groups and the copies beyond the first", () => {
    const list = findRepeats(places());
    expect(repeatGroups(list)).toBe(2);
    expect(extraCopies(list)).toBe(1 + 2);
  });

  it("explains exactly the gap between reports and different records", () => {
    const all = places();
    const list = findRepeats(all);
    let reports = 0;
    let distinct = 0;
    for (const p of all) {
      for (const key of ["step-free-entry", "accessible-washroom", "automatic-door", "elevator"] as const) {
        reports += reportCount(p.resolutions[key]);
        distinct += distinctRecords(p, key);
      }
    }
    expect(reports - distinct).toBe(extraCopies(list));
  });

  it("is empty with no places or no repeats, and changes nothing it was given", () => {
    expect(findRepeats([])).toEqual([]);
    expect(extraCopies([])).toBe(0);
    const all = places();
    const before = JSON.stringify(all);
    findRepeats(all);
    expect(JSON.stringify(all)).toBe(before);
  });
});

describe("wording", () => {
  it("says how often a record was saved", () => {
    expect(timesSaved(2, "en")).toBe("Saved 2 times");
    expect(timesSaved(3, "fr")).toBe("Enregistrée 3 fois");
  });

  it("writes one line with the detail, the answer, all four parts of the record and the count", () => {
    const g = placeRepeats(byName("Library"))[0];
    if (!g) throw new Error("no group");
    expect(repeatLine(g, "en")).toBe("Elevator: Yes. City survey · CC0-1.0 · 2026-05-05 · Tier 0, not reviewed. Saved 3 times.");
    expect(repeatLine(g, "fr")).toBe("Ascenseur\u00A0: Oui. City survey · CC0-1.0 · 2026-05-05 · Niveau 0, non examiné. Enregistrée 3 fois.");
    for (const l of ["en", "fr"] as const) expect(hasAllParts(repeatLine(g, l), g.provenance, l)).toBe(true);
  });

  it("uses French typography and no banned wording", () => {
    for (const pair of Object.values(COPY.repeats)) {
      expect(frenchTypographyIssues(pair.fr), pair.fr).toEqual([]);
      for (const text of [pair.en, pair.fr]) expect(findBanned(text), text).toBeUndefined();
    }
  });

  it("says it removes nothing", () => {
    expect(COPY.repeats.oneRecord.en).toContain("removes nothing");
    expect(COPY.repeats.oneRecord.fr).toContain("ne supprime rien");
  });
});

describe("the list as text", () => {
  it("has a block for each place and a line for each repeated record", () => {
    const list = findRepeats(places());
    const text = repeatsToText(list, "en", TODAY);
    expect(text.startsWith("Records saved more than once\n============================\n")).toBe(true);
    expect(text).toContain("Extra copies: 3");
    expect(text).toContain("Annex\n-----\n3 Main St\n- Accessible washroom: No. City survey · CC0-1.0 · 2025-02-02 · Tier 0, not reviewed. Saved 2 times.");
    expect(text.split("\n").filter((x) => x.startsWith("- "))).toHaveLength(repeatGroups(list));
    expect(text).not.toContain("Bakery");
    expect(text.endsWith("Made on 2026-11-15.\n")).toBe(true);
  });

  it("says so when nothing is saved twice", () => {
    const text = repeatsToText([], "en", TODAY);
    expect(text).toContain("No record is saved more than once.");
    expect(text).not.toContain("Extra copies");
  });

  it("is in step in both languages, with French typography", () => {
    const list = findRepeats(places());
    const fr = repeatsToText(list, "fr", TODAY);
    expect(fr.split("\n")).toHaveLength(repeatsToText(list, "en", TODAY).split("\n").length);
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(fr).toContain("Copies en trop\u00A0: 3");
  });

  it("names the file after the day and the language", () => {
    expect(repeatsFilename(TODAY, "en")).toBe("repeated-records-2026-11-15-en.txt");
    expect(repeatsFilename(TODAY, "fr")).toBe("donnees-en-double-2026-11-15-fr.txt");
  });
});

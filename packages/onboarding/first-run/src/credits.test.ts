import { describe, expect, it } from "vitest";
import { importNotes } from "./exchange";
import {
  CREDITS_CSV_COLUMNS,
  RECORDS_CSV_COLUMNS,
  collectCredits,
  creditsCsv,
  excludeLicences,
  excludedFile,
  licencesInFile,
  makeCopy,
  recordsCsv,
  renameSources,
  renamesFor,
  sourceKey,
  sourceVariants,
} from "./credits";
import type { Note } from "./model";
import { TEST_SOURCE, testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

const withLicence = (n: Note, licence: string): Note => ({ ...n, licence });

/**
 * a: City survey CC0 (elevator, 2026-01-05) and Open data CC-BY (washroom, 2025-03-01).
 * b: Open data CC-BY (elevator, 2026-02-01), Walk group ODbL (door, 2026-05-01); note licence ODbL.
 * c: nothing recorded; note licence CC-BY-SA.
 */
function notes(): Note[] {
  return [
    testNote("a", "Library", [
      { key: "elevator", value: "yes", on: "2026-01-05" },
      { key: "accessible-washroom", value: "no", on: "2025-03-01", source: "Open data", licence: "CC-BY-4.0" },
    ]),
    withLicence(
      testNote("b", "Café", [
        { key: "elevator", value: "no", on: "2026-02-01", source: "Open data", licence: "CC-BY-4.0" },
        { key: "automatic-door", value: "yes", on: "2026-05-01", source: "Walk group", licence: "ODbL-1.0" },
      ]),
      "ODbL-1.0",
    ),
    withLicence(testNote("c", "Kiosk", []), "CC-BY-SA-4.0"),
  ];
}

describe("collectCredits", () => {
  const c = collectCredits(notes());

  it("groups the records by licence, then source, with counts and date ranges", () => {
    expect(c.licences.map((l) => [l.licence, l.records, l.notes])).toEqual([
      ["CC-BY-4.0", 2, 0],
      ["CC0-1.0", 1, 1],
      ["ODbL-1.0", 1, 1],
      ["CC-BY-SA-4.0", 0, 1],
    ]);
    expect(c.licences[0]?.sources).toEqual([{ source: "Open data", licence: "CC-BY-4.0", records: 2, oldest: "2025-03-01", newest: "2026-02-01" }]);
    expect(c.licences[1]?.sources[0]).toMatchObject({ source: TEST_SOURCE, records: 1, oldest: "2026-01-05", newest: "2026-01-05" });
  });

  it("counts records, notes and distinct sources", () => {
    expect([c.records, c.notes, c.sources]).toEqual([4, 3, 3]);
  });

  it("lists a licence carried only by a note, with no sources", () => {
    expect(c.licences.find((l) => l.licence === "CC-BY-SA-4.0")?.sources).toEqual([]);
    expect(licencesInFile(c)).toEqual(["CC-BY-4.0", "CC0-1.0", "ODbL-1.0", "CC-BY-SA-4.0"]);
  });

  it("puts licences with equal records in the App's licence order, and sources with equal records by name", () => {
    const two = collectCredits([
      testNote("x", "X", [
        { key: "elevator", value: "yes", source: "Zed", licence: "ODbL-1.0" },
        { key: "automatic-door", value: "yes", source: "Ann", licence: "ODbL-1.0" },
        { key: "step-free-entry", value: "no", source: "Bo", licence: "CC-BY-4.0" },
      ]),
    ]);
    expect(two.licences.map((l) => l.licence)).toEqual(["ODbL-1.0", "CC-BY-4.0", "CC0-1.0"]);
    expect(two.licences[0]?.sources.map((s) => s.source)).toEqual(["Ann", "Zed"]);
  });

  it("has nothing to credit for an empty set of notes", () => {
    expect(collectCredits([])).toEqual({ licences: [], records: 0, notes: 0, sources: 0 });
  });
});

describe("excludeLicences", () => {
  it("leaves out records under the chosen licences, so those details have no record in the copy", () => {
    const e = excludeLicences(notes(), ["CC-BY-4.0"]);
    expect(e.notes.map((n) => n.id)).toEqual(["a", "b", "c"]);
    const a = e.notes[0];
    expect(a?.facts.map((f) => [f.key, f.value])).toEqual([
      ["step-free-entry", "unknown"],
      ["accessible-washroom", "unknown"],
      ["automatic-door", "unknown"],
      ["elevator", "yes"],
    ]);
    expect(a?.facts.find((f) => f.key === "accessible-washroom")?.provenance).toBeUndefined();
    expect([e.droppedNotes, e.droppedRecords, e.keptRecords]).toEqual([0, 2, 2]);
  });

  it("leaves out whole notes whose own licence is chosen", () => {
    const e = excludeLicences(notes(), ["ODbL-1.0"]);
    expect(e.notes.map((n) => n.id)).toEqual(["a", "c"]);
    expect([e.droppedNotes, e.droppedRecords, e.keptRecords]).toEqual([1, 0, 2]);
  });

  it("changes nothing else: kept records keep their value, source, licence and date", () => {
    const before = notes()[0];
    const after = excludeLicences(notes(), ["ODC-By-1.0"]).notes[0];
    expect(after).toEqual(before);
  });

  it("makes a copy the App reads back the same, and credits the copy without the licence left out", () => {
    const e = excludeLicences(notes(), ["CC-BY-4.0"]);
    const back = importNotes(excludedFile(e, TODAY));
    expect(back.error).toBeUndefined();
    expect(back.notes).toEqual(e.notes);
    expect(collectCredits(back.notes).licences.map((l) => l.licence)).not.toContain("CC-BY-4.0");
  });
});

describe("creditsCsv", () => {
  it("has a row per source and licence, guarded", () => {
    const lines = creditsCsv(collectCredits(notes())).replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines).toEqual([
      CREDITS_CSV_COLUMNS.join(","),
      "CC-BY-4.0,Open data,2,2025-03-01,2026-02-01",
      `CC0-1.0,${TEST_SOURCE},1,2026-01-05,2026-01-05`,
      "ODbL-1.0,Walk group,1,2026-05-01,2026-05-01",
    ]);
    const evil = creditsCsv(collectCredits([testNote("e", "E", [{ key: "elevator", value: "yes", source: "=cmd|x" }])]));
    expect(evil).toContain("'=cmd|x");
  });
});

describe("sources written more than one way", () => {
  const spelled = (): Note[] => [
    testNote("a", "A", [
      { key: "elevator", value: "yes", source: "City Survey" },
      { key: "automatic-door", value: "no", source: "City Survey" },
      { key: "step-free-entry", value: "yes", source: "city survey." },
    ]),
    testNote("b", "B", [
      { key: "elevator", value: "no", source: "Ville  de Montréal" },
      { key: "automatic-door", value: "yes", source: "ville de montreal", licence: "CC-BY-4.0" },
      { key: "accessible-washroom", value: "yes", source: "Walk group" },
    ]),
  ];

  it("groups spellings that differ only by case, accents, spaces or punctuation", () => {
    expect(sourceKey(" Ville  de Montréal. ")).toBe("ville de montreal");
    expect(sourceVariants(spelled())).toEqual([
      { key: "city survey", spellings: [{ source: "City Survey", records: 2 }, { source: "city survey.", records: 1 }] },
      { key: "ville de montreal", spellings: [{ source: "Ville  de Montréal", records: 1 }, { source: "ville de montreal", records: 1 }] },
    ]);
  });

  it("finds no groups when every source is written one way", () => {
    expect(sourceVariants(notes())).toEqual([]);
  });

  it("writes the other spellings of a group as the one picked, and nothing else", () => {
    const renames = renamesFor(sourceVariants(spelled()), { "city survey": "City Survey", "unknown key": "X" });
    expect(renames).toEqual({ "city survey.": "City Survey" });
    const r = renameSources(spelled(), renames);
    expect(r.renamed).toBe(1);
    const fact = r.notes[0]?.facts.find((f) => f.key === "step-free-entry");
    expect(fact?.provenance).toMatchObject({ source: "City Survey", licence: "CC0-1.0" });
    expect(fact?.value).toBe("yes");
    expect(r.notes[1]).toEqual(spelled()[1]);
  });

  it("ignores a pick that is not one of the group's own spellings, and never gives a source another source's name", () => {
    expect(renamesFor(sourceVariants(spelled()), { "city survey": "Walk group" })).toEqual({});
    expect(renameSources(spelled(), { "Walk group": "City Survey" }).renamed).toBe(0);
  });

  it("makes a copy with both choices, keeping each record's licence and date", () => {
    const renames = renamesFor(sourceVariants(spelled()), { "ville de montreal": "Ville  de Montréal" });
    const c = makeCopy(spelled(), ["CC-BY-4.0"], renames);
    // The CC-BY record of "ville de montreal" is left out before renaming, so nothing is renamed.
    expect([c.droppedRecords, c.renamed]).toEqual([1, 0]);
    const c2 = makeCopy(spelled(), [], renames);
    expect(c2.renamed).toBe(1);
    expect(c2.notes[1]?.facts.find((f) => f.key === "automatic-door")?.provenance).toMatchObject({ source: "Ville  de Montréal", licence: "CC-BY-4.0" });
    // Five spellings in the file; the two of Montréal are now one.
    expect(collectCredits(spelled()).sources).toBe(5);
    expect(collectCredits(c2.notes).sources).toBe(4);
  });
});

describe("recordsCsv", () => {
  it("has a row for each Yes or No with its place, source, licence, date and note", () => {
    const lines = recordsCsv(notes()).replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines).toEqual([
      RECORDS_CSV_COLUMNS.join(","),
      `Library,1 Main St,accessible-washroom,no,Open data,CC-BY-4.0,2025-03-01,a`,
      `Library,1 Main St,elevator,yes,${TEST_SOURCE},CC0-1.0,2026-01-05,a`,
      "Café,1 Main St,automatic-door,yes,Walk group,ODbL-1.0,2026-05-01,b",
      "Café,1 Main St,elevator,no,Open data,CC-BY-4.0,2026-02-01,b",
    ]);
  });

  it("guards cells and has only the header for notes with no record", () => {
    expect(recordsCsv([testNote("e", "=Evil", [{ key: "elevator", value: "yes" }])])).toContain("'=Evil");
    expect(recordsCsv([testNote("k", "Kiosk", [])]).replace(/^\uFEFF/, "").trimEnd()).toBe(RECORDS_CSV_COLUMNS.join(","));
  });
});

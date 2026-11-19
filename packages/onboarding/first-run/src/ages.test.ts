import { describe, expect, it } from "vitest";
import {
  AGE_BANDS,
  COPY,
  FACT_KEYS,
  ageRange,
  agesConsistent,
  agesFilename,
  agesReport,
  agesToText,
  bandLabel,
  bandOf,
  findBanned,
  frenchTypographyIssues,
  groupPlaces,
  type AgeRow,
  type Note,
} from "./index";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 15));

const NOTES = (): Note[] => [
  testNote("a1", "Archive", [
    { key: "elevator", value: "yes", on: "2026-10-01" },
    { key: "automatic-door", value: "yes", on: "2026-03-01" },
  ]),
  testNote("a2", "Archive", [{ key: "elevator", value: "no", on: "2025-06-01" }]),
  testNote("b1", "Bakery", [{ key: "elevator", value: "no", on: "2023-01-01" }], "2 Main St"),
  testNote("d1", "Dojo", [], "4 Main St"),
];

const report = (notes: Note[] = NOTES()) => agesReport(groupPlaces(notes, "en"), TODAY);
const rowFor = (key: string, notes?: Note[]): AgeRow => {
  const r = report(notes).rows.find((x) => x.key === key);
  if (!r) throw new Error(`no row ${key}`);
  return r;
};

describe("age bands", () => {
  it("puts whole months into four bands with no gap and no overlap", () => {
    expect([0, 1, 2].map(bandOf)).toEqual(["under3", "under3", "under3"]);
    expect([3, 6, 11].map(bandOf)).toEqual(["under12", "under12", "under12"]);
    expect([12, 18, 23].map(bandOf)).toEqual(["under24", "under24", "under24"]);
    expect([24, 60, 600].map(bandOf)).toEqual(["over24", "over24", "over24"]);
  });

  it("gives every age from 0 to 100 months exactly one band, never going back", () => {
    let last = 0;
    for (let m = 0; m <= 100; m++) {
      const i = AGE_BANDS.indexOf(bandOf(m));
      expect(i).toBeGreaterThanOrEqual(last);
      last = i;
    }
    expect(last).toBe(AGE_BANDS.length - 1);
  });

  it("counts a date in the future as the newest band", () => {
    expect(bandOf(-1)).toBe("under3");
    expect(rowFor("elevator", [testNote("f", "Future", [{ key: "elevator", value: "yes", on: "2027-01-01" }])]).bands.under3).toBe(1);
  });

  it("has a label for every band in both languages, and they all differ", () => {
    for (const l of ["en", "fr"] as const) expect(new Set(AGE_BANDS.map((b) => bandLabel(b, l))).size).toBe(AGE_BANDS.length);
    expect(bandLabel("under3", "en")).toBe("Under 3 months");
    expect(bandLabel("over24", "fr")).toBe("2 ans ou plus");
  });
});

describe("the report", () => {
  it("has a row for each detail in the usual order", () => {
    expect(report().rows.map((r) => r.key)).toEqual([...FACT_KEYS]);
  });

  it("counts every record in its band, including each of two reports that differ", () => {
    expect(rowFor("elevator")).toEqual({
      key: "elevator",
      bands: { under3: 1, under12: 0, under24: 1, over24: 1 },
      records: 3,
      unknownPlaces: 1,
      newest: "2026-10-01",
      oldest: "2023-01-01",
    });
    expect(rowFor("automatic-door").bands).toEqual({ under3: 0, under12: 1, under24: 0, over24: 0 });
  });

  it("counts places with no record apart and never as a record", () => {
    const r = rowFor("step-free-entry");
    expect(r.records).toBe(0);
    expect(r.unknownPlaces).toBe(3);
    expect(r.newest).toBeUndefined();
    expect(r.oldest).toBeUndefined();
  });

  it("adds up: rows, totals, and records a year old or more", () => {
    const r = report();
    expect(r.totals).toEqual({ under3: 1, under12: 1, under24: 1, over24: 1 });
    expect(r.records).toBe(4);
    expect(r.old).toBe(2);
    expect(r.places).toBe(3);
    expect(agesConsistent(r)).toBe(true);
  });

  it("matches the number of Yes and No details held in the notes", () => {
    const held = NOTES().reduce((n, note) => n + note.facts.filter((f) => f.value !== "unknown").length, 0);
    expect(report().records).toBe(held);
  });

  it("notices a report that does not add up", () => {
    const r = report();
    expect(agesConsistent({ ...r, records: r.records + 1 })).toBe(false);
    expect(agesConsistent({ ...r, old: r.old + 1 })).toBe(false);
    expect(agesConsistent({ ...r, totals: { ...r.totals, under3: 9 } })).toBe(false);
    const rows = r.rows.map((row, i) => (i === 3 ? { ...row, records: row.records + 1 } : row));
    expect(agesConsistent({ ...r, rows })).toBe(false);
  });

  it("is all zero with no places, and still consistent", () => {
    const r = agesReport([], TODAY);
    expect(r.records).toBe(0);
    expect(r.places).toBe(0);
    expect(r.rows.every((row) => row.records === 0 && row.unknownPlaces === 0)).toBe(true);
    expect(agesConsistent(r)).toBe(true);
  });

  it("moves a record from band to band as the day changes, and never loses it", () => {
    const places = groupPlaces([testNote("x", "Library", [{ key: "elevator", value: "yes", on: "2026-01-15" }])], "en");
    const at = (y: number, m: number, d: number): string => {
      const r = agesReport(places, new Date(Date.UTC(y, m - 1, d)));
      expect(r.records).toBe(1);
      return AGE_BANDS.find((b) => r.totals[b] === 1) ?? "";
    };
    expect(at(2026, 4, 14)).toBe("under3");
    expect(at(2026, 4, 15)).toBe("under12");
    expect(at(2027, 1, 14)).toBe("under12");
    expect(at(2027, 1, 15)).toBe("under24");
    expect(at(2028, 1, 15)).toBe("over24");
  });
});

describe("date range", () => {
  it("shows both ends, one date when they are the same, and a dash with no record", () => {
    expect(ageRange({ oldest: "2023-01-01", newest: "2026-10-01" }, "en")).toBe("2023-01-01 to 2026-10-01");
    expect(ageRange({ oldest: "2023-01-01", newest: "2026-10-01" }, "fr")).toBe("2023-01-01 au 2026-10-01");
    expect(ageRange({ oldest: "2026-03-01", newest: "2026-03-01" }, "en")).toBe("2026-03-01");
    expect(ageRange({ oldest: undefined, newest: undefined }, "fr")).toBe("–");
  });
});

describe("the counts as text", () => {
  it("lists every band for every detail, the total and the places with no record", () => {
    const text = agesToText(report(), "en", TODAY);
    expect(text.startsWith("How old the records are\n=======================\n")).toBe(true);
    expect(text).toContain("Records on this device: 4");
    expect(text).toContain("Records a year old or more: 2");
    expect(text).toContain("Elevator\n--------\n- Under 3 months: 1\n- 3 to 11 months: 0\n- 1 year to under 2: 1\n- 2 years or more: 1\n- Records: 3\n- Places with no record: 1\n- Dates recorded: 2023-01-01 to 2026-10-01\n");
    expect(text.endsWith("Made on 2026-11-15.\n")).toBe(true);
  });

  it("shows no date for a detail with no record", () => {
    const text = agesToText(report(), "en", TODAY);
    const at = text.indexOf("Step-free entrance");
    expect(text.slice(at, text.indexOf("\n\n", at))).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("is in step in both languages, with French typography", () => {
    const fr = agesToText(report(), "fr", TODAY);
    expect(fr.split("\n")).toHaveLength(agesToText(report(), "en", TODAY).split("\n").length);
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(fr).toContain("- Moins de 3 mois\u00A0: 1");
  });

  it("names the file after the day and the language", () => {
    expect(agesFilename(TODAY, "en")).toBe("record-ages-2026-11-15-en.txt");
    expect(agesFilename(TODAY, "fr")).toBe("age-des-donnees-2026-11-15-fr.txt");
  });

  it("never calls an old record wrong, and uses no banned wording", () => {
    for (const pair of Object.values(COPY.ages)) {
      for (const text of [pair.en, pair.fr]) expect(findBanned(text), text).toBeUndefined();
      expect(frenchTypographyIssues(pair.fr), pair.fr).toEqual([]);
    }
    expect(COPY.ages.notWrong.en).toContain("not shown as wrong");
  });
});

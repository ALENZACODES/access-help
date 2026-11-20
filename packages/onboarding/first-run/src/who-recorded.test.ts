import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, auditCopy, findBanned, groupPlaces, historyToText, placeHistory, type Note, type Place } from "./index";
import { placeSources, recordsWord, renderWhoRecorded, whoRecordedLines, whoStrings } from "./who-recorded";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const NOTES = (): Note[] => [
  testNote("l1", "Library", [
    { key: "step-free-entry", value: "yes", on: "2025-01-01", licence: "ODbL-1.0" },
    { key: "elevator", value: "yes", on: "2026-02-02" },
  ]),
  testNote("l2", "Library", [{ key: "elevator", value: "no", on: "2026-03-03", source: CONTRIBUTOR_SOURCE }]),
  testNote("a1", "Arena", [], "9 Main St"),
];
const place = (name: string): Place => {
  const p = groupPlaces(NOTES(), "en").find((x) => x.name === name);
  if (!p) throw new Error(name);
  return p;
};

describe("placeSources", () => {
  it("groups records by source, most records first", () => {
    expect(placeSources(place("Library"))).toEqual([
      { source: "City survey", records: 2, keys: ["step-free-entry", "elevator"], licences: ["CC0-1.0", "ODbL-1.0"], oldest: "2025-01-01", newest: "2026-02-02" },
      { source: CONTRIBUTOR_SOURCE, records: 1, keys: ["elevator"], licences: ["CC0-1.0"], oldest: "2026-03-03", newest: "2026-03-03" },
    ]);
  });

  it("is empty for a place with no record", () => {
    expect(placeSources(place("Arena"))).toEqual([]);
    expect(renderWhoRecorded(place("Arena"), "en")).toBe("");
  });

  it("accounts for every record exactly once, on random notes", () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const p of groupPlaces(randomNotes(makeRng(seed), 10), "en")) {
        const total = Object.values(p.resolutions).reduce((n, r) => n + (r.kind === "unknown" ? 0 : r.observations.length), 0);
        expect(placeSources(p).reduce((n, s) => n + s.records, 0), String(seed)).toBe(total);
      }
    }
  });
});

describe("wording", () => {
  it("counts records in both languages", () => {
    expect([1, 2].map((n) => recordsWord(n, "en"))).toEqual(["1 record", "2 records"]);
    expect([1, 2].map((n) => recordsWord(n, "fr"))).toEqual(["1 donnée", "2 données"]);
  });

  it("renders sources with the App's own name for contributor reports in French", () => {
    const fr = renderWhoRecorded(place("Library"), "fr");
    expect(fr).toContain("Rapport d’un contributeur");
    expect(fr).toContain("Licences utilisées\u00A0: CC0-1.0, ODbL-1.0");
  });

  it("strings pass the App's copy audit", () => {
    expect(auditCopy(whoStrings()).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });
});

describe("ordering", () => {
  it("breaks a tie in records by source name, so the order never changes", () => {
    const notes = [
      testNote("z1", "Hall", [{ key: "elevator", value: "yes", source: "Zeta survey" }]),
      testNote("a1", "Hall", [{ key: "automatic-door", value: "yes", source: "Alpha survey" }]),
    ];
    const p = groupPlaces(notes, "en")[0] as Place;
    expect(placeSources(p).map((s) => s.source)).toEqual(["Alpha survey", "Zeta survey"]);
    expect(placeSources(groupPlaces([...notes].reverse(), "en")[0] as Place).map((s) => s.source)).toEqual(["Alpha survey", "Zeta survey"]);
  });

  it("lists licences in the App's licence order, each once", () => {
    const notes = [
      testNote("a", "Hall", [{ key: "elevator", value: "yes", licence: "OGL-Canada-2.0" }]),
      testNote("b", "Hall", [{ key: "automatic-door", value: "yes", licence: "CC0-1.0" }]),
      testNote("c", "Hall", [{ key: "step-free-entry", value: "yes", licence: "CC0-1.0" }]),
    ];
    expect(placeSources(groupPlaces(notes, "en")[0] as Place)[0]?.licences).toEqual(["CC0-1.0", "OGL-Canada-2.0"]);
  });
});

describe("whoRecordedLines", () => {
  const library = (l: "en" | "fr") => groupPlaces(NOTES(), l).find((p) => p.name === "Library") as Place;

  it("lists each source with its details, licences and dates", () => {
    const lines = whoRecordedLines(library("en"), "en");
    expect(lines[0]).toBe("Who recorded this place");
    expect(lines[1]).toMatch(/^-+$/);
    expect(lines.filter((x) => x.startsWith("* "))).toHaveLength(placeSources(library("en")).length);
    expect(lines.some((x) => x.startsWith("  Licences used: "))).toBe(true);
    expect(lines.at(-1)).toBe("");
  });

  it("uses French typography and no banned words", () => {
    const lines = whoRecordedLines(library("fr"), "fr");
    for (const x of lines.slice(2)) {
      if (x.startsWith("  ")) expect(x).toMatch(/ : /);
    }
    expect(findBanned(lines.join("\n"))).toBeUndefined();
    expect(lines.join("\n")).not.toMatch(/inconnu/i);
  });

  it("is empty for a place with no record, and goes into the history file", () => {
    const empty = groupPlaces([testNote("e", "Empty hall", [])], "en")[0] as Place;
    expect(placeSources(empty)).toEqual([]);
    expect(whoRecordedLines(empty, "en")).toEqual([]);
    const text = historyToText(library("en"), placeHistory(library("en")), "en", new Date("2026-11-01T12:00:00Z"));
    expect(text).toContain("Who recorded this place\n");
    expect(text.indexOf("Who recorded this place")).toBeLessThan(text.indexOf("When the answer changed"));
  });
});

import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, auditCopy, collectSources, type Note } from "./index";
import { perDetailText, renderSourceCoverage, sourceCoverage, sourceCoverageStrings } from "./source-coverage";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "no" }]),
  testNote("b1", "Bakery", [{ key: "elevator", value: "yes" }], "2 Main St"),
  testNote("c1", "Cafe", [{ key: "elevator", value: "yes", source: CONTRIBUTOR_SOURCE }], "3 Main St"),
];

describe("sourceCoverage", () => {
  it("counts records per detail for each source, most records first", () => {
    expect(sourceCoverage(NOTES())).toEqual([
      { source: "City survey", perDetail: [["step-free-entry", 1], ["elevator", 2]], total: 3 },
      { source: CONTRIBUTOR_SOURCE, perDetail: [["elevator", 1]], total: 1 },
    ]);
    expect(perDetailText(sourceCoverage(NOTES())[0] as never, "en")).toBe("Step-free entrance 1, Elevator 2");
  });

  it("agrees with the sources report on random notes", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const notes = randomNotes(makeRng(seed), 10);
      const list = sourceCoverage(notes);
      expect(list.reduce((n, c) => n + c.total, 0), String(seed)).toBe(collectSources(notes, TODAY).recorded);
      for (const c of list) for (const [, n] of c.perDetail) expect(n, String(seed)).toBeGreaterThan(0);
    }
  });

  it("is empty with no record, and renders nothing", () => {
    expect(sourceCoverage([testNote("x", "Hall", [])])).toEqual([]);
    expect(renderSourceCoverage([], "en")).toBe("");
  });

  it("renders French with a no-break space and the App's own source name", () => {
    const html = renderSourceCoverage(NOTES(), "fr");
    expect(html).toContain("Rapport d’un contributeur</strong>\u00A0: Ascenseur 1");
  });

  it("strings pass the App's copy audit", () => {
    expect(auditCopy(sourceCoverageStrings()).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });
});

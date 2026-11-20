import { describe, expect, it } from "vitest";
import { FACT_KEYS, auditCopy, groupPlaces, type Note } from "./index";
import { COVERAGE_COPY, coverageLabel, coverageLines, coverageSpread, coverageStrings, placesWord, recordedCount, renderCoverage } from "./coverage";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const NOTES = (): Note[] => [
  testNote("a1", "Arena", []),
  testNote("l1", "Library", FACT_KEYS.map((key) => ({ key, value: "yes" as const }))),
  testNote("d1", "Deli", [{ key: "elevator", value: "yes" }], "4 Main St"),
  testNote("d2", "Deli", [{ key: "elevator", value: "no" }], "4 Main St"),
];

describe("recordedCount and coverageSpread", () => {
  it("counts details with any record, including reports that differ", () => {
    const places = groupPlaces(NOTES(), "en");
    expect(places.map((p) => [p.name, recordedCount(p)])).toEqual(
      expect.arrayContaining([
        ["Arena", 0],
        ["Library", FACT_KEYS.length],
        ["Deli", 1],
      ]),
    );
    const spread = coverageSpread(places);
    expect(spread).toHaveLength(FACT_KEYS.length + 1);
    expect(spread[0]).toBe(1);
    expect(spread[1]).toBe(1);
    expect(spread[FACT_KEYS.length]).toBe(1);
  });

  it("adds up to the number of places on random notes", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const places = groupPlaces(randomNotes(makeRng(seed), 12), "en");
      const spread = coverageSpread(places);
      expect(spread.reduce((a, b) => a + b, 0), String(seed)).toBe(places.length);
      for (const p of places) expect(recordedCount(p)).toBeLessThanOrEqual(FACT_KEYS.length);
    }
    expect(coverageSpread([]).every((n) => n === 0)).toBe(true);
  });
});

describe("wording", () => {
  it("labels each count in both languages", () => {
    expect(coverageLabel(2, 4, "en")).toBe("2 of 4 details recorded");
    expect(coverageLabel(1, 4, "fr")).toBe("1 détail sur 4 enregistré");
    expect(coverageLabel(3, 4, "fr")).toBe("3 détails sur 4 enregistrés");
    expect([0, 1, 2].map((n) => placesWord(n, "en"))).toEqual(["0 places", "1 place", "2 places"]);
    expect([0, 1, 2].map((n) => placesWord(n, "fr"))).toEqual(["0 lieu", "1 lieu", "2 lieux"]);
  });

  it("renders a row per count, most recorded first, with the counts", () => {
    const html = renderCoverage(groupPlaces(NOTES(), "en"), "en");
    const order = [...html.matchAll(/data-recorded="(\d+)"/g)].map((m) => Number(m[1]));
    expect(order).toEqual([...Array(FACT_KEYS.length + 1).keys()].reverse());
    expect(html).toContain('data-coverage-count="0">1<');
  });

  it("strings pass the App's copy audit", () => {
    expect(auditCopy(coverageStrings()).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });
});

describe("coverage in French", () => {
  it("renders French labels and typography", () => {
    const html = renderCoverage(groupPlaces(NOTES(), "fr"), "fr");
    expect(html).toContain(`${coverageLabel(0, FACT_KEYS.length, "fr")}\u00A0: <strong`);
    expect(html).not.toMatch(/inconnu/i);
  });

  it("says 0 details in the singular in French", () => {
    expect(coverageLabel(0, 4, "fr")).toBe("0 détail sur 4 enregistré");
    expect(coverageLabel(4, 4, "en")).toBe("4 of 4 details recorded");
  });
});

describe("coverageLines", () => {
  it("gives one line per count, most recorded first, with places as words", () => {
    const lines = coverageLines(groupPlaces(NOTES(), "en"), "en");
    expect(lines.slice(0, 4)).toEqual([COVERAGE_COPY.title.en, "-".repeat(COVERAGE_COPY.title.en.length), COVERAGE_COPY.intro.en, COVERAGE_COPY.notRank.en]);
    expect(lines.slice(4)).toEqual([
      "- 4 of 4 details recorded: 1 place",
      "- 3 of 4 details recorded: 0 places",
      "- 2 of 4 details recorded: 0 places",
      "- 1 of 4 details recorded: 1 place",
      "- 0 of 4 details recorded: 1 place",
    ]);
  });

  it("uses French words and a no-break space before the colon", () => {
    const lines = coverageLines(groupPlaces(NOTES(), "fr"), "fr");
    expect(lines).toContain("- 4 détails sur 4 enregistrés\u00A0: 1 lieu");
    expect(lines).toContain("- 3 détails sur 4 enregistrés\u00A0: 0 lieu");
    expect(lines.join("\n")).not.toMatch(/inconnu/i);
  });
});

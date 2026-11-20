import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, auditCopy, groupPlaces, type Note, type Place } from "./index";
import { BEHIND_COPY, behindColumn, behindStrings, behindSummary, datesText, renderBehind } from "./compare-records";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes", on: "2025-01-01" }, { key: "elevator", value: "no", on: "2026-03-03", source: CONTRIBUTOR_SOURCE }]),
  testNote("l2", "Library", [{ key: "elevator", value: "yes", on: "2026-05-05" }]),
  testNote("a1", "Arena", [], "9 Main St"),
];
const place = (name: string): Place => {
  const p = groupPlaces(NOTES(), "en").find((x) => x.name === name);
  if (!p) throw new Error(name);
  return p;
};

describe("behindColumn", () => {
  it("counts records and sources and finds the date range", () => {
    expect(behindColumn(place("Library"))).toMatchObject({ records: 3, sources: 2, oldest: "2025-01-01", newest: "2026-05-05" });
    expect(datesText(behindColumn(place("Library")))).toBe("2025-01-01 – 2026-05-05");
  });

  it("gives nothing for a place with no record", () => {
    expect(behindColumn(place("Arena"))).toMatchObject({ records: 0, sources: 0, oldest: undefined, newest: undefined });
    expect(datesText(behindColumn(place("Arena")))).toBe("");
  });

  it("never counts more sources than records, on random notes", () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const p of groupPlaces(randomNotes(makeRng(seed), 10), "en")) {
        const c = behindColumn(p);
        expect(c.sources, String(seed)).toBeLessThanOrEqual(c.records);
        if (c.records > 0) expect((c.oldest ?? "") <= (c.newest ?? ""), String(seed)).toBe(true);
      }
    }
  });
});

describe("renderBehind", () => {
  it("lists each place in the given order with its counts", () => {
    const html = renderBehind([place("Arena"), place("Library")], {}, "en");
    expect(html.indexOf("Arena")).toBeLessThan(html.indexOf("Library"));
    expect(html).toContain(BEHIND_COPY.noRecords.en);
    expect(html).toContain('data-behind="records">3<');
    expect(html).not.toContain('data-behind="against"');
  });

  it("adds how the details stand when must-haves or a filter are set", () => {
    const html = renderBehind([place("Library")], { elevator: "yes", "accessible-washroom": "yes" }, "en");
    expect(html).toContain("Against what you chose: Reports differ 1; Unknown 1.");
  });

  it("writes French with a no-break space", () => {
    expect(renderBehind([place("Library")], {}, "fr")).toContain("Données\u00A0: <strong");
  });

  it("strings pass the App's copy audit", () => {
    expect(auditCopy(behindStrings()).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });
});

describe("behindSummary", () => {
  it("says records, sources and dates on one line in both languages", () => {
    expect(behindSummary(behindColumn(place("Library")), "en")).toBe("3 records, 2 sources, 2025-01-01 – 2026-05-05");
    expect(behindSummary(behindColumn(place("Library")), "fr")).toBe("3 données, 2 sources, 2025-01-01 – 2026-05-05");
  });

  it("uses the singular for one, and says so when there is nothing", () => {
    const one = groupPlaces([testNote("x", "Kiosk", [{ key: "elevator", value: "yes", on: "2026-01-01" }])], "en")[0] as Place;
    expect(behindSummary(behindColumn(one), "en")).toBe("1 record, 1 source, 2026-01-01");
    expect(behindSummary(behindColumn(one), "fr")).toBe("1 donnée, 1 source, 2026-01-01");
    expect(behindSummary(behindColumn(place("Arena")), "en")).toBe(BEHIND_COPY.none.en);
    expect(behindSummary(behindColumn(place("Arena")), "fr")).toBe(BEHIND_COPY.none.fr);
  });
});

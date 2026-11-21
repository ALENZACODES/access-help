import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { CONTRIBUTOR_SOURCE, FACT_KEYS } from "./facts";
import { exportNotes } from "./exchange";
import { detailRows, differingPlaces, readSummaryFile, summarize, summaryConsistent, type FileSummary } from "./filesummary";
import { FILE_SUMMARY_COPY, fileSummaryStrings, summarizedText, summaryFilename } from "./filesummary-copy";
import { groupPlaces } from "./places";
import { testNote } from "./testnotes";
import { numberRows, summaryText } from "./views-filesummary";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 20));

const notes = [
  testNote("a1", "Central Library", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes", on: "2024-05-01" }], "1 King St W"),
  testNote("a2", "Central Library", [{ key: "elevator", value: "no", on: "2026-11-02", source: CONTRIBUTOR_SOURCE }], "1 King St W"),
  testNote("b1", "Pool", [{ key: "elevator", value: "no", licence: "ODbL-1.0" }], "9 Lake Rd"),
  testNote("c1", "Café Rivière", [], null),
];

function summary(locale: "en" | "fr" = "en"): FileSummary {
  const r = readSummaryFile(exportNotes(notes, "2026-11-01"), TODAY, locale);
  if (!r.ok) throw new Error(r.error);
  return r.summary;
}

describe("summarize", () => {
  it("counts notes, places, places with no address and places with several notes", () => {
    const s = summary();
    expect([s.notes, s.places, s.leftOut, s.placesWithoutAddress, s.placesWithSeveralNotes]).toEqual([4, 3, 0, 1, 1]);
    expect(s.exportedOn).toBe("2026-11-01");
  });

  it("counts places by answer for each detail, with differing reports and UNKNOWN on their own", () => {
    const rows = Object.fromEntries(summary().details.map((d) => [d.key, [d.yes, d.no, d.differ, d.unknown]]));
    expect(rows["elevator"]).toEqual([0, 1, 1, 1]);
    expect(rows["step-free-entry"]).toEqual([1, 0, 0, 2]);
    expect(rows["automatic-door"]).toEqual([0, 0, 0, 3]);
  });

  it("spreads places by how many details they record", () => {
    // Café: 0, Pool: 1, Library: 2 (elevator differs, step-free yes).
    expect(summary().coverage).toEqual([1, 1, 1, 0, 0]);
  });

  it("uses the App's ages and sources reports", () => {
    const s = summary();
    expect(s.ages.records).toBe(4);
    expect(s.ages.old).toBe(1);
    expect(s.sources.rows.map((r) => r.source).sort()).toEqual([CONTRIBUTOR_SOURCE, "City survey"].sort());
    expect(s.sources.licences).toEqual(["CC0-1.0", "ODbL-1.0"]);
    expect(s.sources.unknown).toBe(FACT_KEYS.length * 4 - 4);
  });

  it("always adds up", () => {
    expect(summaryConsistent(summary())).toBe(true);
    for (const row of summary().details) expect(row.yes + row.no + row.differ + row.unknown).toBe(3);
    const many = Array.from({ length: 30 }, (_, i) =>
      testNote(`m${i}`, `Place ${i % 7}`, FACT_KEYS.filter((_, j) => (i + j) % 3 === 0).map((key) => ({ key, value: i % 2 === 0 ? ("yes" as const) : ("no" as const), on: `202${i % 6}-0${(i % 9) + 1}-15` })), `${i % 7} Main St`),
    );
    expect(summaryConsistent(summarize(many, 0, undefined, "en", TODAY))).toBe(true);
  });

  it("lists the places whose reports differ, by detail", () => {
    expect(summary().differing.map((d) => [d.key, d.places.map((p) => p.name)])).toEqual([["elevator", ["Central Library"]]]);
    expect(differingPlaces(groupPlaces([testNote("x", "Zoo")], "en"))).toEqual([]);
  });

  it("notices when counts do not add up", () => {
    const s = summary();
    expect(summaryConsistent({ ...s, places: s.places + 1 })).toBe(false);
    expect(summaryConsistent({ ...s, differing: [] })).toBe(false);
  });

  it("counts every place in each detail row", () => {
    const places = groupPlaces(notes, "en");
    for (const r of detailRows(places)) expect(r.yes + r.no + r.differ + r.unknown).toBe(places.length);
  });

  it("refuses text that is not an export and files with no readable note", () => {
    expect(readSummaryFile("x", TODAY, "en")).toEqual({ ok: false, error: "not-json" });
    expect(readSummaryFile(exportNotes([], "2026-11-01"), TODAY, "en")).toEqual({ ok: false, error: "no-notes" });
  });
});

describe("the text download", () => {
  it("holds the numbers, coverage, answers, and the App's ages and sources texts", () => {
    const text = summaryText(summary(), "en", TODAY);
    expect(text.startsWith("Summary of a notes file\nMade on 2026-11-20\n")).toBe(true);
    expect(text).toContain("Notes the App reads: 4\nPlaces: 3\n");
    expect(text).toContain("- 2 of 4 details recorded: 1 place");
    expect(text).toContain("- Elevator: Yes 0, No 1, Reports differ 1, No record (Unknown) 1");
    expect(text).toContain("Places where reports differ\n- Elevator: Central Library");
    expect(text).toContain("How old the records are");
    expect(text).toContain("Where details come from");
    expect(findBanned(text)).toBeUndefined();
  });

  it("is written in French with French typography", () => {
    const text = summaryText(summary("fr"), "fr", TODAY);
    expect(text).toContain("Ascenseur");
    expect(text).not.toMatch(/inconnu/i);
    for (const line of text.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("lists the numbers in a fixed order", () => {
    expect(numberRows(summary(), "en").map(([, n]) => n)).toEqual([4, 3, 0, 1, 1]);
  });
});

describe("the copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileSummaryStrings())).toEqual([]);
  });

  it("says counts are not a score and Unknown is not No", () => {
    expect(FILE_SUMMARY_COPY.notScored.en).toContain("Unknown does not mean No");
    expect(FILE_SUMMARY_COPY.notScored.fr).toContain("UNKNOWN ne veut pas dire Non");
  });

  it("builds sentences with French typography and gives an ASCII file name", () => {
    expect(frenchTypographyIssues(summarizedText(3, 4, "fr"))).toEqual([]);
    expect(summarizedText(1, 1, "en")).toBe("Summary ready. 1 place, 1 note.");
    expect(summaryFilename(TODAY, "fr")).toBe("resume-fichier-2026-11-20.txt");
  });

  it("names the removal on the remove button", () => {
    expect(FILE_SUMMARY_COPY.clear.en).toMatch(/^Remove /);
    expect(FILE_SUMMARY_COPY.clear.fr).toMatch(/^Retirer /);
  });
});

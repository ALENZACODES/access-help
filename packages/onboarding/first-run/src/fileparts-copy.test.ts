import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import {
  FILE_PARTS_COPY,
  detailLine,
  filePartsStrings,
  partFacts,
  partHeading,
  partLabel,
  partProblemText,
  partsErrorText,
  partsFilename,
  moreText,
  partsText,
  placeRecorded,
  postalLine,
  streetsLine,
  readText,
  reportSummary,
  sourcesText,
  topSources,
  yearOldText,
} from "./fileparts-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { partsReport, summarize } from "./partsummary";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("l", "Library", [{ key: "elevator", value: "yes", on: "2026-01-05" }], "100 King St W"),
        testNote("b", "Bank", [{ key: "elevator", value: "no", on: "2025-02-01" }], "40 King St W"),
        testNote("k", "Kiosk", [], "1 Elm Ave"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(filePartsStrings())).toEqual([]);
  });

  it("has a message for every problem and file error, without banned words", () => {
    for (const l of ["en", "fr"] as const) {
      for (const p of ["long", "repeat", "none-match", "empty"] as const) expect(findBanned(partProblemText(p, l))).toBeUndefined();
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(partsErrorText(e, l).length).toBeGreaterThan(0);
    }
  });

  it("says the counts never make a part better", () => {
    expect(FILE_PARTS_COPY.notRank.en).toContain("More records do not make a part better.");
  });
});

describe("lines", () => {
  const r = partsReport(file(), ["King"], TODAY);
  const king = r.parts[0];
  if (!king) throw new Error("no part");

  it("says every count for a detail, zeros included, with the token UNKNOWN in French", () => {
    expect(detailLine("elevator", king.perDetail.elevator, "en")).toBe("Elevator: 1 Yes, 1 No, 0 Unknown, 0 with reports that differ");
    const fr = detailLine("elevator", king.perDetail.elevator, "fr");
    expect(fr).toBe("Ascenseur\u00A0: 1 Oui, 1 Non, 0 UNKNOWN, 0 aux rapports divergents");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("names a part by the text typed, or the rest of the file", () => {
    expect(partHeading(king, "en")).toBe("“King” (2 places)");
    expect(partHeading(king, "fr")).toBe("«\u202FKing\u202F» (2 lieux)");
    expect(partHeading(r.rest, "en")).toBe("Rest of the file (1 place)");
    expect(partLabel(2, "fr")).toBe("Partie 3");
  });

  it("gives the share recorded and the newest and oldest records", () => {
    // Bank's record of 2025-02-01 is a year old or more on 2026-11-21.
    expect(partFacts(king, "en")).toBe("25% of details have a record. Newest record: 2026-01-05 (oldest 2025-02-01). 1 recorded detail is a year old or more.");
    const fr = partFacts(king, "fr");
    expect(fr).toBe("25\u00A0% des détails ont une donnée. Donnée la plus récente\u00A0: 2026-01-05 (la plus ancienne 2025-02-01). 1 détail noté date d’un an ou plus.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(partFacts(r.rest, "en")).toBe("0% of details have a record. Nothing recorded yet.");
  });

  it("leaves out the oldest date when there is only one", () => {
    const one = summarize("x", file().places.filter((p) => p.name === "Library"), TODAY);
    expect(partFacts(one, "en")).toBe("25% of details have a record. Newest record: 2026-01-05.");
  });
});

describe("year-old records and sources", () => {
  it("says how many recorded details are a year old or more", () => {
    expect(yearOldText(1, "fr")).toBe("1 détail noté date d’un an ou plus.");
    expect(yearOldText(3, "en")).toBe("3 recorded details are a year old or more.");
  });

  it("names who recorded a part, five at most, then how many more", () => {
    const s = { ...summarize("x", [], TODAY), sources: ["A", "B", "C", "D", "E", "F", "G"].map((source, i) => ({ source, records: 10 - i })) };
    expect(topSources(s).top.map((x) => x.source)).toEqual(["A", "B", "C", "D", "E"]);
    expect(topSources(s).more).toBe(2);
    expect(sourcesText(s, "en")).toBe("Recorded by: A (10), B (9), C (8), D (7), E (6) and 2 more");
    expect(sourcesText(s, "fr")).toBe("Noté par\u00A0: A (10), B (9), C (8), D (7), E (6) et 2 autres");
    expect(moreText(0, "en")).toBe("");
    expect(moreText(1, "fr")).toBe(" et 1 autre");
  });

  it("names the contributor source in French", () => {
    const s = { ...summarize("x", [], TODAY), sources: [{ source: "Contributor report", records: 1 }] };
    expect(sourcesText(s, "fr")).toBe("Noté par\u00A0: Rapport d’un contributeur (1)");
  });
});

describe("summaries", () => {
  it("counts the parts and the rest, and the places in several parts", () => {
    expect(reportSummary(partsReport(file(), ["King"], TODAY), "en")).toBe("1 part compared with the rest of the file (1 place).");
    expect(reportSummary(partsReport(file(), ["King", "100"], TODAY), "en")).toBe("2 parts compared with the rest of the file (1 place). 1 place is in two parts or more and is counted in each.");
    const fr = reportSummary(partsReport(file(), ["King", "St"], TODAY), "fr");
    expect(fr).toBe("2 parties comparées avec le reste du fichier (1 lieu). 2 lieux font partie de plusieurs parties et sont comptés dans chacune.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says how many places a file has after reading it, and lists postal areas", () => {
    expect(readText(3, "en")).toBe("The file has 3 places. Name the parts to compare.");
    expect(readText(1, "fr")).toBe("Le fichier compte 1 lieu. Nommez les parties à comparer.");
    expect(postalLine([{ area: "M5H", places: 2 }, { area: "K7L", places: 1 }], "en")).toBe("M5H (2 places), K7L (1 place)");
    expect(streetsLine([{ street: "King St W", places: 2 }], "fr")).toBe("King St W (2 lieux)");
    expect(placeRecorded(1, 4, "en")).toBe("1 of 4 details recorded");
    expect(placeRecorded(2, 4, "fr")).toBe("2 détails sur 4 notés");
  });
});

describe("partsText", () => {
  it("prints each part and the rest with its counts", () => {
    const text = partsText(partsReport(file(), ["King"], TODAY), "en", TODAY);
    expect(text.split("\n").slice(0, 4)).toEqual(["Compare parts of a file", "Made on 2026-11-21", "1 part compared with the rest of the file (1 place).", FILE_PARTS_COPY.notRank.en]);
    const heading = "“King” (2 places)";
    expect(text).toContain(`${heading}\n${"-".repeat(heading.length)}\n25% of details have a record. Newest record: 2026-01-05 (oldest 2025-02-01). 1 recorded detail is a year old or more.\nRecorded by: City survey (2)\n`);
    expect(text).toContain("  Elevator: 1 Yes, 1 No, 0 Unknown, 0 with reports that differ\n");
    expect(text).toContain("Rest of the file (1 place)\n");
  });

  it("says when every place is in a part", () => {
    const heading = "Rest of the file (0 places)";
    expect(partsText(partsReport(file(), ["St", "Ave"], TODAY), "en", TODAY)).toContain(`${heading}\n${"-".repeat(heading.length)}\nEvery place is in one of the parts.\n`);
  });

  it("keeps French typography outside the texts typed", () => {
    for (const line of partsText(partsReport(file(), ["King"], TODAY), "fr", TODAY).split("\n")) if (!line.includes("King")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });
});

describe("partsFilename", () => {
  it("names the downloads by kind, part, day and language", () => {
    expect(partsFilename("csv", 0, TODAY, "en")).toBe("parts-comparison-2026-11-21.csv");
    expect(partsFilename("text", 0, TODAY, "fr")).toBe("comparaison-de-parties-2026-11-21.txt");
    expect(partsFilename("notes", 1, TODAY, "en")).toBe("notes-part-2-2026-11-21.json");
    expect(partsFilename("open", 0, TODAY, "fr")).toBe("notes-a-regarder-partie-1-2026-11-21.json");
  });
});

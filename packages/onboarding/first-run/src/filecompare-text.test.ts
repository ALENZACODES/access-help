import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { NB, NN } from "./copy";
import { exportNotes } from "./exchange";
import { compareFiles, type FileComparison, type FileErrorCode } from "./filecompare";
import {
  FILE_COMPARE_COPY,
  answerText,
  comparedText,
  compareFilename,
  fileCompareStrings,
  fileErrorText,
  openedText,
  otherAddressText,
  otherNameText,
  placeCaption,
  recordLine,
  sharedText,
  shownText,
} from "./filecompare-copy";
import { comparisonText, detailLines, observationLine } from "./filecompare-text";
import { CONTRIBUTOR_SOURCE } from "./facts";
import { findBanned } from "./wording";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));

function compare(locale: "en" | "fr"): FileComparison {
  const a = exportNotes(
    [
      testNote("a1", "Library", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }]),
      testNote("a2", "Arena", [], "5 Rink Rd"),
      testNote("a3", "Riverside Pool", [], null),
    ],
    "2026-11-01",
  );
  const b = exportNotes(
    [
      testNote("b1", "Library", [{ key: "elevator", value: "no", source: CONTRIBUTOR_SOURCE, on: "2026-11-10" }, { key: "step-free-entry", value: "yes" }]),
      testNote("b2", "Rink", [], "5 Rink Rd"),
    ],
    "2026-11-15",
  );
  const r = compareFiles(a, b, locale);
  if (!r.ok) throw new Error("comparison failed");
  return r.comparison;
}

describe("the copy", () => {
  it("passes the App's copy audit: both languages, French typography, no banned or forbidden words, UNKNOWN token", () => {
    expect(auditCopy(fileCompareStrings())).toEqual([]);
  });

  it("collects every string", () => {
    const keys = fileCompareStrings().map(([k]) => k);
    expect(keys).toContain("fileCompare.title");
    expect(keys).toContain("fileCompare.status.only-a");
    expect(keys).toContain("fileCompare.errors.same-text");
    expect(keys.length).toBeGreaterThan(50);
  });

  it("has an error for every way a file can be refused", () => {
    const codes: FileErrorCode[] = ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes", "same-text"];
    for (const c of codes) {
      expect(fileErrorText("a", c, "en").startsWith("File A ")).toBe(true);
      expect(fileErrorText("b", c, "fr").startsWith("Fichier B ")).toBe(true);
    }
  });

  it("names the remove action on the button that removes", () => {
    expect(FILE_COMPARE_COPY.clear.en).toMatch(/^Remove /);
    expect(FILE_COMPARE_COPY.clear.fr).toMatch(/^Retirer /);
  });

  it("shows a missing record as the UNKNOWN token in French", () => {
    expect(answerText("unknown", "fr")).toBe("UNKNOWN");
    expect(answerText("unknown", "en")).toBe("Unknown");
    expect(answerText("differ", "en")).toBe("Reports differ");
    expect(answerText("yes", "fr")).toBe("Oui");
  });
});

describe("generated sentences", () => {
  const all = (l: "en" | "fr"): string[] => [
    sharedText(1, l),
    sharedText(3, l),
    otherNameText("b", "Bibliothèque", l),
    otherAddressText("b", undefined, l),
    otherAddressText("b", "2 King St", l),
    comparedText(2, 1, 0, l),
    shownText(1, l),
    shownText(4, l),
    openedText("a", l),
    placeCaption("Library", l),
    recordLine("yes", "City survey", "CC0-1.0", "2026-10-01", "Tier 0", l),
  ];

  it("follow French typography", () => {
    for (const s of all("fr")) expect(frenchTypographyIssues(s), s).toEqual([]);
  });

  it("use no banned words in either language", () => {
    for (const l of ["en", "fr"] as const) for (const s of all(l)) expect(findBanned(s), s).toBeUndefined();
  });

  it("keep the file letter in capitals in French", () => {
    expect(openedText("a", "fr")).toMatch(/^Le fichier A /);
    expect(otherNameText("b", "Zoo", "fr")).toBe(`Le fichier B le nomme «${NN}Zoo${NN}».`);
  });

  it("count in the singular and plural", () => {
    expect(sharedText(1, "en")).toBe("1 record is in both files.");
    expect(sharedText(2, "en")).toBe("2 records are in both files.");
    expect(shownText(1, "fr")).toBe("1 lieu affiché.");
    expect(shownText(2, "fr")).toBe("2 lieux affichés.");
  });

  it("gives an ASCII file name with the date", () => {
    expect(compareFilename(TODAY, "en")).toBe("file-comparison-2026-11-20.txt");
    expect(compareFilename(TODAY, "fr")).toBe("comparaison-fichiers-2026-11-20.txt");
    expect(compareFilename(TODAY, "fr")).toMatch(/^[\x20-\x7e]+$/);
  });
});

describe("the text download", () => {
  it("holds both files' summaries, the totals and every place group", () => {
    const text = comparisonText(compare("en"), "en", TODAY);
    expect(text.startsWith("Comparison of two note files\nMade on 2026-11-20\n")).toBe(true);
    expect(text).toContain("File A\n  Notes: 3\n  Places: 3\n");
    expect(text).toContain("File B\n  Notes: 2\n  Places: 2\n");
    expect(text).toContain("- Different answers: 1\n");
    expect(text).toContain("Places in both files (1)");
    expect(text).toContain("Places only in file A (2)");
    expect(text).toContain("Places only in file B (1)");
    expect(text).toContain("May be the same place (1)");
    expect(text).toContain("File A: Arena / File B: Rink. Same address, different names.");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("keeps source, licence, date and tier on every record, and says when a file has none", () => {
    const text = comparisonText(compare("en"), "en", TODAY);
    expect(text).toContain("  Elevator: File A Yes, File B No (Different answers)");
    expect(text).toContain("    File A: Yes: City survey, licence CC0-1.0, 2026-10-01, Tier 0 (Tier 0, not reviewed)");
    expect(text).toContain("    File B: No: Contributor report, licence CC0-1.0, 2026-11-10, Tier 0 (Tier 0, not reviewed)");
    expect(text).toContain("  Automatic door: File A Unknown, File B Unknown (No record in either file)");
    expect(text).toContain("    File A: No record in this file");
    expect(text).toContain("    1 record is in both files.");
  });

  it("lists places in one file only with how many details they record", () => {
    const text = comparisonText(compare("en"), "en", TODAY);
    expect(text).toContain("- Riverside Pool, No address (0 of 4 details recorded)");
  });

  it("is written in French with French typography, the UNKNOWN token and the French contributor name", () => {
    const text = comparisonText(compare("fr"), "fr", TODAY);
    expect(text).toContain(`Ascenseur${NB}: Fichier A Oui, Fichier B Non (Réponses différentes)`);
    expect(text).toContain(`Porte automatique${NB}: Fichier A UNKNOWN, Fichier B UNKNOWN`);
    expect(text).toContain("Rapport d’un contributeur");
    expect(text).not.toMatch(/inconnu/i);
    for (const line of text.split("\n")) {
      // Dates and the places' own names are the only text not written by the App; neither has : ; ! ? « ».
      expect(frenchTypographyIssues(line), line).toEqual([]);
    }
  });

  it("says nothing is ranked and nothing was reviewed", () => {
    const text = comparisonText(compare("en"), "en", TODAY);
    expect(text).toContain(FILE_COMPARE_COPY.notRanked.en);
    expect(text).toContain(FILE_COMPARE_COPY.text.nothingSaved.en);
    expect(findBanned(text)).toBeUndefined();
  });

  it("writes one record per line", () => {
    const c = compare("en");
    const d = c.both[0]?.details.find((x) => x.key === "elevator");
    if (!d) throw new Error("no elevator detail");
    expect(detailLines(d, "en")).toHaveLength(3);
    const first = d.recordsA[0];
    if (!first) throw new Error("no record");
    expect(observationLine(first, "en")).toBe("Yes: City survey, licence CC0-1.0, 2026-10-01, Tier 0 (Tier 0, not reviewed)");
  });

  it("says when no place is in both files", () => {
    const r = compareFiles(exportNotes([testNote("a", "Arena", [], "5 Rink Rd")], "2026-11-01"), exportNotes([testNote("b", "Pool", [], "9 Lake Rd")], "2026-11-01"), "en");
    if (!r.ok) throw new Error("comparison failed");
    const text = comparisonText(r.comparison, "en", TODAY);
    expect(text).toContain("Places in both files (0)\n- No place is in both files.");
    expect(text).not.toContain("May be the same place");
  });
});

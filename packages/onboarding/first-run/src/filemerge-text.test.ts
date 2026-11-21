import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { NB } from "./copy";
import { exportNotes } from "./exchange";
import { CLASH_CHOICES, NO_CHOICES, applyChoices, planMerge, type Choices, type MergeInput } from "./filemerge";
import {
  FILE_MERGE_COPY,
  addedText,
  choiceText,
  clashLegend,
  combinedText,
  copyText,
  fileMergeStrings,
  fileName,
  fileProblemText,
  fileSummaryText,
  mergeFilename,
  removeFileText,
  renamedText,
} from "./filemerge-copy";
import { mergeText, mergeTotals } from "./filemerge-text";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const file = (label: string, ...notes: ReturnType<typeof testNote>[]): MergeInput => ({ label, text: exportNotes(notes, "2026-11-01") });

const plan = planMerge(
  [
    file("sam.json", testNote("n1", "Library", [{ key: "elevator", value: "yes" }]), testNote("n2", "Pool", [], "9 Lake Rd")),
    file("", testNote("n1", "Library", [{ key: "elevator", value: "no" }]), testNote("p9", "Pool", [], "9 Lake Rd")),
    { label: "broken", text: "{" },
  ],
  TODAY,
);

describe("the copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileMergeStrings())).toEqual([]);
  });

  it("names the thing each remove button removes", () => {
    expect(removeFileText(1, "sam.json", "en")).toBe("Remove file 2 (sam.json) from the list");
    expect(removeFileText(0, "#1", "fr")).toBe("Retirer fichier 1 de la liste");
    expect(FILE_MERGE_COPY.clearAll.en).toMatch(/^Remove /);
  });

  it("has a word for each choice", () => {
    for (const c of CLASH_CHOICES) for (const l of ["en", "fr"] as const) expect(choiceText(c, l)).not.toBe("");
  });
});

describe("generated sentences", () => {
  const all = (l: "en" | "fr"): string[] => [
    fileName(1, "sam.json", l),
    fileProblemText(2, "#3", "no-notes", l),
    fileSummaryText(1, 0, l),
    fileSummaryText(3, 2, l),
    addedText(1, l),
    addedText(4, l),
    combinedText(5, 1, 2, l),
    clashLegend("Library", "n1", 0, 1, l),
    copyText("p9", "Pool", "n2", 0, l),
    renamedText("n1", "n1-2", l),
  ];

  it("follow French typography", () => {
    for (const s of all("fr")) expect(frenchTypographyIssues(s), s).toEqual([]);
  });

  it("use no banned words", () => {
    for (const l of ["en", "fr"] as const) for (const s of all(l)) expect(findBanned(s), s).toBeUndefined();
  });

  it("read as plain sentences", () => {
    expect(fileName(0, "#1", "en")).toBe("File 1");
    expect(fileSummaryText(1, 1, "en")).toBe("1 note, 1 entry left out");
    expect(fileSummaryText(2, 0, "fr")).toBe("2 notes, 0 entrée écartée");
    expect(clashLegend("Bibliothèque", "n1", 0, 2, "fr")).toBe(`Bibliothèque (identifiant n1)${NB}: fichier 1 et fichier 3`);
  });

  it("give ASCII file names", () => {
    for (const k of ["notes", "report"] as const) for (const l of ["en", "fr"] as const) expect(mergeFilename(k, TODAY, l)).toMatch(/^[a-z-]+-2026-11-20\.(json|txt)$/);
  });
});

describe("the text download", () => {
  it("lists files, totals, clashes with the version kept, copies and new ids", () => {
    const choices: Choices = { clashes: { "n1@1": "both" }, dropCopies: ["p9@1"] };
    const text = mergeText(plan, choices, applyChoices(plan, choices), "en", TODAY);
    expect(text.startsWith("Combined notes files\nMade on 2026-11-20\n")).toBe(true);
    expect(text).toContain("- File 1 (sam.json): 2 notes, 0 entries left out\n- File 2: 2 notes, 0 entries left out\n- File 3 (broken) is not a notes export.");
    expect(text).toContain("Notes in the combined file: 3\n");
    expect(text).toContain("- Library (id n1): file 1 and file 2. Keep both, the later one under a new id.");
    expect(text).toContain("- p9: same as Pool (id n2) from file 1. Leave this copy out.");
    expect(text).toContain("- n1 is kept as n1-2.");
  });

  it("says which version is kept by default", () => {
    const text = mergeText(plan, NO_CHOICES, applyChoices(plan, NO_CHOICES), "en", TODAY);
    expect(text).toContain("Keep the earlier file’s version.");
    expect(text).not.toContain("kept as");
  });

  it("is written in French with French typography", () => {
    const text = mergeText(plan, NO_CHOICES, applyChoices(plan, NO_CHOICES), "fr", TODAY);
    for (const line of text.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
    expect(findBanned(text)).toBeUndefined();
    expect(text).not.toMatch(/inconnu/i);
  });

  it("adds the totals up from the plan", () => {
    const rows = mergeTotals(plan, applyChoices(plan, NO_CHOICES), "en").map(([, n]) => n);
    expect(rows).toEqual([4, 0, 0, 1, 1, 3]);
  });
});

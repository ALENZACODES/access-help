import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { NB } from "./copy";
import { ROW_PROBLEMS } from "./csvimport";
import { TARGETS, type SetupError } from "./filesheet";
import {
  FILE_SHEET_COPY,
  columnLabel,
  fileSheetStrings,
  madeText,
  problemLine,
  readText,
  rowReasonText,
  setupErrorText,
  sheetErrorText,
  sheetFilename,
  targetText,
  unmatchedText,
} from "./filesheet-copy";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 20));

describe("the copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileSheetStrings())).toEqual([]);
  });

  it("has a distinct name for every target, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const names = TARGETS.map((x) => targetText(x, l));
      expect(new Set(names).size).toBe(TARGETS.length);
    }
    expect(targetText("elevator", "en")).toBe("Answer for elevator");
    expect(targetText("", "fr")).toBe("Pas utilisée");
  });

  it("has text for every problem", () => {
    const codes: SetupError[] = ["no-place-column", "no-detail-column", "two-columns", "no-source", "source-too-long", "source-control", "bad-licence", "bad-date", "future-date", "word-in-two-lists"];
    for (const c of codes) for (const l of ["en", "fr"] as const) expect(setupErrorText(c, l, "x")).not.toBe("");
    for (const e of ["empty", "too-large", "unclosed-quote", "too-many-rows", "no-rows"] as const) expect(sheetErrorText(e, "fr")).not.toBe("");
  });

  it("names the word that is in two lists", () => {
    expect(setupErrorText("word-in-two-lists", "en", "oui")).toBe("“oui” is in two word lists. Keep it in one.");
    expect(frenchTypographyIssues(setupErrorText("word-in-two-lists", "fr", "oui"))).toEqual([]);
  });

  it("says an unknown answer word is not in the person's lists, and reuses the import's other reasons", () => {
    expect(rowReasonText("bad-value", "en")).toBe(FILE_SHEET_COPY.badAnswer.en);
    expect(rowReasonText("no-place", "fr")).toBe(ROW_PROBLEMS["no-place"].fr);
  });

  it("names the removal on the remove button", () => {
    expect(FILE_SHEET_COPY.clear.en).toMatch(/^Remove /);
    expect(FILE_SHEET_COPY.clear.fr).toMatch(/^Retirer /);
  });

  it("never fills in a source, licence or date for the person", () => {
    expect(FILE_SHEET_COPY.fixedHint.en).toContain("Nothing is filled in for you");
  });
});

describe("generated sentences", () => {
  const all = (l: "en" | "fr"): string[] => [
    columnLabel(2, "Ramp?", l),
    problemLine(4, "Ascenseur", rowReasonText("bad-value", l), l),
    problemLine(5, undefined, rowReasonText("no-place", l), l),
    unmatchedText("peut-être", 1, l),
    unmatchedText("maybe", 3, l),
    madeText(1, 0, l),
    madeText(12, 3, l),
    readText(1, 1, l),
    readText(5, 40, l),
  ];

  it("follow French typography", () => {
    // The person's own column name may hold any punctuation; it is marked as their text on the page.
    for (const s of all("fr").filter((x) => !x.includes("Ramp?"))) expect(frenchTypographyIssues(s), s).toEqual([]);
  });

  it("use no banned words", () => {
    for (const l of ["en", "fr"] as const) for (const s of all(l)) expect(findBanned(s), s).toBeUndefined();
  });

  it("read as plain sentences", () => {
    expect(columnLabel(2, "Ramp?", "en")).toBe("Column 3: Ramp?");
    expect(problemLine(4, "Ascenseur", "x", "fr")).toBe(`Ligne 4, colonne Ascenseur${NB}: x`);
    expect(unmatchedText("maybe", 3, "en")).toBe("“maybe” (3 cells)");
    expect(madeText(1, 0, "en")).toBe("1 note made. Rows with something not used: 0.");
    expect(readText(5, 40, "fr")).toBe(`Tableur lu${NB}: 5 colonnes, 40 lignes.`);
  });

  it("gives ASCII file names", () => {
    for (const k of ["notes", "problems", "app"] as const) for (const l of ["en", "fr"] as const) expect(sheetFilename(k, TODAY, l)).toMatch(/^[a-z-]+-2026-11-20\.(json|csv)$/);
  });
});

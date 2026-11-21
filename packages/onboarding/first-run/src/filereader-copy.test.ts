import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { NB } from "./copy";
import { GROUPS } from "./filereader";
import {
  FILE_READER_COPY,
  detailsButtonText,
  fileReaderStrings,
  fileSummaryText,
  foundText,
  groupTitle,
  pageButtonText,
  pageText,
  readerErrorText,
  readerFilename,
} from "./filereader-copy";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 20));

describe("the copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileReaderStrings())).toEqual([]);
  });

  it("names the removal on the remove buttons", () => {
    expect(FILE_READER_COPY.clear.en).toMatch(/^Remove /);
    expect(FILE_READER_COPY.resetFind.fr).toMatch(/^Retirer /);
  });

  it("uses the UNKNOWN token in French and never calls a group a ranking", () => {
    expect(FILE_READER_COPY.groups.unknown.fr).toContain("UNKNOWN");
    for (const g of GROUPS) for (const l of ["en", "fr"] as const) expect(groupTitle(g, true, l)).not.toMatch(/best|worst|rank|meilleur|pire|classement/i);
    expect(groupTitle("match", false, "en")).toBe(FILE_READER_COPY.groups.all.en);
  });

  it("has text for every error", () => {
    for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) for (const l of ["en", "fr"] as const) expect(readerErrorText(e, l)).not.toBe("");
  });
});

describe("generated sentences", () => {
  const all = (l: "en" | "fr"): string[] => [
    fileSummaryText(12, 15, 1, l),
    fileSummaryText(1, 1, 0, l),
    pageText(1, 3, 21, 40, 45, l),
    detailsButtonText(true, "Library", l),
    detailsButtonText(false, "Library", l),
    pageButtonText("next", groupTitle("unknown", true, l), l),
    foundText([1, 2, 3], true, l),
    foundText([4, 0, 0], false, l),
  ];

  it("follow French typography", () => {
    for (const s of all("fr")) expect(frenchTypographyIssues(s), s).toEqual([]);
  });

  it("use no banned words", () => {
    for (const l of ["en", "fr"] as const) for (const s of all(l)) expect(findBanned(s), s).toBeUndefined();
  });

  it("read as plain sentences", () => {
    expect(fileSummaryText(12, 15, 1, "en")).toBe("12 places from 15 notes, 1 entry left out.");
    expect(pageText(1, 3, 21, 40, 45, "en")).toBe("Page 2 of 3, places 21 to 40 of 45.");
    expect(detailsButtonText(false, "Library", "fr")).toBe(`Afficher les détails${NB}: Library`);
    expect(foundText([1, 2, 3], true, "en")).toBe("Match: 1. Unknown or differing: 2. Answered the other way: 3.");
    expect(foundText([1, 0, 0], false, "fr")).toBe("1 lieu affiché.");
  });

  it("gives every paging button its group, so two groups never share a button name", () => {
    const a = pageButtonText("next", groupTitle("match", true, "en"), "en");
    const b = pageButtonText("next", groupTitle("unknown", true, "en"), "en");
    expect(a).not.toBe(b);
  });

  it("gives an ASCII file name", () => {
    expect(readerFilename(TODAY, "en")).toBe("places-in-file-2026-11-20.txt");
    expect(readerFilename(TODAY, "fr")).toBe("lieux-du-fichier-2026-11-20.txt");
  });
});

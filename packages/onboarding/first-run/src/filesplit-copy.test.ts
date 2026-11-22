import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { NB } from "./copy";
import { ANSWER_FILTERS, NO_FILTERS } from "./filesplit";
import {
  FILE_SPLIT_COPY,
  answerFilterText,
  chooseNoteText,
  chosenText,
  fileReadText,
  fileSplitStrings,
  filterErrorText,
  filtersSummary,
  splitErrorText,
  splitFilename,
} from "./filesplit-copy";
import { FILE_TOOLS_COPY, fileToolsStrings, openedToolText, TOOL_IDS, toolTitle } from "./filetools";
import { FILE_CHECK_COPY } from "./filecheck-copy";
import { FILE_COMPARE_COPY } from "./filecompare-copy";
import { FILE_READER_COPY } from "./filereader-copy";
import { FILE_SUMMARY_COPY } from "./filesummary-copy";
import { FILE_ASK_COPY } from "./fileask-copy";
import { FILE_SHEET_COPY } from "./filesheet-copy";
import { FILE_STREETS_COPY } from "./filestreets-copy";
import { FILE_FIRST_COPY } from "./filefirst-copy";
import { FILE_GRID_COPY } from "./filegrid-copy";
import { FILE_ROUND_COPY } from "./fileround-copy";
import { FILE_VISITS_COPY } from "./filevisits-copy";
import { FILE_MERGE_COPY } from "./filemerge-copy";
import { filterParts } from "./views-filesplit";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 20));

describe("the split copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileSplitStrings())).toEqual([]);
  });

  it("names the removal on the remove buttons", () => {
    expect(FILE_SPLIT_COPY.clear.en).toMatch(/^Remove /);
    expect(FILE_SPLIT_COPY.resetFilters.en).toMatch(/^Remove /);
    expect(FILE_SPLIT_COPY.resetFilters.fr).toMatch(/^Retirer /);
  });

  it("keeps UNKNOWN as its own answer, never No", () => {
    expect(answerFilterText("unknown", "fr")).toBe("UNKNOWN (aucune donnée)");
    expect(answerFilterText("unknown", "en")).not.toMatch(/\bNo\b/);
    for (const a of ANSWER_FILTERS) expect(answerFilterText(a, "en")).not.toBe("");
  });

  it("has text for every error", () => {
    for (const e of ["bad-from", "bad-to", "from-after-to", "bad-detail", "bad-answer", "bad-licence"] as const) expect(filterErrorText(e, "fr")).not.toBe("");
    for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(splitErrorText(e, "en")).not.toBe("");
  });
});

describe("generated sentences", () => {
  const all = (l: "en" | "fr"): string[] => [
    fileReadText(12, 1, l),
    fileReadText(1, 3, l),
    chosenText(1, 1, l),
    chosenText(3, 12, l),
    chooseNoteText("Library", "n1", l),
    filtersSummary([], l),
    filtersSummary(["words king", "Elevator, Yes"], l),
    filtersSummary(filterParts({ ...NO_FILTERS, words: "king", detail: "elevator", answer: "no", source: "Owner", licence: "CC0-1.0", from: "2026-01-01", to: "" }, l), l),
  ];

  it("follow French typography", () => {
    for (const s of all("fr")) expect(frenchTypographyIssues(s), s).toEqual([]);
  });

  it("use no banned words", () => {
    for (const l of ["en", "fr"] as const) for (const s of all(l)) expect(findBanned(s), s).toBeUndefined();
  });

  it("read as plain sentences", () => {
    expect(chosenText(3, 12, "en")).toBe("3 of 12 notes chosen.");
    expect(chosenText(1, 4, "fr")).toBe("1 note retenue sur 4.");
    expect(chooseNoteText("Library", "n1", "en")).toBe("Choose Library (id n1)");
    expect(filtersSummary(["a", "b"], "fr")).toBe(`Filtres${NB}: a ; b.`);
  });

  it("describe the filters in use", () => {
    expect(filterParts(NO_FILTERS, "en")).toEqual([]);
    expect(filterParts({ ...NO_FILTERS, detail: "elevator", answer: "unknown", to: "2026-06-30" }, "en")).toEqual(["Elevator, Unknown (no record)", "… – 2026-06-30"]);
  });

  it("give ASCII file names", () => {
    for (const k of ["chosen", "rest", "csv"] as const) for (const l of ["en", "fr"] as const) expect(splitFilename(k, TODAY, l)).toMatch(/^[a-z-]+-2026-11-20\.(json|csv)$/);
  });
});

describe("the note files page copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileToolsStrings())).toEqual([]);
  });

  it("uses each tool's own title, so the list and the tool match", () => {
    expect(FILE_TOOLS_COPY.tools.check.title).toEqual(FILE_CHECK_COPY.title);
    expect(FILE_TOOLS_COPY.tools.compare.title).toEqual(FILE_COMPARE_COPY.title);
    expect(FILE_TOOLS_COPY.tools.merge.title).toEqual(FILE_MERGE_COPY.title);
    expect(FILE_TOOLS_COPY.tools.split.title).toEqual(FILE_SPLIT_COPY.title);
    expect(FILE_TOOLS_COPY.tools.read.title).toEqual(FILE_READER_COPY.title);
    expect(FILE_TOOLS_COPY.tools.summary.title).toEqual(FILE_SUMMARY_COPY.title);
    expect(FILE_TOOLS_COPY.tools.ask.title).toEqual(FILE_ASK_COPY.title);
    expect(FILE_TOOLS_COPY.tools.sheet.title).toEqual(FILE_SHEET_COPY.title);
    expect(FILE_TOOLS_COPY.tools.streets.title).toEqual(FILE_STREETS_COPY.title);
    expect(FILE_TOOLS_COPY.tools.visits.title).toEqual(FILE_VISITS_COPY.title);
    expect(FILE_TOOLS_COPY.tools.round.title).toEqual(FILE_ROUND_COPY.title);
    expect(FILE_TOOLS_COPY.tools.first.title).toEqual(FILE_FIRST_COPY.title);
    expect(FILE_TOOLS_COPY.tools.grid.title).toEqual(FILE_GRID_COPY.title);
  });

  it("gives every open button a name that holds the tool's title", () => {
    for (const id of TOOL_IDS) for (const l of ["en", "fr"] as const) expect(FILE_TOOLS_COPY.tools[id].open[l]).toContain(toolTitle(id, l));
  });

  it("announces the open tool with French typography", () => {
    expect(frenchTypographyIssues(openedToolText("split", "fr"))).toEqual([]);
    expect(openedToolText("merge", "en")).toBe("Tool open: Combine note files.");
  });
});

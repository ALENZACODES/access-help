import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { NB } from "./copy";
import { exportNotes } from "./exchange";
import { DROP_REASONS, ENTRY_PROBLEMS, NOTICES, checkFile, type FileCheck } from "./filecheck";
import {
  FILE_CHECK_COPY,
  checkFilename,
  checkedText,
  dropText,
  droppedText,
  entryLabel,
  fileCheckStrings,
  leftOutText,
  noticeText,
  problemText,
} from "./filecheck-copy";
import { checkText, droppedLines, totalsRows } from "./filecheck-text";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const PROV = { source: "City survey", licence: "CC0-1.0", recordedOn: "2026-10-01" };

function check(): FileCheck {
  const notes = [
    { id: "n1", placeName: "Library", address: "1 Main St", createdOn: "2026-10-01", licence: "CC0-1.0", note: "Call 416 555 0100", facts: [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes", provenance: PROV }] },
    { id: "n2", placeName: "", createdOn: "2026-10-01", licence: "MIT" },
    { id: "n3", placeName: "Pool", address: "9 Lake Rd", createdOn: "2026-10-01", licence: "CC0-1.0", facts: [] },
  ];
  const r = checkFile(JSON.stringify({ format: "app-notes", version: 1, exportedOn: "2026-11-01", notes }), TODAY);
  if (!r.ok) throw new Error(r.error);
  return r.check;
}

describe("the copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileCheckStrings())).toEqual([]);
  });

  it("has words for every problem, reason and notice", () => {
    for (const p of ENTRY_PROBLEMS) for (const l of ["en", "fr"] as const) expect(problemText(p, l)).not.toBe("");
    for (const r of DROP_REASONS) for (const l of ["en", "fr"] as const) expect(dropText(r, l)).not.toBe("");
    for (const n of NOTICES) for (const l of ["en", "fr"] as const) expect(noticeText(n, l)).not.toBe("");
  });

  it("names the remove action on the remove button", () => {
    expect(FILE_CHECK_COPY.clear.en).toMatch(/^Remove /);
    expect(FILE_CHECK_COPY.clear.fr).toMatch(/^Retirer /);
  });

  it("uses the UNKNOWN token in French", () => {
    expect(FILE_CHECK_COPY.rows.dropped.fr).toContain("UNKNOWN");
    expect(FILE_CHECK_COPY.droppedIntro.fr).toContain("UNKNOWN ne veut pas dire Non");
  });
});

describe("generated sentences", () => {
  const all = (l: "en" | "fr"): string[] => [
    entryLabel(3, "Library", "n-3", l),
    entryLabel(4, undefined, undefined, l),
    leftOutText(["no-name", "bad-created-date"], l),
    droppedText("Elevator", "yes", ["no-source", "bad-record-date"], l),
    checkedText(2, 1, 3, l),
  ];

  it("follow French typography", () => {
    for (const s of all("fr")) expect(frenchTypographyIssues(s), s).toEqual([]);
  });

  it("use no banned words", () => {
    for (const l of ["en", "fr"] as const) for (const s of all(l)) expect(findBanned(s), s).toBeUndefined();
  });

  it("read as plain sentences", () => {
    expect(entryLabel(3, "Library", "n-3", "en")).toBe("Entry 3, Library (id n-3)");
    expect(entryLabel(4, undefined, undefined, "fr")).toBe("Entrée 4");
    expect(leftOutText(["no-name"], "en")).toBe("Left out: it has no place name.");
    expect(droppedText("Ascenseur", "no", ["no-source"], "fr")).toBe(`Ascenseur, Non${NB}: pas de source.`);
  });

  it("gives ASCII file names with the date", () => {
    for (const k of ["report", "clean", "no-words"] as const) {
      for (const l of ["en", "fr"] as const) {
        const name = checkFilename(k, TODAY, l);
        expect(name).toMatch(/^[a-z-]+-2026-11-20\.(txt|json)$/);
        expect(findBanned(name)).toBeUndefined();
      }
    }
  });
});

describe("the text download", () => {
  it("holds the totals, every left-out reason, every answer read as Unknown and the notices", () => {
    const text = checkText(check(), "en", TODAY);
    expect(text.startsWith("Check of a notes file\nMade on 2026-11-20\n")).toBe(true);
    expect(text).toContain("The file says it was exported on 2026-11-01.");
    expect(text).toContain("Entries: 3\nNotes the App reads: 2\nEntries the App leaves out: 1\nYes or No answers read as Unknown: 1\n");
    expect(text).toContain("- Entry 2 (id n2). Left out: it has no place name; its licence is missing or is not one of the open licences the App accepts.");
    expect(text).toContain("- Entry 1, Library (id n1)\n  Elevator, Yes: no source, licence or date at all.");
    expect(text).toContain("  The note’s own words hold what looks like a phone number.");
    expect(text).toContain("- Entry 3, Pool (id n3)\n  No Yes or No recorded.");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("is written in French with French typography", () => {
    const text = checkText(check(), "fr", TODAY);
    expect(text).toContain(`Réponses Oui ou Non lues comme UNKNOWN${NB}: 1`);
    expect(text).not.toMatch(/inconnu/i);
    for (const line of text.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
    expect(findBanned(text)).toBeUndefined();
  });

  it("says when a file is clean", () => {
    const r = checkFile(exportNotes([testNote("a", "Library", [{ key: "elevator", value: "yes" }])], "2026-11-01"), TODAY);
    if (!r.ok) throw new Error(r.error);
    const text = checkText(r.check, "en", TODAY);
    expect(text).toContain(FILE_CHECK_COPY.clean.en);
    expect(text).toContain("Entries the App leaves out (0)\n- None.");
  });

  it("lists totals in a fixed order", () => {
    expect(totalsRows(check(), "en").map(([, n]) => n)).toEqual([3, 2, 1, 1, 1]);
  });

  it("writes one line per answer read as Unknown", () => {
    const e = check().entries[0];
    if (!e) throw new Error("no entry");
    expect(droppedLines(e, "en")).toEqual(["- Entry 1, Library (id n1)", "  Elevator, Yes: no source, licence or date at all."]);
  });
});

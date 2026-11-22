import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import {
  FILE_MOVE_COPY as C,
  changeLine,
  changesText,
  changesTitle,
  checkText,
  copySummary,
  fileMoveStrings,
  foundText,
  moveErrorText,
  moveFilename,
  nameLine,
  noteSummary,
  notesTitle,
  problemText,
  targetTitle,
  type StepProblem,
} from "./filemove-copy";
import { parseNote, type Note } from "./model";
import type { MoveChange } from "./movenote";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTE = testNote("a1", "Café A", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "no" }], "10 King St W");
const change = (over: Partial<MoveChange> = {}): MoveChange => ({
  noteId: "a1",
  createdOn: "2026-10-01",
  from: { name: "Café A", address: "10 King St W" },
  to: { name: "Bakery", address: "20 King St W" },
  existing: true,
  ...over,
});
const PROBLEMS: StepProblem[] = ["no-place", "no-note", "no-target", "same-place", "name-empty", "name-long", "name-control", "address-long", "address-control", "exists"];

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileMoveStrings())).toEqual([]);
  });

  it("has French typography and no banned words in every string", () => {
    for (const [path, pair] of fileMoveStrings()) {
      expect(frenchTypographyIssues(pair.fr), path).toEqual([]);
      expect(findBanned(pair.en), path).toBeUndefined();
      expect(findBanned(pair.fr), path).toBeUndefined();
    }
  });

  it("says that the controls that take things away remove them", () => {
    expect(C.clear.en).toMatch(/^Remove/);
    expect(C.undo.en).toMatch(/^Remove/);
    expect(C.undo.fr).toMatch(/^Retirer/);
  });

  it("has words for every problem and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const p of PROBLEMS) expect(problemText(p, l).length, p).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(moveErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("lines", () => {
  it("names a place with its address, or says it has none", () => {
    expect(nameLine({ name: "Kiosk", address: "" }, "en")).toBe("Kiosk, No address");
    expect(nameLine({ name: "Kiosk", address: "" }, "fr")).toBe("Kiosk, Aucune adresse");
  });

  it("says how many places were found", () => {
    expect(foundText(1, 1, "en")).toBe("1 place found.");
    expect(foundText(30, 45, "en")).toBe("45 places found; the first 30 are listed. Add words to narrow the search.");
    expect(foundText(0, 0, "fr")).toBe(C.noneFound.fr);
    expect(foundText(2, 2, "fr")).toBe("2 lieux trouvés.");
  });

  it("titles the notes of a place with how many there are", () => {
    expect(notesTitle({ name: "Café A", address: "10 King St W" }, 2, "en")).toBe("Notes under “Café A, 10 King St W” (2)");
    const fr = notesTitle({ name: "Kiosk", address: "" }, 1, "fr");
    expect(fr).toBe("Notes sous «\u202FKiosk, Aucune adresse\u202F» (1)");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("tells a note apart by its day, its records and its text", () => {
    expect(noteSummary(NOTE, "en")).toBe("Made on 2026-10-01, 2 records. Text: No text.");
    const withText = parseNote({ ...testNote("b", "B", [], "1 A St"), note: "Ramp at back" }) as Note;
    expect(noteSummary(withText, "en")).toBe("Made on 2026-10-01, 0 records. Text: “Ramp at back”.");
    const fr = noteSummary(withText, "fr");
    expect(fr).toBe("Créée le 2026-10-01, 0 donnée. Texte\u00A0: «\u202FRamp at back\u202F».");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("titles the move with the note's day and place", () => {
    expect(targetTitle(NOTE, "en")).toBe("Move the note made on 2026-10-01, under “Café A, 10 King St W”");
    expect(targetTitle(NOTE, "fr")).toBe("Déplacer la note créée le 2026-10-01, sous «\u202FCafé A, 10 King St W\u202F»");
  });
});

describe("moves", () => {
  it("says where each note went, and when it went to a place not in the file", () => {
    expect(changeLine(change(), "en")).toBe("The note made on 2026-10-01 went from “Café A, 10 King St W” to “Bakery, 20 King St W”");
    expect(changeLine(change({ existing: false, to: { name: "Deli", address: "" } }), "en")).toBe(
      "The note made on 2026-10-01 went from “Café A, 10 King St W” to “Deli, No address” (a place not in the file)",
    );
    const fr = changeLine(change({ existing: false }), "fr");
    expect(fr).toBe("La note créée le 2026-10-01 est passée de «\u202FCafé A, 10 King St W\u202F» à «\u202FBakery, 20 King St W\u202F» (un lieu absent du fichier)");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(changesTitle(2, "en")).toBe("Moves in the copy (2)");
  });

  it("sums up the copy, counting each note once", () => {
    const twice = [change(), change({ from: { name: "Bakery", address: "20 King St W" }, to: { name: "Kiosk", address: "" } })];
    expect(copySummary(twice, { ok: true, notes: 4, places: 2 }, "en")).toBe("1 note moved; 4 notes in all, read as 2 places.");
    const fr = copySummary([change(), change({ noteId: "b" })], { ok: true, notes: 40, places: 1 }, "fr");
    expect(fr).toBe("2 notes déplacées\u202F; 40 notes en tout, lues comme 1 lieu.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says whether the copy read back", () => {
    expect(checkText({ ok: true, notes: 1, places: 1 }, "en")).toBe(C.checkOk.en);
    expect(checkText({ ok: false, reason: "moved" }, "fr")).toBe(C.checkFailed.fr);
  });

  it("lists the moves as text, numbered", () => {
    expect(changesText([change()], TODAY, "en")).toBe(
      `Moves in the copy\n2026-11-21\n\n${C.rule.en}\n\n1. The note made on 2026-10-01 went from “Café A, 10 King St W” to “Bakery, 20 King St W”\n`,
    );
    for (const line of changesText([change()], TODAY, "fr").split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("names the files by the number of moves and the day", () => {
    expect(moveFilename("copy", 1, TODAY, "en")).toBe("notes-1-move-2026-11-21.json");
    expect(moveFilename("list", 3, TODAY, "en")).toBe("list-3-moves-2026-11-21.txt");
    expect(moveFilename("copy", 2, TODAY, "fr")).toBe("notes-2-deplacements-2026-11-21.json");
    expect(moveFilename("list", 1, TODAY, "fr")).toBe("liste-1-deplacement-2026-11-21.txt");
  });
});

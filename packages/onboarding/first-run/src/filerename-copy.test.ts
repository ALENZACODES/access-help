import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import {
  FILE_RENAME_COPY as C,
  changeLine,
  changesText,
  changesTitle,
  checkText,
  copySummary,
  editTitle,
  fileRenameStrings,
  foundText,
  joinsText,
  mixedTitle,
  nameLine,
  notesText,
  problemText,
  renameErrorText,
  renameFilename,
  renamePlaceLabel,
  spellingsText,
  type EditProblem,
} from "./filerename-copy";
import type { RenameChange } from "./renameplace";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const change = (over: Partial<RenameChange> = {}): RenameChange => ({
  from: { name: "Café A", address: "10 King St W" },
  to: { name: "Café Ardoise", address: "10 King St W" },
  noteIds: ["a1", "a2"],
  joined: undefined,
  ...over,
});
const PROBLEMS: EditProblem[] = ["no-choice", "name-empty", "name-long", "name-control", "address-long", "address-control", "unchanged", "joins"];

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileRenameStrings())).toEqual([]);
  });

  it("has French typography and no banned words in every string", () => {
    for (const [path, pair] of fileRenameStrings()) {
      expect(frenchTypographyIssues(pair.fr), path).toEqual([]);
      expect(findBanned(pair.en), path).toBeUndefined();
      expect(findBanned(pair.fr), path).toBeUndefined();
    }
  });

  it("says that the controls that take things away remove them", () => {
    expect(C.clear.en).toMatch(/^Remove/);
    expect(C.clear.fr).toMatch(/^Retirer/);
    expect(C.undo.en).toMatch(/^Remove/);
    expect(C.undo.fr).toMatch(/^Retirer/);
  });

  it("has words for every problem and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const p of PROBLEMS) expect(problemText(p, l).length, p).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(renameErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("lines", () => {
  it("names a place with its address, or says it has none", () => {
    expect(nameLine({ name: "Kiosk", address: "" }, "en")).toBe("Kiosk, No address");
    expect(nameLine({ name: "Kiosk", address: "" }, "fr")).toBe("Kiosk, Aucune adresse");
    expect(nameLine({ name: "A", address: "1 B St" }, "en")).toBe("A, 1 B St");
  });

  it("says how many places were found", () => {
    expect(foundText(2, 2, "en")).toBe("2 places found.");
    expect(foundText(30, 31, "en")).toBe("31 places found; the first 30 are listed. Add words to narrow the search.");
    expect(foundText(0, 0, "fr")).toBe(C.noneFound.fr);
    expect(foundText(30, 31, "fr")).toBe("31 lieux trouvés\u202F; les 30 premiers sont listés. Ajoutez des mots pour préciser la recherche.");
  });

  it("quotes the place being renamed and counts its notes", () => {
    expect(editTitle({ name: "Café A", address: "10 King St W" }, "en")).toBe("Rename “Café A, 10 King St W”");
    const fr = editTitle({ name: "Café A", address: "" }, "fr");
    expect(fr).toBe("Renommer «\u202FCafé A, Aucune adresse\u202F»");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(notesText(1, "en")).toBe("The change goes in 1 note.");
    expect(notesText(3, "fr")).toBe("La modification s’applique à 3 notes.");
  });

  it("names the place the renamed one would be read as one with", () => {
    expect(joinsText({ name: "Bakery", address: "20 King St W" }, "en")).toBe("“Bakery, 20 King St W” is already in the file. With this change the two would be read as one place.");
    const fr = joinsText({ name: "Bakery", address: "20 King St W" }, "fr");
    expect(fr).toBe("«\u202FBakery, 20 King St W\u202F» est déjà dans le fichier. Avec cette modification, les deux seraient lus comme un seul lieu.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("places written more than one way", () => {
  it("lists each spelling with its notes, and names the place in its button", () => {
    const s = [
      { name: "Café A", address: "10 King St W", notes: 2 },
      { name: "Cafe A", address: "", notes: 1 },
    ];
    expect(spellingsText(s, "en")).toBe("“Café A, 10 King St W” (2 notes), “Cafe A, No address” (1 note)");
    const fr = spellingsText(s, "fr");
    expect(fr).toBe("«\u202FCafé A, 10 King St W\u202F» (2 notes), «\u202FCafe A, Aucune adresse\u202F» (1 note)");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(renamePlaceLabel("Café A", "en")).toBe("Rename Café A");
    expect(renamePlaceLabel("Café A", "fr")).toBe("Renommer Café A");
    expect(mixedTitle(1, "en")).toBe("Places written more than one way (1)");
    expect(mixedTitle(2, "fr")).toBe("Lieux écrits de plusieurs façons (2)");
  });
});

describe("changes", () => {
  it("says what each change did", () => {
    expect(changeLine(change(), "en")).toBe("“Café A, 10 King St W” became “Café Ardoise, 10 King St W” (2 notes)");
    expect(changeLine(change({ noteIds: ["x"], joined: { name: "B", address: "" } }), "en")).toBe(
      "“Café A, 10 King St W” became “Café Ardoise, 10 King St W” (1 note), now read as one place with the one already named so",
    );
    const fr = changeLine(change(), "fr");
    expect(fr).toBe("«\u202FCafé A, 10 King St W\u202F» est devenu «\u202FCafé Ardoise, 10 King St W\u202F» (2 notes)");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(changesTitle(2, "en")).toBe("Changes in the copy (2)");
    expect(changesTitle(0, "fr")).toBe("Modifications dans la copie (0)");
  });

  it("sums up the copy, counting each note once", () => {
    const two = [change(), change({ noteIds: ["a1"] })];
    expect(copySummary(two, { ok: true, notes: 40, places: 38 }, "en")).toBe("2 changes, 2 notes changed; 40 notes in all, read as 38 places.");
    expect(copySummary([change({ noteIds: ["x"] })], { ok: true, notes: 1, places: 1 }, "en")).toBe("1 change, 1 note changed; 1 note in all, read as 1 place.");
    const fr = copySummary(two, { ok: true, notes: 40, places: 38 }, "fr");
    expect(fr).toBe("2 modifications, 2 notes modifiées\u202F; 40 notes en tout, lues comme 38 lieux.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says whether the copy read back", () => {
    expect(checkText({ ok: true, notes: 1, places: 1 }, "en")).toBe(C.checkOk.en);
    expect(checkText({ ok: false, reason: "changed" }, "fr")).toBe(C.checkFailed.fr);
  });

  it("lists the changes as text, numbered", () => {
    const text = changesText([change(), change({ from: { name: "Kiosk", address: "" }, to: { name: "Kiosk", address: "Union Station" }, noteIds: ["k"] })], TODAY, "en");
    expect(text).toBe(
      `Changes in the copy\n2026-11-21\n\n${C.rule.en}\n\n1. “Café A, 10 King St W” became “Café Ardoise, 10 King St W” (2 notes)\n2. “Kiosk, No address” became “Kiosk, Union Station” (1 note)\n`,
    );
    for (const line of changesText([change()], TODAY, "fr").split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("names the files by the number of changes and the day", () => {
    expect(renameFilename("copy", 1, TODAY, "en")).toBe("notes-renamed-1-change-2026-11-21.json");
    expect(renameFilename("list", 2, TODAY, "en")).toBe("places-renamed-2-changes-2026-11-21.txt");
    expect(renameFilename("copy", 2, TODAY, "fr")).toBe("notes-renommees-2-modifications-2026-11-21.json");
    expect(renameFilename("list", 1, TODAY, "fr")).toBe("lieux-renommes-1-modification-2026-11-21.txt");
  });
});

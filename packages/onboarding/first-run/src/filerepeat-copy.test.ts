import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import {
  FILE_REPEAT_COPY as C,
  checkText,
  fileRepeatStrings,
  foundSummary,
  groupDetail,
  groupLabel,
  groupPlace,
  noteHeading,
  recordLines,
  removalSummary,
  removeLabel,
  repeatErrorText,
  repeatFilename,
  repeatsText,
  showNotesLabel,
  tickedText,
} from "./filerepeat-copy";
import { parseNote, type Note } from "./model";
import { DEFAULT_REPEATS, findRepeats, removeRepeats, type RepeatGroup } from "./repeatnotes";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function note(id: string, name: string, address: string | null, over: { createdOn?: string; note?: string } = {}, yes = true): Note {
  const n = parseNote({ ...testNote(id, name, yes ? [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "no" }] : [], address), ...over });
  if (!n) throw new Error("bad note");
  return n;
}

const NOTES = [note("a1", "Café A", "10 King St W"), note("a2", "Café A", "10 King St W"), note("a3", "Café A", "10 King St W"), note("k1", "Kiosk", null, { note: "By the stairs" }, false), note("k2", "Kiosk", null, { note: "By the stairs" }, false)];
const groups = (): RepeatGroup[] => findRepeats(NOTES, DEFAULT_REPEATS);
const cafe = (): RepeatGroup => groups()[0] as RepeatGroup;
const kiosk = (): RepeatGroup => groups()[1] as RepeatGroup;

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileRepeatStrings())).toEqual([]);
  });

  it("has French typography and no banned words in every string", () => {
    for (const [path, pair] of fileRepeatStrings()) {
      expect(frenchTypographyIssues(pair.fr), path).toEqual([]);
      expect(findBanned(pair.en), path).toBeUndefined();
      expect(findBanned(pair.fr), path).toBeUndefined();
    }
  });

  it("says that the controls that take things out remove them", () => {
    expect(C.title.en).toMatch(/^Remove/);
    expect(C.title.fr).toMatch(/^Retirer/);
    expect(C.clear.en).toMatch(/^Remove/);
    for (const n of [0, 1, 4]) {
      expect(removeLabel(n, "en")).toMatch(/^Remove/);
      expect(removeLabel(n, "fr")).toMatch(/^Retirer/);
    }
    expect(groupLabel(cafe(), "en")).toMatch(/^Remove/);
    expect(groupLabel(kiosk(), "fr")).toMatch(/^Retirer/);
  });

  it("has words for every file error", () => {
    for (const l of ["en", "fr"] as const)
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(repeatErrorText(e, l).length).toBeGreaterThan(0);
  });
});

describe("groups", () => {
  it("names the place and how many repeats each tick box takes out", () => {
    expect(groupPlace(kiosk(), "en")).toBe("Kiosk, No address");
    expect(groupLabel(cafe(), "en")).toBe("Remove the 2 repeats of “Café A, 10 King St W”");
    expect(groupLabel(kiosk(), "en")).toBe("Remove the repeat of “Kiosk, No address”");
    const fr = groupLabel(cafe(), "fr");
    expect(fr).toBe("Retirer les 2 répétitions de «\u202FCafé A, 10 King St W\u202F»");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(groupLabel(kiosk(), "fr")).toBe("Retirer la répétition de «\u202FKiosk, Aucune adresse\u202F»");
  });

  it("says what the notes hold and which is kept", () => {
    expect(groupDetail(cafe(), "en")).toBe("Made on 2026-10-01. Each holds 2 records. The oldest is kept.");
    expect(groupDetail(kiosk(), "en")).toBe("Made on 2026-10-01. Each holds 0 records. Text: “By the stairs”. The oldest is kept.");
    const fr = groupDetail(kiosk(), "fr");
    expect(fr).toBe("Créées le 2026-10-01. Chacune contient 0 donnée. Texte\u00A0: «\u202FBy the stairs\u202F». La plus ancienne est gardée.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("lists every day the notes were made when days are not compared", () => {
    const ns = [note("x", "A", "1 A St"), note("y", "A", "1 A St", { createdOn: "2026-11-02" }), note("z", "A", "1 A St", { createdOn: "2026-11-09" })];
    const g = findRepeats(ns, { ...DEFAULT_REPEATS, anyDay: true })[0] as RepeatGroup;
    expect(groupDetail(g, "en")).toBe("Made on 2026-10-01, 2026-11-02 and 2026-11-09. Each holds 2 records. The oldest is kept.");
    expect(groupDetail(g, "fr")).toContain("Créées le 2026-10-01, 2026-11-02 et 2026-11-09.");
  });

  it("sums up the groups found", () => {
    expect(foundSummary(groups(), "en")).toBe("2 groups of repeated notes: 3 notes repeat another one.");
    expect(foundSummary([kiosk()], "en")).toBe("1 group of repeated notes: 1 note repeats another one.");
    expect(foundSummary([], "en")).toBe(C.none.en);
    const fr = foundSummary(groups(), "fr");
    expect(fr).toBe("2 groupes de notes répétées\u00A0: 3 notes en répètent une autre.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(foundSummary([kiosk()], "fr")).toBe("1 groupe de notes répétées\u00A0: 1 note en répète une autre.");
  });

  it("says how many groups are ticked and how many notes they take out", () => {
    expect(tickedText(groups(), "en")).toBe("2 groups ticked: 3 notes to take out.");
    expect(tickedText([kiosk()], "en")).toBe("1 group ticked: 1 note to take out.");
    expect(tickedText([], "en")).toBe("No group is ticked.");
    const fr = tickedText(groups(), "fr");
    expect(fr).toBe("2 groupes cochés\u00A0: 3 notes à retirer.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(tickedText([], "fr")).toBe("Aucun groupe n’est coché.");
  });

  it("counts the notes in the remove button", () => {
    expect(removeLabel(0, "en")).toBe(C.removeNone.en);
    expect(removeLabel(1, "en")).toBe("Remove 1 repeated note from the copy");
    expect(removeLabel(3, "fr")).toBe("Retirer 3 notes répétées de la copie");
  });
});

describe("notes held in a fuller note", () => {
  const ns = [note("s", "Shop", "1 A St", {}, true), parseNote({ ...testNote("e", "Shop", [], "1 A St"), createdOn: "2026-09-01" }) as Note, parseNote(testNote("f", "Shop", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "no" }, { key: "step-free-entry", value: "yes" }], "1 A St")) as Note];
  const g = (): RepeatGroup => findRepeats(ns, { ...DEFAULT_REPEATS, within: true })[0] as RepeatGroup;

  it("names the place and says the notes are held in a fuller note", () => {
    expect(g().kind).toBe("within");
    expect(groupLabel(g(), "en")).toBe("Remove the 2 notes held in a fuller note about “Shop, 1 A St”");
    const fr = groupLabel(g(), "fr");
    expect(fr).toBe("Retirer les 2 notes contenues dans une note plus complète sur «\u202FShop, 1 A St\u202F»");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    const one = findRepeats([ns[0] as Note, ns[2] as Note], { ...DEFAULT_REPEATS, within: true })[0] as RepeatGroup;
    expect(groupLabel(one, "en")).toBe("Remove the note held in a fuller note about “Shop, 1 A St”");
    expect(groupLabel(one, "fr")).toMatch(/^Retirer la note contenue/);
  });

  it("says how many records the notes taken out hold and the note kept holds", () => {
    expect(groupDetail(g(), "en")).toBe("Every record in the notes taken out (2 records at most) is in the note kept, made on 2026-10-01, which holds 3 records.");
    const fr = groupDetail(g(), "fr");
    expect(fr).toBe("Chaque donnée des notes retirées (2 données au plus) figure dans la note gardée, créée le 2026-10-01, qui en contient 3.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("the notes of a group", () => {
  it("names the place and how many notes the disclosure shows", () => {
    expect(showNotesLabel(cafe(), "en")).toBe("Show the notes about “Café A, 10 King St W” (3)");
    const fr = showNotesLabel(kiosk(), "fr");
    expect(fr).toBe("Afficher les notes sur «\u202FKiosk, Aucune adresse\u202F» (2)");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says which note is kept and when each was made", () => {
    expect(noteHeading(cafe().kept, true, "en")).toBe("Kept: made on 2026-10-01");
    expect(noteHeading(cafe().repeats[0] as Note, false, "en")).toBe("Taken out: made on 2026-10-01");
    expect(noteHeading(cafe().kept, true, "fr")).toBe("Gardée\u00A0: créée le 2026-10-01");
  });

  it("lists each record with its answer, source and day, in the App's order", () => {
    expect(recordLines(cafe().kept, "en")).toEqual(["Automatic door: No (City survey, 2026-10-01)", "Elevator: Yes (City survey, 2026-10-01)"]);
    const fr = recordLines(cafe().kept, "fr");
    expect(fr).toEqual(["Porte automatique\u00A0: Non (City survey, 2026-10-01)", "Ascenseur\u00A0: Oui (City survey, 2026-10-01)"]);
    for (const line of fr) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("says when a note holds no record, with the token UNKNOWN in French", () => {
    expect(recordLines(kiosk().kept, "en")).toEqual([C.noRecords.en]);
    expect(recordLines(kiosk().kept, "fr")).toEqual(["Aucune donnée, chaque détail est UNKNOWN."]);
  });

  it("names a contributor's reports in the reader's language", () => {
    const n = parseNote(testNote("c", "Café", [{ key: "elevator", value: "yes", source: "Contributor report" }], "1 A St")) as Note;
    expect(recordLines(n, "fr")).toEqual(["Ascenseur\u00A0: Oui (Rapport d’un contributeur, 2026-10-01)"]);
  });
});

describe("the copy", () => {
  it("counts the notes taken out and kept", () => {
    const gs = groups();
    const r = removeRepeats(NOTES, gs, gs.map((g) => g.key));
    expect(removalSummary(r, "en")).toBe("3 repeated notes taken out; 2 notes kept.");
    const fr = removalSummary(r, "fr");
    expect(fr).toBe("3 notes répétées retirées\u202F; 2 notes gardées.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    const one = removeRepeats(NOTES, gs, [kiosk().key]);
    expect(removalSummary(one, "en")).toBe("1 repeated note taken out; 4 notes kept.");
  });

  it("says whether the copy read back", () => {
    expect(checkText({ ok: true, notes: 2 }, "en")).toBe(C.checkOk.en);
    expect(checkText({ ok: false, reason: "answers" }, "fr")).toBe(C.checkFailed.fr);
  });

  it("lists each group taken out as text", () => {
    const r = removeRepeats(NOTES, groups(), [cafe().key]);
    expect(repeatsText(r, TODAY, "en")).toBe(
      `Repeated notes\n2026-11-21\n\n${C.rule.en}\n\n2 repeated notes taken out; 3 notes kept.\n\n- Café A, 10 King St W\n    Made on 2026-10-01. Each holds 2 records. The oldest is kept.\n    2 repeats taken out\n`,
    );
    for (const line of repeatsText(r, TODAY, "fr").split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("names the files by count and day", () => {
    expect(repeatFilename("copy", 3, TODAY, "en")).toBe("notes-without-3-repeats-2026-11-21.json");
    expect(repeatFilename("removed", 1, TODAY, "en")).toBe("notes-taken-out-1-repeat-2026-11-21.json");
    expect(repeatFilename("list", 2, TODAY, "en")).toBe("list-2-repeats-2026-11-21.txt");
    expect(repeatFilename("copy", 1, TODAY, "fr")).toBe("notes-sans-1-repetition-2026-11-21.json");
    expect(repeatFilename("removed", 2, TODAY, "fr")).toBe("notes-retirees-2-repetitions-2026-11-21.json");
    expect(repeatFilename("list", 2, TODAY, "fr")).toBe("liste-2-repetitions-2026-11-21.txt");
    expect(repeatFilename("csv", 1, TODAY, "en")).toBe("table-1-repeat-2026-11-21.csv");
    expect(repeatFilename("csv", 2, TODAY, "fr")).toBe("tableau-2-repetitions-2026-11-21.csv");
  });
});

import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import {
  FILE_GAPS_COPY as C,
  addLabel,
  boxErrorText,
  checkText,
  fileGapsStrings,
  filledSummary,
  filledText,
  gapsErrorText,
  gapsFilename,
  leftOutText,
  noteHeading,
  placeDetail,
  placeLabel,
  placeLine,
  planSummary,
  recordLines,
  showNotesLabel,
  tickedText,
} from "./filegaps-copy";
import { DEFAULT_FILL, fillCopy, fillPlan, type FillPlace, type FillPlan } from "./fillgaps";
import { parseNote, type Note } from "./model";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const MINE: Note[] = [testNote("m1", "Café", [{ key: "elevator", value: "yes" }], "1 A St"), testNote("m2", "Kiosk", [], null)];
const OTHER: Note[] = [
  testNote("o1", "Café", [{ key: "automatic-door", value: "yes", source: "Contributor report" }], "1 A St"),
  testNote("o2", "Kiosk", [{ key: "elevator", value: "no", source: "Visit" }, { key: "step-free-entry", value: "yes", source: "Visit" }], null),
  testNote("o3", "Kiosk", [{ key: "elevator", value: "no", source: "Visit", on: "2026-09-01" }], null),
];
const plan = (): FillPlan => fillPlan(MINE, OTHER, DEFAULT_FILL, "en");
const place = (name: string): FillPlace => {
  const p = plan().places.find((x) => x.place.name === name);
  if (!p) throw new Error("no place");
  return p;
};
const empty: FillPlan = { places: [], otherPlaces: 0, nothingMissing: 0, alreadyIn: 0, sameId: 0, alsoOther: 0, older: 0 };

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileGapsStrings())).toEqual([]);
  });

  it("has French typography and no banned words in every string", () => {
    for (const [path, pair] of fileGapsStrings()) {
      expect(frenchTypographyIssues(pair.fr), path).toEqual([]);
      expect(findBanned(pair.en), path).toBeUndefined();
      expect(findBanned(pair.fr), path).toBeUndefined();
    }
  });

  it("says that the control that takes the files off the page removes them", () => {
    expect(C.clear.en).toMatch(/^Remove/);
    expect(C.clear.fr).toMatch(/^Retirer/);
  });

  it("names the box in each file error", () => {
    expect(boxErrorText("mine", "not-json", "en")).toBe("Your file: This text is not a notes export.");
    expect(boxErrorText("other", "empty", "fr")).toBe(`L’autre fichier\u00A0: ${gapsErrorText("empty", "fr")}`);
    for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(gapsErrorText(e, "fr").length).toBeGreaterThan(0);
  });
});

describe("the plan", () => {
  it("says how many places can gain how many answers from how many notes", () => {
    expect(planSummary(plan(), "en")).toBe("2 places can gain 3 answers from 3 notes.");
    const fr = planSummary(plan(), "fr");
    expect(fr).toBe("2 lieux peuvent recevoir 3 réponses grâce à 3 notes.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(planSummary({ ...plan(), places: [place("Café")] }, "fr")).toBe("1 lieu peut recevoir 1 réponse grâce à 1 note.");
    expect(planSummary(empty, "en")).toBe(C.none.en);
  });

  it("says what was left out, naming only what there is", () => {
    expect(leftOutText(empty, "en")).toBe("");
    expect(leftOutText({ ...empty, otherPlaces: 40, nothingMissing: 3 }, "en")).toBe("Left out: 40 notes about places not in your file, 3 that answer no gap.");
    expect(leftOutText({ ...empty, alreadyIn: 2, sameId: 1, alsoOther: 1 }, "en")).toBe(
      "Left out: 2 already in your file, 1 with the id of one of your notes, 1 that also answer another detail.",
    );
    expect(leftOutText({ ...empty, older: 2 }, "en")).toBe("Left out: 2 with a record older than the day chosen.");
    expect(leftOutText({ ...empty, older: 1 }, "fr")).toBe("Laissées de côté\u00A0: 1 avec une donnée plus ancienne que le jour choisi.");
    const fr = leftOutText({ ...empty, otherPlaces: 1, nothingMissing: 2, alsoOther: 1 }, "fr");
    expect(fr).toBe("Laissées de côté\u00A0: 1 note sur des lieux absents de votre fichier, 2 qui ne répondent à aucun manque, 1 qui répond aussi à un autre détail.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("names the place and its notes in each tick box, and the gaps they fill", () => {
    expect(placeLine(place("Kiosk"), "en")).toBe("Kiosk, No address");
    expect(placeLabel(place("Kiosk"), "en")).toBe("Add 2 notes to “Kiosk, No address”");
    expect(placeLabel(place("Café"), "fr")).toBe("Ajouter 1 note à «\u202FCafé, 1 A St\u202F»");
    expect(placeDetail(place("Kiosk"), "en")).toBe("Fills: Step-free entrance, Elevator.");
    expect(placeDetail(place("Kiosk"), "fr")).toBe("Comble\u00A0: Entrée sans marche, Ascenseur.");
  });

  it("names the other details notes add a record to", () => {
    const p = { ...place("Café"), also: ["elevator" as const] };
    expect(placeDetail(p, "en")).toBe("Fills: Automatic door. Also adds a record to: Elevator.");
    const fr = placeDetail(p, "fr");
    expect(fr).toBe("Comble\u00A0: Porte automatique. Ajoute aussi une donnée à\u00A0: Ascenseur.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("counts the notes in the add button", () => {
    expect(addLabel(0, "en")).toBe(C.addNone.en);
    expect(addLabel(1, "en")).toBe("Add 1 note to a copy of your file");
    expect(addLabel(3, "fr")).toBe("Ajouter 3 notes à une copie de votre fichier");
  });
});

describe("reviewing and ticking", () => {
  it("names the place and its notes in the disclosure", () => {
    expect(showNotesLabel(place("Kiosk"), "en")).toBe("Show the notes for “Kiosk, No address” (2)");
    const fr = showNotesLabel(place("Café"), "fr");
    expect(fr).toBe("Afficher les notes pour «\u202FCafé, 1 A St\u202F» (1)");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("gives each note's day and its records, in the App's detail order", () => {
    const n = place("Kiosk").notes[0]?.note;
    if (!n) throw new Error("no note");
    expect(noteHeading(n, "en")).toBe("Note made on 2026-10-01");
    expect(noteHeading(n, "fr")).toBe("Note créée le 2026-10-01");
    expect(recordLines(n, "en")).toEqual(["Step-free entrance: Yes (Visit, 2026-10-01)", "Elevator: No (Visit, 2026-10-01)"]);
    expect(recordLines(place("Café").notes[0]?.note as Note, "fr")).toEqual(["Porte automatique\u00A0: Oui (Rapport d’un contributeur, 2026-10-01)"]);
    expect(recordLines(testNote("e", "E", [], null), "fr")).toEqual(["Aucune donnée, chaque détail est UNKNOWN."]);
  });

  it("shows a note's text, since it comes in with the note", () => {
    const n = parseNote({ ...testNote("t", "Shop", [], "1 A St"), note: "Ramp at back" }) as Note;
    expect(noteHeading(n, "en")).toBe("Note made on 2026-10-01. Text: “Ramp at back”");
    const fr = noteHeading(n, "fr");
    expect(fr).toBe("Note créée le 2026-10-01. Texte\u00A0: «\u202FRamp at back\u202F»");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says how many places are ticked and how many notes they add", () => {
    expect(tickedText(plan().places, "en")).toBe("2 places ticked: 3 notes to add.");
    expect(tickedText([place("Café")], "en")).toBe("1 place ticked: 1 note to add.");
    expect(tickedText([], "en")).toBe("No place is ticked.");
    const fr = tickedText(plan().places, "fr");
    expect(fr).toBe("2 lieux cochés\u00A0: 3 notes à ajouter.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(tickedText([], "fr")).toBe("Aucun lieu n’est coché.");
  });
});

describe("the copy", () => {
  const filled = () => fillCopy(MINE, plan(), plan().places.map((p) => p.place.id));

  it("sums up what was added", () => {
    expect(filledSummary(filled(), { ok: true, notes: 5, filled: 3 }, "en")).toBe("3 notes added; 3 gaps now have an answer; 5 notes in all.");
    const fr = filledSummary(filled(), { ok: true, notes: 5, filled: 1 }, "fr");
    expect(fr).toBe("3 notes ajoutées\u202F; 1 manque a maintenant une réponse\u202F; 5 notes en tout.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says whether the copy read back", () => {
    expect(checkText({ ok: true, notes: 1, filled: 1 }, "en")).toBe(C.checkOk.en);
    expect(checkText({ ok: false, reason: "other-answer" }, "fr")).toBe(C.checkFailed.fr);
  });

  it("lists each place with its notes, their day and their sources", () => {
    const text = filledText(filled(), TODAY, "en");
    expect(text).toContain("- Café, 1 A St\n    Fills: Automatic door.\n    Note made on 2026-10-01 (Contributor report)\n");
    expect(text).toContain("- Kiosk, No address\n    Fills: Step-free entrance, Elevator.\n    Note made on 2026-10-01 (Visit)\n    Note made on 2026-10-01 (Visit)\n");
    const fr = filledText(filled(), TODAY, "fr");
    expect(fr).toContain("Note créée le 2026-10-01 (Rapport d’un contributeur)");
    for (const line of fr.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("names the files by the number of notes added and the day", () => {
    expect(gapsFilename("copy", 3, TODAY, "en")).toBe("notes-3-notes-added-2026-11-21.json");
    expect(gapsFilename("list", 1, TODAY, "en")).toBe("list-1-note-added-2026-11-21.txt");
    expect(gapsFilename("copy", 1, TODAY, "fr")).toBe("notes-1-note-ajoutee-2026-11-21.json");
    expect(gapsFilename("list", 2, TODAY, "fr")).toBe("liste-2-notes-ajoutees-2026-11-21.txt");
    expect(gapsFilename("csv", 1, TODAY, "en")).toBe("table-1-note-added-2026-11-21.csv");
    expect(gapsFilename("csv", 2, TODAY, "fr")).toBe("tableau-2-notes-ajoutees-2026-11-21.csv");
  });
});

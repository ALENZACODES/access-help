import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import {
  FILE_LIST_COPY,
  checkSummary,
  checkText,
  columnLabel,
  columnsProblemText,
  decidedText,
  decisionText,
  fileListStrings,
  listErrorText,
  listFilename,
  notesErrorText,
  recordedText,
  rowText,
  setAsideText,
  statusTitle,
} from "./filelist-copy";
import { readSheet } from "./filesheet";
import { readStreetFile } from "./filestreets";
import { DECISIONS, LIST_STATUSES, applyDecisions, checkList, readEntries, type ListCheck } from "./placelist";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function check(listText: string): ListCheck {
  const f = readStreetFile(exportNotes([testNote("a", "Library", [], "100 King St W"), testNote("b", "Kiosk", [], null)], "2026-11-01"), TODAY, "en");
  const s = readSheet(listText);
  if (!f.ok || !s.ok) throw new Error("bad fixture");
  return checkList(readEntries(s.sheet, { name: 0, address: 1 }), f.file);
}

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileListStrings())).toEqual([]);
  });

  it("has words for every status, problem and error, without banned words", () => {
    for (const l of ["en", "fr"] as const) {
      for (const s of LIST_STATUSES) {
        expect(findBanned(statusTitle(s, l))).toBeUndefined();
        expect(findBanned(t(s, l))).toBeUndefined();
      }
      for (const p of ["name", "same", "licence"] as const) expect(columnsProblemText(p, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "unclosed-quote", "too-many-rows", "no-rows", "no-entries"] as const) expect(listErrorText(e, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(notesErrorText(e, l).length).toBeGreaterThan(0);
    }
  });

  it("has words for each answer and what it means", () => {
    for (const l of ["en", "fr"] as const)
      for (const d of DECISIONS) {
        expect(findBanned(decisionText(d, l))).toBeUndefined();
        expect(frenchTypographyIssues(decidedText(d, "fr"))).toEqual([]);
      }
    expect(decisionText("unsure", "fr")).toBe("Pas sûr");
    expect(decidedText("different", "en")).toBe("You said these are different places.");
  });

  it("never says the App decides two names are one place", () => {
    expect(FILE_LIST_COPY.statusHint["same-address"].en).toContain("The App does not decide.");
    expect(FILE_LIST_COPY.starterHint.fr).toContain("UNKNOWN");
  });
});

function t(s: (typeof LIST_STATUSES)[number], l: "en" | "fr"): string {
  return FILE_LIST_COPY.statusHint[s][l];
}

describe("checkSummary", () => {
  it("counts each status and the places not on the list", () => {
    const c = check("Name,Address\nLibrary,100 King St W\nNew,100 King St W\nShop,1 Elm Ave");
    expect(checkSummary(c, "en")).toBe("Your list has 3 places: 1 with notes, 1 at the same address under another name, 1 with no notes yet. 1 place in the file is not on the list.");
    const fr = checkSummary(c, "fr");
    expect(fr).toBe("Votre liste compte 3 lieux\u00A0: 1 avec des notes, 1 à la même adresse sous un autre nom, 1 sans notes pour l’instant. 1 lieu du fichier n’est pas sur la liste.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("leaves out the last sentence when every place in the file is on the list", () => {
    const c = check("Name,Address\nLibrary,100 King St W\nKiosk,");
    expect(checkSummary(c, "en")).toBe("Your list has 2 places: 2 with notes, 0 at the same address under another name, 0 with no notes yet.");
  });
});

describe("checkText", () => {
  it("prints each status with its rows, a box beside each place with no notes, and the places not on the list", () => {
    const text = checkText(check("Name,Address\nLibrary,100 King St W\nNew,100 King St W\nShop,1 Elm Ave"), "en", TODAY);
    expect(text).toBe(
      [
        "Check your list of places against a notes file",
        "Made on 2026-11-21",
        "Your list has 3 places: 1 with notes, 1 at the same address under another name, 1 with no notes yet. 1 place in the file is not on the list.",
        "",
        "Places with notes (1)",
        "Row 2: Library, 100 King St W",
        "",
        "Same address, another name (1)",
        "Row 3: New, 100 King St W",
        "    In the file: Library, 100 King St W",
        "",
        "Places with no notes yet (1)",
        "[ ] Row 4: Shop, 1 Elm Ave",
        "",
        "Places in the file but not on your list (1)",
        "Kiosk, No address",
        "",
        "",
      ].join("\n"),
    );
  });

  it("says which statuses come from the person's answer, with French spacing", () => {
    const f = readStreetFile(exportNotes([testNote("a", "Library", [], "100 King St W")], "2026-11-01"), TODAY, "fr");
    const s = readSheet("Nom,Adresse\nNouveau,100 King St W");
    if (!f.ok || !s.ok) throw new Error("bad fixture");
    const raw = checkList(readEntries(s.sheet, { name: 0, address: 1 }), f.file);
    const text = checkText(applyDecisions(raw, f.file, { 2: "different" }), "fr", TODAY);
    expect(text).toContain("[ ] Ligne 2\u00A0: Nouveau, 100 King St W\n    Vous avez indiqué que ce sont des lieux différents.\n");
    expect(text).toContain("Lieux du fichier absents de votre liste (1)\nLibrary, 100 King St W\n");
    for (const line of text.split("\n")) if (!/Library|Nouveau/.test(line)) expect(frenchTypographyIssues(line), line).toEqual([]);
  });
});

describe("setAsideText", () => {
  it("says which rows were set aside and why", () => {
    const read = { entries: [], blank: 2, unusable: [4], repeats: [7, 9] };
    expect(setAsideText(read, "en")).toBe("2 rows with no name are left out. 1 row with a name or address too long, or with characters the App cannot keep: 4. 2 rows repeat a place already listed: 7, 9.");
    const fr = setAsideText(read, "fr");
    expect(fr).toBe(
      "2 lignes sans nom sont laissées de côté. 1 ligne avec un nom ou une adresse trop long ou des caractères que l’App ne peut pas garder\u00A0: 4. 2 lignes répètent un lieu déjà listé\u00A0: 7, 9.",
    );
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("lists at most ten rows, and says nothing when nothing was set aside", () => {
    expect(setAsideText({ entries: [], blank: 0, unusable: [], repeats: Array.from({ length: 12 }, (_, i) => i + 2) }, "en")).toBe("12 rows repeat a place already listed: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11….");
    expect(setAsideText({ entries: [], blank: 0, unusable: [], repeats: [] }, "en")).toBe("");
  });
});

describe("small helpers", () => {
  it("labels columns by number and header", () => {
    expect(columnLabel(1, "Address", "en")).toBe("Column 2: Address");
    expect(columnLabel(0, "Nom", "fr")).toBe("Colonne 1\u00A0: Nom");
    expect(columnLabel(2, "", "en")).toBe("Column 3");
  });

  it("names rows and recorded details", () => {
    expect(rowText(4, "fr")).toBe("Ligne 4");
    expect(recordedText(1, 4, "en")).toBe("1 of 4 details recorded");
    expect(recordedText(3, 4, "fr")).toBe("3 détails sur 4 notés");
    expect(recordedText(1, 4, "fr")).toBe("1 détail sur 4 noté");
  });

  it("names the downloads by kind, day and language", () => {
    expect(listFilename("starter", TODAY, "en")).toBe("starter-notes-2026-11-21.json");
    expect(listFilename("found", TODAY, "fr")).toBe("notes-de-votre-liste-2026-11-21.json");
    expect(listFilename("csv", TODAY, "en")).toBe("list-check-2026-11-21.csv");
    expect(listFilename("text", TODAY, "fr")).toBe("comparaison-de-liste-2026-11-21.txt");
    expect(listFilename("not-in-list", TODAY, "en")).toBe("notes-not-on-your-list-2026-11-21.json");
  });
});

import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import {
  FILE_REPLACE_COPY as C,
  acceptLabel,
  changeText,
  copySummary,
  fieldName,
  fileReplaceStrings,
  hitHeading,
  hitProblemText,
  joinsText,
  placesLine,
  optionProblemText,
  replaceErrorText,
  replaceFilename,
  replaceSummary,
  searchText,
} from "./filereplace-copy";
import { readStreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { DEFAULT_REPLACE, OPTION_PROBLEMS, REPLACE_FIELDS, findHits, type ReplacedCopy, type ReplaceOptions, type ReplaceReport } from "./textreplace";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const O: ReplaceOptions = { ...DEFAULT_REPLACE, find: "Kng", replace: "King" };

function report(o: ReplaceOptions = O): ReplaceReport {
  const r = readStreetFile(exportNotes([testNote("a", "Kng Café", [], "1 Kng St"), testNote("b", "Kng", [], null)], "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return findHits(r.file, o);
}

const copy = (replaced: number, fields: number, notesChanged: number): ReplacedCopy => ({ notes: [], replaced, fields, notesChanged });

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileReplaceStrings())).toEqual([]);
  });

  it("holds no banned word or “inconnu”", () => {
    for (const [path, p] of fileReplaceStrings()) {
      expect(findBanned(p.en), path).toBeUndefined();
      expect(findBanned(p.fr), path).toBeUndefined();
      expect(p.fr.toLowerCase(), path).not.toContain("inconnu");
    }
  });

  it("names its remove control as one, and says records are never changed", () => {
    expect(C.clear.en.startsWith("Remove")).toBe(true);
    expect(C.clear.fr.startsWith("Retirer")).toBe(true);
    expect(C.rule.en).toContain("Records are never changed");
    expect(C.rule.fr).toContain("ne sont jamais changées");
  });

  it("has words for every field, problem and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const f of REPLACE_FIELDS) {
        expect(fieldName(f, l).length).toBeGreaterThan(0);
        expect(C.fields[f][l].length).toBeGreaterThan(0);
      }
      for (const p of OPTION_PROBLEMS) expect(optionProblemText(p, l).length).toBeGreaterThan(0);
      for (const p of ["name-empty", "too-long"] as const) expect(hitProblemText(p, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(replaceErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("change lines", () => {
  it("heads a change with its field, place and matches", () => {
    const [kng, cafe, address] = report().hits;
    expect(kng && hitHeading(kng, "en")).toBe("Place name of Kng — 1 match");
    expect(address && hitHeading(address, "fr")).toBe("Adresse de Kng Café — 1 correspondance");
    expect(cafe && hitHeading({ ...cafe, matches: [cafe.matches[0]!, cafe.matches[0]!] }, "en")).toBe("Place name of Kng Café — 2 matches");
  });

  it("labels each tick box so it can be told apart when read alone", () => {
    const [kng, , address] = report().hits;
    expect(kng && acceptLabel(kng, 0, "en")).toBe("Make change 1 (place name of Kng)");
    expect(address && acceptLabel(address, 2, "fr")).toBe("Faire le changement 3 (adresse de Kng Café)");
  });

  it("names the search, with an empty replacement in words", () => {
    expect(searchText(O, "en")).toBe("“Kng” → “King”");
    expect(searchText({ find: "Kng", replace: "" }, "en")).toBe("“Kng” → (empty)");
    const fr = searchText(O, "fr");
    expect(fr).toBe("«\u202FKng\u202F» → «\u202FKing\u202F»");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("summaries", () => {
  it("counts matches, fields and notes", () => {
    expect(replaceSummary(report(), O, "en")).toBe("“Kng” → “King”: 3 matches in 3 fields across 2 notes.");
    const fr = replaceSummary(report(), O, "fr");
    expect(fr).toBe("«\u202FKng\u202F» → «\u202FKing\u202F»\u00A0: 3 correspondances dans 3 champs sur 2 notes.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says how many changes cannot be made", () => {
    const o = { ...O, replace: "", fields: ["name" as const] };
    expect(replaceSummary(report(o), o, "en")).toBe("“Kng” → (empty): 2 matches in 2 fields across 2 notes, 1 of which cannot be made.");
    expect(replaceSummary(report(o), o, "fr")).toContain(", dont 1 impossible.");
  });

  it("tells what the copy changed", () => {
    expect(copySummary(copy(3, 2, 1), "en")).toBe("3 replacements in 2 fields across 1 note.");
    expect(copySummary(copy(1, 1, 1), "en")).toBe("1 replacement in 1 field across 1 note.");
    expect(copySummary(copy(3, 2, 2), "fr")).toBe("3 remplacements dans 2 champs sur 2 notes.");
  });

  it("shows each change before and after", () => {
    const [kng, , address] = report().hits;
    expect(changeText({ hit: address!, to: "1 King St", joins: false }, "en")).toBe("Address of Kng Café: 1 Kng St → 1 King St");
    expect(changeText({ hit: address!, to: "", joins: false }, "en")).toBe("Address of Kng Café: 1 Kng St → (empty)");
    const fr = changeText({ hit: kng!, to: "King", joins: false }, "fr");
    expect(fr).toBe("Nom du lieu de Kng\u00A0: Kng → King");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("joining places", () => {
  it("says when a change makes a note the same place as another", () => {
    const [kng] = report().hits;
    expect(changeText({ hit: kng!, to: "Library", joins: true }, "en")).toBe(
      "Place name of Kng: Kng → Library (joins another place with this name and address; their records go together)",
    );
    const fr = changeText({ hit: kng!, to: "Library", joins: true }, "fr");
    expect(fr).toContain(`(${joinsText("fr")})`);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("gives the place count before and after", () => {
    expect(placesLine(3, 2, "en")).toBe("The file had 3 places; the copy has 2, as 1 joined another.");
    expect(placesLine(1, 1, "en")).toBe("The file had 1 place; the copy has 1.");
    const fr = placesLine(5, 3, "fr");
    expect(fr).toBe("Le fichier comptait 5 lieux\u202F; la copie en compte 3, car 2 lieux en ont rejoint un autre.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("file names", () => {
  it("dates the copy and the list, in each language, without accents", () => {
    expect(replaceFilename("copy", TODAY, "en")).toBe("notes-replaced-2026-11-21.json");
    expect(replaceFilename("csv", TODAY, "en")).toBe("changes-found-2026-11-21.csv");
    expect(replaceFilename("copy", TODAY, "fr")).toBe("notes-remplacees-2026-11-21.json");
    expect(replaceFilename("csv", TODAY, "fr")).toBe("changements-trouves-2026-11-21.csv");
    for (const k of ["copy", "csv"] as const) for (const l of ["en", "fr"] as const) expect(replaceFilename(k, TODAY, l)).toMatch(/^[a-z0-9.-]+$/);
  });
});

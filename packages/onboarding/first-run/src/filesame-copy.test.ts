import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import { FILE_SAME_COPY, copySummary, joinedLine, fileSameStrings, groupHeading, linkText, matchSummary, placeLabel, reasonText, sameErrorText, sameFilename, sameText, stateText, typedProblemText } from "./filesame-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { MAX_GROUPS, fileMatches, type MatchReport, type TypedProblem } from "./placematch";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NB = "\u00A0";
const NN = "\u202F";

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("l1", "Central Library", [], "100 King St W"),
        testNote("l2", "Central Library", [], null),
        testNote("k", "Kiosk", [], "1 Elm St"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const report = (): MatchReport => fileMatches(file());

describe("copy", () => {
  it("passes the App's copy audit, with no banned words", () => {
    expect(auditCopy(fileSameStrings())).toEqual([]);
    for (const [k, p] of fileSameStrings()) {
      expect(findBanned(p.en), k).toBeUndefined();
      expect(findBanned(p.fr), k).toBeUndefined();
    }
  });

  it("has a text for every file error and reason", () => {
    for (const l of ["en", "fr"] as const) {
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(sameErrorText(e, l).length).toBeGreaterThan(0);
      for (const r of ["same-address", "same-name", "similar-name"] as const) expect(reasonText(r, l).length).toBeGreaterThan(0);
    }
  });

  it("says the App only suggests, that different addresses are different places, and that records keep their source", () => {
    expect(FILE_SAME_COPY.rule.en).toContain("Two different street addresses are always different places. It only suggests: you decide.");
    expect(FILE_SAME_COPY.joinNote.en).toContain("Every record keeps its value, source, licence and date");
    expect(FILE_SAME_COPY.privacy.en).toContain("your file does not change");
  });
});

describe("labels", () => {
  it("names a place with its address, or says it has none", () => {
    const f = file();
    const [noAddress, withAddress] = report().groups[0]?.places ?? [];
    if (!noAddress || !withAddress) throw new Error("no group");
    expect(f.places).toHaveLength(3);
    expect(placeLabel(withAddress, "en")).toBe("Central Library, 100 King St W");
    expect(placeLabel(noAddress, "fr")).toBe("Central Library (aucune adresse)");
  });

  it("says why two places were put together", () => {
    const link = report().groups[0]?.links[0];
    if (!link) throw new Error("no link");
    expect(linkText(link, "en")).toBe("Central Library (no address) and Central Library, 100 King St W: same name, one has no address");
    const fr = linkText(link, "fr");
    expect(fr).toBe(`Central Library (aucune adresse) et Central Library, 100 King St W${NB}: même nom, l’un sans adresse`);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("numbers groups from one", () => {
    expect(groupHeading(0, 3, "en")).toBe("Group 1: 3 places");
    expect(groupHeading(4, 2, "fr")).toBe(`Groupe 5${NB}: 2 lieux`);
  });
});

describe("summaries", () => {
  it("counts the groups and their places", () => {
    expect(matchSummary(report(), "en")).toBe("3 places: 1 group of places that may be the same, 2 places in all.");
    const fr = matchSummary(report(), "fr");
    expect(fr).toBe(`3 lieux${NB}: 1 groupe de lieux qui sont peut-être les mêmes, soit 2 lieux.`);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says how many groups are left out past the limit", () => {
    const over = { ...report(), over: 3 };
    expect(matchSummary(over, "en")).toContain(`The first ${MAX_GROUPS} are shown; 3 more groups are left out. Split the file to see them.`);
    const fr = matchSummary({ ...report(), over: 1 }, "fr");
    expect(fr).toContain(`Les ${MAX_GROUPS}${NB}premiers sont affichés${NN}; 1 autre groupe est laissé de côté.`);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says what the copy changed, and any note it could not change", () => {
    expect(copySummary({ notes: [], groups: 2, changed: 3, kept: 0, placesBefore: 9, placesAfter: 6, joined: [] }, "en")).toBe("2 groups joined: 3 notes were given another name or address. The copy has 6 places (9 before).");
    expect(copySummary({ notes: [], groups: 1, changed: 1, kept: 1, placesBefore: 2, placesAfter: 1, joined: [] }, "en")).toBe("1 group joined: 1 note was given another name or address. The copy has 1 place (2 before). 1 note could not be changed and keeps its name and address.");
    const fr = copySummary({ notes: [], groups: 1, changed: 2, kept: 2, placesBefore: 5, placesAfter: 4, joined: [] }, "fr");
    expect(fr).toBe(`1 groupe réuni${NB}: 2 notes ont reçu un autre nom ou une autre adresse. La copie compte 4 lieux (5 avant). 2 notes n’ont pas pu être changées et gardent leurs nom et adresse.`);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("names the downloads by day and language", () => {
    expect(sameFilename("csv", TODAY, "en")).toBe("places-that-may-be-the-same-2026-11-21.csv");
    expect(sameFilename("copy", TODAY, "fr")).toBe("notes-lieux-reunis-2026-11-21.json");
  });
});

describe("typed names, states and print", () => {
  it("explains every problem with a typed name", () => {
    const all: TypedProblem[] = ["name-empty", "name-long", "name-control", "address-long", "address-control", "personal"];
    for (const l of ["en", "fr"] as const) for (const p of all) expect(typedProblemText(p, l).length, p).toBeGreaterThan(0);
    expect(typedProblemText("name-long", "en")).toBe("Give a name of at most 120 characters.");
  });

  it("gives each place's state for a detail in the App's words", () => {
    const r = readStreetFile(
      exportNotes(
        [
          testNote("a", "Kiosk", [{ key: "elevator", value: "yes" }], "1 Elm St"),
          testNote("b", "Kiosk", [{ key: "elevator", value: "no", source: "Visit" }, { key: "automatic-door", value: "no" }], "1 Elm St"),
        ],
        "2026-11-01",
      ),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    const p = r.file.places[0];
    if (!p) throw new Error("no place");
    expect(stateText(p, "elevator", "en")).toBe("Reports differ");
    expect(stateText(p, "automatic-door", "fr")).toBe("Non");
    expect(stateText(p, "step-free-entry", "fr")).toBe("UNKNOWN");
  });

  it("prints each group with its places' answers and why they were put together", () => {
    const text = sameText(report(), TODAY, "en");
    expect(text.split("\n").slice(0, 2)).toEqual(["Places that may be the same", "Made on 2026-11-21"]);
    expect(text).toContain("Group 1: 2 places\n-----------------\nCentral Library (no address)\n  Step-free entrance: Unknown · ");
    expect(text).toContain("Why:\n  - Central Library (no address) and Central Library, 100 King St W: same name, one has no address\n");
    for (const line of sameText(report(), TODAY, "fr").split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
    expect(sameFilename("text", TODAY, "en")).toBe("places-that-may-be-the-same-2026-11-21.txt");
  });
});

describe("joinedLine", () => {
  it("says what each joined group became", () => {
    expect(joinedLine({ group: 2, name: "Central Library", address: "100 King St W", places: 3 }, "en")).toBe("Group 2: 3 places now Central Library, 100 King St W");
    const fr = joinedLine({ group: 1, name: "Banque", address: undefined, places: 2 }, "fr");
    expect(fr).toBe(`Groupe 1${NB}: 2 lieux deviennent Banque (aucune adresse)`);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

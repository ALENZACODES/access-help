import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import {
  FILE_ROUND_COPY,
  addressText,
  answerText,
  changeText,
  changesByPlace,
  fileRoundStrings,
  inFileLine,
  inFileText,
  kindText,
  problemText,
  resultSummary,
  roundErrorText,
  roundFilename,
  roundReport,
  roundSummary,
} from "./fileround-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { ANSWERS, buildRound, makeRound, type ChangeKind, type RoundSettings } from "./visitrecord";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const SETTINGS: RoundSettings = { visitedOn: "2026-11-19", source: "Walk group", licence: "CC0-1.0" };

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Library", [{ key: "elevator", value: "yes" }], "100 King St W"),
        testNote("a2", "Library", [{ key: "elevator", value: "yes" }], "100 King St W"),
        testNote("b", "Café", [], "12 King St W"),
        testNote("c", "Kiosk", [], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const placeId = (f: StreetFile, name: string): string => f.places.find((p) => p.name === name)?.id ?? "";

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileRoundStrings())).toEqual([]);
  });

  it("has words for every answer, problem, change and file error, without banned words", () => {
    for (const l of ["en", "fr"] as const) {
      for (const a of ANSWERS) expect(answerText(a, l).length).toBeGreaterThan(0);
      for (const c of ["date", "future", "source", "licence", "note-long", "note-control", "empty"] as const) expect(findBanned(problemText(c, l)), c).toBeUndefined();
      for (const k of ["new", "same", "different", "differ"] as ChangeKind[]) expect(findBanned(kindText(k, l)), k).toBeUndefined();
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(roundErrorText(e, l).length).toBeGreaterThan(0);
    }
    expect(answerText("skip", "fr")).toBe("Pas regardé");
  });

  it("says Unknown stays Unknown, using the token in French", () => {
    expect(FILE_ROUND_COPY.rule.fr).toContain("UNKNOWN");
    expect(FILE_ROUND_COPY.rule.fr).not.toMatch(/inconnu/i);
  });
});

describe("what the file says now", () => {
  it("names the state of each detail, with the number of reports", () => {
    const library = file().places.find((p) => p.name === "Library");
    if (!library) throw new Error("no library");
    expect(inFileText(library.resolutions.elevator, "en")).toBe("Yes (2 reports)");
    expect(inFileText(library.resolutions.elevator, "fr")).toBe("Oui (2 rapports)");
    expect(inFileText(library.resolutions["step-free-entry"], "fr")).toBe("UNKNOWN");
    expect(inFileText({ kind: "differ", observations: [] }, "en")).toBe("Reports differ");
    expect(inFileLine({ kind: "unknown" }, "en")).toBe("In the file now: Unknown");
    expect(inFileLine({ kind: "unknown" }, "fr")).toBe("Dans le fichier maintenant\u00A0: UNKNOWN");
  });
});

describe("summaries", () => {
  it("counts the places and details on the round", () => {
    const r = makeRound(file(), "open", "en");
    expect(roundSummary(r, "en")).toBe("3 places on the round, 11 details to ask about.");
    expect(roundSummary(r, "fr")).toBe("3 lieux dans la tournée, 11 détails à demander.");
  });

  it("says what was left off", () => {
    const r = { ...makeRound(file(), "open", "en"), leftOutDone: 1, over: 4 };
    expect(roundSummary(r, "en")).toBe(
      "3 places on the round, 11 details to ask about. 1 place where every detail has a record is left off. The file has 4 places more than fit on one round; split it with “Split a notes file” to record them.",
    );
    expect(frenchTypographyIssues(roundSummary(r, "fr"))).toEqual([]);
    expect(roundSummary(r, "fr")).toContain("1 lieu où chaque détail a une donnée est laissé de côté.");
  });

  it("counts the new notes and answers, and what stays Unknown", () => {
    const f = file();
    const result = buildRound(makeRound(f, "open", "en"), { [placeId(f, "Café")]: { answers: { elevator: "yes", "automatic-door": "no" }, note: "" } }, SETTINGS);
    expect(resultSummary(result, "en")).toBe("1 new note: 1 Yes, 1 No. 9 details stay Unknown.");
    expect(resultSummary(result, "fr")).toBe("1 nouvelle note\u00A0: 1 Oui, 1 Non. 9 détails restent UNKNOWN.");
    expect(resultSummary({ ...result, notChecked: 0 }, "en")).toBe("1 new note: 1 Yes, 1 No.");
    expect(resultSummary({ ...result, notChecked: 1 }, "en")).toBe("1 new note: 1 Yes, 1 No. 1 detail stays Unknown.");
  });
});

describe("changes", () => {
  it("names each change and groups them by place in the round's order", () => {
    const f = file();
    const result = buildRound(
      makeRound(f, "all", "en"),
      {
        [placeId(f, "Library")]: { answers: { elevator: "no" }, note: "" },
        [placeId(f, "Café")]: { answers: { elevator: "yes", "step-free-entry": "yes" }, note: "" },
      },
      SETTINGS,
    );
    const groups = changesByPlace(result);
    expect(groups.map((g) => [g.name, g.changes.length])).toEqual([
      ["Café", 2],
      ["Library", 1],
    ]);
    const lib = groups[1]?.changes[0];
    if (!lib) throw new Error("no change");
    expect(changeText(lib, "en")).toBe("Elevator: No (differs from the file, so the reports will differ)");
    expect(changeText(lib, "fr")).toBe("Ascenseur\u00A0: Non (diffère du fichier, donc les rapports divergeront)");
    for (const g of groups) for (const c of g.changes) expect(frenchTypographyIssues(changeText(c, "fr"))).toEqual([]);
  });
});

describe("roundReport", () => {
  const f = file();
  const result = buildRound(
    makeRound(f, "open", "en"),
    { [placeId(f, "Café")]: { answers: { elevator: "yes" }, note: "Ramp at the side.\nBell at the door." }, [placeId(f, "Kiosk")]: { answers: {}, note: "Closed" } },
    SETTINGS,
  );

  it("starts with the day, source and licence, then each place's answers and note", () => {
    const text = roundReport(result, SETTINGS, "en", TODAY);
    expect(text.split("\n").slice(0, 6)).toEqual(["Round of visits", "Day of the visits: 2026-11-19", "Source: Walk group", "Licence: CC0-1.0", "Made on 2026-11-20", "2 new notes: 1 Yes, 0 No. 10 details stay Unknown."]);
    expect(text).toContain("Café\n    12 King St W\n    Elevator: Yes (no record before)\n    Note: Ramp at the side. Bell at the door.\n");
    expect(text).toContain("Kiosk\n    No address\n    Only a note was written for this place.\n    Note: Closed\n");
  });

  it("keeps French typography outside the places' own words", () => {
    const text = roundReport(result, SETTINGS, "fr", TODAY);
    expect(text).toContain("Jour des visites\u00A0: 2026-11-19");
    for (const line of text.split("\n")) if (!/^(Café|Kiosk|Library| {4}\d| {4}Note)/.test(line)) expect(frenchTypographyIssues(line), line).toEqual([]);
  });
});

describe("small helpers", () => {
  it("names the downloads by kind, day and language", () => {
    expect(roundFilename("only", TODAY, "en")).toBe("round-notes-2026-11-20.json");
    expect(roundFilename("with", TODAY, "fr")).toBe("notes-avec-tournee-2026-11-20.json");
    expect(roundFilename("csv", TODAY, "en")).toBe("round-answers-2026-11-20.csv");
    expect(roundFilename("report", TODAY, "fr")).toBe("compte-rendu-de-tournee-2026-11-20.txt");
  });

  it("says when there is no address", () => {
    expect(addressText(undefined, "fr")).toBe("Aucune adresse");
    expect(addressText("1 Main St", "en")).toBe("1 Main St");
  });
});

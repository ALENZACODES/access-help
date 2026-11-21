import { describe, expect, it } from "vitest";
import { DEFAULT_WORDS, TARGETS, makeNotes, readSheet, type Mapping, type SetupError, type Sheet } from "./filesheet";
import { FIXED_ID, WORDS_ID, columnSelectId, setupField, sheetProblemsCsv, targetFrom } from "./views-filesheet";

const TODAY = new Date(Date.UTC(2026, 10, 20));

function sheet(text: string): Sheet {
  const r = readSheet(text);
  if (!r.ok) throw new Error(r.error);
  return r.sheet;
}

describe("setupField", () => {
  const mapping: Mapping = ["address", "place_name", "place_name", "elevator"];

  it("points each problem at the field that fixes it", () => {
    const cases: Array<[SetupError, string]> = [
      ["no-place-column", columnSelectId(0)],
      ["no-detail-column", columnSelectId(0)],
      ["no-source", FIXED_ID.source],
      ["source-too-long", FIXED_ID.source],
      ["source-control", FIXED_ID.source],
      ["bad-licence", FIXED_ID.licence],
      ["bad-date", FIXED_ID.recordedOn],
      ["future-date", FIXED_ID.recordedOn],
      ["word-in-two-lists", WORDS_ID.yes],
    ];
    for (const [code, field] of cases) expect(setupField({ code }, mapping), code).toBe(field);
  });

  it("points two columns set to one target at the first of them", () => {
    expect(setupField({ code: "two-columns", target: "place_name" }, mapping)).toBe(columnSelectId(1));
  });
});

describe("targetFrom", () => {
  it("reads every target and treats anything else as not used", () => {
    for (const t of TARGETS) expect(targetFrom(t)).toBe(t);
    expect(targetFrom("parking")).toBe("");
    expect(targetFrom(undefined)).toBe("");
  });
});

describe("sheetProblemsCsv", () => {
  it("gives the person's own rows with the row number, their column name and the reason", () => {
    const s = sheet(["Nom;Ascenseur", "Bibliothèque;peut-être", ";oui"].join("\n"));
    const mapping: Mapping = ["place_name", "elevator"];
    const r = makeNotes(s, mapping, { source: "Survey", licence: "CC0-1.0", recordedOn: "2026-11-01" }, DEFAULT_WORDS, TODAY);
    if ("error" in r) throw new Error(r.error);
    const lines = sheetProblemsCsv(s, mapping, r, "fr").replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines[0]).toBe("Nom,Ascenseur,ligne,colonne,raison");
    expect(lines[1]).toBe("Bibliothèque,peut-être,2,Ascenseur,Cette réponse ne figure dans aucune de vos listes de mots.");
    expect(lines[2]).toBe(",oui,3,Nom,Le nom du lieu est vide.");
  });

  it("leaves the column blank for a problem with a value from a column the person did not map", () => {
    const s = sheet(["Name,Elevator,When", "Pool,yes,2027-01-01"].join("\n"));
    const mapping: Mapping = ["place_name", "elevator", "recorded_on"];
    const r = makeNotes(s, mapping, { source: "Survey", licence: "CC0-1.0", recordedOn: "" }, DEFAULT_WORDS, TODAY);
    if ("error" in r) throw new Error(r.error);
    const lines = sheetProblemsCsv(s, mapping, r, "en").replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines[1]).toBe("Pool,yes,2027-01-01,2,When,The day it was recorded is after today.");
  });
});

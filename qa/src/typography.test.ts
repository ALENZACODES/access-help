import { describe, expect, it } from "vitest";
import { NBSP, NNBSP, fixFrenchPunctuation, frenchPunctuationIssues } from "./typography.js";

describe("French typography", () => {
  it("requires U+00A0 before ':' and U+202F before ';', '!', and '?'", () => {
    expect(frenchPunctuationIssues(`Oui${NBSP}: d'accord${NNBSP}!`)).toEqual([]);
    expect(frenchPunctuationIssues(`Liste${NNBSP}; item`)).toEqual([]);
    expect(frenchPunctuationIssues(`Pourquoi${NNBSP}?`)).toEqual([]);
    expect(frenchPunctuationIssues("Bonjour : ici").some((item) => item.includes('":"'))).toBe(true);
    expect(frenchPunctuationIssues(`Bonjour${NNBSP}: ici`).some((item) => item.includes('":"'))).toBe(true);
    expect(frenchPunctuationIssues(`Oui${NBSP}!`).some((item) => item.includes('"!"'))).toBe(true);
    expect(frenchPunctuationIssues("Pourquoi ?").some((item) => item.includes('"?"'))).toBe(true);
    expect(frenchPunctuationIssues(`Un${NBSP}; deux`).some((item) => item.includes('";"'))).toBe(true);
  });

  it("leaves URLs and times alone and can insert the right spaces", () => {
    const withUrl = "Voir https://example.org/path:page (consulté le 13 novembre 2026).";
    expect(frenchPunctuationIssues(withUrl)).toEqual([]);
    expect(fixFrenchPunctuation(withUrl)).toBe(withUrl);
    expect(fixFrenchPunctuation("Dire : attendez ! Pourquoi ? Liste ;")).toBe(`Dire${NBSP}: attendez${NNBSP}! Pourquoi${NNBSP}? Liste${NNBSP};`);
    expect(frenchPunctuationIssues("Départ 14:30 aujourd'hui")).toEqual([]);
  });
});

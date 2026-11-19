import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { COMPARE_STRINGS, missingCompareKeys, compareText, type CompareKey } from "./compareStrings.js";

const keys = Object.keys(COMPARE_STRINGS.en) as CompareKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("comparison strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingCompareKeys()).toEqual([]);
    expect(Object.keys(COMPARE_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(COMPARE_STRINGS.fr[key]), key).toEqual(placeholders(COMPARE_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = COMPARE_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(COMPARE_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(COMPARE_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says a match is a suggestion, that the App does not pick a side, and that nothing is uploaded", () => {
    expect(COMPARE_STRINGS.en.lead).toMatch(/A match is a suggestion/);
    expect(COMPARE_STRINGS.en.lead).toMatch(/does not say which record is right/);
    expect(COMPARE_STRINGS.en.lead).toMatch(/nothing is uploaded/);
    expect(COMPARE_STRINGS.fr.lead).toMatch(/rien n’est envoyé/);
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(COMPARE_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(COMPARE_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(compareText("en", "radiusOption", { m: 30 })).toBe("30 m");
    expect(compareText("fr", "radiusOption", { m: 30 })).toBe("30\u00a0m");
    expect(compareText("en", "openPlace")).toBe("Open {name} in the packs");
  });
});

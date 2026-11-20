import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { MATCH_STRINGS, missingMatchKeys, matchPageText, type MatchKey } from "./matchStrings.js";

const keys = Object.keys(MATCH_STRINGS.en) as MatchKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("numbers page strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingMatchKeys()).toEqual([]);
    expect(Object.keys(MATCH_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(MATCH_STRINGS.fr[key]), key).toEqual(placeholders(MATCH_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = MATCH_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(MATCH_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(MATCH_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says everything is worked out on the device and nothing is uploaded", () => {
    expect(MATCH_STRINGS.en.lead).toMatch(/Everything is worked out on this device and nothing is uploaded/);
    expect(MATCH_STRINGS.fr.lead).toMatch(/rien n’est envoyé/);
    expect(MATCH_STRINGS.en.filesNote).toMatch(/No file is sent anywhere/);
  });
  it("says the App fills in no number", () => {
    expect(MATCH_STRINGS.en.formHelp).toBe("Every field is optional. An empty field means you do not mind. The App fills in nothing for you.");
    expect(MATCH_STRINGS.fr.formHelp).toMatch(/L’application ne remplit rien pour vous\.$/);
  });
  it("suggests no number and names no standard", () => {
    for (const key of keys) {
      expect(MATCH_STRINGS.en[key], key).not.toMatch(/\d{2,}\s?(?:cm|in)\b|\b(?:recommended|standard width|building code|at least 8\d)\b/i);
      expect(MATCH_STRINGS.fr[key], key).not.toMatch(/\d{2,}\s?(?:cm|po)\b|\b(?:recommandé|norme|code du bâtiment)\b/i);
    }
  });
  it("never says who can use a place, and keeps score of nothing", () => {
    for (const key of keys) {
      expect(MATCH_STRINGS.en[key], key).not.toMatch(/\b(?:accessible|suitable|you can (?:use|enter|get in)|pass(?:es)?|fail(?:s|ed)?|score|rating)\b/i);
      expect(MATCH_STRINGS.fr[key], key).not.toMatch(/\b(?:accessible|adapté|convient|vous pouvez (?:utiliser|entrer)|pointage|note)\b/i);
    }
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(MATCH_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(MATCH_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(matchPageText("en", "setSaved", { name: "Manual chair" })).toBe("Saved the set Manual chair.");
    expect(matchPageText("fr", "setUsed", { name: "A", counts: "x" })).toBe("Ensemble A utilisé. x");
    expect(matchPageText("en", "looked")).toBe("Looked through your places. {counts}");
  });
});

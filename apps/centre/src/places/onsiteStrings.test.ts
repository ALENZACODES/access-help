import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { ONSITE_STRINGS, missingOnsiteKeys, onsiteText, type OnsiteKey } from "./onsiteStrings.js";

const keys = Object.keys(ONSITE_STRINGS.en) as OnsiteKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("on-site measuring page strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingOnsiteKeys()).toEqual([]);
    expect(Object.keys(ONSITE_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(ONSITE_STRINGS.fr[key]), key).toEqual(placeholders(ONSITE_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = ONSITE_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(ONSITE_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(ONSITE_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says answers are kept as the person goes and measures change only on saving", () => {
    expect(ONSITE_STRINGS.en.lead).toMatch(/nothing changes in your measures until you save at the end\.$/);
    expect(ONSITE_STRINGS.fr.lead).toMatch(/rien ne change dans vos mesures tant que vous n’enregistrez pas à la fin\.$/);
    expect(ONSITE_STRINGS.en.discarded).toMatch(/Nothing changed in your measures\.$/);
    expect(ONSITE_STRINGS.en.replaceNote).toBe("Saving replaces the measures of this place with the answers above.");
  });
  it("says a skipped question stays UNKNOWN, in the same word in both languages", () => {
    expect(ONSITE_STRINGS.en.skip).toBe("Skip, leave UNKNOWN");
    expect(ONSITE_STRINGS.fr.skip).toBe("Passer, laisser UNKNOWN");
    for (const key of keys) expect(ONSITE_STRINGS.fr[key], key).not.toMatch(/\binconnue?s?\b/i);
  });
  it("never calls a place usable or not, and praises nothing", () => {
    for (const key of keys) {
      expect(ONSITE_STRINGS.en[key], key).not.toMatch(/\b(?:accessible|suitable|wide enough|too narrow|well done|great|congratulations)\b/i);
      expect(ONSITE_STRINGS.fr[key], key).not.toMatch(/\b(?:accessible|adapté|assez large|trop étroit|bravo|félicitations)\b/i);
    }
  });
  it("never tells the person to walk", () => {
    for (const key of keys) {
      expect(ONSITE_STRINGS.en[key], key).not.toMatch(/\bwalk/i);
      expect(ONSITE_STRINGS.fr[key], key).not.toMatch(/\b(?:marchez|à pied)\b/i);
    }
  });
  it("never says the App sent anything", () => {
    for (const key of keys) expect(ONSITE_STRINGS.en[key], key).not.toMatch(/\b(?:upload|uploaded|sent to|shared with|submitted)\b/i);
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(ONSITE_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(ONSITE_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(onsiteText("en", "saved", { name: "Sample Library" })).toBe("Measures saved for Sample Library. The questions are closed.");
    expect(onsiteText("fr", "change", { name: "Rampe" })).toBe("Modifier\u00a0: Rampe");
    expect(onsiteText("en", "placeLabel")).toBe("Place: {name}.");
    expect(onsiteText("en", "placeLabel", { name: "toString" })).toBe("Place: toString.");
  });
});

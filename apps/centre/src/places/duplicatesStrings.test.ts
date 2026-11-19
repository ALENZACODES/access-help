import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { DUPLICATES_STRINGS, missingDuplicatesKeys, duplicatesText, type DuplicatesKey } from "./duplicatesStrings.js";

const keys = Object.keys(DUPLICATES_STRINGS.en) as DuplicatesKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("saved twice strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingDuplicatesKeys()).toEqual([]);
    expect(Object.keys(DUPLICATES_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(DUPLICATES_STRINGS.fr[key]), key).toEqual(placeholders(DUPLICATES_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = DUPLICATES_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(DUPLICATES_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(DUPLICATES_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says a group is a suggestion, nothing is removed before confirming, and nothing is uploaded", () => {
    expect(DUPLICATES_STRINGS.en.lead).toMatch(/A group is a suggestion/);
    expect(DUPLICATES_STRINGS.en.lead).toMatch(/Nothing is removed until you choose and confirm/);
    expect(DUPLICATES_STRINGS.en.lead).toMatch(/nothing is uploaded/);
    expect(DUPLICATES_STRINGS.fr.lead).toMatch(/rien n’est envoyé/);
  });
  it("says so when the App suggests no note", () => {
    expect(DUPLICATES_STRINGS.en.noSuggestion).toMatch(/suggests none of these/);
  });
  it("offers a way to say the notes are different places", () => {
    expect(DUPLICATES_STRINGS.en.differentButton).toMatch(/different places/);
    expect(DUPLICATES_STRINGS.fr.differentButton).toMatch(/lieux différents/);
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(DUPLICATES_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(DUPLICATES_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(duplicatesText("en", "confirmButton", { count: 2, n: 1 })).toBe("Yes, remove 2 from group 1");
    expect(duplicatesText("fr", "groupHeading", { n: 1, name: "Café" })).toBe("Groupe 1\u00a0: Café");
    expect(duplicatesText("en", "kept")).toBe("Kept one and removed {count} from this device.");
  });
});

import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { PRESUBMIT_STRINGS, missingPresubmitKeys, presubmitText, type PresubmitKey } from "./presubmitStrings.js";

const keys = Object.keys(PRESUBMIT_STRINGS.en) as PresubmitKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("check strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingPresubmitKeys()).toEqual([]);
    expect(Object.keys(PRESUBMIT_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(PRESUBMIT_STRINGS.fr[key]), key).toEqual(placeholders(PRESUBMIT_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = PRESUBMIT_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(PRESUBMIT_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(PRESUBMIT_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says the checks do not decide what the map takes, and that nothing is uploaded", () => {
    expect(PRESUBMIT_STRINGS.en.lead).toMatch(/do not say the map will take an edit/);
    expect(PRESUBMIT_STRINGS.en.lead).toMatch(/Nothing is uploaded/);
    expect(PRESUBMIT_STRINGS.fr.lead).toMatch(/Rien n’est envoyé/);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(PRESUBMIT_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(presubmitText("en", "copyTags", { name: "Cafe" })).toBe("Copy the tags for Cafe");
    expect(presubmitText("fr", "tidyLine", { field: "Nom", before: "a", after: "b" })).toBe("Nom : « a » devient « b »");
    expect(presubmitText("en", "meta", { date: "d" })).toContain("{source}");
  });
});

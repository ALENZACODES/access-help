import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { REVISIT_STRINGS, missingRevisitKeys, revisitText, type RevisitKey } from "./revisitStrings.js";

const keys = Object.keys(REVISIT_STRINGS.en) as RevisitKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("revisit strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingRevisitKeys()).toEqual([]);
    expect(Object.keys(REVISIT_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(REVISIT_STRINGS.fr[key]), key).toEqual(placeholders(REVISIT_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = REVISIT_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(REVISIT_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(REVISIT_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says a reason is a prompt, not a finding, and that nothing is uploaded", () => {
    expect(REVISIT_STRINGS.en.lead).toMatch(/A reason is a prompt to go and look/);
    expect(REVISIT_STRINGS.en.lead).toMatch(/does not say what you will find/);
    expect(REVISIT_STRINGS.en.lead).toMatch(/Nothing is uploaded/);
    expect(REVISIT_STRINGS.fr.lead).toMatch(/Rien n’est envoyé/);
  });
  it("says the App does not read the location", () => {
    expect(REVISIT_STRINGS.en.startHelp).toMatch(/does not read your location/);
    expect(REVISIT_STRINGS.fr.startHelp).toMatch(/ne lit pas votre position/);
  });
  it("says the fill-in sheet leaves the record fields empty", () => {
    expect(REVISIT_STRINGS.en.filesNote).toMatch(/leaves status, source, licence and date empty/);
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(REVISIT_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(REVISIT_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(revisitText("en", "withinOption", { km: 5 })).toBe("Within 5 km");
    expect(revisitText("fr", "withinOption", { km: 5 })).toBe("À moins de 5\u00a0km");
    expect(revisitText("en", "stopLabel")).toBe("Stop {n}");
  });
});

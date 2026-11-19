import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { DAYS_STRINGS, missingDaysKeys, daysText, type DaysKey } from "./daysStrings.js";

const keys = Object.keys(DAYS_STRINGS.en) as DaysKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("day log strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingDaysKeys()).toEqual([]);
    expect(Object.keys(DAYS_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(DAYS_STRINGS.fr[key]), key).toEqual(placeholders(DAYS_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = DAYS_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(DAYS_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(DAYS_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says the counts are only counts, everything stays on the device and nothing is uploaded", () => {
    expect(DAYS_STRINGS.en.lead).toMatch(/The counts are only counts/);
    expect(DAYS_STRINGS.en.lead).toMatch(/Everything stays on this device and nothing is uploaded/);
    expect(DAYS_STRINGS.fr.lead).toMatch(/rien n’est envoyé/);
  });
  it("says the day note stays on the device and is not added to an observation", () => {
    expect(DAYS_STRINGS.en.noteHelp).toMatch(/stays on this device and is not added to any observation/);
    expect(DAYS_STRINGS.fr.noteHelp).toMatch(/n’est ajoutée à aucune observation/);
  });
  it("says which files hold the note", () => {
    expect(DAYS_STRINGS.en.filesNote).toMatch(/The day file includes your note\. The OpenStreetMap file and the list of days do not\./);
  });
  it("keeps score of nothing", () => {
    for (const key of keys) expect(DAYS_STRINGS.en[key], key).not.toMatch(/\b(?:streak|goal|well done|great job)\b/i);
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(DAYS_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(DAYS_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(daysText("en", "openDay", { day: "2026-11-10", count: "2 observations" })).toBe("Show 2026-11-10, 2 observations");
    expect(daysText("fr", "dayHeading", { day: "mardi" })).toBe("Jour\u00a0: mardi");
    expect(daysText("en", "noteCount", { n: 3 })).toBe("3 of {max} characters");
  });
});

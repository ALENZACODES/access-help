import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { LICENCES_STRINGS, missingLicencesKeys, licencesText, type LicencesKey } from "./licencesStrings.js";

const keys = Object.keys(LICENCES_STRINGS.en) as LicencesKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("licence screen strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingLicencesKeys()).toEqual([]);
    expect(Object.keys(LICENCES_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(LICENCES_STRINGS.fr[key]), key).toEqual(placeholders(LICENCES_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = LICENCES_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(LICENCES_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(LICENCES_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says everything is worked out on the device and nothing is uploaded", () => {
    expect(LICENCES_STRINGS.en.lead).toMatch(/Everything is worked out on this device and nothing is uploaded/);
    expect(LICENCES_STRINGS.fr.lead).toMatch(/rien n’est envoyé/);
    expect(LICENCES_STRINGS.en.filesNote).toMatch(/No file is sent anywhere/);
  });
  it("says the tier is UNKNOWN in the table caption", () => {
    expect(LICENCES_STRINGS.en.sourcesCaption).toMatch(/Tier is UNKNOWN for every row/);
    expect(LICENCES_STRINGS.fr.sourcesCaption).toMatch(/Le niveau est UNKNOWN/);
  });
  it("never says a sharing is in order or lawful", () => {
    for (const key of keys) {
      expect(LICENCES_STRINGS.en[key], key).not.toMatch(/\b(?:compliant|legally safe|all clear|lawful|you are covered)\b/i);
      expect(LICENCES_STRINGS.fr[key], key).not.toMatch(/\b(?:conforme|en règle|légal)\b/i);
    }
  });
  it("names only the two licences the App takes", () => {
    for (const key of keys) expect(LICENCES_STRINGS.en[key], key).not.toMatch(/\bCC[- ]BY\b|\bMIT\b|\bOGL\b/);
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(LICENCES_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(LICENCES_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(licencesText("en", "scopeMine", { count: "2 records" })).toBe("My own observations (2 records)");
    expect(licencesText("fr", "why", { why: "x" })).toBe("Pourquoi\u00a0: x");
    expect(licencesText("en", "partDownload")).toBe("Download the {licence} records (.json)");
  });
});

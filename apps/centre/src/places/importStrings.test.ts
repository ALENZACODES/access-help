import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { IMPORT_STRINGS, missingImportKeys, importText, type ImportKey } from "./importStrings.js";

const keys = Object.keys(IMPORT_STRINGS.en) as ImportKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("sheet strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingImportKeys()).toEqual([]);
    expect(Object.keys(IMPORT_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(IMPORT_STRINGS.fr[key]), key).toEqual(placeholders(IMPORT_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = IMPORT_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(IMPORT_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(IMPORT_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says the sheet is read on the device, nothing is saved before confirming, and nothing is uploaded", () => {
    expect(IMPORT_STRINGS.en.lead).toMatch(/reads it on this device/);
    expect(IMPORT_STRINGS.en.lead).toMatch(/before anything is saved/);
    expect(IMPORT_STRINGS.en.lead).toMatch(/Nothing is uploaded/);
    expect(IMPORT_STRINGS.fr.lead).toMatch(/Rien n’est envoyé/);
  });
  it("says an unclear status is kept as UNKNOWN in both languages", () => {
    expect(IMPORT_STRINGS.en.columnsBody).toMatch(/kept as UNKNOWN/);
    expect(IMPORT_STRINGS.fr.columnsBody).toMatch(/conservé comme UNKNOWN/);
  });
  it("names the two open licences and no other", () => {
    for (const lang of ["en", "fr"] as const) {
      expect(IMPORT_STRINGS[lang].columnsBody).toContain("CC0-1.0");
      expect(IMPORT_STRINGS[lang].columnsBody).toContain("ODbL-1.0");
    }
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(IMPORT_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(IMPORT_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(importText("en", "saveButton", { count: 3 })).toBe("Save 3 to my observations");
    expect(importText("fr", "statusLine", { status: "UNKNOWN" })).toBe("État\u00a0: UNKNOWN");
    expect(importText("en", "lineLabel")).toBe("Line {line}");
  });
});

import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { MEASURE_STRINGS, missingMeasureKeys, measureText, type MeasureKey } from "./measureStrings.js";

const keys = Object.keys(MEASURE_STRINGS.en) as MeasureKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("measuring page strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingMeasureKeys()).toEqual([]);
    expect(Object.keys(MEASURE_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(MEASURE_STRINGS.fr[key]), key).toEqual(placeholders(MEASURE_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = MEASURE_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(MEASURE_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(MEASURE_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says everything is kept on the device and nothing is uploaded", () => {
    expect(MEASURE_STRINGS.en.lead).toMatch(/Everything is kept on this device and nothing is uploaded/);
    expect(MEASURE_STRINGS.fr.lead).toMatch(/rien n’est envoyé/);
    expect(MEASURE_STRINGS.en.filesNote).toMatch(/No file is sent anywhere/);
  });
  it("says an empty field stays UNKNOWN, in both languages", () => {
    expect(MEASURE_STRINGS.en.formHelp).toBe("Every field is optional. An empty field stays UNKNOWN.");
    expect(MEASURE_STRINGS.fr.formHelp).toMatch(/reste UNKNOWN\.$/);
    expect(MEASURE_STRINGS.fr.factsCaption).toMatch(/indique UNKNOWN\.$/);
  });
  it("never says who can use a place and gives no health advice", () => {
    for (const key of keys) {
      expect(MEASURE_STRINGS.en[key], key).not.toMatch(/\b(?:too narrow|wide enough|too high|safe|unsafe|up to code|barrier-free|you can get in|recommended|should be at least)\b/i);
      expect(MEASURE_STRINGS.fr[key], key).not.toMatch(/\b(?:trop étroit|assez large|trop haut|sécuritaire|aux normes|sans obstacle|recommandé)\b/i);
    }
  });
  it("offers an explicit not-noted choice instead of defaulting to no", () => {
    expect(MEASURE_STRINGS.en.choiceUnknown).toBe("Not noted");
    expect(MEASURE_STRINGS.en.methodUnknown).toBe("Not said");
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(MEASURE_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(MEASURE_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(measureText("en", "optionMeasured", { name: "Sample Library", day: "2026-11-10" })).toBe("Sample Library, 2026-11-10, measured");
    expect(measureText("fr", "measuredLineNoMethod", { day: "2026-11-12" })).toBe("Mesuré le 2026-11-12. Façon de prendre les longueurs\u00a0: UNKNOWN.");
    expect(measureText("en", "saved")).toBe("Measures saved for {name}.");
  });
});

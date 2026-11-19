import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { TAGS_STRINGS, missingTagsKeys, tagsText, type TagsKey } from "./tagsStrings.js";

const keys = Object.keys(TAGS_STRINGS.en) as TagsKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("tag page strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingTagsKeys()).toEqual([]);
    expect(Object.keys(TAGS_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(TAGS_STRINGS.fr[key]), key).toEqual(placeholders(TAGS_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = TAGS_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(TAGS_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(TAGS_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says everything is worked out on the device and nothing is uploaded", () => {
    expect(TAGS_STRINGS.en.lead).toMatch(/Everything is worked out on this device and nothing is uploaded/);
    expect(TAGS_STRINGS.fr.lead).toMatch(/rien n’est envoyé/);
    expect(TAGS_STRINGS.en.filesNote).toMatch(/No file is sent anywhere/);
  });
  it("says pasted tags stay on the page and are not saved", () => {
    expect(TAGS_STRINGS.en.pasteHelp).toMatch(/They stay on this page and are not saved\./);
    expect(TAGS_STRINGS.fr.pasteHelp).toMatch(/ne sont pas enregistrées\./);
  });
  it("never says the App added or saved anything on the map", () => {
    for (const key of keys) expect(TAGS_STRINGS.en[key], key).not.toMatch(/\b(?:added to the map|is now on the map|we saved|was saved to OpenStreetMap)\b/i);
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(TAGS_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(TAGS_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(tagsText("en", "optionLabel", { name: "Sample Library", day: "2026-11-10", status: "yes" })).toBe("Sample Library, 2026-11-10, yes");
    expect(tagsText("fr", "shown", { name: "x" })).toBe("Balises affichées pour x.");
    expect(tagsText("en", "shown")).toBe("Showing the tags for {name}.");
  });
});

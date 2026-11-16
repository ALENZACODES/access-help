import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { PLACES_STRINGS, missingPlacesKeys, placesText, type PlacesKey } from "./strings.js";

const keys = Object.keys(PLACES_STRINGS.en) as PlacesKey[];
const BANNED = /verified|vérifi|real-?time|temps réel|certified|certifi|guarantee|garanti|partner|partenai|accessnow|\bAAA\b/i;
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("places strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingPlacesKeys()).toEqual([]);
    expect(Object.keys(PLACES_STRINGS.fr).sort()).toEqual([...keys].sort());
  });

  it("uses the same placeholders in both languages", () => {
    for (const key of keys) {
      expect(placeholders(PLACES_STRINGS.fr[key]), key).toEqual(placeholders(PLACES_STRINGS.en[key]));
    }
  });

  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = PLACES_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), `${key} uses a straight apostrophe`).toBe(false);
    }
  });

  it("makes no claim of checking, live data, partnership, or conformance", () => {
    for (const language of ["en", "fr"] as const) {
      for (const key of keys) expect(PLACES_STRINGS[language][key], `${language}.${key}`).not.toMatch(BANNED);
    }
  });

  it("fills placeholders and leaves unknown ones visible", () => {
    expect(placesText("en", "resultsMany", { count: 3 })).toBe("3 places match.");
    expect(placesText("fr", "resultsMany", { count: 3 })).toBe("3 lieux correspondent.");
    expect(placesText("en", "resultsMany")).toBe("{count} places match.");
  });
});

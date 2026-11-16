import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { DAY_STRINGS, dayText, type DayKey } from "./mappingDayStrings.js";

const keys = Object.keys(DAY_STRINGS.en) as DayKey[];
const BANNED = /verified|verify|vérifi|real-?time|temps réel|certified|certifi|guarantee|garanti|partnership|partenariat/i;
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("mapping-day strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(Object.keys(DAY_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(DAY_STRINGS.fr[key]), key).toEqual(placeholders(DAY_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      expect(frenchPunctuationIssues(DAY_STRINGS.fr[key]), key).toEqual([]);
      expect(DAY_STRINGS.fr[key].includes("'"), key).toBe(false);
    }
  });
  it("makes no claim of checking, live data, partnership or a guarantee", () => {
    for (const language of ["en", "fr"] as const) for (const key of keys) expect(DAY_STRINGS[language][key], `${language}.${key}`).not.toMatch(BANNED);
  });
  it("says nothing was sent and that an empty cell says nothing about the place", () => {
    expect(DAY_STRINGS.en.lead).toMatch(/The App uploads nothing/);
    expect(DAY_STRINGS.fr.lead).toMatch(/n’envoie rien/);
    expect(DAY_STRINGS.en.limitsNote).toMatch(/says nothing about the place/);
    expect(DAY_STRINGS.fr.limitsNote).toMatch(/ne dit rien du lieu/);
    expect(DAY_STRINGS.en.filesLead).toMatch(/Nothing is sent anywhere/);
  });
  it("never says an empty cell is inaccessible, or that anything is mapped, done or scored", () => {
    for (const language of ["en", "fr"] as const) for (const key of keys) expect(DAY_STRINGS[language][key], `${language}.${key}`).not.toMatch(/inaccessible|fully mapped|complete\b|\bscore\b|rating|cartographié en entier/i);
  });
  it("fills placeholders", () => {
    expect(dayText("en", "open", { name: "Main" })).toBe("Open Main");
    expect(dayText("fr", "detailMeta", { date: "2026-11-21", size: 200, rows: 3, cols: 4 })).toBe("2026-11-21, cellules de 200 mètres, 3 rangées sur 4 colonnes.");
  });
});

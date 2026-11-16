import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { SETTINGS_STRINGS, missingSettingsKeys, settingsText, type SettingsKey } from "./strings.js";

const keys = Object.keys(SETTINGS_STRINGS.en) as SettingsKey[];
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("settings strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingSettingsKeys()).toEqual([]);
    expect(Object.keys(SETTINGS_STRINGS.fr).sort()).toEqual([...keys].sort());
  });

  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(SETTINGS_STRINGS.fr[key]), key).toEqual(placeholders(SETTINGS_STRINGS.en[key]));
  });

  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      expect(frenchPunctuationIssues(SETTINGS_STRINGS.fr[key]), key).toEqual([]);
      expect(SETTINGS_STRINGS.fr[key].includes("'"), key).toBe(false);
    }
  });

  it("covers every readiness sentence the evaluator can pick", () => {
    const variants: Record<string, string[]> = {
      connection: ["online", "offline"],
      shell: ["ready", "inactive", "unsupported", "unknown"],
      pack: ["some", "none"],
      storage: ["ok", "low", "unknown"],
      persistence: ["yes", "no", "unknown"],
    };
    for (const [id, list] of Object.entries(variants)) {
      expect(keys, `item.${id}`).toContain(`item.${id}`);
      for (const variant of list) expect(keys, `r.${id}.${variant}`).toContain(`r.${id}.${variant}`);
    }
    for (const state of ["ready", "attention", "unknown"]) expect(keys).toContain(`state.${state}`);
  });

  it("fills placeholders", () => {
    expect(settingsText("en", "r.storage.ok", { percent: 12 })).toBe("About 12% of the space available to the App is used.");
    expect(settingsText("fr", "r.storage.ok", { percent: 12 })).toContain("12 %");
  });
});

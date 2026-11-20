import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { SITTING_STRINGS, missingSittingKeys, sittingStringText, type SittingKey } from "./sittingStrings.js";

const keys = Object.keys(SITTING_STRINGS.en) as SittingKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("sitting screen strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingSittingKeys()).toEqual([]);
    expect(Object.keys(SITTING_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(SITTING_STRINGS.fr[key]), key).toEqual(placeholders(SITTING_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = SITTING_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(SITTING_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(SITTING_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says everything is kept on the device and nothing is uploaded", () => {
    expect(SITTING_STRINGS.en.lead).toMatch(/Everything is kept on this device and nothing is uploaded/);
    expect(SITTING_STRINGS.fr.lead).toMatch(/rien n’est envoyé/);
    expect(SITTING_STRINGS.en.filesNote).toMatch(/No file is sent anywhere/);
  });
  it("words the added button and its note as something the person says", () => {
    expect(SITTING_STRINGS.en.addedButton).toBe("I added this to the map");
    expect(SITTING_STRINGS.en.didAdded).toMatch(/^Noted: you said you added/);
    expect(SITTING_STRINGS.fr.didAdded).toMatch(/vous avez dit avoir ajouté/);
  });
  it("says ending keeps the observations and the list", () => {
    expect(SITTING_STRINGS.en.endHelp).toMatch(/Your observations and your list of what you added stay as they are\./);
  });
  it("keeps score of nothing", () => {
    for (const key of keys) {
      expect(SITTING_STRINGS.en[key], key).not.toMatch(/\b(?:streak|goal|target|well done|great job|keep it up|score)\b/i);
      expect(SITTING_STRINGS.fr[key], key).not.toMatch(/\b(?:bravo|félicitations|objectif|pointage)\b/i);
    }
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(SITTING_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(SITTING_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(sittingStringText("en", "started", { position: "Observation 1 of 4" })).toBe("Sitting started. Observation 1 of 4.");
    expect(sittingStringText("fr", "outcomeNow", { outcome: "x" })).toBe("Ce que vous avez dit jusqu’ici\u00a0: x.");
    expect(sittingStringText("en", "goToItem")).toBe("Go to {name}");
  });
});

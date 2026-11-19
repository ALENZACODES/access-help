import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { MINE_STRINGS, missingMineKeys, mineText, type MineKey } from "./mineStrings.js";

const keys = Object.keys(MINE_STRINGS.en) as MineKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("my observations strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingMineKeys()).toEqual([]);
    expect(Object.keys(MINE_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(MINE_STRINGS.fr[key]), key).toEqual(placeholders(MINE_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = MINE_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(MINE_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(MINE_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says a correction needs the person's confirmation and that nothing is uploaded", () => {
    expect(MINE_STRINGS.en.lead).toMatch(/saved only when you confirm it is what you saw yourself/);
    expect(MINE_STRINGS.en.lead).toMatch(/Nothing is uploaded/);
    expect(MINE_STRINGS.fr.lead).toMatch(/Rien n’est envoyé/);
  });
  it("says the undo list is not stored", () => {
    expect(MINE_STRINGS.en.undoNote).toMatch(/is not stored/);
    expect(MINE_STRINGS.fr.undoNote).toMatch(/n’est pas conservée/);
  });
  it("warns before removing and says it can be taken back", () => {
    expect(MINE_STRINGS.en.removeWarning).toMatch(/You can take it back until you leave this page/);
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(MINE_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(MINE_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(mineText("en", "editButton", { name: "Cafe" })).toBe("Correct Cafe");
    expect(mineText("fr", "selectedCount", { n: 2 })).toBe("Sélectionnées\u00a0: 2.");
    expect(mineText("en", "removed")).toBe("Removed from this device: {n}.");
  });
});

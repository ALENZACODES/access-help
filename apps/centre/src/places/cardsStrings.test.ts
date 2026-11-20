import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { CARDS_STRINGS, missingCardsKeys, cardsText, type CardsKey } from "./cardsStrings.js";

const keys = Object.keys(CARDS_STRINGS.en) as CardsKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("place cards page strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingCardsKeys()).toEqual([]);
    expect(Object.keys(CARDS_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(CARDS_STRINGS.fr[key]), key).toEqual(placeholders(CARDS_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = CARDS_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(CARDS_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(CARDS_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says everything stays on the device until the person passes a file on", () => {
    expect(CARDS_STRINGS.en.lead).toMatch(/Everything stays on this device until you pass a file on yourself\.$/);
    expect(CARDS_STRINGS.en.fileHelp).toMatch(/It is read on this device and nothing is uploaded\.$/);
    expect(CARDS_STRINGS.fr.fileHelp).toMatch(/rien n’est envoyé\.$/);
    expect(CARDS_STRINGS.en.filesNote).toBe("No file is sent anywhere.");
  });
  it("says the label is optional and is not kept", () => {
    expect(CARDS_STRINGS.en.fromLabel).toMatch(/\(optional\)$/);
    expect(CARDS_STRINGS.en.fromHelp).toMatch(/It is not kept on this device\.$/);
    expect(CARDS_STRINGS.fr.fromHelp).toMatch(/n’est pas gardé sur cet appareil\.$/);
  });
  it("never says the App sent or shared a card, and has no share-now wording", () => {
    for (const key of keys) {
      expect(CARDS_STRINGS.en[key], key).not.toMatch(/\b(?:send now|share now|we sent|card sent|shared with|email this)\b/i);
      expect(CARDS_STRINGS.fr[key], key).not.toMatch(/\b(?:envoyer maintenant|partager maintenant|fiche envoyée)\b/i);
    }
  });
  it("never calls a place usable or not, or another person’s facts reliable", () => {
    for (const key of keys) {
      expect(CARDS_STRINGS.en[key], key).not.toMatch(/\b(?:accessible|suitable|trusted|reliable|confirmed)\b/i);
      expect(CARDS_STRINGS.fr[key], key).not.toMatch(/\b(?:accessible|adapté|fiable|confirmé)\b/i);
    }
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(CARDS_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(CARDS_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(cardsText("en", "cardAdded", { name: "Sample Library" })).toBe("Card added: Sample Library.");
    expect(cardsText("fr", "cardRemoved", { name: "A" })).toBe("Fiche retirée\u00a0: A.");
    expect(cardsText("en", "remove")).toBe("Remove card {n}");
  });
});

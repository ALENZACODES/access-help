import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { ASK_STRINGS, missingAskKeys, askText, type AskKey } from "./askStrings.js";

const keys = Object.keys(ASK_STRINGS.en) as AskKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "vér" + "ifier", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti", "certi" + "fied"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("asking page strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingAskKeys()).toEqual([]);
    expect(Object.keys(ASK_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(ASK_STRINGS.fr[key]), key).toEqual(placeholders(ASK_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = ASK_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word", () => {
    for (const key of keys) {
      expect(ASK_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(ASK_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says everything is kept on the device and nothing is uploaded", () => {
    expect(ASK_STRINGS.en.lead).toMatch(/Everything is kept on this device and nothing is uploaded/);
    expect(ASK_STRINGS.fr.lead).toMatch(/rien n’est envoyé/);
    expect(ASK_STRINGS.en.filesNote).toMatch(/No file is sent anywhere/);
  });
  it("words noting an ask as something the person did, not the App", () => {
    expect(ASK_STRINGS.en.askedButton).toBe("Note that I asked");
    expect(ASK_STRINGS.en.didAsk).toMatch(/^Noted: you asked/);
    for (const key of keys) expect(ASK_STRINGS.en[key], key).not.toMatch(/\b(?:send now|we sent|message sent|email sent|contact the place for you)\b/i);
  });
  it("says an empty answer field stays UNKNOWN", () => {
    expect(ASK_STRINGS.en.toldHelp).toMatch(/An empty field stays UNKNOWN\.$/);
    expect(ASK_STRINGS.fr.toldHelp).toMatch(/reste UNKNOWN\.$/);
  });
  it("makes no demand, cites no law and says nothing about the person", () => {
    for (const key of keys) {
      expect(ASK_STRINGS.en[key], key).not.toMatch(/\b(?:must|required|by law|legal|rights|disab\w*|my wheelchair)\b/i);
      expect(ASK_STRINGS.fr[key], key).not.toMatch(/\b(?:devez|la loi|légal\w*|droits|handicap\w*|mon fauteuil)\b/i);
    }
  });
  it("uses contrôle, not vérification, in French", () => {
    for (const key of keys) expect(ASK_STRINGS.fr[key], key).not.toMatch(/v[ée]rifi/i);
  });
  it("gives no medical or eligibility advice", () => {
    for (const key of keys) expect(ASK_STRINGS.en[key], key).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(askText("en", "didAsk", { name: "Sample Library", day: "2026-11-19" })).toBe("Noted: you asked Sample Library on 2026-11-19.");
    expect(askText("fr", "markNoReply", { n: 2 })).toBe("Fermer la demande 2 sans réponse");
    expect(askText("en", "removeAsk")).toBe("Remove ask {n}");
  });
});

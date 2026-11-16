import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { REVIEW_STRINGS, missingReviewKeys, reviewText, type ReviewKey } from "./reviewStrings.js";

const keys = Object.keys(REVIEW_STRINGS.en) as ReviewKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifi", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("review strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingReviewKeys()).toEqual([]);
    expect(Object.keys(REVIEW_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(REVIEW_STRINGS.fr[key]), key).toEqual(placeholders(REVIEW_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = REVIEW_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word in either language", () => {
    for (const key of keys) {
      expect(REVIEW_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(REVIEW_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says the App uploads nothing and that the person submits", () => {
    expect(REVIEW_STRINGS.en.lead).toMatch(/does not upload anything/);
    expect(REVIEW_STRINGS.en.downloadNote).toMatch(/Nothing is sent/);
    expect(REVIEW_STRINGS.fr.downloadNote).toMatch(/Rien n’est envoyé/);
    expect(REVIEW_STRINGS.en.stepsLead).toMatch(/cannot submit for you/);
  });
  it("never claims an observation is right", () => {
    for (const key of keys) expect(REVIEW_STRINGS.en[key], key).not.toMatch(/\b(?:is correct|are correct|is accurate|approved|certified)\b/i);
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(reviewText("en", "tickedOn", { title: "A" })).toBe("Ticked: A.");
    expect(reviewText("fr", "tickedOn", { title: "A" })).toBe("Coché : A.");
    expect(reviewText("en", "includedCount")).toBe("{count} in the draft files");
  });
  it("labels every status the App can hold, with UNKNOWN left as UNKNOWN", () => {
    for (const status of ["yes", "limited", "no", "UNKNOWN"] as const) {
      expect(reviewText("en", `status.${status}` as ReviewKey).length).toBeGreaterThan(2);
    }
    expect(reviewText("fr", "status.UNKNOWN")).toBe("UNKNOWN");
  });
});

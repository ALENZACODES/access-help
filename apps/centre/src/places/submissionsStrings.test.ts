import { describe, expect, it } from "vitest";
import { frenchPunctuationIssues } from "../../../../qa/src/typography.js";
import { SUBMISSION_STRINGS, missingSubmissionKeys, submissionText, type SubmissionKey } from "./submissionsStrings.js";

const keys = Object.keys(SUBMISSION_STRINGS.en) as SubmissionKey[];
const BANNED = new RegExp(["ver" + "ified", "ver" + "ify", "vér" + "ifié", "real" + "-?time", "temps " + "réel", "partner" + "ship", "partenar" + "iat", "guaran" + "tee", "garan" + "ti"].join("|"), "i");
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("submissions strings", () => {
  it("has French for every English key and nothing extra", () => {
    expect(missingSubmissionKeys()).toEqual([]);
    expect(Object.keys(SUBMISSION_STRINGS.fr).sort()).toEqual([...keys].sort());
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of keys) expect(placeholders(SUBMISSION_STRINGS.fr[key]), key).toEqual(placeholders(SUBMISSION_STRINGS.en[key]));
  });
  it("follows French punctuation and apostrophe rules", () => {
    for (const key of keys) {
      const fr = SUBMISSION_STRINGS.fr[key];
      expect(frenchPunctuationIssues(fr), key).toEqual([]);
      expect(fr.includes("'"), key).toBe(false);
    }
  });
  it("uses no banned word in either language", () => {
    for (const key of keys) {
      expect(SUBMISSION_STRINGS.en[key], key).not.toMatch(BANNED);
      expect(SUBMISSION_STRINGS.fr[key], key).not.toMatch(BANNED);
    }
  });
  it("says the App cannot see OpenStreetMap and uploads nothing", () => {
    expect(SUBMISSION_STRINGS.en.lead).toMatch(/cannot see OpenStreetMap/);
    expect(SUBMISSION_STRINGS.en.lead).toMatch(/Nothing is uploaded/);
    expect(SUBMISSION_STRINGS.fr.lead).toMatch(/ne peut pas voir OpenStreetMap/);
    expect(SUBMISSION_STRINGS.en.filesNote).toMatch(/Nothing is sent anywhere/);
  });
  it("never says a submission was received, accepted or checked", () => {
    for (const key of keys) {
      expect(SUBMISSION_STRINGS.en[key], key).not.toMatch(/\b(?:was received|was accepted|has been accepted|is live|approved|confirmed by)\b/i);
    }
  });
  it("fills placeholders and leaves a missing one visible", () => {
    expect(submissionText("en", "markButton", { name: "Cafe" })).toBe("Mark Cafe as submitted");
    expect(submissionText("fr", "noteLine", { note: "x" })).toBe("Note : x");
    expect(submissionText("en", "seenLine")).toBe("Seen on {date}.");
  });
});

import { describe, expect, it } from "vitest";
import {
  COPY_META,
  FORBIDDEN_TERMS,
  allPairs,
  frenchTypographyIssues,
  stepOf,
} from "./index";

describe("shell copy", () => {
  const pairs = allPairs();

  it("covers a meaningful amount of text", () => {
    expect(pairs.length).toBeGreaterThan(25);
  });

  it("has non-empty, different EN and FR for every pair", () => {
    for (const [path, p] of pairs) {
      expect(p.en.trim(), `${path} en`).not.toBe("");
      expect(p.fr.trim(), `${path} fr`).not.toBe("");
    }
  });

  it("follows French typography", () => {
    for (const [path, p] of pairs) expect(frenchTypographyIssues(p.fr), path).toEqual([]);
    expect(frenchTypographyIssues(stepOf(2, 3, "fr"))).toEqual([]);
  });

  it("avoids forbidden names, AI mentions and overclaims", () => {
    const overclaim = /\b(real-?time|verified|certified|conformant|partnership|AAA)\b|temps réel|vérifi|conforme|partenariat/i;
    for (const [path, p] of pairs) {
      for (const re of FORBIDDEN_TERMS) {
        expect(re.test(p.en), `${path} en ${re}`).toBe(false);
        expect(re.test(p.fr), `${path} fr ${re}`).toBe(false);
      }
      expect(overclaim.test(p.en), path).toBe(false);
      expect(overclaim.test(p.fr), path).toBe(false);
    }
  });

  it("records provenance and words step counts", () => {
    expect(COPY_META.licence).toBe("CC0-1.0");
    expect(stepOf(2, 3, "en")).toBe("Step 2 of 3");
    expect(stepOf(2, 3, "fr")).toBe("Étape 2 sur 3");
  });
});

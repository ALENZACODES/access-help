import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS, frenchTypographyIssues } from "../../src/paths";
import { ARTICLES, ARTICLES_META, KEY_HELP, articleFilename, articleToText, decodeTextHref, findBanned, findScannerClaim, textHref } from "./index";

describe("articleToText", () => {
  it("includes the title, summary, every heading and every paragraph, in both languages", () => {
    for (const lang of ["en", "fr"] as const) {
      for (const a of ARTICLES) {
        const text = articleToText(a, lang);
        expect(text, `${a.id} ${lang} title`).toContain(a.title[lang]);
        expect(text, `${a.id} ${lang} summary`).toContain(a.summary[lang]);
        for (const s of a.sections) {
          expect(text, `${a.id} ${s.id} heading`).toContain(s.heading[lang]);
          for (const p of s.paragraphs ?? []) expect(text, `${a.id} ${s.id}`).toContain(p[lang]);
          (s.steps ?? []).forEach((p, i) => expect(text, `${a.id} ${s.id} step`).toContain(`${i + 1}. ${p[lang]}`));
        }
      }
    }
  });

  it("lists every key from the key table in the keyboard article", () => {
    const keyboard = ARTICLES.find((a) => a.id === "keyboard");
    expect(keyboard).toBeDefined();
    const text = articleToText(keyboard as NonNullable<typeof keyboard>, "en");
    for (const k of KEY_HELP) expect(text, k.id).toContain(`${k.keys.en}: ${k.action.en}`);
    const fr = articleToText(keyboard as NonNullable<typeof keyboard>, "fr");
    for (const k of KEY_HELP) expect(fr, k.id).toContain(`${k.keys.fr}\u00A0: ${k.action.fr}`);
  });

  it("ends with the written date, source and licence", () => {
    const text = articleToText(ARTICLES[0] as NonNullable<(typeof ARTICLES)[number]>, "en");
    expect(text).toContain(`Written on ${ARTICLES_META.date}.`);
    expect(text).toContain(`Licence: ${ARTICLES_META.licence}.`);
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });

  it("is plain text: no markup and no control characters other than new lines", () => {
    for (const lang of ["en", "fr"] as const) {
      for (const a of ARTICLES) {
        const text = articleToText(a, lang);
        expect(/<[a-z/][^>]*>/i.test(text), `${a.id} ${lang}`).toBe(false);
        expect(/[\u0000-\u0009\u000B-\u001F\u007F]/.test(text), `${a.id} ${lang}`).toBe(false);
      }
    }
  });

  it("follows French typography in the text it builds", () => {
    for (const a of ARTICLES) {
      for (const line of articleToText(a, "fr").split("\n")) expect(frenchTypographyIssues(line), `${a.id}: ${line}`).toEqual([]);
    }
  });

  it("has no banned wording and no scanner claim, so a saved copy is as safe as the page", () => {
    for (const lang of ["en", "fr"] as const) {
      for (const a of ARTICLES) {
        const text = articleToText(a, lang);
        expect(findBanned(text), `${a.id} ${lang}`).toBeUndefined();
        expect(findScannerClaim(text), `${a.id} ${lang}`).toBeUndefined();
      }
    }
  });

  it("numbers steps from 1 and leaves one blank line between parts, never two", () => {
    for (const a of ARTICLES) {
      const text = articleToText(a, "en");
      expect(text.includes("\n\n\n"), a.id).toBe(false);
      expect(/^0\. /m.test(text), a.id).toBe(false);
    }
  });

  it("gives each language its own text", () => {
    for (const a of ARTICLES) expect(articleToText(a, "fr"), a.id).not.toBe(articleToText(a, "en"));
  });
});

describe("file names and links", () => {
  it("names the file after the article and the language, using safe characters only", () => {
    const seen = new Set<string>();
    for (const lang of ["en", "fr"] as const) {
      for (const a of ARTICLES) {
        const name = articleFilename(a, lang);
        expect(name, `${a.id} ${lang}`).toMatch(/^help-[a-z0-9-]+-(en|fr)\.txt$/);
        expect(seen.has(name), name).toBe(false);
        seen.add(name);
      }
    }
    expect(seen.size).toBe(ARTICLES.length * 2);
  });

  it("makes a download link that decodes back to the exact text", () => {
    for (const a of ARTICLES) {
      for (const lang of ["en", "fr"] as const) {
        const text = articleToText(a, lang);
        const href = textHref(text);
        expect(href.startsWith("data:text/plain;charset=utf-8,")).toBe(true);
        expect(href.includes("\n")).toBe(false);
        expect(decodeTextHref(href)).toBe(text);
      }
    }
  });

  it("refuses to decode anything that is not its own kind of link", () => {
    expect(decodeTextHref("https://example.org/x")).toBeUndefined();
    expect(decodeTextHref("data:application/json;charset=utf-8,%7B%7D")).toBeUndefined();
    expect(decodeTextHref("data:text/plain;charset=utf-8,%E0%A4%A")).toBeUndefined();
  });

  it("does not collide with the short guides", () => {
    for (const a of ARTICLES) expect(ONBOARDING_PATHS.some((p) => p.id === a.id)).toBe(false);
  });
});

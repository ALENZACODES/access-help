import { describe, expect, it } from "vitest";
import { ALL_HELP_ARTICLES } from "./integrated-articles.js";
import { auditArticles } from "./content-rules.js";
import { getHelpForShell, listHelpForShell } from "./shell.js";

const ctx = { locale: "fr" as const, offline: true, nowIso: "2026-11-15T15:00:00Z" };
const bannedOrg = String.fromCharCode(115, 99, 105, 111);
const prohibited = [ new RegExp(`\\b${bannedOrg}\\b`, "i"), /\bAI\b/, /wheelchair-bound/i, /cloué au fauteuil/i, /\bin partnership with\b/i ];

describe("integrated help", () => {
  it("ships both languages and records editorial provenance", () => {
    expect(ALL_HELP_ARTICLES.length).toBeGreaterThanOrEqual(7);
    expect(new Set(ALL_HELP_ARTICLES.map((a) => a.id)).size).toBe(ALL_HELP_ARTICLES.length);
    for (const article of ALL_HELP_ARTICLES) {
      for (const lang of ["en", "fr"] as const) {
        expect(article[lang].title.trim()).not.toBe("");
        expect(article[lang].sections.length).toBeGreaterThan(0);
      }
      const result = getHelpForShell(article.id, ctx);
      expect(result.item?.provenance).toMatchObject({ source_name: "App-authored help centre", licence: "MIT", tier: "E" });
      expect(result.item?.provenance.source_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.item?.provenance.retrieved_at).toBe(ctx.nowIso);
      for (const pattern of prohibited) expect(pattern.test(JSON.stringify(article))).toBe(false);
    }
    expect(listHelpForShell(ctx).items).toHaveLength(ALL_HELP_ARTICLES.length);
    expect(getHelpForShell("not-an-article", ctx).availability).toBe("empty");
  });

  it("passes the existing content gate", () => {
    expect(auditArticles(ALL_HELP_ARTICLES)).toEqual([]);
  });

  it("uses non-breaking spaces before French double punctuation", () => {
    for (const article of ALL_HELP_ARTICLES) {
      const body = article.fr;
      const text = [body.title, body.summary, ...body.sections.flatMap((s) => [s.heading, ...s.paragraphs]), ...article.does.fr, ...article.doesNot.fr, ...article.dataUses.fr].join("\n");
      expect(text).not.toMatch(/(?<![\u00a0\u202f])[:;?!]/u);
      expect(text).not.toMatch(/«(?![\u00a0\u202f])|(?<![\u00a0\u202f])»/u);
    }
  });
});

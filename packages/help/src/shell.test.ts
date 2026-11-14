import { describe, expect, it } from "vitest";
import { HELP_ARTICLES } from "./content/articles.js";
import { HELP_LICENCE, SHELL_CONTRACT_VERSION, helpShellModule, listHelpForShell, toShellArticle } from "./shell.js";
import type { HelpArticle } from "./types.js";

const NOW = "2026-11-14T12:00:00.000Z";

describe("help shell adapter", () => {
  it("pins the shell contract version", () => {
    expect(SHELL_CONTRACT_VERSION).toBe("1.1.0");
  });

  it("lists every article in the screen language with a source, licence, date, and tier", async () => {
    for (const locale of ["en", "fr"] as const) {
      const result = await helpShellModule.list({ locale, offline: true, nowIso: NOW });
      expect(result).toMatchObject({ moduleId: "help", availability: "ready", liveStatus: "unavailable" });
      expect(result.items).toHaveLength(HELP_ARTICLES.length);
      for (const item of result.items) {
        const article = HELP_ARTICLES.find((candidate) => candidate.id === item.id)!;
        expect(item.locale).toBe(locale);
        expect(item.title).toBe(article[locale].title);
        expect(item.provenance.licence).toBe(HELP_LICENCE);
        expect(item.provenance.source_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(item.provenance.retrieved_at).toBe(NOW);
        expect(item.provenance.prototype_label).toBe("PROTOTYPE-UNVERIFIED");
        expect([0, "E"]).toContain(item.provenance.tier);
        expect(item.translationState).toBe(article.translation[locale].state);
      }
    }
  });

  it("uses the latest source date and tier E only when an https source was read", () => {
    const base = HELP_ARTICLES[0]!;
    const withUrl: HelpArticle = {
      ...base,
      sources: [
        { ...base.sources[0]!, retrieved: "2026-11-01", url: undefined },
        { ...base.sources[0]!, retrieved: "2026-11-13", url: "https://example.org/official" },
      ],
    };
    expect(toShellArticle(withUrl, "en", NOW)?.provenance).toMatchObject({ source_date: "2026-11-13", tier: "E" });
    const noUrl: HelpArticle = { ...base, sources: [{ ...base.sources[0]!, url: undefined }] };
    expect(toShellArticle(noUrl, "en", NOW)?.provenance.tier).toBe(0);
  });

  it("leaves out an article with no dated source instead of giving it a date", () => {
    const undated: HelpArticle = { ...HELP_ARTICLES[0]!, sources: [] };
    expect(toShellArticle(undated, "en", NOW)).toBeNull();
    const result = listHelpForShell({ locale: "en", offline: false, nowIso: NOW }, [undated, HELP_ARTICLES[1]!]);
    expect(result.items.map((item) => item.id)).toEqual([HELP_ARTICLES[1]!.id]);
  });

  it("searches in the screen language and returns an empty ready list for no match", () => {
    const french = listHelpForShell({ locale: "fr", offline: true, nowIso: NOW, query: "hors ligne" });
    expect(french.items.map((item) => item.id)).toContain("offline");
    const none = listHelpForShell({ locale: "en", offline: true, nowIso: NOW, query: "zzzz nothing zzzz" });
    expect(none.items).toEqual([]);
    expect(none.asOf).toBeNull();
  });

  it("never marks an article verified", () => {
    const text = JSON.stringify(listHelpForShell({ locale: "en", offline: true, nowIso: NOW }));
    expect(text).not.toMatch(/"VERIFIED"|"tier":3|"tier":2/);
  });
});

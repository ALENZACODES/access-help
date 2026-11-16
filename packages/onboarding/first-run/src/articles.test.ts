import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS, frenchTypographyIssues, FORBIDDEN_TERMS } from "../../src/paths";
import {
  ARTICLES,
  ARTICLES_META,
  ARTICLE_ID,
  KEY_HELP,
  articleForMode,
  articleStrings,
  findBanned,
  findScannerClaim,
  getArticle,
  plainIssues,
  sectionAnchor,
} from "./index";

const ALL = ARTICLES.flatMap((a) => articleStrings(a));

describe("article data", () => {
  it("has unique, address-safe ids and unique section ids", () => {
    const ids = ARTICLES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ARTICLES) {
      expect(a.id, a.id).toMatch(ARTICLE_ID);
      const sections = a.sections.map((s) => s.id);
      expect(new Set(sections).size, a.id).toBe(sections.length);
      expect(a.sections.length, a.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("covers the keyboard, switch and voice routes plus Unknown", () => {
    for (const id of ["keyboard", "switch", "voice", "unknown"]) expect(getArticle(id), id).toBeDefined();
  });

  it("gives every section something to read", () => {
    for (const a of ARTICLES) {
      for (const s of a.sections) {
        const body = (s.paragraphs?.length ?? 0) + (s.steps?.length ?? 0) + (s.keys ? 1 : 0);
        expect(body, `${a.id}.${s.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("has English and French for every string, and the two differ", () => {
    for (const [label, l] of ALL) {
      expect(l.en.trim(), `${label} en`).not.toBe("");
      expect(l.fr.trim(), `${label} fr`).not.toBe("");
      if (/[a-z]{4,}/i.test(l.en)) expect(l.fr, `${label} differs`).not.toBe(l.en);
    }
  });

  it("links only to paths and articles that exist, and never to itself", () => {
    const pathIds = new Set(ONBOARDING_PATHS.map((p) => p.id));
    for (const a of ARTICLES) {
      for (const p of a.relatedPaths) expect(pathIds.has(p), `${a.id} -> path ${p}`).toBe(true);
      for (const r of a.relatedArticles) {
        expect(getArticle(r), `${a.id} -> article ${r}`).toBeDefined();
        expect(r).not.toBe(a.id);
      }
    }
  });

  it("makes every article reachable from another one or from the list", () => {
    // The list reaches all of them. This also checks no article is only a dead end for a reader of related links.
    for (const a of ARTICLES) expect(a.relatedArticles.length + a.relatedPaths.length, a.id).toBeGreaterThan(0);
  });

  it("gives every section a unique anchor", () => {
    const anchors = ARTICLES.flatMap((a) => a.sections.map((s) => sectionAnchor(a.id, s.id)));
    expect(new Set(anchors).size).toBe(anchors.length);
    for (const a of anchors) expect(a).toMatch(/^[a-z0-9-]+$/);
  });

  it("records source, licence and date", () => {
    expect(ARTICLES_META.source).not.toBe("");
    expect(ARTICLES_META.licence).toBe("CC0-1.0");
    expect(ARTICLES_META.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("maps a way of moving to its article only when the way is known", () => {
    expect(articleForMode("keyboard")?.id).toBe("keyboard");
    expect(articleForMode("switch")?.id).toBe("switch");
    expect(articleForMode("pointer")).toBeUndefined();
    expect(articleForMode(undefined)).toBeUndefined();
    expect(articleForMode("voice")).toBeUndefined();
  });
});

describe("article wording", () => {
  it("follows French typography", () => {
    for (const [label, l] of ALL) expect(frenchTypographyIssues(l.fr), label).toEqual([]);
  });

  it("has no banned or forbidden wording in either language", () => {
    for (const [label, l] of ALL) {
      for (const lang of ["en", "fr"] as const) {
        expect(findBanned(l[lang]), `${label} ${lang}`).toBeUndefined();
        for (const re of FORBIDDEN_TERMS) expect(re.test(l[lang]), `${label} ${lang} ${re}`).toBe(false);
      }
    }
  });

  it("never says the App runs a scanner", () => {
    for (const [label, l] of ALL) {
      for (const lang of ["en", "fr"] as const) expect(findScannerClaim(l[lang]), `${label} ${lang}`).toBeUndefined();
    }
  });

  it("says plainly that the App does not run a scanner or listen", () => {
    const sw = getArticle("switch");
    const text = (sw?.sections.flatMap((s) => s.paragraphs ?? []) ?? []).map((p) => p.en).join(" ");
    expect(text).toContain("does not highlight items one after another by itself");
    const fr = (sw?.sections.flatMap((s) => s.paragraphs ?? []) ?? []).map((p) => p.fr).join(" ");
    expect(fr).toContain("ne met pas les éléments en surbrillance");
    const voice = (getArticle("voice")?.sections.flatMap((s) => s.paragraphs ?? []) ?? []).map((p) => p.en).join(" ");
    expect(voice).toContain("no voice commands");
  });

  it("keeps the unknown article true to the rule: unknown is not yes and not no", () => {
    const text = (getArticle("unknown")?.sections.flatMap((s) => s.paragraphs ?? []) ?? []).map((p) => p.en).join(" ");
    expect(text).toContain("It does not mean yes. It does not mean no.");
    expect(text).toContain("Do not assume a place is accessible.");
    const fr = (getArticle("unknown")?.sections.flatMap((s) => s.paragraphs ?? []) ?? []).map((p) => p.fr).join(" ");
    expect(fr).toContain("Ne présumez pas qu’un lieu est accessible.");
  });

  it("uses short sentences", () => {
    for (const [label, l] of ALL) {
      for (const lang of ["en", "fr"] as const) expect(plainIssues(l[lang], lang), `${label} ${lang}`).toEqual([]);
    }
  });

  it("gives no medical or eligibility advice", () => {
    const re = /\b(diagnos\w*|treatment|medication|doctor|eligible|eligibility|entitled|qualify|qualif\w+ for|médecin|traitement|admissible|admissibilité)\b/i;
    for (const [label, l] of ALL) {
      expect(re.test(l.en), `${label} en`).toBe(false);
      expect(re.test(l.fr), `${label} fr`).toBe(false);
    }
  });
});

describe("titles are distinct, so each button can be named by voice", () => {
  it("has no two articles, paths or the place-card guide with the same title in a language", () => {
    for (const lang of ["en", "fr"] as const) {
      const titles = [...ARTICLES.map((a) => a.title[lang]), ...ONBOARDING_PATHS.map((p) => p.title[lang])];
      const lower = titles.map((t) => t.toLowerCase());
      expect(new Set(lower).size, lang).toBe(lower.length);
    }
  });

  it("keeps key names short enough to read aloud", () => {
    for (const k of KEY_HELP) {
      expect(k.keys.en.length).toBeLessThanOrEqual(20);
      expect(k.keys.fr.length).toBeLessThanOrEqual(20);
    }
  });
});

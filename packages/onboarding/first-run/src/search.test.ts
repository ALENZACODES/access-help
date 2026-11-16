import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS } from "../../src/paths";
import { ARTICLES, MAX_QUERY, queryWords, searchHelp } from "./index";

const ids = (q: string, l: "en" | "fr" = "en"): string[] => searchHelp(q, l).map((h) => `${h.kind}:${h.id}`);

describe("queryWords", () => {
  it("folds case, accents and punctuation", () => {
    expect(queryWords("  Éclair, CAFÉ! ")).toEqual(["eclair", "cafe"]);
    expect(queryWords("???")).toEqual([]);
  });

  it("cuts very long input", () => {
    expect(queryWords("a".repeat(500)).join("").length).toBe(MAX_QUERY);
  });
});

describe("searchHelp", () => {
  it("finds nothing for an empty, one-letter or symbol-only query", () => {
    for (const q of ["", " ", "a", "?", "!!"]) expect(searchHelp(q, "en"), q).toEqual([]);
  });

  it("finds the keyboard article first for keyboard", () => {
    expect(ids("keyboard")[0]).toBe("article:keyboard");
    expect(ids("keyboard")).toContain("path:move-with-keyboard");
  });

  it("finds the voice article and path for voice and for dictation", () => {
    expect(ids("voice")).toEqual(expect.arrayContaining(["article:voice", "path:use-voice-control"]));
    expect(ids("dictation")).toContain("article:voice");
  });

  it("puts title matches before body matches", () => {
    const r = searchHelp("unknown", "en");
    expect(r[0]?.id).toBe("unknown");
    expect(r.length).toBeGreaterThan(2);
    for (let i = 1; i < r.length; i++) expect(r[i - 1]!.score).toBeGreaterThanOrEqual(r[i]!.score);
  });

  it("needs every word to be found", () => {
    expect(ids("keyboard scanner")).not.toContain("article:keyboard");
    expect(ids("switch scanner")).toContain("article:switch");
    expect(ids("zzzz qqqq")).toEqual([]);
  });

  it("ignores accents and case in both directions", () => {
    expect(ids("INCONNU", "fr")).toContain("article:unknown");
    expect(ids("inconnu", "fr")).toEqual(ids("Inconnu", "fr"));
    expect(ids("ecran", "fr")).toEqual(ids("écran", "fr"));
    expect(ids("clavier", "fr")[0]).toBe("article:keyboard");
  });

  it("searches only the language on screen", () => {
    expect(ids("clavier", "en")).toEqual([]);
    expect(ids("keyboard", "fr")).toEqual([]);
  });

  it("finds the place-card guide", () => {
    expect(ids("place card")).toContain("card:card");
    expect(ids("fiche", "fr")).toContain("card:card");
  });

  it("is repeatable and does not depend on array order", () => {
    expect(ids("note")).toEqual(ids("note"));
  });

  it("returns only things that exist", () => {
    const known = new Set([...ARTICLES.map((a) => `article:${a.id}`), ...ONBOARDING_PATHS.map((p) => `path:${p.id}`), "card:card"]);
    for (const q of ["a note", "ou", "plan", "tab", "voice", "scanner", "unknown", "licence"]) {
      for (const h of ids(q)) expect(known.has(h), `${q} -> ${h}`).toBe(true);
    }
  });

  it("finds a hit for every article title and path title in both languages", () => {
    for (const lang of ["en", "fr"] as const) {
      for (const a of ARTICLES) expect(ids(a.title[lang], lang), `${a.id} ${lang}`).toContain(`article:${a.id}`);
      for (const p of ONBOARDING_PATHS) expect(ids(p.title[lang], lang), `${p.id} ${lang}`).toContain(`path:${p.id}`);
    }
  });
});

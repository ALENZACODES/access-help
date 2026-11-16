import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS } from "../../src/paths";
import { ARTICLES, FIND_QUESTIONS, GLOSSARY, hashToView, isRouteHash, viewToHash, type View } from "./index";

describe("routes", () => {
  const views: View[] = [
    { kind: "setup" },
    { kind: "notes" },
    { kind: "form" },
    { kind: "display" },
    { kind: "help" },
    ...ARTICLES.map((a): View => ({ kind: "article", id: a.id })),
    ...FIND_QUESTIONS.map((q): View => ({ kind: "find", node: q.id })),
    { kind: "card" },
    { kind: "practice" },
    { kind: "names", section: "notes" },
    { kind: "names", section: "display" },
    { kind: "words", term: undefined },
    { kind: "words", term: "scanning" },
    { kind: "places" },
    { kind: "place", id: "archive-0a1b2c3d" },
    { kind: "plan", id: "archive-0a1b2c3d" },
    { kind: "compare", ids: ["a-1", "b-2"] },
    { kind: "compare", ids: ["a-1", "b-2", "c-3"] },
    ...ONBOARDING_PATHS.flatMap((p) => p.steps.map((_, i): View => ({ kind: "path", id: p.id, step: i }))),
  ];

  it("round-trips every screen through its address", () => {
    for (const v of views) expect(hashToView(viewToHash(v)), viewToHash(v)).toEqual(v);
  });

  it("uses readable, 1-based addresses", () => {
    expect(viewToHash({ kind: "path", id: "get-help", step: 0 })).toBe("#/help/get-help/1");
    expect(viewToHash({ kind: "form" })).toBe("#/notes/new");
    expect(viewToHash({ kind: "plan", id: "x-1" })).toBe("#/places/x-1/plan");
    expect(viewToHash({ kind: "compare", ids: ["a-1", "b-2"] })).toBe("#/compare/a-1,b-2");
  });

  it("opens a path at its first step when no step is given", () => {
    expect(hashToView("#/help/get-help")).toEqual({ kind: "path", id: "get-help", step: 0 });
  });

  it("only treats #/ hashes as routes, so skip links and field links are left alone", () => {
    expect(isRouteHash("#/notes")).toBe(true);
    for (const h of ["", "#", "#main", "#f-placeName", "notes"]) {
      expect(isRouteHash(h), h).toBe(false);
      expect(hashToView(h), h).toBeUndefined();
    }
  });

  it("rejects unknown, malformed and out-of-range routes", () => {
    for (const h of [
      "#/", "#/nope", "#/setup/extra", "#/notes/old", "#/notes/new/x", "#/help/nope", "#/help/get-help/0",
      "#/help/get-help/9", "#/help/get-help/x", "#/help/place-card/1", "#/places/UPPER", "#/places/a b",
      "#/places/x/other", "#/compare", "#/compare/a-1", "#/compare/a-1,a-1", "#/compare/a-1,b-2,c-3,d-4", "#/compare/A,b", "#/compare/a-1,b-2/x", `#/compare/${"a".repeat(300)},b`, "#/places/x/plan/y", "#/a/b/c/d", `#/places/${"a".repeat(81)}`,
    ]) {
      expect(hashToView(h), h).toBeUndefined();
    }
  });
});

describe("article routes", () => {
  it("uses a readable address under the help centre", () => {
    expect(viewToHash({ kind: "article", id: "keyboard" })).toBe("#/help/articles/keyboard");
    expect(hashToView("#/help/articles/keyboard")).toEqual({ kind: "article", id: "keyboard" });
  });

  it("sends the bare articles address to the help list", () => {
    expect(hashToView("#/help/articles")).toEqual({ kind: "help" });
  });

  it("does not open an article that does not exist, or an address that is not an id", () => {
    for (const h of ["#/help/articles/nope", "#/help/articles/KEYBOARD", "#/help/articles/../x", "#/help/articles/keyboard/extra"]) {
      expect(hashToView(h), h).toBeUndefined();
    }
  });

  it("keeps article ids from colliding with path ids", () => {
    const paths = new Set(ONBOARDING_PATHS.map((p) => p.id));
    for (const a of ARTICLES) expect(paths.has(a.id), a.id).toBe(false);
  });
});

describe("names and words routes", () => {
  it("round trips every names screen, with Notes as the plain address", () => {
    expect(viewToHash({ kind: "names", section: "notes" })).toBe("#/help/names");
    expect(hashToView("#/help/names")).toEqual({ kind: "names", section: "notes" });
    for (const s of ["setup", "help", "display"] as const) {
      expect(viewToHash({ kind: "names", section: s })).toBe(`#/help/names/${s}`);
      expect(hashToView(`#/help/names/${s}`)).toEqual({ kind: "names", section: s });
    }
    for (const h of ["#/help/names/places", "#/help/names/Notes", "#/help/names/help/x", "#/help/names/"]) {
      const v = hashToView(h);
      if (h === "#/help/names/") expect(v).toEqual({ kind: "names", section: "notes" });
      else expect(v, h).toBeUndefined();
    }
  });

  it("round trips every word and rejects ones that are not in the list", () => {
    expect(viewToHash({ kind: "words", term: undefined })).toBe("#/help/words");
    expect(hashToView("#/help/words")).toEqual({ kind: "words", term: undefined });
    for (const w of GLOSSARY) {
      expect(viewToHash({ kind: "words", term: w.id })).toBe(`#/help/words/${w.id}`);
      expect(hashToView(`#/help/words/${w.id}`)).toEqual({ kind: "words", term: w.id });
    }
    for (const h of ["#/help/words/nope", "#/help/words/FOCUS", "#/help/words/focus/x", "#/help/words/../x"]) expect(hashToView(h), h).toBeUndefined();
  });

  it("does not let a short guide hide these addresses", () => {
    for (const id of ["names", "words", "practice", "find"]) expect(ONBOARDING_PATHS.some((p) => p.id === id), id).toBe(false);
  });
});

describe("practice route", () => {
  it("round trips and rejects extra parts", () => {
    expect(viewToHash({ kind: "practice" })).toBe("#/help/practice");
    expect(hashToView("#/help/practice")).toEqual({ kind: "practice" });
    for (const h of ["#/help/practice/x", "#/help/Practice", "#/help/practice/"]) {
      const v = hashToView(h);
      if (h === "#/help/practice/") expect(v).toEqual({ kind: "practice" });
      else expect(v, h).toBeUndefined();
    }
  });
});

describe("find-help routes", () => {
  it("gives the first question the short address and the others their own", () => {
    expect(viewToHash({ kind: "find", node: "start" })).toBe("#/help/find");
    expect(viewToHash({ kind: "find", node: "move" })).toBe("#/help/find/move");
    expect(hashToView("#/help/find")).toEqual({ kind: "find", node: "start" });
    expect(hashToView("#/help/find/move")).toEqual({ kind: "find", node: "move" });
  });

  it("opens a question by address, and nothing for one that does not exist or is not an id", () => {
    for (const h of ["#/help/find/nope", "#/help/find/MOVE", "#/help/find/../x", "#/help/find/move/extra", "#/help/find/"]) {
      const v = hashToView(h);
      if (h === "#/help/find/") expect(v, h).toEqual({ kind: "find", node: "start" });
      else expect(v, h).toBeUndefined();
    }
  });

  it("does not let a short guide hide the find address", () => {
    expect(ONBOARDING_PATHS.some((p) => p.id === "find")).toBe(false);
  });
});

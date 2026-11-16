import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS } from "../../src/paths";
import { ARTICLES, hashToView, isRouteHash, viewToHash, type View } from "./index";

describe("routes", () => {
  const views: View[] = [
    { kind: "setup" },
    { kind: "notes" },
    { kind: "form" },
    { kind: "display" },
    { kind: "help" },
    ...ARTICLES.map((a): View => ({ kind: "article", id: a.id })),
    { kind: "card" },
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

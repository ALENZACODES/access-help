import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS } from "../../src/paths";
import { hashToView, isRouteHash, viewToHash, type View } from "./index";

describe("routes", () => {
  const views: View[] = [
    { kind: "setup" },
    { kind: "notes" },
    { kind: "form" },
    { kind: "display" },
    { kind: "help" },
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

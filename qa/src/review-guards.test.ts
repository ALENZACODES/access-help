import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findForbiddenTerms } from "./guards/forbidden-terms.js";
import { CENTRE_SCREENS } from "./audit/model.js";

/**
 * Guards for the review-before-submitting screen and the pure modules behind it. They read the
 * source so a later change cannot quietly add an upload, a network call, a claim the App cannot
 * back up, or a route that is not wired into the shell.
 */
const root = fileURLToPath(new URL("../..", import.meta.url));
const placesDir = join(root, "apps/centre/src/places");
const reviewDir = join(root, "docs/submit-review");
const text = (path: string) => readFileSync(path, "utf8");

const appFiles = readdirSync(placesDir).filter((name) => /^[Rr]eview.*\.(ts|tsx|css)$/.test(name));
const appSource = appFiles.filter((name) => !/\.test\.ts$/.test(name));
const docFiles = readdirSync(reviewDir).filter((name) => name.endsWith(".ts"));
const docSource = docFiles.filter((name) => !name.endsWith(".test.ts"));

const NETWORK = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|EventSource|https?:\/\/|importScripts/;
const UPLOAD = /method\s*:\s*["'](?:POST|PUT|PATCH)["']|FormData|\.submit\s*\(/;
const OVERCLAIM = new RegExp(["ver" + "ified", "real-?" + "time", "certi" + "fied", "guaran" + "teed", "partner" + "ship", "\\bAA" + "A\\b"].join("|"), "i");

describe("review screen files", () => {
  it("exist", () => {
    for (const name of ["ReviewView.tsx", "reviewModel.ts", "reviewStore.ts", "reviewStrings.ts", "review.css"]) {
      expect(appFiles, name).toContain(name);
    }
  });
  it("make no network request and send nothing", () => {
    for (const name of appSource) {
      expect(text(join(placesDir, name)), name).not.toMatch(NETWORK);
      expect(text(join(placesDir, name)), name).not.toMatch(UPLOAD);
    }
  });
  it("hold only code and styles", () => {
    for (const name of appFiles) expect(name).toMatch(/\.(ts|tsx|css)$/);
  });
  it("carry no overclaim and no forbidden organisation name", () => {
    for (const name of appSource) {
      expect(text(join(placesDir, name)), name).not.toMatch(OVERCLAIM);
      expect(findForbiddenTerms(text(join(placesDir, name))), name).toEqual([]);
    }
  });
  it("import the docs tooling only through the one bridge file", () => {
    for (const name of appSource) expect(text(join(placesDir, name)), name).not.toMatch(/from\s+"(?:\.\.\/)+docs\//);
    expect(text(join(placesDir, "docs-bridge.ts"))).toContain("docs/submit-review/index.js");
  });
  it("never set a target height below 44 px", () => {
    const css = text(join(placesDir, "review.css"));
    const heights = [...css.matchAll(/(?<![\w-])min-height\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)];
    expect(heights.length).toBeGreaterThan(0);
    for (const [, value, unit] of heights) {
      expect(unit === "rem" ? Number(value) * 16 : Number(value)).toBeGreaterThanOrEqual(44);
    }
    expect(css).not.toMatch(/(?<![\w-])(?:max-)?height\s*:\s*\d+(?:px|rem)/);
  });
  it("show a status in words, not by colour alone", () => {
    const view = text(join(placesDir, "ReviewView.tsx"));
    expect(view).toContain("review-group-label");
    expect(view).toMatch(/t\(`group\.\$\{group\.severity\}`/);
  });
});

describe("review screen wiring", () => {
  it("is routed from the shell and linked from the places menu", () => {
    expect(text(join(root, "apps/centre/src/App.tsx"))).toContain('path="/places/review"');
    expect(text(join(placesDir, "PlacesNav.tsx"))).toContain('to="/places/review"');
    expect(text(join(placesDir, "index.ts"))).toContain("ReviewView");
  });
  it("has a screen entry for the route audit and a release check", () => {
    expect(CENTRE_SCREENS.some((screen) => screen.path === "/places/review")).toBe(true);
    expect(text(join(root, "qa/tests/release.spec.ts"))).toContain('"/places/review"');
  });
  it("is cleared with the rest of the places data", () => {
    const store = text(join(placesDir, "store.ts"));
    expect(store).toContain("clearReviewData(storage)");
  });
});

describe("submit-review modules", () => {
  it("have source and tests", () => {
    expect(docSource.length).toBeGreaterThanOrEqual(9);
    expect(docFiles.length - docSource.length).toBeGreaterThanOrEqual(9);
  });
  it("carry no forbidden organisation name, no web address and no overclaim", () => {
    for (const name of docFiles) {
      const body = text(join(reviewDir, name));
      expect(findForbiddenTerms(body), name).toEqual([]);
      if (!name.endsWith(".test.ts")) expect(body.replace(/\/\/ .*$/gm, ""), name).not.toMatch(/https?:\/\//);
      if (!name.endsWith(".test.ts") && name !== "lintkit.ts") expect(body, name).not.toMatch(OVERCLAIM);
    }
  });
  it("are not imported by anything that ships a network call", () => {
    for (const name of docSource) expect(text(join(reviewDir, name)), name).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon/);
  });
});

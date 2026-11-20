import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findForbiddenTerms } from "./guards/forbidden-terms.js";

/** Guards for the sitting screen: the pure add-session modules plus the screen that uses them. */
const root = fileURLToPath(new URL("../..", import.meta.url));
const docsDir = join(root, "docs/add-session");
const placesDir = join(root, "apps/centre/src/places");

const docFiles = readdirSync(docsDir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
const uiFiles = readdirSync(placesDir).filter((n) => /^(?:sitting|SittingView).*\.(ts|tsx|css)$/.test(n) && !n.endsWith(".test.ts"));
const docText = (n: string) => readFileSync(join(docsDir, n), "utf8");
const uiText = (n: string) => readFileSync(join(placesDir, n), "utf8");

describe("sitting screen guards", () => {
  it("has files to check", () => {
    expect(docFiles.length).toBeGreaterThan(4);
    expect(uiFiles.length).toBeGreaterThan(2);
  });
  it("contains no forbidden organisation name in any file", () => {
    for (const n of docFiles) expect(findForbiddenTerms(docText(n)), n).toEqual([]);
    for (const n of uiFiles) expect(findForbiddenTerms(uiText(n)), n).toEqual([]);
  });
  it("makes no network call and uses no clock in the pure modules", () => {
    for (const n of docFiles) {
      expect(docText(n), n).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|https?:\/\/|Date\.now|new Date\(\)|localStorage/);
    }
  });
  it("makes no network call in the screen files", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|https?:\/\//);
  });
  it("keeps touch targets at 44 px or more", () => {
    const css = uiText("sitting.css");
    for (const [, v, unit] of css.matchAll(/min-(?:height|width)\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)) {
      expect(unit === "rem" ? Number(v) * 16 : Number(v)).toBeGreaterThanOrEqual(44);
    }
    expect(css).not.toMatch(/(?<![\w-])(?:max-)?height\s*:\s*\d+(?:px|rem)/);
  });
  it("is routed and listed in the places menu", () => {
    expect(readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8")).toContain('path="/places/sitting"');
    expect(readFileSync(join(placesDir, "PlacesNav.tsx"), "utf8")).toContain("/places/sitting");
  });
  it("is routed before the place page, so the place page cannot take its address", () => {
    const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
    expect(app.indexOf('path="/places/sitting"')).toBeGreaterThan(-1);
    expect(app.indexOf('path="/places/sitting"')).toBeLessThan(app.indexOf('path="/places/:id"'));
  });
  it("never changes an observation or a pack, and writes storage only through its own store and the person’s list", () => {
    for (const n of uiFiles.filter((f) => f !== "sittingStore.ts")) {
      expect(uiText(n), n).not.toMatch(/\.setItem\(|\.removeItem\(|localStorage|sessionStorage|drafts\.(?:add|remove|clear)\(|library\.(?:add|remove|clear)\(/);
    }
    expect(uiText("sittingStore.ts").match(/the-app-[a-z-]+/g)).toEqual(["the-app-add-sitting"]);
    expect(readFileSync(join(placesDir, "store.ts"), "utf8")).toContain("clearSittingData(storage);");
  });
  it("puts an observation on the person’s list only when they press the added button", () => {
    const view = uiText("SittingView.tsx");
    expect(view.match(/list\.mark\(/g)).toHaveLength(1);
    expect(view).toContain("function sayAdded(record: PlaceRecord)");
    expect(view.indexOf("list.mark(")).toBeGreaterThan(view.indexOf("function sayAdded"));
    expect(view.indexOf("list.mark(")).toBeLessThan(view.indexOf("function sayOther"));
  });
  it("carries the cannot-see line on the screen and in the summary file", () => {
    expect(uiText("SittingView.tsx")).toContain("{sitCannotSeeText(language)}");
    expect(docText("report.ts")).toContain("cannotSeeText(lang)");
  });
  it("has no control that sends, signs in or opens an editor", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/window\.open|oauth|api\/0\.6|<form|type="submit"/i);
  });
  it("uses no clipboard or other device feature", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/navigator\./);
  });
  it("is opened by the release run through the screen inventory", async () => {
    const { releaseRoutes } = await import("./audit/release-routes.js");
    expect(releaseRoutes()).toContain("/places/sitting");
  });
});

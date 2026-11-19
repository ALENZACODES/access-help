import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findForbiddenTerms } from "./guards/forbidden-terms.js";

/** Guards for the licence screen: the pure sharing-plan modules plus the screen that uses them. */
const root = fileURLToPath(new URL("../..", import.meta.url));
const docsDir = join(root, "docs/share-plan");
const placesDir = join(root, "apps/centre/src/places");

const docFiles = readdirSync(docsDir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
const uiFiles = readdirSync(placesDir).filter((n) => /^(?:licences|LicencesView).*\.(ts|tsx|css)$/.test(n) && !n.endsWith(".test.ts"));
const docText = (n: string) => readFileSync(join(docsDir, n), "utf8");
const uiText = (n: string) => readFileSync(join(placesDir, n), "utf8");

describe("licence screen guards", () => {
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
    const css = uiText("licences.css");
    for (const [, v, unit] of css.matchAll(/min-(?:height|width)\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)) {
      expect(unit === "rem" ? Number(v) * 16 : Number(v)).toBeGreaterThanOrEqual(44);
    }
    expect(css).not.toMatch(/(?<![\w-])(?:max-)?height\s*:\s*\d+(?:px|rem)/);
  });
  it("is routed and listed in the places menu", () => {
    expect(readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8")).toContain('path="/places/licences"');
    expect(readFileSync(join(placesDir, "PlacesNav.tsx"), "utf8")).toContain("/places/licences");
  });
  it("is routed before the place page, so the place page cannot take its address", () => {
    const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
    expect(app.indexOf('path="/places/licences"')).toBeGreaterThan(-1);
    expect(app.indexOf('path="/places/licences"')).toBeLessThan(app.indexOf('path="/places/:id"'));
  });
  it("reads the records and never writes storage or changes an observation", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/\.setItem\(|\.removeItem\(|localStorage|sessionStorage|drafts\.(?:add|remove|clear)\(|library\.(?:add|remove|clear)\(/);
  });
  it("carries the not-advice line on the screen and in both text files", () => {
    expect(uiText("LicencesView.tsx")).toContain("{view.guide.notAdvice}");
    expect(readFileSync(join(root, "docs/licence-guide/guide.ts"), "utf8")).toContain("guide.notAdvice");
    expect(docText("report.ts")).toContain("notAdviceText(lang)");
  });
  it("builds a part file only from the records of that part", () => {
    expect(uiText("licencesModel.ts")).toContain("sharePartRecords(view.records, part)");
    expect(uiText("licencesModel.ts")).not.toMatch(/exportFile\("osm"/);
  });
  it("uses no clipboard or other device feature", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/navigator\./);
  });
  it("is opened by the release run through the screen inventory", async () => {
    const { releaseRoutes } = await import("./audit/release-routes.js");
    expect(releaseRoutes()).toContain("/places/licences");
  });
});

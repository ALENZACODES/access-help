import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findForbiddenTerms } from "./guards/forbidden-terms.js";

/** Guards for the measuring page: the pure place-measures modules plus the screen that uses them. */
const root = fileURLToPath(new URL("../..", import.meta.url));
const docsDir = join(root, "docs/place-measures");
const placesDir = join(root, "apps/centre/src/places");

const docFiles = readdirSync(docsDir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
const uiFiles = readdirSync(placesDir).filter((n) => /^(?:measure|MeasureView|MeasureFields).*\.(ts|tsx|css)$/.test(n) && !n.endsWith(".test.ts"));
const docText = (n: string) => readFileSync(join(docsDir, n), "utf8");
const uiText = (n: string) => readFileSync(join(placesDir, n), "utf8");

describe("measuring page guards", () => {
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
    const css = uiText("measure.css");
    for (const [, v, unit] of css.matchAll(/min-(?:height|width)\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)) {
      expect(unit === "rem" ? Number(v) * 16 : Number(v)).toBeGreaterThanOrEqual(44);
    }
    expect(css).not.toMatch(/(?<![\w-])(?:max-)?height\s*:\s*\d+(?:px|rem)/);
  });
  it("is routed and listed in the places menu", () => {
    expect(readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8")).toContain('path="/places/measure"');
    expect(readFileSync(join(placesDir, "PlacesNav.tsx"), "utf8")).toContain("/places/measure");
  });
  it("is routed before the place page, so the place page cannot take its address", () => {
    const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
    expect(app.indexOf('path="/places/measure"')).toBeGreaterThan(-1);
    expect(app.indexOf('path="/places/measure"')).toBeLessThan(app.indexOf('path="/places/:id"'));
  });
  it("never changes an observation or a pack, and writes storage only through its own store", () => {
    for (const n of uiFiles.filter((f) => f !== "measuresStore.ts")) {
      expect(uiText(n), n).not.toMatch(/\.setItem\(|\.removeItem\(|localStorage|sessionStorage|drafts\.(?:add|remove|clear)\(|library\.(?:add|remove|clear)\(/);
    }
    expect(uiText("measuresStore.ts").match(/the-app-[a-z-]+/g)).toEqual(["the-app-place-measures"]);
    expect(readFileSync(join(placesDir, "store.ts"), "utf8")).toContain("clearMeasuresData(storage);");
  });
  it("carries the no-judgment line on the page and in the sheet", () => {
    expect(uiText("MeasureView.tsx")).toContain("{view.noJudgment}");
    expect(docText("sheet.ts")).toContain("noJudgmentText(lang)");
  });
  it("offers a not-noted choice first in every list, so nothing defaults to yes or no", () => {
    const view = `${uiText("MeasureView.tsx")}\n${uiText("MeasureFields.tsx")}`;
    expect(view.match(/<option value="">/g)).toHaveLength(3);
    expect(view).not.toMatch(/defaultValue="(?:yes|no)"/);
  });
  it("has no control that sends, signs in or opens an editor", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/window\.open|oauth|api\/0\.6|action=|fetch\(/i);
  });
  it("is in the device backup", () => {
    const backup = readFileSync(join(placesDir, "backup.ts"), "utf8");
    expect(backup).toContain("measures: createMeasuresStore(storage).read(),");
    expect(backup).toMatch(/const KEYS = \[[^\]]*MEASURES_KEY/);
  });
  it("uses no clipboard or other device feature", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/navigator\./);
  });
  it("is opened by the release run through the screen inventory", async () => {
    const { releaseRoutes } = await import("./audit/release-routes.js");
    expect(releaseRoutes()).toContain("/places/measure");
  });
});

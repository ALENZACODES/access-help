import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findForbiddenTerms } from "./guards/forbidden-terms.js";

/** Guards for the day log: pure docs modules plus the screen that uses them. */
const root = fileURLToPath(new URL("../..", import.meta.url));
const docsDir = join(root, "docs/day-log");
const placesDir = join(root, "apps/centre/src/places");

const docFiles = readdirSync(docsDir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
const uiFiles = readdirSync(placesDir).filter((n) => /^(?:days|dayNotes|DaysView).*\.(ts|tsx|css)$/.test(n) && !n.endsWith(".test.ts"));
const docText = (n: string) => readFileSync(join(docsDir, n), "utf8");
const uiText = (n: string) => readFileSync(join(placesDir, n), "utf8");

describe("day log guards", () => {
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
    const css = uiText("days.css");
    for (const [, v, unit] of css.matchAll(/min-(?:height|width)\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)) {
      expect(unit === "rem" ? Number(v) * 16 : Number(v)).toBeGreaterThanOrEqual(44);
    }
    expect(css).not.toMatch(/(?<![\w-])(?:max-)?height\s*:\s*\d+(?:px|rem)/);
  });
  it("is routed and listed in the places menu", () => {
    expect(readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8")).toContain('path="/places/days"');
    expect(readFileSync(join(placesDir, "PlacesNav.tsx"), "utf8")).toContain("/places/days");
  });
  it("is routed before the place page, so the place page cannot take its address", () => {
    const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
    expect(app.indexOf('path="/places/days"')).toBeGreaterThan(-1);
    expect(app.indexOf('path="/places/days"')).toBeLessThan(app.indexOf('path="/places/:id"'));
  });
  it("writes only the day notes, through their own store, and never changes an observation", () => {
    for (const n of uiFiles.filter((name) => name !== "dayNotesStore.ts")) expect(uiText(n), n).not.toMatch(/\.setItem\(|localStorage|sessionStorage|drafts\.(?:add|remove|clear)\(/);
    expect(uiText("dayNotesStore.ts")).toContain('DAY_NOTES_KEY = "the-app-day-notes"');
  });
  it("clears the day notes with the rest of the places data", () => {
    expect(readFileSync(join(placesDir, "store.ts"), "utf8")).toContain("clearDayNotesData(storage);");
  });
  it("never puts the day note into the OpenStreetMap file", () => {
    expect(uiText("daysModel.ts")).toMatch(/exportFile\("osm", group\.notes as PlaceRecord\[\], group\.day\)/);
  });
  it("is opened by the release run through the screen inventory", async () => {
    const { releaseRoutes } = await import("./audit/release-routes.js");
    expect(releaseRoutes()).toContain("/places/days");
  });
});

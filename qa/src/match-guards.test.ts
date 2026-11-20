import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findForbiddenTerms } from "./guards/forbidden-terms.js";

/** Guards for the numbers page: the pure fact-match modules plus the screen that uses them. */
const root = fileURLToPath(new URL("../..", import.meta.url));
const docsDir = join(root, "docs/fact-match");
const placesDir = join(root, "apps/centre/src/places");

const docFiles = readdirSync(docsDir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
const uiFiles = readdirSync(placesDir).filter((n) => /^(?:match|MatchView).*\.(ts|tsx|css)$/.test(n) && !n.endsWith(".test.ts"));
const docText = (n: string) => readFileSync(join(docsDir, n), "utf8");
const uiText = (n: string) => readFileSync(join(placesDir, n), "utf8");

describe("numbers page guards", () => {
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
    const css = uiText("match.css");
    for (const [, v, unit] of css.matchAll(/min-(?:height|width)\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)) {
      expect(unit === "rem" ? Number(v) * 16 : Number(v)).toBeGreaterThanOrEqual(44);
    }
    expect(css).not.toMatch(/(?<![\w-])(?:max-)?height\s*:\s*\d+(?:px|rem)/);
  });
  it("is routed and listed in the places menu", () => {
    expect(readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8")).toContain('path="/places/numbers"');
    expect(readFileSync(join(placesDir, "PlacesNav.tsx"), "utf8")).toContain("/places/numbers");
  });
  it("is routed before the place page, so the place page cannot take its address", () => {
    const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
    expect(app.indexOf('path="/places/numbers"')).toBeGreaterThan(-1);
    expect(app.indexOf('path="/places/numbers"')).toBeLessThan(app.indexOf('path="/places/:id"'));
  });
  it("never changes an observation, a pack, the measures or what places said, and writes storage only through its own store", () => {
    for (const n of uiFiles.filter((f) => f !== "matchStore.ts")) {
      expect(uiText(n), n).not.toMatch(/\.setItem\(|\.removeItem\(|localStorage|sessionStorage|drafts\.(?:add|remove|clear)\(|\.(?:save|remove|replace|prune)\((?!Set)[^)]*measures|createToldStore\(storage\)\.(?:save|remove|replace|clear)/);
    }
    expect([...new Set(uiText("matchStore.ts").match(/the-app-[a-z-]+/g))]).toEqual(["the-app-match-sets", "the-app-match-current"]);
    expect(readFileSync(join(placesDir, "store.ts"), "utf8")).toContain("clearMatchData(storage);");
  });
  it("carries the line that the numbers are the person’s own, on the page and in the file", () => {
    expect(uiText("MatchView.tsx")).toContain("{view.yours}");
    expect(docText("report.ts")).toContain("yoursText(lang)");
  });
  it("starts every number field empty and fills in no number of its own", () => {
    const view = uiText("MatchView.tsx");
    expect(view).not.toMatch(/defaultValue=|placeholder=/);
    expect(view).toContain("useState<MatchForm>(emptyMatchForm)");
    expect(uiText("matchStore.ts")).toContain("return emptyMatchCriteria();");
  });
  it("shows which group a place is in as words, not by colour or an icon alone", () => {
    expect(uiText("MatchView.tsx")).toContain("<h3>{group.heading}</h3>");
    expect(uiText("match.css")).not.toMatch(/(?:^|[^-])color:\s*(?:red|green|#)/m);
  });
  it("has no control that sends anything", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/mailto:|window\.open|action=|fetch\(|navigator\.share/i);
  });
  it("is in the device backup", () => {
    const backup = readFileSync(join(placesDir, "backup.ts"), "utf8");
    expect(backup).toContain("numbers: { current: createMatchStore(storage).current(), sets: createMatchStore(storage).sets() },");
  });
  it("uses no clipboard or other device feature", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/navigator\./);
  });
  it("is opened by the release run through the screen inventory", async () => {
    const { releaseRoutes } = await import("./audit/release-routes.js");
    expect(releaseRoutes()).toContain("/places/numbers");
  });
});

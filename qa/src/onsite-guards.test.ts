import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findForbiddenTerms } from "./guards/forbidden-terms.js";

/** Guards for the on-site measuring page: the pure field-walk modules plus the screen that uses them. */
const root = fileURLToPath(new URL("../..", import.meta.url));
const docsDir = join(root, "docs/field-walk");
const placesDir = join(root, "apps/centre/src/places");

const docFiles = readdirSync(docsDir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
const uiFiles = readdirSync(placesDir).filter((n) => /^(?:onsite|OnsiteView).*\.(ts|tsx|css)$/.test(n) && !n.endsWith(".test.ts"));
const docText = (n: string) => readFileSync(join(docsDir, n), "utf8");
const uiText = (n: string) => readFileSync(join(placesDir, n), "utf8");

describe("on-site measuring page guards", () => {
  it("has files to check", () => {
    expect(docFiles.length).toBeGreaterThan(5);
    expect(uiFiles.sort()).toEqual(["OnsiteView.tsx", "onsite.css", "onsiteModel.ts", "onsiteStore.ts", "onsiteStrings.ts"]);
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
    const css = uiText("onsite.css");
    const sizes = [...css.matchAll(/min-(?:height|width)\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)];
    expect(sizes.length).toBeGreaterThan(3);
    for (const [, v, unit] of sizes) expect(unit === "rem" ? Number(v) * 16 : Number(v)).toBeGreaterThanOrEqual(44);
    expect(css).not.toMatch(/(?<![\w-])(?:max-)?height\s*:\s*\d+(?:px|rem)/);
    for (const [, px] of css.matchAll(/grid-template-columns:\s*(\d+)px/g)) expect(Number(px)).toBeGreaterThanOrEqual(44);
  });
  it("is routed and listed in the places menu", () => {
    expect(readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8")).toContain('path="/places/onsite"');
    expect(readFileSync(join(placesDir, "PlacesNav.tsx"), "utf8")).toContain("/places/onsite");
  });
  it("is routed before the place page, so the place page cannot take its address", () => {
    const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
    expect(app.indexOf('path="/places/onsite"')).toBeGreaterThan(-1);
    expect(app.indexOf('path="/places/onsite"')).toBeLessThan(app.indexOf('path="/places/:id"'));
  });
  it("writes storage only through its own store, under its own two keys", () => {
    for (const n of uiFiles.filter((f) => f !== "onsiteStore.ts")) {
      expect(uiText(n), n).not.toMatch(/\.setItem\(|\.removeItem\(|localStorage|sessionStorage|drafts\.(?:add|remove|clear)\(/);
    }
    expect([...new Set(uiText("onsiteStore.ts").match(/the-app-[a-z-]+/g))].sort()).toEqual(["the-app-onsite-progress", "the-app-onsite-unit"]);
    expect(readFileSync(join(placesDir, "store.ts"), "utf8")).toContain("clearOnsiteData(storage);");
  });
  it("changes the measures in one place only: the save at the end", () => {
    const view = uiText("OnsiteView.tsx");
    expect(view.match(/measures\.save\(/g)).toHaveLength(1);
    expect(view).toContain("measures.save(screen.measures)");
    expect(view).not.toMatch(/measures\.(?:remove|replace|clear|prune)\(/);
    for (const n of ["onsiteModel.ts", "onsiteStore.ts"]) expect(uiText(n), n).not.toMatch(/createMeasuresStore|putMeasures|removeMeasures/);
  });
  it("saves through the same checks as the measuring form", () => {
    expect(docText("finish.ts")).toContain("return readForm(walkForm(walk)");
    expect(uiText("onsiteModel.ts")).toContain("finishOnsite(walk, { id: record.id, observedOn: record.observedOn }, today)");
  });
  it("offers a skip on every question and never preselects a choice", () => {
    const view = uiText("OnsiteView.tsx");
    expect(view).toContain('<button type="button" onClick={skip}>');
    expect(view).not.toMatch(/defaultChecked|defaultValue/);
    expect(view).toContain("checked={typed === choice.value}");
  });
  it("shows the effect of saving before the save button", () => {
    const view = uiText("OnsiteView.tsx");
    expect(view.indexOf('data-testid="onsite-effects"')).toBeGreaterThan(-1);
    expect(view.indexOf('data-testid="onsite-effects"')).toBeLessThan(view.indexOf('{t("save")}'));
  });
  it("moves focus to the heading when the question changes, and to the problem when there is one", () => {
    const view = uiText("OnsiteView.tsx");
    expect(view).toContain("heading.current?.focus()");
    expect(view).toContain("alert.current?.focus()");
    expect(view).toContain('role="alert"');
    expect(view).toContain('aria-live="polite"');
  });
  it("reads everything as text: nothing is run, linked from data or shown as markup", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/dangerouslySetInnerHTML|innerHTML|eval\(|new Function|href=\{/);
  });
  it("has no control that sends anything and uses no device feature", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/mailto:|sms:|window\.open|action=|navigator\./i);
  });
  it("shows no tag and no score", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/measureTags|osmTagText|wheelchair:description|toilets:wheelchair|score|percent|streak/i);
  });
  it("is opened by the release run through the screen inventory", async () => {
    const { releaseRoutes } = await import("./audit/release-routes.js");
    expect(releaseRoutes()).toContain("/places/onsite");
  });
});

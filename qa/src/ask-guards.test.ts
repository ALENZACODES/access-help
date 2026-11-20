import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findForbiddenTerms } from "./guards/forbidden-terms.js";

/** Guards for the asking page: the pure ask-place modules plus the screen that uses them. */
const root = fileURLToPath(new URL("../..", import.meta.url));
const docsDir = join(root, "docs/ask-place");
const placesDir = join(root, "apps/centre/src/places");

const docFiles = readdirSync(docsDir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
const uiFiles = readdirSync(placesDir).filter((n) => /^(?:ask|AskView).*\.(ts|tsx|css)$/.test(n) && !n.endsWith(".test.ts"));
const docText = (n: string) => readFileSync(join(docsDir, n), "utf8");
const uiText = (n: string) => readFileSync(join(placesDir, n), "utf8");

describe("asking page guards", () => {
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
    const css = uiText("ask.css");
    for (const [, v, unit] of css.matchAll(/min-(?:height|width)\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)) {
      expect(unit === "rem" ? Number(v) * 16 : Number(v)).toBeGreaterThanOrEqual(44);
    }
    expect(css).not.toMatch(/(?<![\w-])(?:max-)?height\s*:\s*\d+(?:px|rem)/);
  });
  it("is routed and listed in the places menu", () => {
    expect(readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8")).toContain('path="/places/ask"');
    expect(readFileSync(join(placesDir, "PlacesNav.tsx"), "utf8")).toContain("/places/ask");
  });
  it("is routed before the place page, so the place page cannot take its address", () => {
    const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
    expect(app.indexOf('path="/places/ask"')).toBeGreaterThan(-1);
    expect(app.indexOf('path="/places/ask"')).toBeLessThan(app.indexOf('path="/places/:id"'));
  });
  it("never changes an observation, a pack or the measures, and writes storage only through its own stores", () => {
    for (const n of uiFiles.filter((f) => f !== "askStore.ts")) {
      expect(uiText(n), n).not.toMatch(/\.setItem\(|\.removeItem\(|localStorage|sessionStorage|drafts\.(?:add|remove|clear)\(|library\.(?:add|remove|clear)\(|measureStore\.(?:save|remove|replace|clear)\(/);
    }
    expect(uiText("askStore.ts").match(/the-app-[a-z-]+/g)).toEqual(["the-app-place-asks", "the-app-place-told"]);
    expect(readFileSync(join(placesDir, "store.ts"), "utf8")).toContain("clearAskData(storage);");
  });
  it("carries the privacy line and the kept-apart line on the page", () => {
    expect(uiText("AskView.tsx")).toContain("{view.privacy}");
    expect(uiText("AskView.tsx")).toContain("{view.toldNote}");
    expect(docText("sheet.ts")).toContain("toldNoteText(lang)");
  });
  it("never shows a tag for what a place said", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/measureTags|measureTagText|osmTagText|wheelchair:description|toilets:wheelchair/);
  });
  it("has no control that sends, opens a mail program or contacts anyone", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/mailto:|tel:|sms:|window\.open|action=|fetch\(|navigator\.share/i);
  });
  it("asks for no name, address, phone number or other detail about the person", () => {
    const view = uiText("AskView.tsx");
    expect(view).not.toMatch(/type="email"|type="tel"|autoComplete="(?:name|email|tel)"/);
    expect(view.match(/<input/g)?.length).toBeLessThanOrEqual(8);
  });
  it("is in the device backup, apart from the measures", () => {
    const backup = readFileSync(join(placesDir, "backup.ts"), "utf8");
    expect(backup).toContain("asks: createAskStore(storage).read(),");
    expect(backup).toContain("told: createToldStore(storage).read(),");
  });
  it("uses no clipboard or other device feature", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/navigator\./);
  });
  it("is opened by the release run through the screen inventory", async () => {
    const { releaseRoutes } = await import("./audit/release-routes.js");
    expect(releaseRoutes()).toContain("/places/ask");
  });
});

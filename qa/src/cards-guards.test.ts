import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findForbiddenTerms } from "./guards/forbidden-terms.js";

/** Guards for the place cards page: the pure place-card modules plus the screen that uses them. */
const root = fileURLToPath(new URL("../..", import.meta.url));
const docsDir = join(root, "docs/place-card");
const placesDir = join(root, "apps/centre/src/places");

const docFiles = readdirSync(docsDir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
const uiFiles = readdirSync(placesDir).filter((n) => /^(?:cards|CardsView).*\.(ts|tsx|css)$/.test(n) && !n.endsWith(".test.ts"));
const docText = (n: string) => readFileSync(join(docsDir, n), "utf8");
const uiText = (n: string) => readFileSync(join(placesDir, n), "utf8");

describe("place cards page guards", () => {
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
    const css = uiText("cards.css");
    for (const [, v, unit] of css.matchAll(/min-(?:height|width)\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)) {
      expect(unit === "rem" ? Number(v) * 16 : Number(v)).toBeGreaterThanOrEqual(44);
    }
    expect(css).not.toMatch(/(?<![\w-])(?:max-)?height\s*:\s*\d+(?:px|rem)/);
  });
  it("is routed and listed in the places menu", () => {
    expect(readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8")).toContain('path="/places/cards"');
    expect(readFileSync(join(placesDir, "PlacesNav.tsx"), "utf8")).toContain("/places/cards");
  });
  it("is routed before the place page, so the place page cannot take its address", () => {
    const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
    expect(app.indexOf('path="/places/cards"')).toBeGreaterThan(-1);
    expect(app.indexOf('path="/places/cards"')).toBeLessThan(app.indexOf('path="/places/:id"'));
  });
  it("never changes an observation, a pack, the measures or what places said, and writes storage only through its own store", () => {
    for (const n of uiFiles.filter((f) => f !== "cardsStore.ts")) {
      expect(uiText(n), n).not.toMatch(/\.setItem\(|\.removeItem\(|localStorage|sessionStorage|drafts\.(?:add|remove|clear)\(|createMeasuresStore\(storage\)\.(?:save|remove|replace|clear)|createToldStore\(storage\)\.(?:save|remove|replace|clear)/);
    }
    expect([...new Set(uiText("cardsStore.ts").match(/the-app-[a-z-]+/g))]).toEqual(["the-app-received-cards"]);
    expect(readFileSync(join(placesDir, "store.ts"), "utf8")).toContain("clearCardsData(storage);");
  });
  it("carries the line that a received card is another person’s facts, on the page and in the card text", () => {
    expect(uiText("CardsView.tsx")).toContain("{list.otherPerson}");
    expect(docText("messages.ts")).toContain("lines.push('', otherPersonText(lang));");
  });
  it("never shows a tag for a card", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/measureTags|measureTagText|osmTagText|wheelchair:description|toilets:wheelchair/);
  });
  it("reads a card as text only: nothing in it is run, linked or shown as markup", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/dangerouslySetInnerHTML|innerHTML|eval\(|new Function|href=\{/);
    expect(uiText("CardsView.tsx")).toContain("parsePlaceCard(text)");
  });
  it("does not keep the sender’s label on the device", () => {
    expect(uiText("cardsStore.ts")).not.toMatch(/from:/);
    expect(uiText("CardsView.tsx")).toContain('useState("")');
  });
  it("has no control that sends anything", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/mailto:|sms:|window\.open|action=|fetch\(|navigator\.share/i);
  });
  it("is in the device backup", () => {
    const backup = readFileSync(join(placesDir, "backup.ts"), "utf8");
    expect(backup).toContain("receivedCards: createCardsStore(storage).read(),");
  });
  it("uses no clipboard or other device feature", () => {
    for (const n of uiFiles) expect(uiText(n), n).not.toMatch(/navigator\./);
  });
  it("is opened by the release run through the screen inventory", async () => {
    const { releaseRoutes } = await import("./audit/release-routes.js");
    expect(releaseRoutes()).toContain("/places/cards");
  });
});

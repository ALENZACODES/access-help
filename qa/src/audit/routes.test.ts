import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CENTRE_SCREENS } from "./model.js";
import { patternToRegex, pathsMissingFromSource, routePatterns, routesWithoutMenuLink, routesWithoutScreen } from "./routes.js";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("route audit: the checker fails on each kind of gap", () => {
  const source = `<Routes><Route path="/" element={<A/>} /><Route path="/places/saved" element={<B/>} />
    <Route
      path="/places/:id"
      element={<C/>}
    /><Route path="*" element={<D/>} /></Routes>`;
  it("reads every route path, across lines, and leaves out the catch-all", () => {
    expect(routePatterns(source)).toEqual(["/", "/places/saved", "/places/:id"]);
  });
  it("matches a dynamic route to one segment only", () => {
    expect(patternToRegex("/places/:id").test("/places/s1")).toBe(true);
    expect(patternToRegex("/places/:id").test("/places/a/b")).toBe(false);
    expect(patternToRegex("/a.b").test("/aXb")).toBe(false);
  });
  it("reports a route with no screen", () => {
    expect(routesWithoutScreen(["/", "/places/saved"], ["/"])).toEqual(["/places/saved"]);
  });
  it("covers a dynamic route only with a concrete path that no static route claims", () => {
    const patterns = ["/places/saved", "/places/:id"];
    expect(routesWithoutScreen(patterns, ["/places/saved"])).toEqual(["/places/:id"]);
    expect(routesWithoutScreen(patterns, ["/places/saved", "/places/s1"])).toEqual([]);
  });
  it("reports a screen path missing from the release list", () => {
    expect(pathsMissingFromSource(["/a", "/b"], 'const ROUTES = ["/a", "/c"];')).toEqual(["/b"]);
  });
  it("reports a static places route with no menu link", () => {
    const menu = '<NavLink to="/places">x</NavLink><NavLink to="/places/saved">y</NavLink>';
    expect(routesWithoutMenuLink(["/places", "/places/saved", "/places/plan", "/places/:id", "/about"], "/places", menu)).toEqual(["/places/plan"]);
  });
});

describe("route audit: this repository", () => {
  const patterns = routePatterns(read("apps/centre/src/App.tsx"));
  const screenPaths = CENTRE_SCREENS.map((screen) => screen.path as string);

  it("routes every places screen", () => {
    for (const path of ["/places", "/places/saved", "/places/plan", "/places/sources", "/places/status", "/places/contribute", "/places/:id", "/settings"]) {
      expect(patterns, path).toContain(path);
    }
  });
  const ours = (path: string) => path.startsWith("/places") || path.startsWith("/settings");

  it("has a Day 17 audit screen for every places and settings route", () => {
    expect(routesWithoutScreen(patterns.filter(ours), screenPaths)).toEqual([]);
  });
  it("holds the routes outside places and settings at today's gap, which may shrink but not grow", () => {
    expect(routesWithoutScreen(patterns.filter((p) => !ours(p)), screenPaths)).toEqual(["/demo-record"]);
  });
  it("lists every places and settings screen in the release run", () => {
    expect(pathsMissingFromSource(screenPaths.filter(ours), read("qa/tests/release.spec.ts"))).toEqual([]);
  });
  it("links every static places route from the places menu", () => {
    expect(routesWithoutMenuLink(patterns, "/places", read("apps/centre/src/places/PlacesNav.tsx"))).toEqual([]);
  });
});

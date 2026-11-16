import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findForbiddenTerms } from "./guards/forbidden-terms.js";

/**
 * Guards for the places screens in apps/centre. They read the source files so a
 * later change cannot quietly add a network call, a bundled data file, a claim
 * the App cannot back up, or a route that is not wired into the shell.
 */
const root = fileURLToPath(new URL("../..", import.meta.url));
const placesDir = join(root, "apps/centre/src/places");

const files = readdirSync(placesDir);
const sourceFiles = files.filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) && name !== "testing.ts");
const read = (name: string) => readFileSync(join(placesDir, name), "utf8");

const NETWORK = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|EventSource|https?:\/\/|importScripts/;
const OVERCLAIM = /verified|real-?time|certified|guaranteed|partnership|accessnow|\bAAA\b/i;

describe("places screens", () => {
  it("make no network request and name no tile or map server", () => {
    for (const name of sourceFiles) expect(read(name), name).not.toMatch(NETWORK);
  });

  it("bundle no data: only code, strings, and styles live in the folder", () => {
    for (const name of files) expect(name, name).toMatch(/\.(ts|tsx|css)$/);
  });

  it("carry no overclaim and no forbidden organisation name", () => {
    for (const name of [...sourceFiles, "places.css"]) {
      const text = read(name);
      expect(text, name).not.toMatch(OVERCLAIM);
      expect(findForbiddenTerms(text), name).toEqual([]);
    }
  });

  it("never set a target height below 44 px", () => {
    const css = read("places.css");
    const heights = [...css.matchAll(/(?<![\w-])min-height\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)];
    expect(heights.length).toBeGreaterThan(0);
    for (const [, value, unit] of heights) {
      const px = unit === "rem" ? Number(value) * 16 : Number(value);
      expect(px, `${value}${unit}`).toBeGreaterThanOrEqual(44);
    }
    expect(css).not.toMatch(/(?<![\w-])(?:max-)?height\s*:\s*\d+(?:px|rem)/);
  });

  it("are routed from the shell, with a primary navigation link in both languages", () => {
    const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
    for (const route of ["/places", "/places/status", "/places/contribute"]) {
      expect(app, route).toContain(`path="${route}"`);
    }
    expect(app).toMatch(/<NavLink[^>]*to="\/places"/);
    const strings = readFileSync(join(root, "apps/centre/src/strings.ts"), "utf8");
    expect(strings).toContain('places: "Places"');
    expect(strings).toContain('places: "Lieux"');
  });

  it("are exported through the folder index and used by the shell only", () => {
    const index = read("index.ts");
    for (const view of ["PlacesBrowse", "PlacesStatus", "ContributeView"]) expect(index).toContain(view);
    expect(readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8")).toContain('from "./places/index.js"');
  });

  it("keep the docs tooling behind one bridge file", () => {
    for (const name of sourceFiles.filter((file) => file !== "docs-bridge.ts")) {
      expect(read(name), name).not.toMatch(/from\s+"(?:\.\.\/)+docs\//);
    }
  });
});

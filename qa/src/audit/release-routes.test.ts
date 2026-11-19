import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CENTRE_SCREENS } from "./model.js";
import { EXTRA_RELEASE_ROUTES, LOADS_PER_PAGE, inBatches, releaseRoutes } from "./release-routes.js";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

describe("releaseRoutes", () => {
  const routes = releaseRoutes();
  it("opens every screen in the inventory", () => {
    for (const screen of CENTRE_SCREENS) expect(routes, screen.id).toContain(screen.path);
  });
  it("opens the extra addresses too", () => {
    for (const path of EXTRA_RELEASE_ROUTES) expect(routes).toContain(path);
  });
  it("opens each address once", () => expect(new Set(routes).size).toBe(routes.length));
  it("keeps the inventory order, then the extras", () => {
    expect(routes.slice(0, CENTRE_SCREENS.length)).toEqual(CENTRE_SCREENS.map((screen) => screen.path));
  });
  it("has only addresses that start with a slash", () => {
    for (const path of routes) expect(path.startsWith("/"), path).toBe(true);
  });
});

describe("inBatches", () => {
  it("splits without dropping or repeating anything", () => {
    const items = Array.from({ length: 29 }, (_, i) => i);
    const batches = inBatches(items, 12);
    expect(batches.map((b) => b.length)).toEqual([12, 12, 5]);
    expect(batches.flat()).toEqual(items);
  });
  it("returns one batch for a short list and none for an empty one", () => {
    expect(inBatches([1, 2], 12)).toEqual([[1, 2]]);
    expect(inBatches([], 12)).toEqual([]);
  });
  it("treats a size below one as one", () => expect(inBatches([1, 2], 0)).toEqual([[1], [2]]));
  it("uses the shared page-load limit by default", () => {
    expect(inBatches(Array.from({ length: LOADS_PER_PAGE + 1 }, () => 0)).map((b) => b.length)).toEqual([LOADS_PER_PAGE, 1]);
  });
  it("keeps the limit small", () => expect(LOADS_PER_PAGE).toBeLessThanOrEqual(15));
});

describe("the browser runs use the inventory, not a second list", () => {
  it("the release run derives its addresses and has no hand-written list of places", () => {
    const spec = read("../../tests/release.spec.ts");
    expect(spec).toContain("releaseRoutes()");
    expect(spec).not.toMatch(/"\/places\/[a-z-]+"/);
  });
  it("the release run moves to a fresh page in batches", () => {
    expect(read("../../tests/release.spec.ts")).toContain("inBatches(");
  });
});

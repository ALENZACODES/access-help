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
const OVERCLAIM = /verif|vérif|real-?time|certified|guaranteed|partnership|accessnow|\bAAA\b/i;

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

describe("settings screen", () => {
  const settingsDir = join(root, "apps/centre/src/settings");
  const settingsFiles = readdirSync(settingsDir);
  const settingsSource = settingsFiles.filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name));

  it("makes no network request and holds no data files", () => {
    for (const name of settingsSource) expect(readFileSync(join(settingsDir, name), "utf8"), name).not.toMatch(NETWORK);
    for (const name of settingsFiles) expect(name, name).toMatch(/\.(ts|tsx|css)$/);
  });

  it("is routed from the shell, linked in both languages, and applied before the first paint", () => {
    const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
    expect(app).toContain('path="/settings"');
    expect(app).toContain('<NavLink className="min-target" to="/settings">');
    const strings = readFileSync(join(root, "apps/centre/src/strings.ts"), "utf8");
    expect(strings).toContain('settings: "Settings"');
    expect(strings).toContain('settings: "Réglages"');
    const main = readFileSync(join(root, "apps/centre/src/main.tsx"), "utf8");
    expect(main).toContain("applyPrefs(");
    expect(main).toContain("a11y-prefs.css");
  });
});

describe("mapping-day screen", () => {
  const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
  const view = read("MappingDayView.tsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const store = read("dayStore.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it("is routed once, linked from the places menu, and routed before the place detail", () => {
    expect(app.split('path="/places/mapping-day"')).toHaveLength(2);
    expect(read("PlacesNav.tsx")).toContain('to="/places/mapping-day"');
    // There is no place-detail route on main yet; once there is, this route must come before it.
    const detail = app.indexOf('path="/places/:id"');
    if (detail >= 0) expect(app.indexOf('path="/places/mapping-day"')).toBeLessThan(detail);
  });

  it("reaches storage only through the two stores", () => {
    expect(view).not.toMatch(/localStorage|sessionStorage|\.setItem|\.getItem/);
    expect(store.match(/storage\.setItem\(/g)).toHaveLength(1);
  });

  it("does not read the clock outside today.ts, or a random number", () => {
    for (const name of ["MappingDayView.tsx", "dayStore.ts", "mappingDayModel.ts"]) expect(read(name), name).not.toMatch(/new Date\(|Date\.now\(|Math\.random\(/);
  });

  it("offers no control that uploads, submits or syncs", () => {
    expect(view).not.toMatch(/<form[^>]*action=|method=["']post|\bfetch\b|sendBeacon/i);
    expect(read("mappingDayStrings.ts")).not.toMatch(/\b(uploaded|submitted|synced|published)\b/i);
  });
});

describe("saved places, visit plan, sources, and backup", () => {
  const app = readFileSync(join(root, "apps/centre/src/App.tsx"), "utf8");
  const settings = readFileSync(join(root, "apps/centre/src/settings/SettingsView.tsx"), "utf8");
  const src = (path: string) => readFileSync(join(root, "apps/centre/src", path), "utf8");

  it("are routed from the shell, with the detail route written after the fixed ones", () => {
    for (const route of ["/places/saved", "/places/plan", "/places/sources", "/places/:id"]) expect(app, route).toContain(`path="${route}"`);
    expect(app.indexOf('path="/places/:id"')).toBeGreaterThan(app.indexOf('path="/places/contribute"'));
  });

  it("are linked from the places menu and from the places list", () => {
    const nav = src("places/PlacesNav.tsx");
    for (const link of ["/places/saved", "/places/plan", "/places/sources"]) expect(nav, link).toContain(`to="${link}"`);
    expect(src("places/PlacesBrowse.tsx")).toContain("placePath(record.id)");
  });

  it("never keep an access status on a saved place", () => {
    const saved = src("places/saved.ts");
    expect(saved).not.toMatch(/wheelchair\s*:/);
    expect(saved).not.toMatch(/\bstatus\s*:\s*"/);
  });

  it("build every status they show from the merged packs", () => {
    for (const file of ["places/PlaceDetail.tsx", "places/SavedView.tsx", "places/PlanView.tsx"]) {
      expect(src(file), file).toMatch(/usePlaces\(|resolveSaved\(|mergePacks\(/);
    }
  });

  it("cover every key the App writes to this device, in the backup and in clear-all", () => {
    const keys = [...["places/store.ts", "places/saved.ts", "settings/prefs.ts"].flatMap((file) => [...src(file).matchAll(/export const (\w+_KEY)\s*=\s*"the-app-/g)].map((m) => m[1]!))];
    expect(keys.sort()).toEqual(["DRAFTS_KEY", "LIBRARY_KEY", "PACK_KEY", "PREFS_KEY", "SAVED_KEY"]);
    const backup = src("places/backup.ts");
    for (const key of keys) expect(backup, key).toContain(key);
    const store = src("places/store.ts");
    expect(store).toContain("createSavedStore(storage).clear()");
    expect(store).toContain("createDraftStore(storage).clear()");
  });

  it("offer the backup from the settings screen", () => {
    expect(settings).toContain("createBackup(");
    expect(settings).toContain("restoreBackup(");
  });

  it("print only the plan, with no colour set for print", () => {
    const css = src("places/print.css");
    expect(css).toContain("@media print");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
    expect(src("places/PlanView.tsx")).toContain('import "./print.css"');
  });

  it("open a map app only with a geo: link, never a map page or tile server", () => {
    const detail = src("places/detail.ts");
    expect(detail).toContain("geo:");
    expect(detail).not.toMatch(/https?:/);
  });
});

// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ONBOARDING_PATHS } from "../../src/paths";
import { PATH_PROGRESS_KEY, hashToView, loadProgress } from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

const routes = ONBOARDING_PATHS.flatMap((p) => p.steps.flatMap((s, i) => (s.appRoute ? [{ path: p.id, step: i, route: s.appRoute }] : [])));

describe("every page a path step opens", () => {
  it.each(["en", "fr"] as const)("has a heading and passes axe and the App's own audit (%s)", async (locale) => {
    const seen = new Set<string>();
    for (const r of routes) {
      if (seen.has(r.route)) continue;
      seen.add(r.route);
      h.destroy();
      h = createHarness(TODAY);
      h.seed([testNote("l1", "Library", [{ key: "elevator", value: "yes" }]), testNote("c1", "Cafe", [], "3 Main St")]);
      h.mount(locale);
      h.click(act("view", "help"));
      h.click(act("open-path", r.path));
      for (let n = 1; n <= r.step; n++) h.click(act("path-step", String(n)));
      h.click(act("path-open", r.route));
      expect(h.shell?.getView(), r.route).toEqual(hashToView(r.route));
      expect(h.heading().trim(), r.route).not.toBe("");
      const res = await axe.run(document.body, AXE_OPTIONS);
      expect(res.violations.map((v) => `${v.id}: ${v.help}`), r.route).toEqual([]);
      expect(h.auditLines(), `${locale} ${r.route}`).toEqual([]);
    }
    expect(seen.size).toBeGreaterThanOrEqual(12);
  });
});

describe("ticks across a language change", () => {
  it("are kept when the person switches language", () => {
    h.mount("en");
    h.click(act("view", "help"));
    h.click(act("open-path", "find-doubles"));
    h.root.querySelector<HTMLInputElement>('input[data-action="path-done"]')?.click();
    h.mount("fr");
    h.click(act("view", "help"));
    h.click(act("open-path", "find-doubles"));
    expect(h.root.querySelector<HTMLInputElement>('input[data-action="path-done"]')?.checked).toBe(true);
    expect(h.root.querySelector("[data-path-progress]")?.textContent).toBe("1 étape faite sur 3");
    expect(loadProgress(h.store)).toEqual({ "find-doubles": ["similar"] });
    expect(h.store.getItem(PATH_PROGRESS_KEY)).toBe('{"find-doubles":["similar"]}');
  });
});

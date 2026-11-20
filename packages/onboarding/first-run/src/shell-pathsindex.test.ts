// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ONBOARDING_PATHS } from "../../src/paths";
import { COPY, PATH_PROGRESS_KEY, hashToView, loadProgress, viewToHash } from "./index";
import { getQuestion, reachableLeaves } from "./chooser";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

function open(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "help"));
  h.click(act("view", "pathsindex"));
}

const card = (id: string): Element | null => h.root.querySelector(`section[data-path="${id}"]`);

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("the short paths page", () => {
  it("has its own address next to the paths", () => {
    expect(viewToHash({ kind: "pathsindex" })).toBe("#/help/paths");
    expect(hashToView("#/help/paths")).toEqual({ kind: "pathsindex" });
    expect(hashToView("#/help/paths/1")).toBeUndefined();
    expect(ONBOARDING_PATHS.map((p) => p.id)).not.toContain("paths");
  });

  it("lists every path with its steps and the person's ticks", () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "plan-a-visit": ["must-haves"] }));
    open();
    expect(h.heading()).toBe("Short paths and your ticks");
    expect(Array.from(h.root.querySelectorAll("section[data-path]")).map((s) => s.getAttribute("data-path"))).toEqual(ONBOARDING_PATHS.map((p) => p.id));
    const steps = Array.from(card("plan-a-visit")?.querySelectorAll("li[data-step]") ?? []);
    expect(steps.map((s) => s.getAttribute("data-done"))).toEqual(["true", "false", "false"]);
    expect(steps[1]?.textContent).toBe("Put your shortlist in order (not ticked) Next");
    expect(card("plan-a-visit")?.querySelector("[data-paths-progress]")?.textContent).toBe("1 of 3 steps done");
  });

  it("starts, continues or reads again, by what is ticked", () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "plan-a-visit": ["must-haves"], "tidy-my-notes": ["check", "decide", "copy"] }));
    open();
    expect(card("get-help")?.querySelector("button")?.textContent).toBe("Start: Get help");
    expect(card("plan-a-visit")?.querySelector("button")?.textContent).toBe("Continue: Plan a visit, step by step");
    expect(card("tidy-my-notes")?.querySelector("button")?.textContent).toBe("Read again: Tidy my notes");
    h.click(`section[data-path="plan-a-visit"] ${act("path-continue", "plan-a-visit")}`);
    expect(h.shell?.getView()).toEqual({ kind: "path", id: "plan-a-visit", step: 1 });
  });

  it("clears every tick only after a second press, and Keep changes nothing", async () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "plan-a-visit": ["must-haves"] }));
    open();
    h.click(act("paths-clear"));
    expect(document.activeElement?.getAttribute("data-action")).toBe("paths-clear-confirm");
    expect(h.root.querySelector('main [role="note"]')?.textContent).toBe(COPY.pathsIndex.clearAsk.en);
    h.click(act("paths-clear-cancel"));
    expect(loadProgress(h.store)).toEqual({ "plan-a-visit": ["must-haves"] });
    expect(document.activeElement?.getAttribute("data-action")).toBe("paths-clear");
    h.click(act("paths-clear"));
    h.click(act("paths-clear-confirm"));
    expect(loadProgress(h.store)).toEqual({});
    expect(h.root.querySelector('main [role="status"]')?.textContent).toBe(COPY.pathsIndex.cleared.en);
    expect(h.root.querySelector(act("paths-clear"))).toBeNull();
    await Promise.resolve();
    expect(h.status()).toBe(COPY.pathsIndex.cleared.en);
  });

  it("offers no clear button when nothing is ticked, and forgets a half-done clear when you leave", () => {
    open();
    expect(h.root.querySelector(act("paths-clear"))).toBeNull();
    h.destroy();
    h = createHarness(TODAY);
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "get-help": ["contact"] }));
    open();
    h.click(act("paths-clear"));
    h.click(`main ${act("view", "help")}`);
    h.click(act("view", "pathsindex"));
    expect(h.root.querySelector(act("paths-clear-confirm"))).toBeNull();
    expect(h.root.querySelector(act("paths-clear"))).not.toBeNull();
  });
});

describe("the chooser reaches the record paths", () => {
  it("through one more question under notes", () => {
    expect(getQuestion("note")?.choices.some((c) => "node" in c.to && c.to.node === "records")).toBe(true);
    const ids = reachableLeaves().filter((l) => l.kind === "path").map((l) => (l as { id: string }).id);
    for (const id of ["check-the-sources", "find-doubles", "keep-details-current"]) expect(ids).toContain(id);
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit, also while confirming (%s)", async (locale) => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "plan-a-visit": ["must-haves"], "tidy-my-notes": ["check", "decide", "copy"] }));
    open(locale);
    let r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    h.click(act("paths-clear"));
    r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`), "confirming").toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
    const names = Array.from(h.root.querySelectorAll("main button")).map((b) => (b.textContent ?? "").toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("main button"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
  });

  it("uses French names with a no-break space and never says inconnu", () => {
    open("fr");
    expect(card("ask-about-unknown")?.querySelector("button")?.textContent).toBe("Commencer\u00A0: Demander un détail UNKNOWN");
    expect(h.root.querySelector("main")?.textContent ?? "").not.toMatch(/\binconnu/i);
  });
});

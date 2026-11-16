// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import {
  attachRovingFocus,
  initialState,
  renderStep,
  type FirstRunState,
  type Locale,
} from "./index";

const states: FirstRunState[] = [
  initialState(),
  { step: "scan", mode: "switch", scanMs: undefined },
  { step: "finish", mode: "switch", scanMs: 2000 },
  { step: "finish", mode: undefined, scanMs: undefined },
];
const locales: Locale[] = ["en", "fr"];

function mount(state: FirstRunState, locale: Locale): HTMLElement {
  document.documentElement.lang = locale;
  document.title = "First run";
  document.body.innerHTML = `<main>${renderStep(state, locale)}</main>`;
  return document.body;
}

describe("automated accessibility checks (axe-core in jsdom)", () => {
  it("finds no WCAG 2.x A/AA violations in any step or language", async () => {
    for (const s of states) {
      for (const l of locales) {
        const root = mount(s, l);
        const results = await axe.run(root, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
          // jsdom has no layout or rendering: these rules cannot run here.
          rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
        });
        const summary = results.violations.map((v) => `${v.id}: ${v.help}`);
        expect(summary, `${s.step} ${l}`).toEqual([]);
      }
    }
  });
});

describe("keyboard behaviour in the DOM", () => {
  it("has a logical tab order: every control is a native button, none removed from order", () => {
    for (const s of states) {
      const root = mount(s, "en");
      const controls = root.querySelectorAll("button");
      expect(controls.length).toBeGreaterThan(0);
      for (const c of Array.from(controls)) {
        expect(c.tabIndex).toBe(0);
        expect(c.getAttribute("type")).toBe("button");
      }
    }
  });

  it("moves focus with arrow keys, wraps, and does not trap Tab", () => {
    const root = mount(initialState(), "en");
    const group = root.querySelector<HTMLElement>('[role="group"]');
    expect(group).not.toBeNull();
    if (!group) return;
    const detach = attachRovingFocus(group);
    const items = Array.from(group.querySelectorAll<HTMLElement>("button"));
    items[0]?.focus();

    const press = (key: string): boolean =>
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );

    press("ArrowRight");
    expect(document.activeElement).toBe(items[1]);
    press("ArrowLeft");
    press("ArrowLeft");
    expect(document.activeElement).toBe(items[items.length - 1]);
    press("Home");
    expect(document.activeElement).toBe(items[0]);
    press("End");
    expect(document.activeElement).toBe(items[items.length - 1]);

    // Tab must not be cancelled, so the browser can move focus out.
    const notCancelled = press("Tab");
    expect(notCancelled).toBe(true);

    detach();
    items[0]?.focus();
    press("ArrowRight");
    expect(document.activeElement).toBe(items[0]);
  });
});

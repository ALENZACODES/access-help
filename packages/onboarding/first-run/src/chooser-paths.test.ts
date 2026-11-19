// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chooserStrings, depthOf, getQuestion, parentOf, reachableLeaves, validateTree } from "./chooser";
import { frenchTypographyIssues } from "../../src/paths";
import { act, createHarness, type Harness } from "./shelltest";

describe("the chooser leads to the place-tool paths", () => {
  it("stays a valid tree", () => {
    expect(validateTree()).toEqual([]);
  });

  it("reaches each new path", () => {
    const paths = reachableLeaves().filter((l) => l.kind === "path").map((l) => (l as { id: string }).id);
    for (const id of ["plan-a-visit", "ask-about-unknown", "tidy-my-notes"]) expect(paths, id).toContain(id);
  });

  it("asks one more question for planning and for Unknown, both one level down", () => {
    for (const id of ["visit", "unknown"]) {
      expect(parentOf(id), id).toBe("start");
      expect(depthOf(id), id).toBe(depthOf("move"));
      expect(getQuestion(id)?.choices).toHaveLength(2);
    }
    expect(getQuestion("visit")?.choices.map((c) => c.to)).toEqual([
      { kind: "article", id: "plan" },
      { kind: "path", id: "plan-a-visit" },
    ]);
    expect(getQuestion("unknown")?.choices.map((c) => c.to)).toEqual([
      { kind: "article", id: "unknown" },
      { kind: "path", id: "ask-about-unknown" },
    ]);
  });

  it("keeps French typography, UNKNOWN and no inconnu in every chooser string", () => {
    for (const [label, l] of chooserStrings()) {
      expect(frenchTypographyIssues(l.fr), label).toEqual([]);
      expect(l.fr, label).not.toMatch(/\binconnu/i);
    }
    expect(getQuestion("unknown")?.prompt.fr).toBe("Que voulez-vous savoir sur UNKNOWN\u202F?");
  });
});

describe("walking the chooser to a path", () => {
  let h: Harness;
  beforeEach(() => {
    h = createHarness(new Date(Date.UTC(2026, 10, 19)));
  });
  afterEach(() => {
    h.destroy();
  });

  it("goes from the first question to the plan-a-visit path in two choices", () => {
    h.mount();
    h.click(act("view", "help"));
    h.click(act("find-open"));
    const choose = (label: string): void => {
      const b = Array.from(h.root.querySelectorAll<HTMLElement>("main button")).find((x) => x.textContent === label);
      if (!b) throw new Error(`no choice ${label}`);
      b.click();
    };
    choose("Planning a visit");
    expect(h.heading()).toBe("How do you want to plan?");
    expect(h.root.querySelector(act("open-path", "plan-a-visit"))?.textContent).toBe("Go step by step");
    choose("Go step by step");
    expect(h.shell?.getView()).toEqual({ kind: "path", id: "plan-a-visit", step: 0 });
    expect(h.heading()).toBe("Save your must-haves");
  });
});

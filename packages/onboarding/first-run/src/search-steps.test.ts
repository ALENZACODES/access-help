// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bestPathStep } from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";

describe("bestPathStep", () => {
  it("names the step a search matches best", () => {
    expect(bestPathStep("plan-a-visit", "round-up", "en")).toBe(2);
    expect(bestPathStep("plan-a-visit", "shortlist order", "en")).toBe(1);
    expect(bestPathStep("tidy-my-notes", "copy", "en")).toBe(2);
    expect(bestPathStep("find-doubles", "repeated records", "en")).toBe(1);
  });

  it("gives nothing when the first step matches best, or nothing matches", () => {
    expect(bestPathStep("plan-a-visit", "must-haves", "en")).toBeUndefined();
    expect(bestPathStep("plan-a-visit", "zebra", "en")).toBeUndefined();
    expect(bestPathStep("no-such-path", "copy", "en")).toBeUndefined();
    expect(bestPathStep("plan-a-visit", "", "en")).toBeUndefined();
  });

  it("weighs a step title over step text, and gives ties to the earlier step", () => {
    // "source" is in the text of steps 2 and 3: the earlier one wins.
    expect(bestPathStep("ask-about-unknown", "source", "en")).toBe(1);
    // "records" is in the titles of steps 2 and 3, and only in step text elsewhere.
    expect(bestPathStep("check-the-sources", "records", "en")).toBe(1);
    // "latest" is only in step 3's title.
    expect(bestPathStep("check-the-sources", "latest", "en")).toBe(2);
  });

  it("works in French, including the French word for UNKNOWN", () => {
    expect(bestPathStep("plan-a-visit", "bilan", "fr")).toBe(2);
    expect(bestPathStep("ask-about-unknown", "inconnu reponse", "fr")).toBe(1);
  });
});

describe("search results open the matching step", () => {
  let h: Harness;
  beforeEach(() => {
    h = createHarness(new Date(Date.UTC(2026, 10, 19)));
  });
  afterEach(() => {
    h.destroy();
  });

  function search(q: string, locale = "en"): void {
    h.mount(locale);
    h.click(act("view", "help"));
    const input = h.root.querySelector<HTMLInputElement>("#help-q");
    if (!input) throw new Error("no search box");
    input.value = q;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("shows the step under the path result and opens it", () => {
    search("round-up");
    const b = h.root.querySelector<HTMLElement>(act("open-path", "plan-a-visit"));
    expect(b?.getAttribute("data-key")).toBe("2");
    expect(b?.closest("li")?.querySelector("[data-hit-step]")?.textContent).toBe("Step 3 of 3: Read the round-up");
    h.click(act("open-path", "plan-a-visit"));
    expect(h.shell?.getView()).toEqual({ kind: "path", id: "plan-a-visit", step: 2 });
    expect(h.heading()).toBe("Read the round-up");
  });

  it("opens step 1 when the first step is the best match", () => {
    search("must-haves");
    const b = h.root.querySelector<HTMLElement>(act("open-path", "plan-a-visit"));
    expect(b?.hasAttribute("data-key")).toBe(false);
    h.click(act("open-path", "plan-a-visit"));
    expect(h.shell?.getView()).toEqual({ kind: "path", id: "plan-a-visit", step: 0 });
  });

  it("names the step in French with a no-break space, and passes axe and the audit", async () => {
    search("bilan", "fr");
    expect(h.root.querySelector(`[data-hit-step]`)?.textContent).toBe("Étape 3 sur 3\u00A0: Lisez le bilan");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(h.auditLines()).toEqual([]);
  });
});

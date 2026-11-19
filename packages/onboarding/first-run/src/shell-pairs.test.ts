// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decodeTextExportHref, findSimilar, groupPlaces, type Note } from "./index";
import { PAIR_COPY, pairsToText } from "./pairs";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "no" }]),
  testNote("l2", "Libary", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "yes" }], null),
  testNote("p1", "Pharmacy", [], "3 Low St"),
];

function open(): void {
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("view", "similar"));
}

const card = (): Element | null => h.root.querySelector("article.card");

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("what the two hold, on the possible matches page", () => {
  it("lists every detail of the pair with what each place holds", () => {
    h.seed(NOTES());
    h.mount();
    open();
    const items = Array.from(card()?.querySelectorAll("ul.pair-details li") ?? []);
    expect(items.map((li) => li.getAttribute("data-kind"))).toEqual(["agree", "neither", "neither", "disagree"]);
    expect(items[3]?.textContent).toMatch(/^Elevator: (No \/ Yes|Yes \/ No)\. Different answers\.$/);
    expect(card()?.querySelector("[data-pair-counts]")?.textContent).toBe("Same answer 1; Different answers 1; Neither has a record 2.");
  });

  it("labels the list by its heading", () => {
    h.seed(NOTES());
    h.mount();
    open();
    const list = card()?.querySelector("ul.pair-details");
    expect(h.root.querySelector(`#${list?.getAttribute("aria-labelledby") ?? "x"}`)?.textContent).toBe(PAIR_COPY.heading.en);
  });

  it("says once that matching records are a hint, in both languages", () => {
    h.seed(NOTES());
    for (const l of ["en", "fr"] as const) {
      h.mount(l);
      open();
      const hints = h.root.querySelectorAll("[data-pair-hint]");
      expect(hints).toHaveLength(1);
      expect(hints[0]?.textContent).toBe(PAIR_COPY.hint[l]);
    }
  });

  it("offers the pairs as text, after the pairs", () => {
    h.seed(NOTES());
    h.mount();
    open();
    const link = h.root.querySelector<HTMLAnchorElement>("main a[download]");
    expect(link?.getAttribute("download")).toBe("possible-matches-en.txt");
    expect(link?.textContent).toBe(PAIR_COPY.download.en);
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(pairsToText(findSimilar(groupPlaces(NOTES(), "en")), "en"));
  });

  it("shows no hint and no download when there is no pair", () => {
    h.seed([NOTES()[2] as Note]);
    h.mount();
    open();
    expect(h.root.querySelector("[data-pair-hint]")).toBeNull();
    expect(h.root.querySelector("main a[download]")).toBeNull();
  });

  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    h.seed(NOTES());
    h.mount(locale);
    open();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
    const ids = Array.from(h.root.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(h.root.querySelector<HTMLElement>("main a[download]")?.style.minHeight).toBe("44px");
  });
});

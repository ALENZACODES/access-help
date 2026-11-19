// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COPY, MAX_SHORTLIST, NEEDS_KEY, SHORTLIST_KEY, findBanned, loadShortlist, placeId, type Note } from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "elevator", value: "yes" }]),
  testNote("b1", "Bakery", [], "2 Main St"),
  testNote("c1", "Cafe", [], "3 Main St"),
];

const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
const BAKERY = placeId({ placeName: "Bakery", address: "2 Main St" });
const CAFE = placeId({ placeName: "Cafe", address: "3 Main St" });

function open(list: readonly string[] = [LIBRARY, BAKERY, CAFE]): void {
  h.seed(NOTES());
  h.store.setItem(SHORTLIST_KEY, JSON.stringify(list));
  h.mount();
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("view", "shortlistpage"));
}

const names = (): string[] => Array.from(h.root.querySelectorAll("ol.shortlist-order li span[data-user-content][id]")).map((x) => x.textContent ?? "");
const btn = (action: string, id: string): HTMLElement | null => h.root.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${id}"]`);

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("the shortlist page", () => {
  it("is offered on the places screen, lists places in the person's order and counts them", () => {
    open([CAFE, LIBRARY, BAKERY]);
    expect(h.shell?.getView()).toEqual({ kind: "shortlistpage" });
    expect(h.heading()).toBe("My shortlist");
    expect(names()).toEqual(["Cafe", "Library", "Bakery"]);
    expect(Array.from(h.root.querySelectorAll("[data-position]")).map((x) => x.textContent)).toEqual(["1 of 3", "2 of 3", "3 of 3"]);
    expect(h.root.querySelector("[data-shortlist-count]")?.textContent).toBe(`Places on the shortlist: 3 / ${MAX_SHORTLIST}`);
  });

  it("offers no Move up on the first row and no Move down on the last", () => {
    open();
    expect(btn("shortlist-up", LIBRARY)).toBeNull();
    expect(btn("shortlist-down", LIBRARY)).not.toBeNull();
    expect(btn("shortlist-down", CAFE)).toBeNull();
    expect(btn("shortlist-up", CAFE)).not.toBeNull();
  });

  it("moves a place, saves the order, keeps focus and says where it went", async () => {
    open();
    h.click(act("shortlist-down", LIBRARY));
    expect(names()).toEqual(["Bakery", "Library", "Cafe"]);
    expect(loadShortlist(h.store)).toEqual([BAKERY, LIBRARY, CAFE]);
    expect(document.activeElement).toBe(btn("shortlist-down", LIBRARY));
    await Promise.resolve();
    expect(h.status()).toBe("Moved to position 2 of 3");
  });

  it("moves focus to the other move button when a place reaches an edge", () => {
    open();
    h.click(act("shortlist-up", BAKERY));
    expect(names()).toEqual(["Bakery", "Library", "Cafe"]);
    expect(btn("shortlist-up", BAKERY)).toBeNull();
    expect(document.activeElement).toBe(btn("shortlist-down", BAKERY));
  });

  it("removes a place and moves focus to the next row's Remove", async () => {
    open();
    h.click(act("shortlist-remove", BAKERY));
    expect(names()).toEqual(["Library", "Cafe"]);
    expect(loadShortlist(h.store)).toEqual([LIBRARY, CAFE]);
    expect(document.activeElement).toBe(btn("shortlist-remove", CAFE));
    expect(h.root.querySelector('main [role="status"]')?.textContent).toBe(COPY.shortlistPage.removed.en);
    await Promise.resolve();
    expect(h.status()).toBe(COPY.shortlistPage.removed.en);
  });

  it("goes to the heading and says the list is empty after the last removal", () => {
    open([LIBRARY]);
    h.click(act("shortlist-remove", LIBRARY));
    expect(h.root.querySelector("[data-shortlist-empty]")?.textContent).toBe(COPY.shortlistPage.empty.en);
    expect(document.activeElement?.tagName).toBe("H2");
    expect(loadShortlist(h.store)).toEqual([]);
  });

  it("keeps the new order in the round-up", () => {
    h.store.setItem(NEEDS_KEY, JSON.stringify({ elevator: "yes" }));
    open();
    h.click(act("shortlist-up", CAFE));
    h.click(act("shortlist-up", CAFE));
    expect(loadShortlist(h.store)).toEqual([CAFE, LIBRARY, BAKERY]);
    h.click(`main ${act("view", "roundup")}`);
    expect(Array.from(h.root.querySelectorAll("article.roundup-place")).map((a) => a.getAttribute("data-place"))).toEqual([CAFE, LIBRARY, BAKERY]);
  });

  it("opens a place's visit plan, tied to its name", () => {
    open();
    const b = btn("open-plan", CAFE);
    expect(h.root.querySelector(`#${b?.getAttribute("aria-describedby") ?? "x"}`)?.textContent).toBe("Cafe");
    h.click(`ol.shortlist-order ${act("open-plan", CAFE)}`);
    expect(h.shell?.getView()).toEqual({ kind: "plan", id: CAFE });
  });

  it("drops a place that left the notes before drawing", () => {
    open([LIBRARY, "gone-0a1b2c3d", CAFE]);
    expect(names()).toEqual(["Library", "Cafe"]);
    expect(loadShortlist(h.store)).toEqual([LIBRARY, CAFE]);
  });

  it("says the shortlist is empty when it is", () => {
    open([]);
    expect(h.root.querySelector("[data-shortlist-empty]")?.textContent).toBe(COPY.shortlistPage.empty.en);
    expect(h.root.querySelector("ol.shortlist-order")).toBeNull();
  });
});

describe("many moves in a row", () => {
  it("keep the page, the saved list and the positions in step", () => {
    open();
    const ids = [LIBRARY, BAKERY, CAFE];
    const steps: Array<[string, string]> = [
      ["shortlist-down", LIBRARY],
      ["shortlist-down", LIBRARY],
      ["shortlist-up", CAFE],
      ["shortlist-up", BAKERY],
      ["shortlist-down", CAFE],
    ];
    for (const [action, id] of steps) {
      if (btn(action, id)) h.click(act(action, id));
      const saved = loadShortlist(h.store);
      expect([...saved].sort()).toEqual([...ids].sort());
      expect(Array.from(h.root.querySelectorAll("ol.shortlist-order > li")).map((li) => li.getAttribute("data-place"))).toEqual(saved);
      expect(Array.from(h.root.querySelectorAll("[data-position]")).map((x) => x.textContent)).toEqual(saved.map((_, i) => `${i + 1} of ${saved.length}`));
    }
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    h.seed(NOTES());
    h.store.setItem(SHORTLIST_KEY, JSON.stringify([LIBRARY, BAKERY, CAFE]));
    h.mount(locale);
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("view", "shortlistpage"));
    let r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    h.click(act("shortlist-remove", BAKERY));
    r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`), "after remove").toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
    const ids = Array.from(h.root.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("main button"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
    if (locale === "fr") expect(h.root.querySelector("[data-shortlist-count]")?.textContent).toBe(`Lieux de la liste courte\u00A0: 2 / ${MAX_SHORTLIST}`);
  });

  it("never sorts, ranks or scores", () => {
    h.seed(NOTES());
    h.store.setItem(SHORTLIST_KEY, JSON.stringify([CAFE, LIBRARY]));
    for (const locale of ["en", "fr"] as const) {
      h.mount(locale);
      h.click(act("view", "notes"));
      h.click(act("view", "places"));
      h.click(act("view", "shortlistpage"));
      const main = (h.root.querySelector("main")?.textContent ?? "").replace(COPY.shortlist.intro[locale], "");
      expect(findBanned(main), locale).toBeUndefined();
      expect(main, locale).not.toMatch(/\b(best|worst|score|ranked|meilleur|pire|classement)\b/i);
      expect(names(), locale).toEqual(["Cafe", "Library"]);
    }
  });
});

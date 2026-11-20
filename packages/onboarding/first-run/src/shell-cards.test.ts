// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { placeId } from "./index";
import { CARD_COPY } from "./placecard";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
const CAFE = placeId({ placeName: "Cafe", address: "5 King St" });
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([testNote("a", "Library", [{ key: "elevator", value: "yes" }]), testNote("b", "Cafe", [{ key: "automatic-door", value: "no" }], "5 King St")]);
});

afterEach(() => {
  h.destroy();
  vi.restoreAllMocks();
});

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = h.root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

function openPlace(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("open-place", LIBRARY));
}

const cardNames = (): string[] => Array.from(h.root.querySelectorAll("article.place-card h3")).map((e) => e.textContent ?? "");

describe("a card for one place", () => {
  it("opens from the place's page with its own card, and goes back there", () => {
    openPlace();
    h.click(act("open-place-card", LIBRARY));
    expect(h.heading()).toBe(CARD_COPY.title.en);
    expect(cardNames()).toEqual(["Library"]);
    expect($("[data-cards-download]").getAttribute("download")).toBe(`cards-${LIBRARY}-2026-11-20.html`);
    h.click(act("open-place", LIBRARY));
    expect(h.heading()).toBe("Library");
  });

  it("has its own address", () => {
    window.location.hash = `#/places/${LIBRARY}/card`;
    h.mount("fr", true);
    expect(h.heading()).toBe(CARD_COPY.title.fr);
    expect(cardNames()).toEqual(["Library"]);
  });

  it("says when the place is not there", () => {
    window.location.hash = "#/places/nowhere-00000000/card";
    h.mount("en", true);
    expect(h.text()).toContain(CARD_COPY.none.en);
    expect(h.root.querySelector('[data-action="card-print"]')).toBeNull();
  });
});

describe("cards for the shortlist", () => {
  it("prints the shortlist in its order, and goes back to it", () => {
    h.store.setItem("app.onboarding.shortlist.v1", JSON.stringify([CAFE, LIBRARY]));
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("view", "shortlistpage"));
    h.click(act("view", "cards"));
    expect(cardNames()).toEqual(["Cafe", "Library"]);
    expect($("[data-cards-download]").getAttribute("download")).toBe("cards-shortlist-2026-11-20.html");
    h.click(act("view", "shortlistpage"));
    expect(h.root.querySelector("[data-shortlist-count]")).not.toBeNull();
  });

  it("has its own address, and says when the shortlist is empty", () => {
    window.location.hash = "#/places/shortlist/cards";
    h.mount("en", true);
    expect(h.heading()).toBe(CARD_COPY.title.en);
    expect(h.text()).toContain(CARD_COPY.none.en);
  });
});

describe("printing", () => {
  it("opens the browser's print dialog", () => {
    openPlace();
    h.click(act("open-place-card", LIBRARY));
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    h.click(act("card-print"));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("does not break when printing is not available", () => {
    openPlace();
    h.click(act("open-place-card", LIBRARY));
    vi.spyOn(window, "print").mockImplementation(() => {
      throw new Error("not here");
    });
    expect(() => h.click(act("card-print"))).not.toThrow();
  });

  it("makes the text larger on screen and in the page to download, keeping focus on the choice", () => {
    openPlace();
    h.click(act("open-place-card", LIBRARY));
    $<HTMLInputElement>('[data-action="card-large"]').click();
    expect(document.activeElement?.getAttribute("data-action")).toBe("card-large");
    expect($("section.cards").classList.contains("cards-large")).toBe(true);
    const href = $("[data-cards-download]").getAttribute("href") ?? "";
    expect(decodeURIComponent(href.slice(href.indexOf(",") + 1))).toContain("font-size:150%");
    // The choice stays while moving to another card.
    h.click(act("open-place", LIBRARY));
    h.click(act("open-place-card", LIBRARY));
    expect($<HTMLInputElement>('[data-action="card-large"]').checked).toBe(true);
  });

  it("keeps the App's menus, buttons and messages off the printed page", () => {
    h.mount("en");
    const css = document.querySelector("style")?.textContent ?? "";
    expect(css).toContain("@media print");
    expect(css).toMatch(/@media print\{nav,header,\.skip-link,\.no-print/);
    openPlace();
    h.click(act("open-place-card", LIBRARY));
    expect($('[data-action="card-print"]').closest(".no-print")).not.toBeNull();
  });
});

describe("accessibility", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's audit, normal and larger (%s)", async (l) => {
    openPlace(l);
    for (const step of [() => h.click(act("open-place-card", LIBRARY)), () => $<HTMLInputElement>('[data-action="card-large"]').click()]) {
      step();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
    expect(h.auditLines()).toEqual([]);
  });
});
